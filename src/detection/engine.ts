import rules from "./rules.json";

export {};


/* ══════════════════════════════════════════════════════════════════════
   1 · SCORE MODEL — every weight, bonus and floor, documented
   ══════════════════════════════════════════════════════════════════════
   LINK points (per link, added to the message score):
     official domain / official subdomain ............ −20  (genuine)
     bare IP address (http://192.168.5.4/login) ...... +30  scam
     punycode label (xn--…) .......................... +30  scam
     brand-token lookalike (sbi-kyc-update.xyz,
       hdfcbank-secure.com, 1c1cibank-kyc-update.com,
       iciclbank.com typosquat, sbi.co.in.verify-kyc.top
       real domain embedded as an inner subdomain) ... +38  scam
     official body w/o one official domain in host
       (customs-clearance-info.click, aadhaar-…) ..... +26  scam
     URL shortener (bit.ly, tinyurl, …) .............. +24  suspicious
     cheap scam TLD (.xyz .top .click .info …) ....... +24  suspicious
     two or more hyphens in the host ................ +14  suspicious
     http:// (no TLS) ................................ +8
     otherwise-plain domain ......................... +4
     bare link with almost no message text ........... +10

   TEXT signal groups (each fires at most once, adds one reason):
     G·impersonation   bank/gov body name +12 · consumer brand +6
     G·urgency         9 + 2 per extra hit, capped at 17
     G·credential      soft ask (KYC/Aadhaar/card details/"9-digit
                       code") +20 · "update your KYC" +20 · generic
                       "update/verify your details/payment/bill" +12
     G·threat          16 + 3 per extra hit, capped at 25
     G·riskyLink       any link with verdict ≠ safe (points above)
     G·callback         "call/WhatsApp/message + number", a personal
                       10-digit mobile, or "press 9 to talk to an
                       officer" ...................... +10  (toll-free
                       1800/1860 numbers never fire)
     G·reward          lottery/prize/KBC bait +14, +8 more when a
                       claim path (risky link or number) exists
     G·job             task/part-time "earn by liking videos" +22
     plus one group per hard category below

   HARD categories — each adds +30 and FLOORS THE SCORE AT 70 (scam):
     H1  asks for OTP / PIN / CVV / UPI PIN (incl. Hinglish &
         Devanagari "OTP साझा करें"), unless negated ("never share")
     H2  asks to install AnyDesk/TeamViewer/QuickSupport/RustDesk
     H3  asks to move money to a "safe account" / RBI account
     H4  digital arrest: authority (CBI/police/customs/…) + coercion
         (video call, "stay on the call", "do not tell anyone", …)
     H5  sextortion: private video/photos + payment demand
     H6  task-scam funnel: job bait + private contact number
     H7  prize bait + "send Aadhaar/bank details/a fee to claim"
     (H1/H2/H3/H4/H5 are the user-specified hard signals; H6/H7 are
      documented extras — both patterns are near-certain scams.)

   Extra pattern points (no group of their own):
     pending/due bill-challan-emi pressure ............ +10
     unsolicited 10-digit mobile in the text ......... +6
     panic + number combo (urgency or threat AND a
       callback number / mobile) ..................... +15
     SHOUTING / many exclamation marks ............... +6

   Combination logic:
     2 distinct groups fire  → +8 bonus  AND score floored at 30
     3+ groups fire          → +14 bonus (instead of +8), floor 30
     any HARD category      → score floored at 70 → verdict scam

   Genuine-message negatives (applied before floors):
     "never share your OTP"-style negation .......... −12
     each official-domain link ..................... −20
     routine delivery-update phrasing .............. −8
     "no action required / automated message" ...... −8

   Verdict thresholds: score > 65 → scam · 30–65 → suspicious · < 30 safe
   Known trade-offs (deliberate): short brands like "sbi/hdfc/axis" are
   matched as whole labels or label prefixes, never inside longer
   English words; "upi" only as a whole label (cupid.com stays safe);
   known genuine brand-affiliated sites are whitelisted in REAL_DOMAINS.
   ══════════════════════════════════════════════════════════════════════ */

/* ── 2 · Reference tables ──────────────────────────────────────────── */

/* Official domains. A host that IS one of these, or ends with
   ".<one of these>", is treated as genuine (−20). Extend freely. */
const REAL_DOMAINS = rules.realDomains;

/* Brand token found inside a hostname label → the official domain it
   imitates. mode 'eq'  : token must be a whole label segment only
                        (short tokens where substring hits would be
                         false positives, e.g. upi → cupid.com)
   mode 'seg'  : whole segment OR the segment starts with the token
                        (3–4 letter brands: sbi, hdfc, axis, mseb…)
   default     : token may appear anywhere in the segment (long brands)
   real null   : official body with no single official site → strong
                 scam link, but no side-by-side diff is shown.        */
const BRAND_TOKENS = rules.brandTokens;

const SHORTENERS = new Set(rules.shorteners);

const BAD_TLDS = new Set(rules.badTlds);

/* Homoglyph passes — applied to each host label before token matching:
   1c1cibank → icicibank (1→i), hdfcbank.c0m → hdfcbank.com (0→o),
   rn → m, vv → w. Second pass tries 1→l for l/i confusable brands. */
const HOMOGLYPH_PASSES = rules.homoglyphPasses;

const CAPS_OK = new Set(rules.capsOk);

/* ── 3 · Text-signal patterns (EN + Hinglish + Devanagari) ────────────
   Note: JS \b is ASCII-only, so Devanagari alternatives are NEVER put
   inside \b groups — they sit at the top level of the alternation.     */

/* Urgency & panic: EN + turant/abhi/aaj raat/band ho jayega/kat jayega
   + तुरंत/अभी/आज रात/ब्लॉक/कट जाएगी … */
const RE_URG = new RegExp(
  '(\\bblock(?:ed|ing)?\\b|\\block(?:ed|ing)?\\b|\\bsuspend(?:ed)?\\b|' +
  'deactivat(?:e|ed|ion)|disconnec(?:t|ted|tion)|will\\s+be\\s+cut|cut\\s+off|' +
  '\\bimmediately\\b|\\burgent(?:ly)?\\b|within\\s+\\d+\\s?(?:hours?|hrs?|days?|minutes?|mins?)|' +
  'last\\s+warning|final\\s+(?:warning|notice)|\\btonight\\b|today\\s+itself|' +
  'right\\s+now|act\\s+now|\\bexpires?\\s+(?:today|tonight|soon|immediately|now|in\\s+\\d+\\s*(?:hours?|hrs?|minutes?|mins?))\\b|\\bexpired\\b|expir(?:y|ation)|last\\s+day|\\bdeadline\\b|' +
  'turant|\\babhi\\b|jaldi|aaj\\s+raat|aaj\\s+hi|band\\s+ho\\s+ja(?:y|ye)?g|' +
  'kat\\s+ja(?:y|ye)?g|aakhri|\\d+\\s?ghant[oe]|' +
  'तुरंत|तुरन्त|अभी|आज\\s+रात|आज\\s+ही|ब्लॉक|बंद|बन्द|कट\\s+जाएगा|कट\\s+जाएगी|कट\\s+जायेगा|कट\\s+जायेगी|' +
  'निलंबित|समाप्त|अवरुद्ध|अंतिम|\\d+\\s?घंटे)', 'gi');

/* Threats: arrest/legal action/case filed/SIM block/giraftar/kanooni
   karwai + गिरफ्तार/कानूनी कार्रवाई/जेल/वारंट … */
const RE_THREAT = new RegExp(
  '(\\barrest(?:ed)?\\b|\\blegal\\s+(?:action|notice)\\b|\\bpolice\\b|\\bfir\\b|' +
  'case\\s+(?:will\\s+be|has\\s+been|is)\\s+(?:filed|registered|booked)|' +
  '\\bwarrant\\b|non-?bailable|\\bseized\\b|\\bdetained\\b|digital\\s+arrest|' +
  'narcotics|money\\s+laundering|illegal\\s+(?:items|goods|content|parcel)|' +
  'sim\\s+(?:card\\s+)?(?:will\\s+be\\s+)?(?:blocked?|suspended|deactivated)|' +
  'giraftar|giraftari|kanooni\\s+(?:karwai|karvai|action)|' +
  'कानूनी\\s+कार्रवाई|गिरफ्तार|गिरफ़्तार|जेल|वारंट|ज़ब्त|जब्त|मुकदमा|मुक़दमा|केस\\s+दर्ज|अवैध|' +
  'सिम\\s+कार्ड[^।.!?\\n]{0,30}(?:ब्लॉक|बंद|निलंबित)|सिम\\s+(?:कार्ड\\s+)?(?:ब्लॉक|बंद)|' +
  '(?:meter|मीटर)[^.!?\\n]{0,30}(?:disconnec(?:t|ted)|cut\\s+off|blocked)|नारकोटिक्स)', 'gi');

/* Credential ask, HARD tier (OTP/PIN/CVV/UPI PIN) — verb then noun,
   negation-aware ("never … share this OTP" does NOT fire).           */
const RE_CRED_HARD = new RegExp(
  '(\\b(?:share|send|provide|give|type|enter|update|confirm|bhejo|bhejen|bhej|batana|batao|dena|dijiye)\\b|' +
  'साझा|शेयर|भेजें|भेजो|दीजिए)[^.!?\\n]{0,45}' +
  '(\\b(?:otp|upi\\s*pin|pin)\\b(?!\\s?code)|\\bcvv\\b|\\bcvc\\b|ओटीपी)', 'gi');

/* Credential ask, HARD tier, noun-first (Hindi word order):
   "OTP साझा करें", "पिन भेजें" — negated by मत/नहीं/कभी/न करें in between. */
const RE_CRED_HARD_HI = new RegExp(
  '(\\b(?:otp|pin)\\b|ओटीपी|पिन)[^।.!?\\n]{0,30}' +
  '(साझा|शेयर|भेजें|भेजो|दीजिए|दिजिए|बताएं|बताइए|देना\\s+होगा|दें)', 'gi');

/* Credential ask, SOFT tier (+20): KYC/Aadhaar/password/card-bank
   account details/screen code/"9-digit code", or noun-first
   "KYC update …". PAN is deliberately NOT here (PAN-update requests
   are far more common in genuine mail) — PAN only scores +12 below. */
const RE_CRED_SOFT = new RegExp(
  '(\\b(?:share|send|provide|give|type|upload|submit|bhejo|bhejen|bhej|batana|batao|dena|dijiye)\\b|' +
  'साझा|शेयर|भेजें|भेजो|दीजिए|बताएं)[^.!?\\n]{0,45}' +
  '(\\b(?:kyc|aadhaar|aadhar|adhar|password|card\\s+details?|bank\\s+details?|account\\s+details?|' +
  'screen\\s+(?:sharing\\s+)?code)\\b|(?:\\d|one|two|nine)[\\s-]?digit\\s+code|' +
  'आधार|केवाईसी|पासवर्ड)', 'gi');

const RE_CRED_NOUNFIRST = new RegExp(
  '(\\b(?:kyc|otp|aadhaar|aadhar|adhar)\\b|आधार)[^.!?\\n]{0,20}' +
  '(\\b(?:update|verify|confirm)\\b|अपडेट|सत्यापित)', 'gi');

/* Credential expiring/pending: "your KYC has expired", "KYC is pending" */
const RE_CRED_EXPIRE = new RegExp(
  '(\\b(?:otp|kyc|aadhaar|aadhar|adhar|pan|password)\\b)[^.!?\\n]{0,25}' +
  '(\\b(?:expired?|expiring|expire|pending|suspended|blocked)\\b|खत्म|बंद\\s+हो)', 'gi');

/* Generic "update/verify your details/payment/bill/PAN" — the soft
   +12 tier, incl. Hinglish verb ("bill update karein") and reversed
   noun-first order. */
const RE_CRED_UPDATE = new RegExp(
  '(\\b(?:update|verify|confirm|re-?verify)\\b[^.!?\\n]{0,25}\\b(?:your\\s+)?(?:details?|payment|address|account|bill|pan)\\b' +
  '|\\b(?:details?|payment|account|bill|pan|kyc)\\b[^.!?\\n]{0,15}\\b(?:update|verify|confirm)\\b' +
  '|\\b(?:update|verify|confirm)\\b[^.!?\\n]{0,25}\\b(?:karein|karo|karne|kijiye)\\b)', 'gi');

/* Bank / government impersonation (body is named in the message). */
const RE_GOV_IMP = new RegExp(
  '(\\bsbi\\b|\\blic\\b|\\bjio\\b|\\bairtel\\b|vodafone|state\\s+bank|\\byono\\b|\\bhdfc\\b|\\bicici\\b|\\baxis\\b|\\bpnb\\b|' +
  'punjab\\s+national|bank\\s+of\\s+baroda|canara\\s+bank|union\\s+bank|\\bkotak\\b|indusind|' +
  '\\brbi\\b|reserve\\s+bank|\\bupi\\b|\\btrai\\b|\\bcbi\\b|narcotics|customs|mumbai\\s+customs|' +
  'india\\s+post|indiapost|income\\s+tax|\\bgst\\b|\\baadhaar\\b|\\buidai\\b|passport\\s+office|' +
  'electricity\\s+(?:board|dept|department)|\\bmseb\\b|msedcl|\\bbses\\b|\\bbescom\\b|tata\\s+power|' +
  'mahadiscom|mahavitaran|cyber\\s+(?:cell|crime)|ed\\s+officer|' +
  'bijli|vidyut|बिजली|विद्युत|पुलिस|रिज़र्व\\s+बैंक|रिजर्व\\s+बैंक|साइबर\\s+सेल)', 'gi');

/* Well-known consumer brands — silent +6, becomes a visible reason
   only when other risk signals are present. */
const RE_CONSUMER_IMP = new RegExp(
  '(\\bpaytm\\b|\\bphonepe\\b|google\\s+pay|\\bgpay\\b|\\bamazon\\b|\\bflipkart\\b|' +
  '\\bswiggy\\b|\\bzomato\\b|\\bmyntra\\b|\\bairtel\\b|\\bjio\\b|vodafone|\\blic\\b|tata\\s+power|\\birctc\\b|' +
  '\\buber\\b|\\bola\\b|rapido|netflix|\\bfedex\\b|bluedart|blue\\s+dart|\\bdhl\\b|delhivery|\\bekart\\b)', 'gi');

/* Reward bait: lottery / won / prize / KBC / लॉटरी / जीते … */
const RE_REWARD = new RegExp(
  '(\\blottery\\b|lucky\\s+draw|\\bwon\\b|\\bwinner\\b|jackpot|crorepati|\\bprize\\b|\\bkbc\\b|' +
  'free\\s+(?:gift|recharge|charge|iphone|subscription)|लॉटरी|करोड़पति|इनाम|केबीसी|जीते|जीता|जीतें)', 'gi');

/* Job / task scams: part-time job, earn by liking videos, typing work,
   prepaid tasks, रोज कमाई … */
const RE_JOB = new RegExp(
  '(\\bpart\\s?-?\\s?time\\b[^.!?\\n]{0,20}\\b(?:job|work)\\b|typing\\s+(?:job|work)|' +
  'form\\s+filling|data\\s+entry|work\\s+from\\s+home|pre-?paid\\s+tasks?|' +
  'daily\\s+(?:earning|income|payout|kaam|kamai)|' +
  'earn(?:ing)?\\s+(?:rs\\.?|₹|money|daily|per\\s+day|per\\s+month|upto|up\\s+to)|' +
  'by\\s+(?:liking|watching|rating|subscribing|reviewing)|liking\\s+(?:youtube\\s+)?videos|' +
  'रोज(?:ा|े)?\\s*(?:कमाई|पैसे)|घर\\s+बैठे)', 'gi');

/* HARD · instant-loan app funnel: approval bait + no-document promise + fee demand/APK. */
const RE_LOAN_APP = new RegExp(
   '(instant\\s+loan|pre-?approved\\s+loan|loan\\s+approved)' +
   '[\\s\\S]{0,120}?(no\\s+documents?|without\\s+documents?|zero\\s+documents?|processing\\s+(?:fee|charges)|\\.apk)', 'gi');

const RE_LOAN_APP2 = new RegExp(
   '\\bloan\\b[^.!?\\n]{0,40}\\bapproved\\b[\\s\\S]{0,120}?(no\\s+documents?|without\\s+documents?|zero\\s+documents?|\\.apk|\\bpay\\b[^.!?\\n]{0,30}processing\\s+(?:fee|charges))', 'gi');

/* HARD · remote-control apps — nobody legitimate ever asks this. */
const RE_REMOTE = new RegExp(
  '(anydesk|any\\s+desk|teamviewer|team\\s+viewer|quicksupport|quick\\s+support|rustdesk|' +
  'remotepc|supremo|gotoassist|screen\\s+sharing\\s+app|' +
  'remote\\s+(?:access|control|support)\\s+(?:app|software|application)|' +
  'रिमोट\\s+(?:एक्सेस|कंट्रोल|सपोर्ट))', 'i');

/* HARD · "safe account" / RBI-account money transfer (digital arrest). */
const RE_SAFE_ACCT = new RegExp(
  '(\\b(?:transfer|move|deposit|shift)\\b[^.!?\\n]{0,60}\\b(?:safe\\s+(?:account|keeping|locker)|rbi\\s+account|reserve\\s+bank)\\b' +
  '|\\b(?:transfer|move|deposit|shift|send)\\b[^.!?\\n]{0,45}\\b(?:money|funds|amount)\\b[^.!?\\n]{0,45}\\bsafe\\s+(?:account|locker)\\b' +
  '|सुरक्षित\\s+खाते?|सेफ\\s+खाते?)', 'i');

/* HARD · digital arrest = named authority + coercion. */
const RE_DA_AUTH = new RegExp(
  '(\\bcbi\\b|enforcement\\s+directorate|\\bed\\b|\\bed\\s+(?:officer|notice|office)|\\bpolice\\b|\\bcustoms\\b|narcotics|' +
  'cyber\\s+(?:cell|crime|police)|interpol|judicial|magistrate|digital\\s+arrest|\\brbi\\b|' +
  'नाबार्ड|nabard|पुलिस|कस्टम्स|साइबर\\s+पुलिस|नारकोटिक्स)', 'i');
const RE_DA_COERCE = new RegExp(
  '(video\\s?-?\\s?call|stay\\s+on\\s+(?:the\\s+)?call|do\\s+not\\s+(?:tell|disconnect|hang\\s?up)|' +
  'don\'?t\\s+(?:tell|disconnect|hang\\s?up)|safe\\s+(?:account|keeping)|transfer\\s+(?:money|funds)|' +
  'digital\\s+arrest|online\\s+(?:detention|arrest)|under\\s+arrest|under\\s+investigation|investigation|verification\\s+deposit|deposit\\s+required|' +
  'वीडियो\\s+कॉल|डिजिटल\\s+अरेस्ट|ऑनलाइन\\s+अरेस्ट|किसी\\s+को\\s+न\\s+बताएं|कॉल\\s+पर\\s+रुके)', 'i');

/* Courier/customs parcel fees are a common payment funnel. */
const RE_COURIER_FEE = new RegExp(
  '(?:(?:courier|parcel|shipment|customs)[^.!?\\n]{0,80}(?:fee|duty|charge|payment|pay|held|seized)|' +
  '(?:fee|duty|charge|payment|pay)[^.!?\\n]{0,80}(?:courier|parcel|shipment|customs))', 'i');

/* HARD · sextortion / blackmail: intimate media + payment demand.
   Bare "send" is deliberately NOT a demand — "send me your photos
   from the trip" from a friend must stay safe. */
const RE_SEX_MEDIA = new RegExp(
  '(private\\s+(?:video|clip|photo|pic|picture|camera)|' +
  'your\\s+(?:private\\s+)?(?:video|photos?|pics?|clips?)|nudes?|' +
  'nude\\s+(?:pics?|photos?|video|clips?)|compromising\\s+(?:video|photo|pic)|hidden\\s+camera|' +
  '(?:webcam|web\\s?cam)\\s+(?:recording|video|footage)|(?:recording|footage)\\s+of\\s+(?:you|your)|' +
  'निजी\\s+(?:वीडियो|तस्वीर|फोटो|क्लिप)|हमारे\\s+पास[^।.!?\\n]{0,40}(?:वीडियो|तस्वीरें|तस्वीर|फोटो))', 'i');

/* Genuine delivery hand-over: a courier/order is named and the OTP is given
   in person. A message that also carries a link or a phone number is not a
   hand-over — that stays a credential ask. */
const RE_ORDER_CONTEXT = new RegExp(
  '(order|parcel|shipment|package|consignment|awb|tracking|delhivery|bluedart|blue\\s+dart|' +
  'ekart|shiprocket|amazon|flipkart|myntra|swiggy|zomato|jiomart)', 'i');
const RE_HANDOVER_CONTEXT = new RegExp(
  '(delivery\\s+(?:agent|boy|person|executive|partner)|at\\s+the\\s+(?:door|door\\s?step)|' +
  'door\\s?step|in\\s+person|while\\s+(?:receiving|accepting)|upon\\s+delivery|at\\s+delivery)', 'i');
const RE_MOBILE_ANY = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/;

/* HARD · an upfront "fee to release money/benefit". The fee is the product;
   a genuine scheme never charges to release what it owes you. */
const RE_RELEASE_FEE = new RegExp(
  '(?:(?:verification|processing|release|clearance|activation|service|registration)\\s+(?:fee|charge|amount)|' +
  'pay\\s+(?:rs\\.?|₹|inr)\\s*[\\d,]+[^.!?\\n]{0,40}\\b(?:fee|charge)\\b)', 'i');
const RE_RELEASE_TARGET = new RegExp(
  '(release|instal?ment|subsidy|benefit|claim|refund|prize|amount|payment|policy)', 'i');
const RE_NO_FEE = new RegExp(
  '(no\\s+fee|never\\s+(?:ask|charge)|free\\s+of\\s+cost|without\\s+(?:any\\s+)?(?:fee|charge)|' +
  'koi\\s+(?:fees?|charge|paise)\\s+nahi|कोई\\s+(?:शुल्क|फीस)\\s+नहीं)', 'i');

/* HARD · loan approval + a processing/advance fee pushed to a private contact. */
const RE_LOAN_APPROVED = new RegExp('\\bloan\\b[^.!?\\n]{0,45}approv(?:e|ed|al)|approv(?:e|ed|al)[^.!?\\n]{0,20}\\bloan\\b', 'i');
const RE_LOAN_FEE = new RegExp(
  '(processing\\s+(?:fee|charge)|advance\\s+(?:fee|payment)|(?:pay|bhejo|transfer)[^.!?\\n]{0,30}(?:fee|charge|rs\\.?\\s*\\d|₹\\s*\\d))', 'i');

/* HARD · a payment link on a cheap TLD attached to a toll/tax/benefit brand. */
const RE_BENEFIT_BRAND = new RegExp(
  '(fastag|toll|challan|kyc|aadhaar|uidai|income\\s*tax|\\bitr\\b|refund|subsidy|instal?ment|' +
  'pension|kisan|ration|scholarship|benefit)', 'i');
const RE_PAY_DEMAND = new RegExp('(recharge|pay|payment|fee|charge|clearance|update|verify)', 'i');

/* HARD · parcel-contraband threat plus a payment demand. */
const RE_CONTRABAND = new RegExp(
  '(narcotics|drugs?|contraband|banned\\s+(?:item|substance|goods)|illegal\\s+(?:item|goods|substance)|heroin|cocaine|ganja)', 'i');
const RE_PARCEL = new RegExp('(parcel|package|shipment|courier|consignment|customs)', 'i');
const RE_SETTLE_DEMAND = new RegExp('(settlement|\\bpay\\b|fine|penalty)', 'i');
const RE_SEX_DEMAND = new RegExp(
  '(\\bpay\\b|\\bmoney\\b|\\brs\\.?\\b|₹|\\bupi\\b|bitcoin|\\btransfer\\b|\\bdeposit\\b|blackmail|' +
  'वरना|warna|पैसे|रुपये|देना\\s+होगा|सबको\\s+भेज)', 'i');

/* "Press 9 to speak to an officer" — classic call-back trick. */
const RE_PRESS = new RegExp('(press\\s*(?:\\d|one|two|nine|ek)\\b|दबाएं|दबाओ)', 'gi');

/* Contact-channel words + unsolicited mobile numbers (toll-free
   1800/1860 and short codes never match). */
const RE_CALL_WORD = /(\bcall\b|\bwhatsapp\b|whats\s?app|\bmsg\b|\bmessage\b|\bcontact\b|\breach\b|\bdial\b|कॉल|संपर्क)/g;
const RE_MOBILE = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g;

/* WhatsApp / Telegram contact-me links (t.me, wa.me, chat.whatsapp.com) */
const RE_CONTACT_LINK = /(?:^|[./])(?:wa\.me|t\.me|telegram\.me|chat\.whatsapp\.com|api\.whatsapp\.com)(?:[./]|$)/gi;

/* e-challan / चालान */
const RE_CHALLAN = /(challan|चालान)/i;

/* "bill pending", "payment due" pressure (soft, not a group). */
const RE_PENDING_PAY = /(\b(?:bill|payment|challan|emi)\b[^.!?\n]{0,20}\b(?:pending|due|overdue)\b)/gi;

/* OTP that was sent TO you (code near the word) — a genuine marker. */
const OTP_TO_YOU_RE = /(\b(?:otp|code|password)\b[^.!?\n]{0,25}\b\d{4,8}\b|\b\d{4,8}\b[^.!?\n]{0,25}\b(?:otp|code)\b)/i;

/* "Never share your OTP"-style reassurance — negates credential asks. */
const NEG_SHARE_RE = /(\b(?:never|no\s+one|nobody)\b[^.!?\n]{0,45}\b(?:otp|pin|cvv|kyc|password|ask|share)\b|\b(?:do\s+not|don'?t|dont)\s+(?:share|ask|call)\b|\b(?:otp|pin|kyc|aadhaar?)\b[^.!?\n]{0,30}\b(?:mat|nahi|kabhi)\b|कभी\s+नहीं|साझा\s+मत|मत\s+करें|न\s+करें)/i;
const NEG_BEFORE_RE = /\b(?:never|do\s+not|don'?t|dont|won'?t|not|mat|nahi|kabhi)\b|कभी|मत|नहीं|न\s+कर/i;
const NEG_BETWEEN_RE = /कभी|मत|नहीं|न\s+कर|न\s+दें|\b(?:mat|nahi|kabhi)\b/i;

/* Genuine-message markers */
const RE_DELIVERY = /(out\s+for\s+delivery|will\s+be\s+delivered|your\s+order|delivery\s+partner|order\s?#\d|track\s+your\s+(?:order|package)|\bshipped\b|arriving\s+(?:today|tomorrow)|आपका\s+ऑर्डर|डिलीवरी)/i;
const RE_NO_ACTION = /(no\s+action\s+(?:is\s+)?(?:required|needed)|ignore\s+(?:this|if|when)|automated\s+message|informational\s+message|do\s+not\s+reply)/i;

export function normalizeText(rawText) {
  let text = String(rawText || '').normalize('NFKC');
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  text = text.replace(/[०-९]/g, function (d) { return String(d.charCodeAt(0) - 0x0966); });
  text = text.replace(/(?:\b[A-Za-z]\b(?:[\s._\-*#@~!]+|[\u{1F300}-\u{1FAFF}])*){2,}[A-Za-z]\b/gu,
    function (match) { return match.replace(/[^A-Za-z]/gu, ''); });
  text = text.replace(/([A-Za-z])[\u{1F300}-\u{1FAFF}]+(?=[A-Za-z])/gu, '$1');
  return text.replace(/[ \t]+/g, ' ').trim();
}

/* These are only used with .test()/collectHits — keep them non-global so
   lastIndex can never leak between calls (order-dependent verdicts). */
const RE_UPI_PIN_NOUNFIRST = new RegExp(rules.regexes.upiPinNounFirst, 'i');
const RE_QR_COLLECT = new RegExp(rules.regexes.qrCollect, 'i');
const RE_PAID_TASK = new RegExp(rules.regexes.paidTask, 'i');
const RE_LIC_PAYMENT = new RegExp(rules.regexes.licPayment, 'i');
const RE_PUNYCODE_HOST = new RegExp(rules.regexes.punycodeHost, 'i');
const RE_OFFICIAL_REMINDER = new RegExp(rules.regexes.officialReminder, 'i');
const RE_REWARD_CALLBACK = new RegExp(rules.regexes.rewardCallback, 'i');

/* ── 4 · URL extraction & helpers ──────────────────────────────────── */
const TLD_SRC = '(?:com|in|net|org|xyz|top|click|info|io|app|gov|edu|tk|ml|ga|cf|gq|me|co|biz|live|shop|online|site|link|icu|sbs|cfd|rest|quest|ly|gy|to|cc|ms|gg|be|tv|sbi)';
const URL_RE = new RegExp(
  '(?:https?://|www\\.)[^\\s<>"\u0060]+|(?:[a-z0-9][\\w-]*\\.)+' + TLD_SRC + '(?![\\w-])(?:/[^\\s<>"\u0060]*)?', 'gi');

export function extractUrls(text) {
  const found = [];
  let m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null && found.length < 8) {
    if (m.index > 0 && text[m.index - 1] === '@') continue; /* email address */
    const url = m[0].replace(/[.,!?;:)\]]+$/, '');
    if (url.length > 4 && !found.includes(url)) found.push(url);
  }
  return found;
}
export function urlHost(url) {
  try {
    let h = url.toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0];
    const at = h.lastIndexOf('@');
    if (at > -1) h = h.slice(at + 1);
    h = h.split(':')[0];
    return h.replace(/^www\./, '') || h;
  } catch (e) { return ''; }
}
export function realDomainOf(host) {
  if (REAL_DOMAINS.includes(host)) return host;
  for (const d of REAL_DOMAINS) if (host.endsWith('.' + d)) return d;
  return null;
}
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/* Is `host` a fake of a real bank/service/government domain?
   Order: punycode → real-domain-embedded-as-subdomain → brand token
   (raw spelling) → brand token (homoglyph-normalised) → typosquat
   (1–2 letter misspelling). Never fires for official domains.       */
export function findLookalike(host) {
  if (realDomainOf(host)) return null;
  const labels = host.split('.');
  for (const l of labels) {
    if (l.indexOf('xn--') === 0) return { kind: 'punycode', real: null, brand: l };
  }
  /* real domain embedded inside a longer address: sbi.co.in.verify-kyc.top */
  for (const d of REAL_DOMAINS) {
    if (host.indexOf(d) > -1) return { kind: 'embedded', real: d, brand: d };
  }
  const passes = [null].concat(HOMOGLYPH_PASSES);
  for (const pass of passes) {
    for (const label of labels) {
      if (label.length < 3) continue;
      let form = label;
      if (pass) for (const pair of pass) form = form.split(pair[0]).join(pair[1]);
      const segs = form.split(/[^a-z0-9]+/).filter(Boolean);
      for (const bt of BRAND_TOKENS) {
        let hit = false;
        if (bt.mode === 'eq') hit = segs.indexOf(bt.tok) > -1;
        else if (bt.mode === 'seg') hit = segs.indexOf(bt.tok) > -1 || segs.some(function (s) { return s.indexOf(bt.tok) === 0; });
        else hit = segs.some(function (s) { return s.indexOf(bt.tok) > -1; });
        if (hit) return { kind: pass ? 'homoglyph' : 'lookalike', real: bt.real, brand: bt.tok };
      }
    }
  }
  /* 1–2 letter typosquat of a real domain: iciclbank.com, hdfcbnk.com */
  for (const label of labels) {
    if (label.length < 6 || label.length > 30 || /\d/.test(label)) continue;
    for (const d of REAL_DOMAINS) {
      const core = d.split('.').slice(0, -1).join('.');
      if (core.length >= 6 && levenshtein(label, core) <= 2) {
        return { kind: 'typo', real: d, brand: core };
      }
    }
  }
  return null;
}
function worstVerdict(a, b) {
  const order = { safe: 0, suspicious: 1, scam: 2 };
  return order[b] > order[a] ? b : a;
}

/* ── 5 · Link analysis (points feed the message score) ─────────────── */
export function analyzeLink(url) {
  const host = urlHost(url);
  const out = { url, host, verdict: 'safe', reason: null, lookalike_of: null, pts: 0 };
  if (!host || host.indexOf('.') === -1) return out;
  const real = realDomainOf(host);
  if (real) {
    out.pts = -20;
    out.reason = { en: 'The link points to the real official website ' + host + '.',
                   hi: 'लिंक असली आधिकारिक वेबसाइट ' + host + ' पर जाता है।' };
    return out;
  }
  const look = findLookalike(host);
  const tld = host.split('.').pop();
  const isIP = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const isShort = SHORTENERS.has(host);
  const hyphens = (host.match(/-/g) || []).length;

  if (isIP) {
    out.pts += 30; out.verdict = 'scam';
    out.reason = { en: 'The link is just a raw number address (IP) — real banks never send these.',
                   hi: 'लिंक सिर्फ एक नंबर-पता (IP) है — असली बैंक कभी ऐसा पता नहीं भेजते।' };
  } else if (look) {
    if (look.kind === 'punycode') {
      out.pts += 30; out.verdict = 'scam';
      out.reason = { en: 'The link uses foreign-character (punycode) tricks to imitate a real website.',
                     hi: 'लिंक विदेशी-अक्षर (punycode) की चाल से असली वेबसाइट की नकल करता है।' };
    } else if (look.kind === 'embedded') {
      out.pts += 38; out.verdict = 'scam'; out.lookalike_of = look.real;
      out.reason = { en: 'The real website “' + look.real + '” is hidden inside a longer fake address — only the ending counts.',
                     hi: 'असली वेबसाइट “' + look.real + '” लंबे फर्ज़ी पते के अंदर छिपी है — असली पहचान पते के अंतिम हिस्से से होती है।' };
    } else if (!look.real) {
      out.pts += 26; out.verdict = 'scam';
      out.reason = { en: 'The address puts an official body (“' + look.brand.toUpperCase() + '”) inside a website that is not its official site.',
                     hi: 'पते में आधिकारिक निकाय (“' + look.brand.toUpperCase() + '”) का नाम है, पर वह उसकी आधिकारिक साइट नहीं है।' };
    } else {
      out.pts += 38; out.verdict = 'scam'; out.lookalike_of = look.real;
      if (look.kind === 'homoglyph' || look.kind === 'typo') {
        out.reason = { en: '“' + host + '” uses look-alike letters to imitate the real website “' + look.real + '”.',
                       hi: '“' + host + '” एक जैसे दिखने वाले अक्षरों से असली वेबसाइट “' + look.real + '” की नकल है।' };
      } else {
        out.reason = { en: 'The link “' + host + '” is a fake copy of the real website “' + look.real + '”.',
                       hi: 'लिंक “' + host + '” असली वेबसाइट “' + look.real + '” की नकल है।' };
      }
    }
  }
  if (isShort) {
    out.pts += 24; out.verdict = worstVerdict(out.verdict, 'suspicious');
    if (!out.reason) out.reason = { en: 'The link is shortened (' + host + ') to hide where it really leads.',
      hi: 'लिंक छोटा किया गया है (' + host + ') ताकि असली पता छिप जाए।' };
  } else if (BAD_TLDS.has(tld)) {
    out.pts += 24; out.verdict = worstVerdict(out.verdict, 'suspicious');
    if (!out.reason) out.reason = { en: 'The link ends in “.' + tld + '” — a cheap domain type that scammers often use.',
      hi: 'लिंक का अंत “.' + tld + '” में है — ऐसे सस्ते डोमेन अक्सर ठग इस्तेमाल करते हैं।' };
  }
  if (hyphens >= 2) {
    out.pts += 14; out.verdict = worstVerdict(out.verdict, 'suspicious');
    if (!out.reason) out.reason = { en: 'The address has many hyphens (' + host + ') — a trick to look official.',
      hi: 'पते में कई हाइफन (-) हैं (' + host + ') — आधिकारिक दिखने की चाल है।' };
  }
  if (/^http:\/\//i.test(url)) out.pts += 8;
  if (!out.reason) {
    out.pts += 4;
    out.reason = { en: 'An ordinary website link. Nothing obviously wrong, but stay alert if the message felt scary.',
      hi: 'सामान्य वेबसाइट लिंक। कुछ भी गलत नहीं दिखता — संदेश डरावना लगे तो सावधान रहें।' };
  }
  return out;
}

/* ── 6 · Advice per verdict ────────────────────────────────────────── */
const ADVICE = {
  scam: [
    { text_en: 'Do not click the link or call any number in this message.',
      text_hi: 'इस संदेश का लिंक न खोलें और इसमें दिए नंबर पर कॉल न करें।' },
    { text_en: 'Never share OTP, PIN, CVV or KYC details — real banks never ask for them.',
      text_hi: 'OTP, PIN, CVV या KYC की जानकारी किसी को न दें — असली बैंक कभी नहीं मांगते।' },
    { text_en: 'Call your bank yourself on the number printed on your card or passbook.',
      text_hi: 'अपने कार्ड या पासबुक पर छपे नंबर पर खुद बैंक को कॉल करें।' },
    { text_en: 'Report it at cybercrime.gov.in or call 1930 (free, 24×7).',
      text_hi: 'cybercrime.gov.in पर रिपोर्ट करें या 1930 पर कॉल करें (मुफ़्त, 24×7)।' }
  ],
  suspicious: [
    { text_en: 'Do not act on the message yet — no clicks, no calls, no codes.',
      text_hi: 'अभी इस संदेश पर कोई कदम न उठाएँ — न लिंक, न कॉल, न कोई कोड।' },
    { text_en: 'Open your bank’s official app yourself, or call the number printed on your card.',
      text_hi: 'बैंक का आधिकारिक ऐप खुद खोलें, या कार्ड पर छपे नंबर पर कॉल करें।' },
    { text_en: 'If it turns out to be fake, report it at cybercrime.gov.in or call 1930.',
      text_hi: 'फर्ज़ी निकले तो cybercrime.gov.in पर रिपोर्ट करें या 1930 पर कॉल करें।' }
  ],
  safe: [
    { text_en: 'No action needed for this message.',
      text_hi: 'इस संदेश के लिए कुछ करने की ज़रूरत नहीं है।' },
    { text_en: 'Remember: banks and government offices never ask for OTP or PIN over calls or messages.',
      text_hi: 'याद रखें: बैंक या सरकारी दफ़्तर कभी कॉल या संदेश में OTP या PIN नहीं मांगते।' },
    { text_en: 'Share ScamShield with your family to keep them safe too.',
      text_hi: 'अपने परिवार को भी सुरक्षित रखने के लिए ScamShield उनके साथ साझा करें।' }
  ]
};

/* ── 7 · Small helpers ─────────────────────────────────────────────── */
function collectHits(re, text, cap) {
  re.lastIndex = 0;
  const hits = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (hits.indexOf(m[0]) === -1) hits.push(m[0]);
    if (hits.length >= (cap || 12)) break;
  }
  return hits;
}
function negatedBefore(text, idx, span) {
  const win = text.slice(Math.max(0, idx - (span || 55)), idx).toLowerCase();
  const clauseStart = Math.max(win.lastIndexOf('.'), win.lastIndexOf('!'), win.lastIndexOf('?'), win.lastIndexOf('\n'));
  const clause = win.slice(clauseStart + 1);
  if (/\b(?:now|then|but|however|instead)\b/.test(clause)) return false;
  return NEG_BEFORE_RE.test(clause);
}

/* ── 8 · Local rule-based detector (the offline brain) ─────────────── */
export function detectLocal(rawText) {
  const text = normalizeText(rawText).slice(0, 4000);
  const low = text.toLowerCase();
  let score = 0;
  let hard = false;                       /* any HARD category fired */
  let officialContext = false;
  const groups = new Set();               /* distinct signal groups */
  const riskReasons = [];                 /* {icon,text_en,text_hi,rank} */
  const safeReasons = [];
  const highlights = [];
  const links = [];

  const addRisk = function (rank: number, icon: string, en: string, hi: string, hl?: any[]) {
    riskReasons.push({ icon: icon, text_en: en, text_hi: hi, rank: rank });
    if (hl) for (let i = 0; i < hl.length; i++) if (hl[i]) highlights.push(String(hl[i]).slice(0, 60));
  };
  const addSafe = function (icon, en, hi) { safeReasons.push({ icon: icon, text_en: en, text_hi: hi }); };

  /* ---------- 1 · Links ---------- */
  const urls = extractUrls(text);
  let riskyLink = false;
  let sawRealDomain = false;
  for (let i = 0; i < urls.length; i++) {
    const la = analyzeLink(urls[i]);
    score += la.pts;
    links.push({
      url: la.url, verdict: la.verdict,
      reason: { en: la.reason.en, hi: la.reason.hi, text_en: la.reason.en, text_hi: la.reason.hi },
      lookalike_of: la.lookalike_of
    });
    if (la.verdict !== 'safe') {
      riskyLink = true;
      if (la.lookalike_of) {
        addRisk(0, 'link', la.reason.en, la.reason.hi, [la.host]);
      } else if (la.verdict === 'scam') {
        addRisk(0, 'link', la.reason.en, la.reason.hi, [la.host]);
      } else {
        addRisk(4, 'link', la.reason.en, la.reason.hi, [la.host]);
      }
    } else if (realDomainOf(la.host)) {
      sawRealDomain = true;
      addSafe('link', la.reason.en, la.reason.hi);
    }
  }
  if (riskyLink) groups.add('riskyLink');
  const punycodeLink = urls.some(function (url) {
    RE_PUNYCODE_HOST.lastIndex = 0;
    return RE_PUNYCODE_HOST.test(urlHost(url));
  });
  /* bare link with no message around it */
  if (urls.length && text.replace(/\s+/g, ' ').trim().length <= urls[0].length + 12) {
    score += 10;
    addRisk(12, 'link', 'The message is only a link, with no explanation — be careful.',
      'संदेश सिर्फ एक लिंक है, कोई और जानकारी नहीं — सावधान रहें।');
  }

  /* ---------- 2 · Credential requests (negation-aware) ---------- */
  let credFired = false, credNegated = false;
  let m;
  /* "Share the OTP with the delivery agent at the doorstep" is a hand-over,
     not a request to send a secret anywhere. Links and numbers cancel it. */
  const deliveryHandover = RE_ORDER_CONTEXT.test(text) && RE_HANDOVER_CONTEXT.test(text)
    && urls.length === 0 && !RE_MOBILE_ANY.test(text);
  RE_CRED_HARD.lastIndex = 0;
  while ((m = RE_CRED_HARD.exec(text)) !== null) {
    if (deliveryHandover) continue;
    if (negatedBefore(text, m.index, 55)) { credNegated = true; continue; }
    /* "Enter this OTP in the app" next to a delivered code = instruction
       to yourself, not a scammer asking — skip when the verb is a
       self-action AND an OTP-to-you pattern is present. */
    const verb = (m[1] || '').toLowerCase();
    if (/^(enter|type|confirm)$/.test(verb.trim()) && OTP_TO_YOU_RE.test(text)) continue;
    hard = true; credFired = true;
    highlights.push(String(m[0]).slice(0, 40));
  }
  RE_CRED_HARD_HI.lastIndex = 0;
  while ((m = RE_CRED_HARD_HI.exec(text)) !== null) {
    if (deliveryHandover) continue;
    /* Hindi negation may FOLLOW the verb ("OTP साझा न करें") — check both
       the matched span and a short window after it. */
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 14);
    if (NEG_BETWEEN_RE.test(m[0]) || /न\s*(?:करें|करना|देना|बताना|भेजना)|मत|नहीं|कभी/.test(after)) {
      credNegated = true; continue;
    }
    hard = true; credFired = true;
    highlights.push(String(m[0]).slice(0, 40));
  }
  RE_UPI_PIN_NOUNFIRST.lastIndex = 0;
  if (RE_UPI_PIN_NOUNFIRST.test(text)) {
    hard = true;
    score += 30; groups.add('credential');
    addRisk(0, 'key', 'It asks for a UPI PIN in a payment/refund conversation — real apps receive PINs only inside the official app.',
      'यह भुगतान/रिफंड बातचीत में UPI PIN मांगता है — असली ऐप में PIN सिर्फ़ आधिकारिक ऐप के अंदर डाला जाता है।');
  }
  RE_URG.lastIndex = 0;
  if (!credFired && /\b(?:kyc|aadhaar|aadhar)\b/i.test(text) && /\botp\b/i.test(text) && RE_URG.test(text)) {
    hard = true;
    score += 30; groups.add('credential');
    addRisk(0, 'key', 'The urgent KYC message and OTP request are combined even though the wording was obfuscated.',
      'जल्दबाजी वाली KYC बात और OTP अनुरोध आपस में जुड़े हैं, भले शब्द असामान्य रूप से लिखे हों।');
  }
  if (credFired) {
    score += 30; groups.add('credential');
    addRisk(0, 'key', 'It asks you to share an OTP, PIN, CVV or UPI PIN — no real bank, app or government office will ever ask for these.',
      'यह आपसे OTP, PIN, CVV या UPI PIN मांगता है — कोई असली बैंक, ऐप या सरकारी दफ़्तर कभी नहीं मांगते।');
  } else {
    const softHits = collectHits(RE_CRED_SOFT, text, 3);
    const nfHits = collectHits(RE_CRED_NOUNFIRST, text, 3);
    const exHits = collectHits(RE_CRED_EXPIRE, text, 3);
    const updHits = collectHits(RE_CRED_UPDATE, text, 3);
    if (softHits.length) {
      score += 20; credFired = true;
      addRisk(1, 'key', 'It asks for KYC, Aadhaar, password or card/bank details — a classic phishing hook.',
        'यह KYC, आधार, पासवर्ड या कार्ड/बैंक की जानकारी मांगता है — फ़िशिंग की सबसे आम चाल।',
        softHits.slice(0, 2));
    }
    if (nfHits.length) {
      score += 20; credFired = true;
      addRisk(1, 'key', 'It pushes a “KYC/Aadhaar update” — banks never run KYC updates through message links.',
        'यह “KYC/आधार अपडेट” की बात करता है — बैंक कभी संदेश-लिंक से KYC अपडेट नहीं करवाते।',
        nfHits.slice(0, 2));
    }
    if (exHits.length && !credFired) {
      score += 20; credFired = true;
      addRisk(1, 'key', 'It says your OTP/KYC/Aadhaar has “expired” or is “pending” and pushes you to act — a standard phishing opener.',
        'यह कहता है कि आपका OTP/KYC/आधार “समाप्त” या “बाकी” है और जल्दी करने को दबाव बनाता है — फ़िशिंग की आम शुरुआत।',
        exHits.slice(0, 2));
    }
    if (updHits.length && !credFired) {
      score += 12; credFired = true;
      addRisk(1, 'key', 'It pushes you to “update/verify your details, payment or bill” through it — never do that from a message.',
        'यह आपको उसी संदेश से “जानकारी/भुगतान अपडेट या सत्यापित” करने पर मजबूर करता है — संदेश से ऐसा कभी न करें।',
        updHits.slice(0, 2));
    }
  }
  if (credFired) groups.add('credential');
  if (credNegated) {
    addSafe('key', 'It clearly tells you NOT to share the OTP or PIN — something only genuine senders say.',
      'इसमें साफ़ कहा गया है कि OTP/PIN किसी से साझा न करें — यह असली भेजने वाले ही कहते हैं।');
  }

  /* ---------- 3 · Impersonation ----------
     Brand names are matched on the message PROSE only — a brand inside
     a URL host is the link engine's job (official hosts must not raise
     an impersonation flag against themselves, e.g. onlinesbi.sbi). */
  let textNoLinks = text;
  for (let i = 0; i < urls.length; i++) textNoLinks = textNoLinks.split(urls[i]).join(' ');
  const lowNoLinks = textNoLinks.toLowerCase();
  const govHit = collectHits(RE_GOV_IMP, lowNoLinks, 1)[0];
  const consumerHit = collectHits(RE_CONSUMER_IMP, lowNoLinks, 1)[0];
  if (govHit) {
    score += 12; groups.add('impersonation');
    addRisk(3, 'bank', 'It speaks in the name of a bank or government body (“' + govHit.toUpperCase() + '”) — scammers hide behind big names.',
      'यह किसी बैंक या सरकारी विभाग (“' + govHit.toUpperCase() + '”) के नाम से आया है — ठग बड़े नाम के पीछे छिपते हैं।',
      [govHit]);
  } else if (consumerHit) {
    score += 6; groups.add('impersonation'); /* silent unless other risks */
  }

  /* ---------- 4 · Threats ---------- */
  const threatHits = collectHits(RE_THREAT, text, 6);
  const threatFired = threatHits.length > 0;
  if (threatFired) {
    score += Math.min(25, 16 + 3 * (threatHits.length - 1));
    groups.add('threat');
    addRisk(2, 'siren', 'It threatens you with arrest, legal action, seizure or SIM blocking — real authorities never warn like this over SMS.',
      'इसमें गिरफ़्तारी, कानूनी कार्रवाई, ज़ब्ती या SIM बंद करने की धमकी है — असली सरकारी अधिकारी कभी SMS में ऐसी चेतावनी नहीं देते।',
      threatHits.slice(0, 3));
  }

  /* ---------- 5 · Urgency / panic ---------- */
  const urgHits = collectHits(RE_URG, text, 6);
  const urgFired = urgHits.length > 0;
  if (urgFired) {
    score += Math.min(17, 9 + 2 * (urgHits.length - 1));
    groups.add('urgency');
    addRisk(5, 'clock', 'It creates panic with words like “' + urgHits.slice(0, 2).join('”, “') + '” so you act without thinking.',
      'यह “' + urgHits.slice(0, 2).join('”, “') + '” जैसे शब्दों से घबराहट पैदा करता है ताकि आप बिना सोचे-समझे कोई कदम उठाएँ।',
      urgHits.slice(0, 3));
  }

  /* ---------- 6 · Callback numbers & mobiles ---------- */
  const pressHits = collectHits(RE_PRESS, text, 2);
  const callHits = collectHits(RE_CALL_WORD, low, 2);
  const mobileHits = collectHits(RE_MOBILE, text, 3);
  const hasMobile = mobileHits.length > 0;
  let contactLink = false;
  for (let i = 0; i < urls.length; i++) {
    if (RE_CONTACT_LINK.test(urlHost(urls[i]))) { contactLink = true; break; }
    RE_CONTACT_LINK.lastIndex = 0;
  }
  const callbackFired = pressHits.length > 0 || ((callHits.length > 0 || contactLink) && hasMobile);
  if (pressHits.length) {
    score += 10; groups.add('callback');
    addRisk(9, 'phone', 'It tells you to press a key to “speak to an officer” — a classic call-back scam trick.',
      'यह किसी बटन दबाकर “अफ़सर से बात” करने को कहता है — कॉल-बैक घोटाले की पुरानी चाल।',
      pressHits.slice(0, 2));
  } else if (callbackFired) {
    score += 10; groups.add('callback');
    addRisk(9, 'phone', 'It pushes you to call or message an unknown number — real notices come through official channels, not private numbers.',
      'यह आपसे किसी अनजान नंबर पर कॉल या मैसेज कराना चाहता है — असली सूचनाएँ आधिकारिक रास्ते से आती हैं, निजी नंबरों से नहीं।',
      mobileHits.slice(0, 2));
  } else if (contactLink) {
    score += 10; groups.add('callback');
    addRisk(9, 'phone', 'It moves the chat to WhatsApp or Telegram — the favourite corner of scam gangs.',
      'यह बातचीत को WhatsApp या Telegram पर ले जाता है — ठगों का पसंदीदा ठिकाना।');
  }
  if (hasMobile) {
    score += 6; /* unsolicited personal mobile number in the text */
    highlights.push(mobileHits[0]);
  }

  /* ---------- 7 · Reward bait ---------- */
  const rewardHits = collectHits(RE_REWARD, text, 3);
  const rewardFired = rewardHits.length > 0;
  if (rewardFired) {
    score += 14; groups.add('reward');
    if (riskyLink || callbackFired || hasMobile) score += 8;
    addRisk(6, 'gift', 'It offers a prize or reward that is too good to be true — because it is.',
      'यह ऐसा इनाम या लॉटरी का लालच देता है जो सच हो ही नहीं सकता।',
      rewardHits.slice(0, 2));
    if (callbackFired || hasMobile) {
      hard = true; score += 30; groups.add('rewardCallback');
      addRisk(0, 'phone', 'A prize or reward is combined with a private call/message number — that is a common prize-scam funnel.',
        'इनाम या लॉटरी के साथ निजी कॉल/मैसेज नंबर दिया गया है — यह इनाम-घोटाले का आम तरीका है।');
    }
  }

  /* ---------- 8 · Job / task bait ---------- */
  const jobHits = collectHits(RE_JOB, text, 3);
  const jobFired = jobHits.length > 0;
  if (jobFired) {
    score += 22; groups.add('job');
    addRisk(7, 'gift', 'It offers easy money — a part-time “liking videos” / “typing work” job. This is how task scams begin.',
      'यह आसान पैसे का लालच देता है — “वीडियो लाइक करने” / “टाइपिंग वर्क” वाली पार्ट-टाइम नौकरी। टास्क-घोटाला यहीं से शुरू होता है।',
      jobHits.slice(0, 2));
  }
  RE_PAID_TASK.lastIndex = 0;
  if (RE_PAID_TASK.test(text) && (hasMobile || contactLink)) {
    hard = true; score += 30; groups.add('paidTask');
    addRisk(0, 'phone', 'It demands a registration fee or deposit for a task or job and moves you to a private contact — that is a task-scam funnel.',
      'यह टास्क या नौकरी के नाम पर रजिस्ट्रेशन फीस/डिपॉज़िट मांगकर निजी संपर्क पर ले जाता है — यह टास्क-स्कैम का रास्ता है।');
  }

  /* ---------- 9 · HARD scam categories ---------- */
  if (punycodeLink) {
    hard = true; score += 30; groups.add('punycode');
    addRisk(0, 'link', 'This link uses punycode or foreign-character tricks and should not be opened.',
      'यह लिंक punycode या विदेशी-अक्षर चाल का उपयोग करता है और इसे नहीं खोलना चाहिए।');
  }
  RE_LIC_PAYMENT.lastIndex = 0;
  if (RE_LIC_PAYMENT.test(low) && riskyLink) {
    hard = true; score += 30; groups.add('licPayment');
    addRisk(0, 'link', 'A lapsed insurer policy is being used to push payment through an unofficial link — treat it as a scam.',
      'बीमा पॉलिसी खत्म होने के बहाने गैर-आधिकारिक लिंक से भुगतान माँगा जा रहा है — इसे घोटाला मानें।');
  }
  RE_REWARD_CALLBACK.lastIndex = 0;
  if (RE_REWARD_CALLBACK.test(text) && (callbackFired || hasMobile)) {
    hard = true; score += 30; groups.add('rewardCallback');
    addRisk(0, 'phone', 'A prize claim is being combined with a private callback number — that is a common prize-scam funnel.',
      'इनाम पाने के साथ निजी कॉल नंबर दिया गया है — यह इनाम-घोटाले का आम तरीका है।');
  }
  /* 9a · remote-control app */
  if (RE_REMOTE.test(low)) {
    hard = true; score += 30; groups.add('remote');
    addRisk(0, 'monitor', 'It asks you to install a remote-control app (AnyDesk, TeamViewer, QuickSupport…) — that hands your entire phone to a stranger. No real bank or officer ever asks this.',
      'यह आपसे रिमोट-कंट्रोल ऐप (AnyDesk, TeamViewer, QuickSupport…) इंस्टॉल करने को कहता है — इससे आपका पूरा फ़ोन किसी अजनबी के हाथ चला जाता है। कोई असली बैंक या अफ़सर कभी ऐसा नहीं कहता।');
  }
  /* 9a-extra · courier/customs fee funnel */
  RE_COURIER_FEE.lastIndex = 0;
  if (RE_COURIER_FEE.test(low) && (riskyLink || callbackFired)) {
    hard = true; score += 30; groups.add('courierFee');
    addRisk(0, 'link', 'It asks for a customs or courier fee through an unofficial payment link or callback — legitimate deliveries do not use a separate fee funnel.',
      'यह गैर-आधिकारिक भुगतान लिंक या कॉल के जरिए कूरियर/कस्टम्स शुल्क माँगता है — असली डिलीवरी अलग से इस तरह शुल्क नहीं माँगती।');
  }
  /* 9b · instant-loan APK/fee funnel */
  RE_LOAN_APP.lastIndex = 0; RE_LOAN_APP2.lastIndex = 0;
  if (RE_LOAN_APP.test(low) || RE_LOAN_APP2.test(low)) {
    hard = true; score += 30; groups.add('loanApp');
    addRisk(0, 'siren', 'It promises instant approval with no documents, then pushes an APK or demands a processing fee. Real lenders do not collect fees this way.',
      'यह बिना दस्तावेज़ तुरंत लोन मंज़ूर होने का वादा करके APK या प्रोसेसिंग फीस माँगता है। असली लोनदाता ऐसे शुल्क नहीं लेते।');
  }
  /* 9b · "safe account" transfer */
  if (RE_SAFE_ACCT.test(low)) {
    hard = true; score += 30; groups.add('safeAccount');
    addRisk(0, 'siren', 'It wants you to move money to a “safe account” or RBI account — the signature trick of the “digital arrest” scam. No real authority ever parks your money like this.',
      'यह आपसे पैसे “सेफ खाते” या RBI खाते में डालने को कहता है — “डिजिटल अरेस्ट” घोटाले की पहचान यही है। कोई भी असली अधिकारी ऐसा कभी नहीं करता।');
  }
  /* 9c · digital arrest: authority + coercion */
  if (RE_DA_AUTH.test(low) && RE_DA_COERCE.test(low)) {
    hard = true; score += 30; groups.add('digitalArrest');
    addRisk(0, 'siren', 'This has the fingerprints of a “digital arrest” scam: a fake officer, a video call, secrecy and pressure. Police and agencies never work like this.',
      'इसमें “डिजिटल अरेस्ट” घोटाले के सारे निशान हैं: नकली अफ़सर, वीडियो कॉल, गोपनीयता और दबाव। पुलिस या कोई भी एजेंसी कभी ऐसे काम नहीं करती।');
  }
  /* 9d · sextortion / blackmail */
  if ((RE_SEX_MEDIA.test(low) && RE_SEX_DEMAND.test(low)) ||
      (/(?:private|nude|compromising)[^.!?\n]{0,30}(?:video|photo|pic|picture)/i.test(low) &&
       /\b(?:pay|money|upi|rs\.?|₹|bitcoin|transfer|deposit)\b/i.test(low))) {
    hard = true; score += 30; groups.add('sextortion');
    addRisk(0, 'chat', 'This is blackmail: it claims to have a private video or photos and demands money. Do not pay, do not reply — report it to the police or at cybercrime.gov.in.',
      'यह ब्लैकमेल है: निजी वीडियो या फोटो होने का दावा करके पैसे मांगे जा रहे हैं। न भुगतान करें, न जवाब दें — पुलिस या cybercrime.gov.in पर रिपोर्ट करें।');
  }
  /* 9e · task-scam funnel: job bait + private contact number */
  if (jobFired && hasMobile) {
    hard = true; score += 30; groups.add('funnel');
    addRisk(0, 'phone', 'It funnels you to a personal WhatsApp/Telegram number — exactly how “task scam” gangs recruit victims.',
      'यह आपको किसी निजी WhatsApp/Telegram नंबर तक ले जाता है — “टास्क स्कैम” गैंग शिकार यहीं से करते हैं।',
      mobileHits.slice(0, 1));
  }
  /* 9f · prize bait + documents/fee to "claim" */
  if (rewardFired && /(\b(?:send|share|upload|submit|pay|bhejo|bhej)\b[^.!?\n]{0,45}\b(?:aadhaar|aadhar|adhar|bank\s+details?|documents?|id\s+proof|fee|registration|processing)\b|(?:भेजें|साझा)[^.!?\n]{0,45}(?:आधार|कागज़ात|बैंक\s+विवरण))/i.test(low)) {
    hard = true; score += 30; groups.add('lotteryDocs');
    addRisk(0, 'key', 'A prize you never entered, asking for Aadhaar, bank details or a “fee” to claim it — that is the trap.',
      'जिस इनाम में आपने हिस्सा ही नहीं लिया, उसे पाने के लिए आधार, बैंक विवरण या “फ़ीस” मांगी जा रही है — यही जाल है।');
  }
  /* 9g · pay a fee to “release” money or a benefit */
  if (!RE_NO_FEE.test(low) && RE_RELEASE_FEE.test(low) && RE_RELEASE_TARGET.test(low)) {
    hard = true; score += 30; groups.add('releaseFee');
    addRisk(0, 'key', 'Money or a benefit is being held back until you pay a “verification”, “processing” or “release” fee. Nothing legitimate releases your own money that way.',
      'आपका पैसा या लाभ “वेरिफिकेशन”, “प्रोसेसिंग” या “रिलीज़” फीस देने तक रोका जा रहा है। कोई भी असली संस्था आपका पैसा इस तरह नहीं रोकती।');
  }
  /* 9h · approved loan + processing/advance fee via private contact */
  if (RE_LOAN_APPROVED.test(low) && RE_LOAN_FEE.test(low) && (hasMobile || contactLink)) {
    hard = true; score += 30; groups.add('loanFee');
    addRisk(0, 'phone', 'A “approved” loan that first asks for a processing or advance fee through a private number is an advance-fee loan scam. Real lenders deduct fees from the disbursal.',
      '“मंज़ूर” लोन पहले निजी नंबर पर प्रोसेसिंग या एडवांस फीस मांगता है — यह एडवांस-फीस लोन घोटाला है। असली लोनदाता फीस वितरण में से काटते हैं।');
  }
  /* 9i · toll/tax/benefit brand + payment on a cheap TLD */
  if (riskyLink && RE_BENEFIT_BRAND.test(low) && RE_PAY_DEMAND.test(low)) {
    hard = true; score += 30; groups.add('benefitLink');
    addRisk(0, 'link', 'A toll, tax or benefit message is pushing payment through a link on a cheap throwaway domain. The official service never collects money there.',
      'टोल, टैक्स या लाभ की बात कहकर सस्ते थ्रोअवे डोमेन के लिंक से भुगतान माँगा जा रहा है। असली सेवा वहाँ पैसा नहीं लेती।');
  }
  /* 9j · parcel-contraband threat + payment demand */
  if (RE_CONTRABAND.test(low) && RE_PARCEL.test(low) && RE_SETTLE_DEMAND.test(low)) {
    hard = true; score += 30; groups.add('contraband');
    addRisk(0, 'siren', 'It claims your parcel holds narcotics or illegal goods and asks for a “settlement”. Customs and police never settle a case over a message.',
      'यह दावा करता है कि आपके पार्सल में नारकोटिक्स या अवैध सामान है और “सेटलमेंट” माँगता है। कस्टम्स और पुलिस कभी संदेश से केस नहीं निपटाते।');
  }
  if (rewardFired && contactLink) {
    hard = true; score += 30; groups.add('rewardContact');
    addRisk(0, 'phone', 'A free reward or subscription is being pushed through a private Telegram or WhatsApp link — that is a common bait-and-payment funnel.',
      'मुफ़्त इनाम या सब्सक्रिप्शन को निजी Telegram/WhatsApp लिंक पर ले जाया जा रहा है — यह लालच और भुगतान की आम चाल है।');
  }

  /* 9g · a KYC/OTP/details conversation pushed to WhatsApp or Telegram —
     real banks and government offices never verify customers there. */
  if (credFired && contactLink) {
    hard = true; score += 30; groups.add('credContact');
    addRisk(0, 'phone', 'It moves a KYC/OTP/details conversation to WhatsApp or Telegram — real banks and government offices never verify you there.',
      'यह KYC/OTP/जानकारी की बातचीत को WhatsApp या Telegram पर ले जाता है — असली बैंक या सरकारी दफ़्तर कभी वहीं सत्यापन नहीं करते।');
  }

  /* ---------- 10 · UPI refund / collect-request trick ---------- */
  const hasRefundWord = /\b(?:refund|रिफंड)\b/i.test(low);
  const hasPinAsk = credFired || /\bupi\s*pin\b|\benter\s+your\s+pin\b|pin\s+डाल/i.test(low);
  RE_QR_COLLECT.lastIndex = 0;
  const hasCollect = RE_QR_COLLECT.test(low) || /\bcollect\s+(?:request|money)\b|scan\s+(?:the\s+|this\s+)?(?:qr|code)\s+(?:to\s+)?(?:receive|get)|कलेक्ट\s+रिक्वेस्ट/i.test(low);
  if ((hasRefundWord && (hasPinAsk || hasCollect)) || hasCollect) {
    score += 18; groups.add('upiTrick');
    if (hasCollect && !credFired) { hard = true; score += 30; groups.add('collectRequest'); }
    addRisk(1, 'key', 'It offers a “refund” that needs your UPI PIN, a QR scan or a collect request — money coming IN never needs a PIN.',
      'यह “रिफंड” देने के बहाने UPI PIN, QR स्कैन या कलेक्ट रिक्वेस्ट मांगता है — पैसे आने के लिए PIN कभी नहीं चाहिए।');
  }

  /* ---------- 11 · e-challan ---------- */
  const challanFired = RE_CHALLAN.test(low);
  RE_CHALLAN.lastIndex = 0;
  if (challanFired) {
    if (riskyLink || callbackFired) {
      score += 24; groups.add('challan');
      addRisk(0, 'link', 'A traffic e-challan that avoids the official government portal — real challans are only paid at echallan.parivahan.gov.in.',
        'ट्रैफ़िक ई-चालान जो आधिकारिक सरकारी पोर्टल से हटकर भुगतान मांगे — असली चालान सिर्फ़ echallan.parivahan.gov.in पर भरा जाता है।');
    } else if (sawRealDomain && !riskyLink) {
      addSafe('checkCircle', 'This is a genuine government challan notice pointing to the official parivahan website.',
        'यह सरकारी चालान की असली सूचना है जो आधिकारिक parivahan वेबसाइट पर ले जाती है।');
    }
  }

  /* ---------- 12 · Pending-payment pressure (soft, no group) ---------- */
  const pendHits = collectHits(RE_PENDING_PAY, text, 2);
  if (pendHits.length) {
    score += 10;
    addRisk(11, 'clock', 'It builds pressure over a “pending/due” bill or challan — pay only inside the official app or website.',
      'यह “बाकी/due” बिल या चालान का दबाव बनाता है — भुगतान सिर्फ़ आधिकारिक ऐप या वेबसाइट से करें।',
      pendHits.slice(0, 1));
  }

  /* ---------- 13 · Panic + private-number combo ---------- */
  if ((urgFired || threatFired) && (callbackFired || hasMobile)) {
    score += 15;
    addRisk(10, 'phone', 'First it creates panic, then it gives you a personal number to call — that combination is the scammer’s script.',
      'पहले घबराहट पैदा करता है, फिर कॉल के लिए निजी नंबर देता है — ठग की कहानी इसी क्रम में चलती है।');
  }

  /* ---------- 14 · SHOUTING ---------- */
  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).filter(function (w) { return !CAPS_OK.has(w); });
  const bangs = (text.match(/!/g) || []).length;
  if (capsWords.length >= 3 || bangs >= 3) {
    score += 6;
    addRisk(11, 'type', 'SHOUTING in CAPITAL LETTERS and warnings to create panic.',
      'पूरे CAPITALS में लिखकर घबराहट पैदा करने की कोशिश की गई है।', capsWords.slice(0, 4));
  }

  /* ---------- 15 · Genuine-message markers (negative weight) ---------- */
  if (NEG_SHARE_RE.test(low)) {
    score -= 12;
    addSafe('checkCircle', 'It clearly reminds you to keep your OTP/PIN private — a sign of a genuine message.',
      'यह याद दिलाता है कि OTP/PIN निजी रखें — असली संदेश की निशानी।');
  }
  if (RE_DELIVERY.test(low)) {
    score -= 8;
    addSafe('checkCircle', 'This is a routine delivery update about your own order.',
      'यह आपके ही ऑर्डर की आम डिलीवरी सूचना है।');
  }
  if (RE_NO_ACTION.test(low)) {
    score -= 8;
    addSafe('checkCircle', 'It explicitly says no action or no reply is needed — scam messages never do that.',
      'इसमें साफ़ कहा गया है कि कुछ करने या जवाब देने की ज़रूरत नहीं — घोटाले वाले संदेश ऐसा कभी नहीं कहते।');
  }
  if (!credFired && OTP_TO_YOU_RE.test(text)) {
    addSafe('key', 'This looks like a routine OTP or code sent TO you — nobody is asking you for one.',
      'यह आपको भेजा गया आम OTP या कोड लगता है — कोई आपसे मांग नहीं रहा।');
  }
  if (!hard) {
    RE_OFFICIAL_REMINDER.lastIndex = 0;
    if (sawRealDomain || RE_OFFICIAL_REMINDER.test(low)) {
      score -= 25;
      officialContext = true;
      addSafe('checkCircle', 'It has official-domain or genuine-reminder context and does not contain an unsafe hard signal.',
        'इसमें आधिकारिक डोमेन या असली-संदेश का संदर्भ है और कोई सीधे खतरनाक हार्ड संकेत नहीं है।');
    }
  }

  /* ---------- 16 · Combination logic & floors ---------- */
  /* ≥2 distinct groups  → +8   and score floored at 30 (suspicious)
     ≥3 distinct groups  → +14  (instead of +8)
     any HARD category   → score floored at 70 (scam)                */
  if (!officialContext && groups.size >= 2) score += groups.size >= 3 ? 14 : 8;
  if (!officialContext && groups.size >= 2) score = Math.max(score, 30);
  if (hard) score = Math.max(score, 70);
  score = Math.max(3, Math.min(100, Math.round(score)));

  /* ---------- 17 · Verdict + reasons ---------- */
  const verdict = score > 65 ? 'scam' : score >= 30 ? 'suspicious' : 'safe';
  let reasons;
  if (verdict === 'safe') {
    if (safeReasons.length === 0) {
      addSafe('checkCircle', 'No requests for money, OTP or personal details.', 'पैसे, OTP या निजी जानकारी की कोई मांग नहीं है।');
    }
    if (safeReasons.length === 1) {
      addSafe('checkCircle', 'No threatening or panic-creating language.', 'न धमकी है, न घबराहट पैदा करने वाली भाषा।');
    }
    if (safeReasons.length === 2) {
      addSafe('checkCircle', 'Nothing here pressures you to act quickly.', 'इसमें कहीं भी जल्दी करने का दबाव नहीं है।');
    }
    reasons = safeReasons.slice(0, 4);
  } else {
    if (!govHit && consumerHit && riskReasons.length) {
      addRisk(8, 'bank', 'It references “' + consumerHit.toUpperCase() + '” — scammers often imitate well-known companies.',
        'इसमें “' + consumerHit.toUpperCase() + '” का नाम है — ठग अक्सर मशहूर कंपनियों का नाटक करते हैं।');
    }
    riskReasons.sort(function (a, b) { return a.rank - b.rank; });
    reasons = riskReasons.slice(0, verdict === 'scam' ? 5 : 4);
    if (!reasons.length) {
      addRisk(5, 'alertTri', 'Something about this message felt off — treat it with caution.',
        'इस संदेश में कुछ गड़बड़ लगी — सावधानी से पेश आएँ।');
      reasons = riskReasons.slice(0, 3);
    }
  }

  /* ---------- 18 · Highlights (dedupe, sane lengths) ---------- */
  const seen = new Set();
  const hl = highlights
    .map(function (h) { return String(h).trim(); })
    .filter(function (h) { return h.length >= 3 && h.length <= 60 && !/[<>&"]/.test(h); })
    .filter(function (h) { const k = h.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 10);

  return { verdict: verdict, score: score, reasons: reasons, links: links, advice: ADVICE[verdict], highlights: hl };
}

/* ── 9 · Single entry point — API first, offline fallback always ───── */
export async function analyze(input) {
  const text = String(input || '').slice(0, 4000);
  const API_BASE = ((import.meta as any).env?.VITE_API_BASE || '');
  if (API_BASE) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(String(API_BASE).replace(/\/$/, '') + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || !['safe', 'suspicious', 'scam'].includes(data.verdict) ||
          typeof data.score !== 'number' || !Array.isArray(data.reasons)) {
        throw new Error('Unexpected response shape');
      }
      return {
        verdict: data.verdict,
        score: Math.max(0, Math.min(100, Math.round(data.score))),
        reasons: data.reasons.slice(0, 5),
        links: Array.isArray(data.links) ? data.links : [],
        advice: Array.isArray(data.advice) ? data.advice : ADVICE[data.verdict],
        highlights: Array.isArray(data.highlights) ? data.highlights : []
      };
    } catch (err) {
      console.warn('[ScamShield] API unavailable, using offline detector:', err.message);
    }
  }
  await sleep(1000); /* demo scanning delay for the local detector */
  return detectLocal(text);
}



const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

