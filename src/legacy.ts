import { analyze as analyzeShared } from './detection/analyze';

"use strict";
/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */
const APP_NAME = 'ScamShield';
const APP_VERSION = '1.0';
const STORAGE_KEY = 'scamshield.v1';
/* Set to your backend origin (e.g. "https://api.example.com") to send
   checks to a real server. Empty = fully offline, local rules only.
   Expected response shape — see analyze() in the DETECTION section. */
const API_BASE = ((import.meta as any).env?.VITE_API_BASE || "");
const TABS = ['check', 'history', 'protect', 'settings'];

/* Realistic example messages (3 scams, 2 genuine). */
const EXAMPLES = [
  { label: { en: 'Fake SBI KYC scam', hi: 'फर्ज़ी SBI KYC घोटाला' },
    text: 'Dear Customer, your SBI NetBanking has been BLOCKED because your KYC has expired. Update your KYC immediately to avoid permanent account closure: http://sbi-kyc-update.xyz/verify — State Bank of India (no reply)' },
  { label: { en: 'Electricity cut-off scam', hi: 'बिजली कटौती घोटाला' },
    text: 'ELECTRICITY BOARD: Your electricity connection will be DISCONNECTED tonight at 9:30 PM due to unpaid bill. Update your payment now: https://bill-update-desk.top/pay or call 9312345678 — Electricity Dept' },
  { label: { en: 'Customs "digital arrest" scam', hi: 'कस्टम्स "डिजिटल अरेस्ट" घोटाला' },
    text: 'CUSTOMS ALERT: A parcel booked in your name containing illegal items has been SEIZED by Mumbai Customs. A case will be filed. To avoid ARREST and legal action, call the investigating officer immediately: +91 99871 20458, or verify at customs-clearance-info.click' },
  { label: { en: 'Real bank OTP', hi: 'असली बैंक OTP' },
    text: 'Your One Time Password (OTP) for HDFC Bank NetBanking login is 582914. OTP is valid for 10 minutes. HDFC Bank will NEVER ask you to share this OTP with anyone. Do not share it. Helpline: 1800 123 1234' },
  { label: { en: 'Swiggy order update', hi: 'Swiggy ऑर्डर अपडेट' },
    text: 'Your Swiggy order #4567821 from Andhra Gunpowder is out for delivery. Sunil will deliver it in about 15 minutes. Track your order at swiggy.com/track/4567821 — Enjoy your meal!' }
];

/* Demo texts used by the Protect-screen simulations. */
const SIM_SMS_TEXT = 'Your SBI KYC is expired. Update now: sbi-kyc-update.xyz/verify';
const SIM_COPY_TEXT = 'Dear Customer, your SBI account will be BLOCKED within 24 hours. Verify now: http://sbi-netverify.xyz/pay';

/* Priya's message — used by the "See a demo story" stepper and its
   "check it yourself" CTA. Detected as SCAM by the engine. */
const DEMO_SMS = 'Dear Customer, your SBI NetBanking has been BLOCKED because your KYC has expired. Update your KYC immediately to avoid permanent closure: http://sbi-kyc-update.xyz/verify — SBI';

/* ══════════════════════════════════════════════════════════════════
   I18N — every UI string in English + हिन्दी
   ══════════════════════════════════════════════════════════════════ */
const I18N = {
  skip:            { en: 'Skip to content', hi: 'सीधे content पर जाएँ' },
  tagline:         { en: 'Paste any suspicious SMS, WhatsApp message or link and get a plain-language verdict in seconds.',
                     hi: 'कोई भी शक वाला SMS, WhatsApp संदेश या लिंक पेस्ट करें — सरल भाषा में जवाब पाएं।' },
  nav_check:       { en: 'Check', hi: 'जाँच' },
  nav_history:     { en: 'History', hi: 'इतिहास' },
  nav_protect:     { en: 'Protect', hi: 'सुरक्षा' },
  nav_settings:    { en: 'Settings', hi: 'सेटिंग्स' },
  hint_short:      { en: 'Shortcuts: 1–4 switch tabs · Ctrl/⌘ + Enter checks · Esc closes', hi: 'शॉर्टकट: 1–4 टैब बदलें · Ctrl/⌘ + Enter जाँच · Esc बंद करे' },
  field_label:     { en: 'Paste the message or link here', hi: 'संदेश या लिंक यहाँ पेस्ट करें' },
  btn_check:       { en: 'Check now', hi: 'अभी जाँचें' },
  btn_paste:       { en: 'Paste from clipboard', hi: 'क्लिपबोर्ड से पेस्ट करें' },
  btn_upload:      { en: 'Upload screenshot', hi: 'स्क्रीनशॉट अपलोड करें' },
  soon:            { en: 'Screenshot reading coming soon', hi: 'स्क्रीनशॉट पढ़ने की सुविधा जल्द आ रही है' },
  remove:          { en: 'Remove', hi: 'हटाएँ' },
  examples_label:  { en: 'Try an example', hi: 'उदाहरण आज़माएँ' },
  pasted:          { en: 'Pasted from clipboard', hi: 'क्लिपबोर्ड से पेस्ट हो गया' },
  paste_fail:      { en: "Couldn't read the clipboard — long-press the box and choose Paste.", hi: 'क्लिपबोर्ड नहीं पढ़ पाए — बॉक्स पर दबाकर Paste चुनें।' },
  err_empty:       { en: 'Paste a message or link first.', hi: 'पहले कोई संदेश या लिंक पेस्ट करें।' },
  err_generic:     { en: 'Something went wrong — please try again.', hi: 'कुछ गड़बड़ हुई — फिर कोशिश करें।' },
  loading1:        { en: 'Reading message…', hi: 'संदेश पढ़ा जा रहा है…' },
  loading2:        { en: 'Checking links…', hi: 'लिंक जाँचे जा रहे हैं…' },
  loading3:        { en: 'Preparing advice…', hi: 'सलाह तैयार हो रही है…' },
  res_title:       { en: 'Scan result', hi: 'जाँच का नतीजा' },
  v_safe:          { en: 'SAFE', hi: 'सुरक्षित' },
  v_susp:          { en: 'BE CAREFUL', hi: 'सावधान' },
  v_scam:          { en: 'SCAM', hi: 'घोटाला' },
  sent_safe:       { en: 'This message looks safe. We found no strong warning signs in it.', hi: 'यह संदेश सुरक्षित लगता है। इसमें कोई बड़ा खतरे का संकेत नहीं मिला।' },
  sent_susp:       { en: 'This message has some warning signs. Be careful and verify before you act.', hi: 'इस संदेश में कुछ चेतावनी वाले संकेत हैं। कोई कदम उठाने से पहले जाँच-परख लें।' },
  sent_scam:       { en: 'This message is almost certainly a scam. Do not click anything, do not call back, do not reply.', hi: 'यह संदेश लगभग पक्का घोटाला है। इसमें कुछ भी न दबाएँ, न कॉल करें, जवाब भी न दें।' },
  sev_fmt:         { en: 'Risk level {n} of 3', hi: 'जोखिम स्तर: 3 में से {n}' },
  score_label:     { en: 'Risk score', hi: 'जोखिम स्कोर' },
  why_title:       { en: 'Why we think so', hi: 'हमें ऐसा क्यों लगता है' },
  links_title:     { en: 'Links found in this message', hi: 'संदेश में मिले लिंक' },
  msg_title:       { en: 'Your message — risky parts marked', hi: 'आपका संदेश — खतरनाक हिस्से चिह्नित' },
  vs_msg:          { en: 'In the message', hi: 'संदेश में' },
  vs_real:         { en: 'Real website', hi: 'असली वेबसाइट' },
  advice_title:    { en: 'What to do now', hi: 'अब क्या करें' },
  act_copy:        { en: 'Copy warning to share with family', hi: 'चेतावनी कॉपी करें' },
  act_report:      { en: 'Report this scam', hi: 'घोटाला रिपोर्ट करें' },
  act_again:       { en: 'Check another', hi: 'दूसरा संदेश जाँचें' },
  copied:          { en: 'Copied — paste it in your family group', hi: 'कॉपी हो गया — अपने परिवार के group में भेजें' },
  reporting:       { en: 'Opening the National Cyber Crime portal…', hi: 'राष्ट्रीय साइबर अपराध पोर्टल खुल रहा है…' },
  hist_title:      { en: 'History', hi: 'इतिहास' },
  stat_total:      { en: 'Checked', hi: 'जाँचे गए' },
  stat_scam:       { en: 'Scams blocked', hi: 'घोटाले रोके' },
  stat_safe:       { en: 'Safe messages', hi: 'सुरक्षित संदेश' },
  filter_all:      { en: 'All', hi: 'सब' },
  filter_scam:     { en: 'Scam', hi: 'घोटाला' },
  filter_susp:     { en: 'Suspicious', hi: 'संदिग्ध' },
  filter_safe:     { en: 'Safe', hi: 'सुरक्षित' },
  clear:           { en: 'Clear history', hi: 'इतिहास मिटाएँ' },
  clear_q:         { en: 'Clear all history?', hi: 'पूरा इतिहास मिटाएँ?' },
  clear_d:         { en: 'All past checks will be removed from this device.', hi: 'इस डिवाइस की सभी पिछली जाँचें हट जाएँगी।' },
  cancel:          { en: 'Cancel', hi: 'रद्द करें' },
  confirm:         { en: 'Clear', hi: 'मिटाएँ' },
  cleared:         { en: 'History cleared', hi: 'इतिहास मिटा दिया गया' },
  removed:         { en: 'Removed', hi: 'हटा दिया गया' },
  del_label:       { en: 'Delete this check', hi: 'यह जाँच हटाएँ' },
  empty_t:         { en: 'No checks yet', hi: 'अभी तक कोई जाँच नहीं' },
  empty_s:         { en: 'Paste a message on the Check tab — every result will be saved here.', hi: 'जाँच टैब पर कोई संदेश पेस्ट करें — सारे नतीजे यहाँ सुरक्षित रहेंगे।' },
  empty_cta:       { en: 'Check a message', hi: 'संदेश जाँचें' },
  just_now:        { en: 'just now', hi: 'अभी' },
  m_ago:           { en: '{n} min ago', hi: '{n} मिनट पहले' },
  h_ago:           { en: '{n} h ago', hi: '{n} घंटे पहले' },
  d_ago:           { en: '{n} d ago', hi: '{n} दिन पहले' },
  protect_title:   { en: 'Protect my devices', hi: 'अपने डिवाइस सुरक्षित करें' },
  protect_sub:     { en: 'These layers are a demo for now — turn them on and try the simulations below.', hi: 'ये सुरक्षा परतें अभी डेमो हैं — चालू करके नीचे दिए सिमुलेशन आज़माएँ।' },
  prot_ext:        { en: 'Browser Extension (Chrome)', hi: 'ब्राउज़र एक्सटेंशन (Chrome)' },
  prot_ext_d:      { en: 'Checks every page you open and blocks lookalike bank sites before they load.', hi: 'खुलने वाले हर पेज की जाँच करके नकली बैंक साइटें वहीं रोक देता है।' },
  prot_and:        { en: 'Android notification scanner', hi: 'Android नोटिफिकेशन स्कैनर' },
  prot_and_d:      { en: 'Reads incoming SMS and alerts you instantly if a message looks like a scam.', hi: 'आने वाले SMS पढ़कर घोटाले जैसा लगने पर तुरंत चेतावनी देता है।' },
  prot_dsk:        { en: 'Windows / Mac clipboard watcher', hi: 'Windows / Mac क्लिपबोर्ड वॉचर' },
  prot_dsk_d:      { en: 'Watches the text you copy and warns you before you paste it somewhere risky.', hi: 'आप जो टेक्स्ट copy करते हैं उसे देखकर खतरे पर चेतावनी देता है।' },
  on:              { en: 'Active · demo', hi: 'सक्रिय · डेमो' },
  off:             { en: 'Off', hi: 'बंद' },
  sim_title:       { en: 'See it in action', hi: 'खुद देखें' },
  sim_sub:         { en: 'This is how ScamShield would warn you in real life.', hi: 'असली ज़िंदगी में ScamShield ऐसे ही चेतावनी देता है।' },
  sim_sms:         { en: 'Simulate incoming SMS', hi: 'SMS नोटिफिकेशन देखें' },
  sim_copy:        { en: 'Simulate copied text', hi: 'कॉपी किया टेक्स्ट देखें' },
  sim_site:        { en: 'Simulate scam website', hi: 'घोटाला वेबसाइट देखें' },
  sms_warn:        { en: 'ScamShield: SCAM — fake SBI link. Do not tap.', hi: 'ScamShield: घोटाला — फर्ज़ी SBI लिंक। न दबाएँ।' },
  sms_check:       { en: 'Check', hi: 'जाँचें' },
  sms_dismiss:     { en: 'Dismiss', hi: 'हटाएँ' },
  toast_copy_t:    { en: 'Warning: the text you just copied looks like a scam', hi: 'चेतावनी: आपने जो टेक्स्ट copy किया है वह घोटाला जैसा लगता है' },
  toast_check:     { en: 'Check it', hi: 'जाँचें' },
  ov_title:        { en: 'Dangerous site blocked', hi: 'ख़तरनाक वेबसाइट रोक दी गई' },
  ov_body:         { en: 'This site imitates sbi.co.in and may steal your bank login, OTP and money.', hi: 'यह साइट sbi.co.in की नकल है और आपका बैंक पासवर्ड, OTP और पैसे चुरा सकती है।' },
  ov_back:         { en: 'Go back to safety', hi: 'वापस सुरक्षित जाएँ' },
  ov_cont:         { en: 'I understand the risk, continue', hi: 'जोखिम समझता हूँ, फिर भी खोलें' },
  ov_back_msg:     { en: 'Good choice — nothing was opened.', hi: 'सही फैसला — कुछ भी नहीं खुला।' },
  ov_cont_msg:     { en: 'Stay careful — never enter your bank login there.', hi: 'सावधान रहें — वहाँ अपनी बैंक login कभी न डालें।' },
  set_title:       { en: 'Settings', hi: 'सेटिंग्स' },
  set_lang:        { en: 'Language', hi: 'भाषा' },
  set_theme:       { en: 'Theme', hi: 'थीम' },
  th_light:        { en: 'Light', hi: 'हल्की' },
  th_dark:         { en: 'Dark', hi: 'गहरी' },
  th_auto:         { en: 'Auto', hi: 'ऑटो' },
  set_ts:          { en: 'Text size', hi: 'टेक्स्ट का आकार' },
  ts_n:            { en: 'Normal', hi: 'सामान्य' },
  ts_l:            { en: 'Large', hi: 'बड़ा' },
  ts_xl:           { en: 'Extra large', hi: 'बहुत बड़ा' },
  set_rm:          { en: 'Reduce motion', hi: 'कम एनिमेशन' },
  set_rm_d:        { en: 'Turn off animations for a calmer experience.', hi: 'शांत अनुभव के लिए एनिमेशन बंद कर देता है।' },
  open:            { en: 'Open', hi: 'खोलें' },
  how_title:       { en: 'How ScamShield works', hi: 'ScamShield कैसे काम करता है' },
  how_l1t:         { en: '1 · Reading the message', hi: '1 · संदेश पढ़ना' },
  how_l1d:         { en: 'This rule-based detector looks for panic words, threats, and requests for OTP, PIN, KYC or Aadhaar. It is not an ML SMS classifier.', hi: 'यह rule-based डिटेक्टर घबराहट भरे शब्द, धमकियाँ और OTP, PIN, KYC या आधार मांगने वाली बातें ढूँढता है। यह ML SMS क्लासिफ़ायर नहीं है।' },
  how_l2t:         { en: '2 · Checking the links', hi: '2 · लिंक जाँचना' },
  how_l2d:         { en: 'Every link is compared with the real websites of Indian banks and services. Optional URL ML is currently OFF.', hi: 'हर लिंक की तुलना भारतीय बैंकों और सेवाओं की असली वेबसाइटों से होती है। वैकल्पिक URL ML फिलहाल OFF है।' },
  how_l3t:         { en: '3 · Explaining it simply', hi: '3 · सरल भाषा में समझाना' },
  how_l3d:         { en: 'Findings become a simple verdict and clear next steps — no jargon.', hi: 'नतीजा और अगले कदम आसान शब्दों में मिलते हैं — कोई तकनीकी बात नहीं।' },
  how_priv:        { en: 'With no backend configured, checks stay on this device. Protect simulations and screenshot upload do not provide real phone/device protection or OCR.', hi: 'बैकएंड न हो तो जाँच इस डिवाइस पर रहती है। Protect सिमुलेशन और स्क्रीनशॉट अपलोड असली फ़ोन सुरक्षा या OCR नहीं देते।' },
  close:           { en: 'Close', hi: 'बंद करें' },
  about_title:     { en: 'About', hi: 'ऐप के बारे में' },
  about_v:         { en: 'Version 1.0 · demo build', hi: 'संस्करण 1.0 · डेमो' },
  about_d:         { en: 'ScamShield helps ordinary people spot digital fraud in India — no security knowledge needed.', hi: 'ScamShield आम लोगों को डिजिटल ठगी पहचानने में मदद करता है — कोई तकनीकी ज्ञान ज़रूरी नहीं।' },
  about_disc:      { en: 'Best-effort guidance. When in doubt, call your bank on the number printed on your card, or the national helpline 1930.', hi: 'यह सलाह best-effort है। शक हो तो अपने कार्ड पर छपे नंबर पर बैंक को कॉल करें या राष्ट्रीय हेल्पलाइन 1930 पर।' },
  helpline_t:      { en: 'National Cyber Crime Helpline', hi: 'राष्ट्रीय साइबर अपराध हेल्पलाइन' },
  /* — Sidebar (shorter label, keeps the button on one line) — */
  how_btn:         { en: 'How it works', hi: 'कैसे काम करता है' },
  /* — Demo story — */
  demo_t:          { en: 'See a demo story', hi: 'डेमो कहानी देखें' },
  demo_next:       { en: 'Next', hi: 'आगे' },
  demo_back:       { en: 'Back', hi: 'पीछे' },
  demo_time:       { en: 'now', hi: 'अभी' },
  demo_try:        { en: 'Check Priya’s message yourself', hi: 'प्रिया का संदेश खुद जाँचें' },
  demo_step:       { en: 'Step {n} of 3', hi: 'चरण: 3 में से {n}' },
  d1_t:            { en: 'Meet Priya', hi: 'प्रिया से मिलिए' },
  d1_b:            { en: 'Priya is a 58-year-old school teacher in Mumbai. She uses her phone for WhatsApp, UPI and family photos — she is not a technical person. She is exactly the kind of person scammers hunt for.', hi: 'प्रिया मुंबई की 58 साल की स्कूल टीचर हैं। वह फ़ोन को WhatsApp, UPI और पारिवारिक फ़ोटो के लिए इस्तेमाल करती हैं — तकनीकी जानकारी नहीं रखतीं। ठग ऐसे ही लोगों को ढूँढते हैं।' },
  d1_t1:           { en: 'School teacher', hi: 'स्कूल टीचर' },
  d1_t2:           { en: 'Uses WhatsApp daily', hi: 'रोज़ WhatsApp इस्तेमाल' },
  d2_t:            { en: 'The attack', hi: 'हमला' },
  d2_b:            { en: 'One evening, this SMS lands on her phone. It looks official, it frightens her, and it gives her only a few minutes to act.', hi: 'एक शाम उनके फ़ोन पर यह SMS आता है। यह आधिकारिक दिखता है, डराता है, और कुछ ही मिनट में काम करने को कहता है।' },
  d3_t:            { en: 'Without vs With ScamShield', hi: 'बिना बनाम ScamShield के साथ' },
  d3_wo:           { en: 'Without ScamShield', hi: 'बिना ScamShield' },
  d3_w:            { en: 'With ScamShield', hi: 'ScamShield के साथ' },
  d3_s1:           { en: 'In panic, she taps the link', hi: 'घबराहट में वह लिंक खोल देती हैं' },
  d3_s2:           { en: 'The site looks exactly like SBI’s', hi: 'वेबसाइट बिल्कुल SBI जैसी दिखती है' },
  d3_s3:           { en: 'She enters her login, then the OTP that follows', hi: 'वह अपना login भरती हैं, फिर आने वाला OTP' },
  d3_s4:           { en: 'By morning, Rs 40,000 is gone from her account', hi: 'सुबह तक खाते से ₹40,000 चले जाते हैं' },
  d3_a2:           { en: 'Do not tap the link — it is a fake SBI site', hi: 'लिंक न खोलें — यह फर्ज़ी SBI साइट है' },
  d3_a3:           { en: 'SBI never asks for KYC over SMS', hi: 'SBI कभी SMS से KYC नहीं मांगता' },
  d3_a4:           { en: 'She shows her son, blocks the sender — money stays safe', hi: 'वह बेटे को दिखाती हैं, भेजने वाले को ब्लॉक करती हैं — पैसे सुरक्षित' },
  /* — Read aloud — */
  read_t:          { en: 'Read aloud', hi: 'पढ़कर सुनाएँ' },
  read_stop:       { en: 'Stop reading', hi: 'आवाज़ रोकें' },
  read_no:         { en: 'Speech is not available in this browser.', hi: 'इस ब्राउज़र में आवाज़ उपलब्ध नहीं है।' },
  /* — Share — */
  share_t:         { en: 'Share with family', hi: 'परिवार के साथ साझा करें' },
  share_wa:        { en: 'Share on WhatsApp', hi: 'WhatsApp पर भेजें' },
  share_open:      { en: 'Opening WhatsApp — warning copied for you', hi: 'WhatsApp खुल रहा है — चेतावनी कॉपी हो गई' },
  share_done:      { en: 'Shared', hi: 'साझा हो गया' },
  /* — Test lab — */
  lab_t:           { en: 'Test lab', hi: 'टेस्ट लैब' },
  lab_d:           { en: 'Run 55 project-written cases on this device. This is not independent accuracy.', hi: 'इस डिवाइस पर 55 प्रोजेक्ट-लिखित मामलों की जाँच चलाएँ। यह स्वतंत्र सटीकता नहीं है।' },
  lab_run:         { en: 'Run tests', hi: 'टेस्ट चलाएँ' },
  lab_total:       { en: 'Cases', hi: 'मामले' },
  lab_pass:        { en: 'Passed', hi: 'पास' },
  lab_acc:         { en: 'Accuracy', hi: 'सटीकता' },
  lab_fail:        { en: 'Failing messages', hi: 'नाकाम संदेश' },
  lab_none:        { en: 'No failures — every case passed.', hi: 'कोई असफलता नहीं — हर मामला पास।' },
  lab_note:        { en: 'The same results table is printed in the browser console (F12).', hi: 'यही नतीजे ब्राउज़र कंसोल (F12) में भी छपते हैं।' },
  /* — On-device / server status chip — */
  priv_on:         { en: 'On-device analysis: your message never leaves this phone', hi: 'ऑन-डिवाइस जाँच: आपका संदेश इस फ़ोन से बाहर नहीं जाता' },
  priv_srv:        { en: 'Connected to ScamShield server', hi: 'ScamShield सर्वर से जुड़ा है' },
  /* — First-launch onboarding — */
  onb_t:           { en: 'Welcome to ScamShield', hi: 'ScamShield में आपका स्वागत है' },
  onb_s1_t:        { en: 'Paste', hi: 'पेस्ट' },
  onb_s1_d:        { en: 'Copy any doubtful SMS or WhatsApp message into the big box.', hi: 'कोई भी शक वाला SMS या WhatsApp संदेश बड़े बॉक्स में कॉपी करें।' },
  onb_s2_t:        { en: 'Check', hi: 'जाँच' },
  onb_s2_d:        { en: 'Read the verdict in plain language — and the reasons behind it.', hi: 'सरल भाषा में नतीजा पढ़ें — और उसके पीछे की वजहें।' },
  onb_s3_t:        { en: 'Stay safe', hi: 'सुरक्षित रहें' },
  onb_s3_d:        { en: 'Never share OTP or PIN. Report scams at cybercrime.gov.in or 1930.', hi: 'OTP या PIN कभी साझा न करें। घोटाले cybercrime.gov.in या 1930 पर रिपोर्ट करें।' },
  onb_go:          { en: 'Get started', hi: 'शुरू करें' },
  onb_skip:        { en: 'Skip', hi: 'छोड़ें' }
};
function t(key, n) {
  const e = I18N[key];
  if (!e) return key;
  let s = e[state.lang] || e.en;
  if (typeof n === 'number') s = s.replace('{n}', n);
  return s;
}

/* ══════════════════════════════════════════════════════════════════
   STATE — persisted via a safe localStorage wrapper
   ══════════════════════════════════════════════════════════════════ */
const store = (() => {
  try {
    const k = '__ss_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) { /* private mode / disabled storage → in-memory fallback */
    const m = {};
    return {
      getItem: k => (k in m ? m[k] : null),
      setItem: (k, v) => { m[k] = String(v); },
      removeItem: k => { delete m[k]; }
    };
  }
})();

const DEFAULTS = {
  lang: 'en', theme: 'auto', ts: 'n', rm: null,
  toggles: { ext: true, and: false, dsk: false },
  history: [],
  onboarded: false   /* first-launch onboarding shown once */
};
let state = loadState();

function loadState() {
  try {
    const raw = JSON.parse(store.getItem(STORAGE_KEY) || '{}');
    return {
      lang: raw.lang === 'hi' ? 'hi' : 'en',
      theme: ['light', 'dark', 'auto'].includes(raw.theme) ? raw.theme : 'auto',
      ts: ['n', 'l', 'xl'].includes(raw.ts) ? raw.ts : 'n',
      rm: typeof raw.rm === 'boolean' ? raw.rm : null,
      onboarded: !!raw.onboarded,
      toggles: Object.assign({}, DEFAULTS.toggles, raw.toggles && typeof raw.toggles === 'object' ? raw.toggles : {}),
      history: Array.isArray(raw.history) ? raw.history.slice(0, 100) : []
    };
  } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
}
function saveState() {
  try { store.setItem(STORAGE_KEY, JSON.stringify({
    lang: state.lang, theme: state.theme, ts: state.ts, rm: state.rm,
    toggles: state.toggles, history: state.history.slice(0, 100),
    onboarded: state.onboarded
  })); } catch (e) { /* storage full — keep running in memory */ }
}

/* Session-only state */
state.screen = 'check';
state.histFilter = 'all';
state.lastResult = null;
state.lastText = '';
state.resultLoc = null; /* 'inline' | 'sheet' | null */

/* DOM helpers */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rmActive = () => document.documentElement.dataset.rm === '1';
const mqDesk = window.matchMedia('(min-width: 920px)');
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ══════════════════════════════════════════════════════════════════
   DETECTION — delegated to the shared engine in src/detection/.
   This module used to carry its own copy of the rule engine; that copy
   was deleted so the UI, the tests and the backend all run one
   implementation. Do not re-add detection logic here.
   Result shape (also the API contract when API_BASE is set):
     {
       verdict: "safe" | "suspicious" | "scam",
       score: 0–100,
       reasons: [{icon, text_en, text_hi}],        // 3–5 items
       links:   [{url, verdict, reason:{en,hi}, lookalike_of}],
       advice:  [{text_en, text_hi}],
       highlights: ["OTP", "sbi-kyc-update.xyz", …]
     }
   ══════════════════════════════════════════════════════════════════ */
/* ── Shared detection implementation ───────────────────────────────── */
function analyze(input: unknown) {
  return analyzeShared(input);
}
/* ══════════════════════════════════════════════════════════════════
   UI COMPONENTS — icons, settings appliers, rendering
   ══════════════════════════════════════════════════════════════════ */

/* Inline SVG icon set — one consistent 1.75px rounded-stroke style. */
const I = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const ICONS = {
  shield:     I('<path d="M12 3l7 3v5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3z"/>'),
  shieldCheck:I('<path d="M12 3l7 3v5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3z"/><path d="M9 11.5l2.1 2.1 4-4.4"/>'),
  checkCircle:I('<circle cx="12" cy="12" r="9"/><path d="M8.3 12.3l2.4 2.4 5-5.4"/>'),
  alertTri:   I('<path d="M12 4.2L2.8 19.5h18.4L12 4.2z"/><path d="M12 10v4.2"/><path d="M12 17.1v.1"/>'),
  halfRing:   I('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor" stroke="none"/>'),
  octaX:      I('<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2L8.2 3z"/><path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2"/>'),
  clock:      I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.4 2"/>'),
  key:        I('<circle cx="7.5" cy="15.5" r="3.5"/><path d="M10.2 12.8L20 3m-3.6 1.2l2.4 2.4"/>'),
  bank:       I('<path d="M3.5 9.5L12 4l8.5 5.5"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8"/><path d="M3.5 20.5h17"/>'),
  link:       I('<path d="M10.4 13.6a4 4 0 005.7 0l3.2-3.2a4 4 0 10-5.7-5.7l-1.3 1.3"/><path d="M13.6 10.4a4 4 0 00-5.7 0l-3.2 3.2a4 4 0 105.7 5.7l1.3-1.3"/>'),
  siren:      I('<path d="M6 20h12"/><path d="M7.5 20v-5.5a4.5 4.5 0 019 0V20"/><path d="M12 4.5v2M5.6 7.6l1.5 1.5M18.4 7.6l-1.5 1.5"/>'),
  gift:       I('<path d="M20 12v8.5H4V12"/><path d="M2.5 8.5h19V12h-19z"/><path d="M12 8.5v12"/><path d="M12 8.5C10.2 8.5 7.8 8 7.8 6c0-1.8 3-2.3 4.2 2.5 1.2-4.8 4.2-4.3 4.2-2.5 0 2-2.4 2.5-4.2 2.5z"/>'),
  type:       I('<path d="M5 7V5h14v2M12 5v14M9.5 19h5"/>'),
  copy:       I('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5"/>'),
  clipboard:  I('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9.5 4h5"/><path d="M9 11h6M9 15h4"/>'),
  image:      I('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4.5 17.5l5-5 3.5 3.5 3-3 3.5 3.5"/>'),
  x:          I('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash:      I('<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13.5h9l1-13.5"/><path d="M10 11v6M14 11v6"/>'),
  sun:        I('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>'),
  moon:       I('<path d="M20.5 13.5A8.5 8.5 0 1110.5 3.5a7 7 0 0010 10z"/>'),
  auto:       I('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/><path d="M12 8a4 4 0 010 8z" fill="currentColor" stroke="none"/>'),
  sliders:    I('<path d="M4 7.5h16M4 16.5h16"/><circle cx="9.5" cy="7.5" r="2.2"/><circle cx="15" cy="16.5" r="2.2"/>'),
  info:       I('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.7v.2"/>'),
  phone:      I('<path d="M5 4h4l1.6 4.7-2.4 1.8a13 13 0 005.3 5.3l1.8-2.4L20 15v4a1.6 1.6 0 01-1.7 1.6A17 17 0 013.4 5.7 1.6 1.6 0 015 4z"/>'),
  external:   I('<path d="M14 4h6v6"/><path d="M20 4L11 13"/><path d="M19 14.5v4a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 014 18.5v-12A1.5 1.5 0 015.5 5H10"/>'),
  scan:       I('<circle cx="11" cy="11" r="7"/><path d="M16.2 16.2L21 21"/>'),
  history:    I('<path d="M12 7v5l3.4 2"/><path d="M3.5 12a8.5 8.5 0 108.5-8.5A8.4 8.4 0 004.6 8.1"/><path d="M3.5 3.8V8h4.2"/>'),
  monitor:    I('<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M9.5 20.5h5M12 17v3.5"/>'),
  phoneDev:   I('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.3h3"/>'),
  ext:        I('<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.2v7.6M8.2 12h7.6"/>'),
  bell:       I('<path d="M6 16v-5.2a6 6 0 1112 0V16l1.6 2.6H4.4L6 16z"/><path d="M10 21a2.1 2.1 0 004 0"/>'),
  chevD:      I('<path d="M6 9.5l6 6 6-6"/>'),
  chat:       I('<path d="M20 12a8 8 0 01-8 8H4l2-3a8 8 0 1114-5z"/><path d="M8.5 12h.2M12 12h.2M15.5 12h.2"/>'),
  lock:       I('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>'),
  speaker:    I('<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9.7a3.4 3.4 0 010 4.6M18 7.3a7 7 0 010 9.4"/>'),
  stop:       I('<rect x="6" y="6" width="12" height="12" rx="2.5"/>'),
  play:       I('<path d="M8 5.5v13l10.5-6.5z"/>'),
  user:       I('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2a7.2 7.2 0 0114.4 0"/>'),
  flask:      I('<path d="M9.5 3h5M10.5 3v5.5L5.2 18.6A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.3-2.4L13.5 8.5V3"/><path d="M7.8 14.5h8.4"/>'),
  emptyArt:   '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M50 18l26 11v19c0 17.5-11 29-26 34-15-5-26-16.5-26-34V29l26-11z"/><path d="M39 47l8 8 15-16"/><circle cx="80" cy="78" r="16"/><path d="M91.5 89.5L104 102"/><path d="M74 72l3 6-4 3 6 3"/></svg>'
};
function injectIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(el => {
    const svg = ICONS[el.dataset.icon];
    if (svg) el.innerHTML = svg;
  });
}

/* ---- i18n + settings appliers ------------------------------------ */
function applyI18n() {
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  /* On-device / server status chip — text follows API_BASE */
  const pv = $('#privTxt');
  if (pv) pv.textContent = t(API_BASE ? 'priv_srv' : 'priv_on');
}
function updateSeg(sel, val) {
  $$(sel + ' button').forEach(b => b.classList.toggle('on', b.dataset.val === val));
}
function applyTheme() {
  const resolved = state.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : state.theme;
  document.documentElement.dataset.theme = resolved;
  $('#metaTheme').setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff');
  updateSeg('#segTheme', state.theme);
}
function applyTextSize() {
  document.documentElement.dataset.ts = state.ts;
  updateSeg('#segTs', state.ts);
}
function applyRm() {
  const on = state.rm === null ? mqRM.matches : state.rm;
  document.documentElement.dataset.rm = on ? '1' : '0';
  const sw = $('#swRm');
  if (sw) sw.checked = on;
}
function applyLang() {
  document.documentElement.lang = state.lang === 'hi' ? 'hi' : 'en';
  updateSeg('#segLang', state.lang);
  applyI18n();
  renderExamples();
  renderHistory();
  renderProtect();
  rerenderResult();
  if ($('#demoOv') && $('#demoOv').classList.contains('show')) demoGo(demoIdx);
}

/* ---- Check screen -------------------------------------------------- */
function renderExamples() {
  $('#exChips').innerHTML = EXAMPLES.map((x, i) =>
    '<button class="chip" type="button" data-ex="' + i + '">' + esc(x.label[state.lang] || x.label.en) + '</button>'
  ).join('');
}
function renderLoading() {
  const el = document.createElement('div');
  el.className = 'card load-card';
  el.innerHTML =
    '<div class="sk-bar" style="width:92%"></div>' +
    '<div class="sk-bar" style="width:68%"></div>' +
    '<div class="sk-bar" style="width:84%"></div>' +
    '<div class="sk-bar" style="width:44%"></div>' +
    '<div class="load-status"><span class="spin"></span>' +
    '<span class="load-label" aria-live="polite">' + esc(t('loading1')) + '</span></div>';
  const label = el.querySelector('.load-label');
  const seq = ['loading1', 'loading2', 'loading3'];
  let i = 0;
  const iv = setInterval(() => { i = (i + 1) % seq.length; label.textContent = t(seq[i]); }, 380);
  el._stop = () => clearInterval(iv);
  return el;
}

/* Highlight risky words in the original message (inverted marker style). */
function highlightHtml(text, hls) {
  const base = esc(text);
  const alts = Array.from(new Set((hls || []).map(h => String(h).trim())))
    .filter(h => h.length >= 3 && h.length <= 60 && !/[<>&"']/.test(h))
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);
  if (!alts.length) return base;
  try {
    const re = new RegExp('\\b(?:' + alts.map(escRe).join('|') + ')\\b', 'gi');
    return base.replace(re, w => '<mark class="hl">' + w + '</mark>');
  } catch (e) { return base; }
}
/* Visual domain diff: shared prefix normal, differing tail marked. */
function diffHtml(shown, ref, cls) {
  const s = String(shown), r = String(ref);
  let i = 0;
  while (i < s.length && i < r.length && s[i] === r[i]) i++;
  return esc(s.slice(0, i)) + (i < s.length ? '<span class="' + cls + '">' + esc(s.slice(i)) + '</span>' : '');
}

/* ---- Result view ---------------------------------------------------- */
function buildResultNode(r, text) {
  const MAP = {
    safe:       { cls: 'v-safe',       icon: 'checkCircle', label: t('v_safe'), sev: 1, sent: t('sent_safe') },
    suspicious: { cls: 'v-suspicious', icon: 'halfRing',    label: t('v_susp'), sev: 2, sent: t('sent_susp') },
    scam:       { cls: 'v-scam',       icon: 'octaX',       label: t('v_scam'), sev: 3, sent: t('sent_scam') }
  };
  const V = MAP[r.verdict] || MAP.safe;
  const L = state.lang;
  const pickTxt = o => (L === 'hi' ? (o && (o.text_hi || o.text_en)) : (o && (o.text_en || o.text_hi))) || '';
  const el = document.createElement('div');
  el.className = 'result';
  el.setAttribute('role', 'article');

  let html = '';
  /* Verdict block — shape-coded, never color-only */
  html += '<div class="verdict ' + V.cls + '"><span class="v-ic" data-icon="' + V.icon + '"></span>' +
    '<div class="v-body"><div class="v-label">' + esc(V.label) + '</div>' +
    '<div class="sev" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<div class="v-sub">' + esc(t('sev_fmt', V.sev)) + '</div></div></div>';
  html += '<p class="v-sentence">' + esc(V.sent) + '</p>';

  /* Gauge + reasons */
  html += '<div class="res-grid">' +
    '<div class="card gauge-card"><div class="gauge-wrap">' +
    '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="g-trk" cx="60" cy="60" r="52"/><circle class="g-val" cx="60" cy="60" r="52"/></svg>' +
    '<div class="g-center"><div class="g-num" data-count>0</div><div class="g-den">/ 100</div></div></div>' +
    '<div class="g-lb">' + esc(t('score_label')) + '</div><div class="g-v">' + esc(V.label) + '</div></div>' +
    '<div class="card why-card"><h3>' + esc(t('why_title')) + '</h3><ul class="stagger">' +
    (r.reasons || []).map((x, i) =>
      '<li style="--i:' + i + '"><span data-icon="' + esc(x.icon || 'info') + '"></span>' +
      '<span class="wr">' + esc(pickTxt(x)) + '</span></li>').join('') +
    '</ul></div></div>';

  /* Links with mini verdicts + lookalike comparison */
  if (r.links && r.links.length) {
    html += '<div class="card res-card"><h3>' + esc(t('links_title')) + '</h3>' +
      r.links.map(l => {
        const vbc = l.verdict === 'scam' ? 'scam' : l.verdict === 'suspicious' ? 'suspicious' : 'safe';
        const vlbl = { scam: t('v_scam'), suspicious: t('v_susp'), safe: t('v_safe') }[l.verdict] || '';
        let row = '<div class="link-row"><div class="link-head">' +
          '<span class="vb ' + vbc + '">' + esc(vlbl) + '</span>' +
          '<span class="dom">' + esc(l.url) + '</span></div>';
        const reason = l.reason ? (typeof l.reason === 'string' ? l.reason : pickTxt(l.reason)) : '';
        if (reason) row += '<p class="link-why">' + esc(reason) + '</p>';
        if (l.lookalike_of) {
          const host = urlHost(l.url);
          row += '<div class="vs">' +
            '<div><span class="vs-l">' + esc(t('vs_msg')) + '</span><span class="dom">' + diffHtml(host, l.lookalike_of, 'd') + '</span></div>' +
            '<div><span class="vs-l">' + esc(t('vs_real')) + '</span><span class="dom">' + diffHtml(l.lookalike_of, host, 'u') + '</span></div>' +
            '</div>';
        }
        return row + '</div>';
      }).join('') + '</div>';
  }

  /* Original message with inline highlights */
  if (r.highlights && r.highlights.length) {
    html += '<div class="card res-card"><h3>' + esc(t('msg_title')) + '</h3>' +
      '<blockquote class="orig">' + highlightHtml(text, r.highlights) + '</blockquote></div>';
  }

  /* What to do now */
  html += '<div class="card res-card"><h3>' + esc(t('advice_title')) + '</h3><div class="steps stagger">' +
    (r.advice || []).map((a, i) =>
      '<div class="step" style="--i:' + i + '"><span class="n">' + (i + 1) + '</span>' +
      '<span class="s-txt">' + esc(pickTxt(a)) + '</span></div>').join('') +
    '</div></div>';

  /* Actions — native share (or copy + WhatsApp fallback), read aloud,
     report, again */
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  html += '<div class="res-actions">';
  html += canShare
    ? '<button class="btn btn-tonal" type="button" data-act="share"><span data-icon="chat"></span><span>' + esc(t('share_t')) + '</span></button>'
    : '<button class="btn btn-tonal" type="button" data-act="copy"><span data-icon="copy"></span><span>' + esc(t('act_copy')) + '</span></button>' +
      '<button class="btn btn-outline" type="button" data-act="wa"><span data-icon="chat"></span><span>' + esc(t('share_wa')) + '</span></button>';
  html += '<button class="btn btn-outline" type="button" data-act="speak" aria-pressed="false">' +
    '<span class="ic-a" data-icon="speaker"></span><span class="ic-b" data-icon="stop"></span>' +
    '<span class="sp-lb">' + esc(t('read_t')) + '</span></button>';
  html += '<button class="btn btn-filled" type="button" data-act="report"><span data-icon="external"></span><span>' + esc(t('act_report')) + '</span></button>';
  html += '<button class="btn btn-text" type="button" data-act="again"><span>' + esc(t('act_again')) + '</span></button>';
  html += '</div>';

  el.innerHTML = html;
  injectIcons(el);
  return el;
}

function countUp(el, to, ms) {
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function runResultFx(node, r) {
  const val = node.querySelector('.g-val');
  const num = node.querySelector('[data-count]');
  const C = 2 * Math.PI * 52;
  if (val) {
    const target = C * (1 - Math.max(0, Math.min(100, r.score)) / 100);
    requestAnimationFrame(() => requestAnimationFrame(() => { val.style.strokeDashoffset = target; }));
  }
  if (num) {
    if (rmActive()) num.textContent = r.score;
    else countUp(num, r.score, 900);
  }
}
/* Modal sheet on mobile, inline panel on desktop. */
function presentResult(result, text) {
  stopSpeak();
  state.lastResult = result;
  state.lastText = text;
  const node = buildResultNode(result, text);
  if (mqDesk.matches) {
    state.resultLoc = 'inline';
    $('#slotResult').replaceChildren();
    $('#inlineResult').replaceChildren(node);
    requestAnimationFrame(() => runResultFx(node, result));
    $('#inlineResult').scrollIntoView({ behavior: rmActive() ? 'auto' : 'smooth', block: 'start' });
  } else {
    state.resultLoc = 'sheet';
    $('#inlineResult').replaceChildren();
    $('#slotResult').replaceChildren(node);
    openSheet($('#sheetResult'));
    requestAnimationFrame(() => runResultFx(node, result));
  }
}
function clearResult(focus) {
  stopSpeak();
  state.lastResult = null;
  state.lastText = '';
  state.resultLoc = null;
  $('#inlineResult').replaceChildren();
  $('#slotResult').replaceChildren();
  if ($('#sheetResult').classList.contains('open')) closeSheet($('#sheetResult'));
  if (focus) {
    const ta = $('#msgInput');
    ta.value = '';
    $('#fieldMsg').classList.remove('has-value');
    $('#main').scrollTo({ top: 0, behavior: rmActive() ? 'auto' : 'smooth' });
    setTimeout(() => ta.focus(), 300);
  }
}
function rerenderResult() {
  if (!state.lastResult) return;
  const inlineHas = $('#inlineResult').children.length > 0;
  const sheetOpen = $('#sheetResult').classList.contains('open');
  if (inlineHas || sheetOpen) presentResult(state.lastResult, state.lastText);
}

/* ---- Check flow ------------------------------------------------------ */
let checking = false;
async function runCheck() {
  if (checking) return;
  const ta = $('#msgInput');
  const text = ta.value.trim();
  if (!text) {
    const f = $('#fieldMsg');
    f.classList.remove('nudge'); void f.offsetWidth; f.classList.add('nudge');
    snack(t('err_empty'));
    ta.focus();
    return;
  }
  checking = true;
  $('#btnCheck').disabled = true;
  clearResult(false);
  const load = renderLoading();
  $('#loadSlot').replaceChildren(load);
  try {
    const result = await analyze(text);
    if (load._stop) load._stop();
    $('#loadSlot').replaceChildren();
    presentResult(result, text);
    addHistory(text, result);
  } catch (err) {
    if (load._stop) load._stop();
    $('#loadSlot').replaceChildren();
    snack(t('err_generic'));
  }
  $('#btnCheck').disabled = false;
  checking = false;
}
function loadAndCheck(text) {
  switchScreen('check');
  $('#msgInput').value = text;
  $('#fieldMsg').classList.add('has-value');
  runCheck();
}

/* ---- Shareable warning text ------------------------------------------ */
function buildWarning() {
  const r = state.lastResult;
  if (!r) return '';
  const L = state.lang;
  const vWord = { safe: t('v_safe'), suspicious: t('v_susp'), scam: t('v_scam') }[r.verdict];
  const pick = o => (L === 'hi' ? (o.text_hi || o.text_en) : (o.text_en || o.text_hi));
  const W = [];
  W.push(L === 'hi'
    ? 'चेतावनी (ScamShield): यह संदेश “' + vWord + '” पाया गया — जोखिम स्कोर ' + r.score + '/100।'
    : 'WARNING (ScamShield): this message was checked and looks ' + vWord + ' — risk score ' + r.score + '/100.');
  W.push(L === 'hi' ? 'क्यों:' : 'Why:');
  (r.reasons || []).slice(0, 4).forEach(x => W.push('• ' + pick(x)));
  W.push(L === 'hi' ? 'क्या करें:' : 'What to do:');
  (r.advice || []).forEach((x, i) => W.push((i + 1) + '. ' + pick(x)));
  W.push(L === 'hi' ? '— ScamShield से जाँचा गया' : '— Checked with ScamShield');
  return W.join('\n');
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; }
  catch (e) {
    try {
      const x = document.createElement('textarea');
      x.value = txt;
      x.style.cssText = 'position:fixed;top:-999px;opacity:0';
      document.body.appendChild(x);
      x.select();
      const ok = document.execCommand('copy');
      x.remove();
      return ok;
    } catch (e2) { return false; }
  }
}
async function pasteFromClipboard() {
  try {
    const txt = await navigator.clipboard.readText();
    if (!txt || !txt.trim()) throw new Error('empty');
    $('#msgInput').value = txt.trim().slice(0, 4000);
    $('#fieldMsg').classList.add('has-value');
    snack(t('pasted'));
  } catch (e) { snack(t('paste_fail')); }
}
function onFileChosen(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const img = $('#thumbImg');
  if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(f);
  $('#thumbName').textContent = f.name;
  $('#thumbRow').hidden = false;   /* [hidden] CSS fix keeps this working */
  snack(t('soon'));
}

/* ---- Read aloud (speechSynthesis, en-IN / hi-IN) --------------------
   Reads the verdict sentence + the advice steps. Toggle button gets a
   stop state; speech is cancelled on any result change.               */
let speaking = false;
function ttsText() {
  const r = state.lastResult;
  if (!r) return '';
  const L = state.lang;
  const pick = o => (L === 'hi' ? (o && (o.text_hi || o.text_en)) : (o && (o.text_en || o.text_hi))) || '';
  const parts = [t('sent_' + r.verdict)];
  (r.advice || []).forEach(a => { const s = pick(a); if (s) parts.push(s); });
  return parts.join(' ');
}
function ttsVoice() {
  try {
    const want = state.lang === 'hi' ? 'hi-IN' : 'en-IN';
    const vs = window.speechSynthesis.getVoices();
    return vs.find(v => v.lang === want) ||
           vs.find(v => (v.lang || '').indexOf(want.split('-')[0]) === 0) || null;
  } catch (e) { return null; }
}
function updateSpeakBtns() {
  $$('[data-act="speak"]').forEach(b => {
    b.classList.toggle('speaking', speaking);
    b.setAttribute('aria-pressed', speaking ? 'true' : 'false');
    const lb = b.querySelector('.sp-lb');
    if (lb) lb.textContent = t(speaking ? 'read_stop' : 'read_t');
  });
}
function stopSpeak() {
  if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  if (speaking) { speaking = false; updateSpeakBtns(); }
}
function speakToggle() {
  if (!('speechSynthesis' in window)) { snack(t('read_no')); return; }
  if (speaking) { stopSpeak(); return; }
  const txt = ttsText().replace(/\s+/g, ' ').trim();
  if (!txt) return;
  const u = new SpeechSynthesisUtterance(txt);
  const v = ttsVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  else u.lang = state.lang === 'hi' ? 'hi-IN' : 'en-IN';
  u.rate = 0.97;
  u.onend = () => { speaking = false; updateSpeakBtns(); };
  u.onerror = () => { speaking = false; updateSpeakBtns(); };
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    speaking = true;
    updateSpeakBtns();
  } catch (e) { snack(t('read_no')); }
}

/* ---- Demo story — full-screen 3-step stepper ------------------------- */
let demoIdx = 0;
function buildDemoDots() {
  const box = $('#demoDots');
  if (!box || box.children.length) return;
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => demoGo(i));
    box.appendChild(b);
  }
}
function demoGo(n, dirBack) {
  demoIdx = Math.max(0, Math.min(2, n));
  $$('#demoOv .demo-step').forEach(s => {
    const cur = Number(s.dataset.step) === demoIdx;
    s.classList.toggle('cur', cur);
    s.classList.toggle('fromL', !!dirBack);
  });
  $('#demoBack').disabled = demoIdx === 0;
  const next = $('#demoNext');
  const last = demoIdx === 2;
  next.dataset.i18n = last ? 'demo_try' : 'demo_next'; /* survives applyLang */
  next.textContent = t(next.dataset.i18n);
  $$('#demoDots button').forEach((b, i) => {
    b.classList.toggle('on', i === demoIdx);
    b.setAttribute('aria-label', t('demo_step', i + 1));
  });
}
function openDemo() {
  $('#demoBubble').textContent = DEMO_SMS;
  demoGo(0);
  $('#demoOv').classList.add('show');
  setTimeout(() => $('#demoClose').focus(), 260);
}
function hideDemo() { $('#demoOv').classList.remove('show'); }

/* ---- Test lab — measured accuracy for judges ------------------------- */
function runLab() {
  const out = $('#labOut');
  if (typeof runSelfTests !== 'function') {
    out.innerHTML = '<div class="lab-row"><span class="vb suspicious">!</span><span>' + esc(t('err_generic')) + '</span></div>';
    return;
  }
  out.innerHTML = '<div class="load-status" style="padding:12px 0"><span class="spin"></span><span>' + esc(t('lab_run')) + '…</span></div>';
  /* let the spinner paint, then run the synchronous suite */
  setTimeout(() => {
    const r = runSelfTests();
    let html = '<div class="lab-stats">' +
      '<div class="lab-stat"><div class="num">' + r.total + '</div><div class="lb">' + esc(t('lab_total')) + '</div></div>' +
      '<div class="lab-stat"><div class="num">' + r.passed + '</div><div class="lb">' + esc(t('lab_pass')) + '</div></div>' +
      '<div class="lab-stat"><div class="num">' + r.accuracy + '%</div><div class="lb">' + esc(t('lab_acc')) + '</div></div>' +
      '</div>';
    if (r.failures && r.failures.length) {
      html += '<h4 class="lab-fail-head">' + esc(t('lab_fail')) + '</h4>';
      html += r.failures.map(f =>
        '<div class="lab-row"><span class="vb suspicious">FAIL</span>' +
        '<span><strong>' + esc(f.label) + '</strong>' +
        esc(f.expected + ' → ' + f.got + (typeof f.score === 'number' ? ' · ' + f.score + '/100' : '')) +
        '</span></div>').join('');
    } else {
      html += '<div class="lab-ok"><span data-icon="checkCircle"></span><span>' + esc(t('lab_none')) + '</span></div>';
    }
    out.innerHTML = html;
    injectIcons(out);
  }, 60);
}

/* ---- History --------------------------------------------------------- */
const FILTERS = [['all', 'filter_all'], ['scam', 'filter_scam'], ['suspicious', 'filter_susp'], ['safe', 'filter_safe']];
function addHistory(text, result) {
  state.history.unshift({
    id: 'h' + Date.now() + Math.floor(Math.random() * 1e4),
    ts: Date.now(), verdict: result.verdict, score: result.score, text, result
  });
  if (state.history.length > 100) state.history.length = 100;
  saveState();
  renderHistory();
}
function relTime(ts) {
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 1) return t('just_now');
  if (m < 60) return t('m_ago', m);
  const h = Math.floor(m / 60);
  if (h < 24) return t('h_ago', h);
  const dd = Math.floor(h / 24);
  if (dd < 7) return t('d_ago', dd);
  return new Date(ts).toLocaleDateString(state.lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
}
function renderHistory() {
  const h = state.history;
  const scams = h.filter(x => x.verdict === 'scam').length;
  const safes = h.filter(x => x.verdict === 'safe').length;
  $('#histStats').innerHTML =
    [['' + h.length, t('stat_total')], ['' + scams, t('stat_scam')], ['' + safes, t('stat_safe')]]
    .map(s => '<div class="stat"><div class="num">' + esc(s[0]) + '</div><div class="lb">' + esc(s[1]) + '</div></div>').join('');
  $('#histFilters').innerHTML = FILTERS.map(f =>
    '<button class="chip' + (state.histFilter === f[0] ? ' on' : '') + '" type="button" data-filter="' + f[0] + '">' + esc(t(f[1])) + '</button>').join('');
  const list = h.filter(x => state.histFilter === 'all' || x.verdict === state.histFilter);
  $('#histList').innerHTML = list.map(x => {
    const vlbl = { scam: t('v_scam'), suspicious: t('v_susp'), safe: t('v_safe') }[x.verdict] || '';
    return '<div class="hrow" role="button" tabindex="0" data-id="' + esc(x.id) + '" aria-label="' + esc(vlbl) + ': ' + esc(x.text.slice(0, 60)) + '">' +
      '<span class="vb ' + x.verdict + '">' + esc(vlbl) + '</span>' +
      '<span class="hmid"><span class="snip">' + esc(x.text.slice(0, 110)) + '</span>' +
      '<span class="htime">' + esc(relTime(x.ts)) + ' · ' + x.score + '/100</span></span>' +
      '<button class="iconbtn hdel" type="button" data-del="' + esc(x.id) + '" aria-label="' + esc(t('del_label')) + '"><span data-icon="trash"></span></button>' +
      '</div>';
  }).join('');
  $('#histEmpty').hidden = list.length !== 0;
  injectIcons($('#histList'));
}
function deleteHistory(id) {
  const doRemove = () => {
    state.history = state.history.filter(x => x.id !== id);
    saveState(); renderHistory(); snack(t('removed'));
  };
  const row = $('#histList').querySelector('.hrow[data-id="' + id + '"]');
  if (row && !rmActive()) { row.classList.add('removing'); setTimeout(doRemove, 230); }
  else doRemove();
}
function openHistoryItem(id) {
  const e = state.history.find(x => x.id === id);
  if (!e) return;
  switchScreen('check');
  $('#msgInput').value = e.text;
  $('#fieldMsg').classList.add('has-value');
  presentResult(e.result, e.text);
}

/* ---- Protect --------------------------------------------------------- */
const PROTECT_CARDS = [
  { k: 'ext', icon: 'ext',      name: 'prot_ext', desc: 'prot_ext_d' },
  { k: 'and', icon: 'phoneDev', name: 'prot_and', desc: 'prot_and_d' },
  { k: 'dsk', icon: 'monitor',  name: 'prot_dsk', desc: 'prot_dsk_d' }
];
function renderProtect() {
  $('#protList').innerHTML = PROTECT_CARDS.map(c => {
    const on = !!state.toggles[c.k];
    return '<div class="prot-card card">' +
      '<div class="pc-ic" data-icon="' + c.icon + '"></div>' +
      '<div class="pc-main"><h3>' + esc(t(c.name)) + '</h3><p class="pc-desc">' + esc(t(c.desc)) + '</p>' +
      '<p class="pc-status' + (on ? ' on' : '') + '"><span class="dot"></span>' + esc(on ? t('on') : t('off')) + '</p></div>' +
      '<label class="switch"><input type="checkbox" data-prot="' + c.k + '"' + (on ? ' checked' : '') +
      ' aria-label="' + esc(t(c.name)) + '"><span class="trk"></span><span class="thb"></span></label>' +
      '</div>';
  }).join('');
  injectIcons($('#protList'));
}

/* ---- Sheets, dialog, snackbar, simulations ---------------------------- */
let sheetStack = [];
function openSheet(el) {
  const wasOpen = el.classList.contains('open');
  el.classList.add('open');
  $('#scrim').classList.add('show');
  if (!wasOpen) {
    sheetStack.push(el);
    if (!mqDesk.matches) {
      const f = el.querySelector('button');
      if (f) setTimeout(() => f.focus(), 330);
    }
  }
}
function closeSheet(el) {
  el.classList.remove('open');
  sheetStack = sheetStack.filter(x => x !== el);
  if (!sheetStack.length) $('#scrim').classList.remove('show');
  if (el.id === 'sheetResult' && state.resultLoc === 'sheet') { state.resultLoc = null; stopSpeak(); }
  /* Onboarding counts as seen however it is closed — show only once. */
  if (el.id === 'sheetOnb' && !state.onboarded) { state.onboarded = true; saveState(); }
}
function enableSheetDrag() {
  $$('.sheet').forEach(sheet => {
    const handle = sheet.querySelector('[data-drag]');
    if (!handle) return;
    let startY = 0, dy = 0, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (mqDesk.matches) return;
      dragging = true; startY = e.clientY; dy = 0;
      sheet.style.transition = 'none';
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 110) closeSheet(sheet);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
}
let snackTimer = null;
function snack(msg) {
  $('#snackTxt').textContent = msg;
  const s = $('#snack');
  s.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => s.classList.remove('show'), 2800);
}
let smsTimer = null, toastTimer = null;
function showSmsBanner() {
  $('#smsBody').textContent = SIM_SMS_TEXT;
  $('#smsTime').textContent = new Date()
    .toLocaleTimeString(state.lang === 'hi' ? 'hi-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
  $('#smsBanner').classList.add('show');
  clearTimeout(smsTimer);
  smsTimer = setTimeout(hideSmsBanner, 6500);
}
function hideSmsBanner() { clearTimeout(smsTimer); $('#smsBanner').classList.remove('show'); }
function showDeskToast() {
  $('#deskToast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideDeskToast, 5500);
}
function hideDeskToast() { clearTimeout(toastTimer); $('#deskToast').classList.remove('show'); }
function showScamOv() { $('#scamOv').classList.add('show'); $('#ovBack').focus(); }
function hideScamOv() { $('#scamOv').classList.remove('show'); }

/* ---- Navigation -------------------------------------------------------- */
function switchScreen(name) {
  if (TABS.indexOf(name) === -1) return;
  const oldIdx = TABS.indexOf(state.screen), newIdx = TABS.indexOf(name);
  const same = state.screen === name;
  $('#wrap').style.setProperty('--ax', newIdx > oldIdx ? '1' : '-1');
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  $$('.nav-item,.side-item').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  state.screen = name;
  $('#fab').classList.toggle('hide', name === 'check');
  $('#main').scrollTop = 0;
  $('#topbar').classList.remove('scrolled');
  if (!same && name === 'check') setTimeout(() => $('#msgInput').focus({ preventScroll: true }), 340);
}

/* ══════════════════════════════════════════════════════════════════
   ANIMATIONS — ripple + entrance effects (transform/opacity only)
   ══════════════════════════════════════════════════════════════════ */
function enableRipple() {
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.btn,.chip,.seg button,.side-item,.hrow');
    if (!el || rmActive()) return;
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 1.15;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    el.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  });
}

/* ══════════════════════════════════════════════════════════════════
   EVENT HANDLERS + INIT
   ══════════════════════════════════════════════════════════════════ */
function wireEvents() {
  /* Check screen */
  $('#msgInput').addEventListener('input', e => {
    $('#fieldMsg').classList.toggle('has-value', e.target.value.length > 0);
  });
  $('#btnCheck').addEventListener('click', runCheck);
  $('#btnPaste').addEventListener('click', pasteFromClipboard);
  $('#btnUpload').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', onFileChosen);
  $('#thumbRemove').addEventListener('click', () => {
    $('#thumbRow').hidden = true;
    const img = $('#thumbImg');
    if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
    img.removeAttribute('src');
  });
  $('#exChips').addEventListener('click', e => {
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    const ex = EXAMPLES[Number(b.dataset.ex)];
    if (ex) loadAndCheck(ex.text);
  });

  /* Navigation */
  $$('.nav-item,.side-item').forEach(b => b.addEventListener('click', () => switchScreen(b.dataset.tab)));
  $('#fab').addEventListener('click', () => switchScreen('check'));
  $('#emptyCta').addEventListener('click', () => switchScreen('check'));

  /* History */
  $('#histFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    state.histFilter = b.dataset.filter;
    renderHistory();
  });
  $('#histList').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); deleteHistory(del.dataset.del); return; }
    const row = e.target.closest('.hrow');
    if (row) openHistoryItem(row.dataset.id);
  });
  $('#histList').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.hrow');
    if (!row) return;
    e.preventDefault();
    openHistoryItem(row.dataset.id);
  });
  $('#btnClear').addEventListener('click', () => $('#dlgClear').classList.add('show'));
  $('#dlgCancel').addEventListener('click', () => $('#dlgClear').classList.remove('show'));
  $('#dlgOk').addEventListener('click', () => {
    state.history = [];
    saveState();
    renderHistory();
    $('#dlgClear').classList.remove('show');
    snack(t('cleared'));
  });

  /* Protect */
  $('#protList').addEventListener('change', e => {
    const c = e.target.closest('[data-prot]');
    if (!c) return;
    state.toggles[c.dataset.prot] = c.checked;
    saveState();
    renderProtect();
  });
  $('#simSms').addEventListener('click', showSmsBanner);
  $('#simCopy').addEventListener('click', showDeskToast);
  $('#simSite').addEventListener('click', showScamOv);
  $('#smsDismiss').addEventListener('click', hideSmsBanner);
  $('#smsCheck').addEventListener('click', () => { hideSmsBanner(); loadAndCheck(SIM_SMS_TEXT); });
  $('#dtClose').addEventListener('click', hideDeskToast);
  $('#dtCheck').addEventListener('click', () => { hideDeskToast(); loadAndCheck(SIM_COPY_TEXT); });
  $('#ovBack').addEventListener('click', () => { hideScamOv(); snack(t('ov_back_msg')); });
  $('#ovCont').addEventListener('click', () => { hideScamOv(); snack(t('ov_cont_msg')); });

  /* Demo story */
  $('#btnDemo').addEventListener('click', openDemo);
  $('#demoClose').addEventListener('click', hideDemo);
  $('#demoBack').addEventListener('click', () => demoGo(demoIdx - 1, true));
  $('#demoNext').addEventListener('click', () => {
    if (demoIdx === 2) { hideDemo(); loadAndCheck(DEMO_SMS); }
    else demoGo(demoIdx + 1);
  });

  /* Settings */
  $('#segLang').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.lang = b.dataset.val;
    saveState();
    applyLang();
  });
  $('#segTheme').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.theme = b.dataset.val;
    saveState();
    applyTheme();
  });
  $('#segTs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.ts = b.dataset.val;
    saveState();
    applyTextSize();
  });
  $('#swRm').addEventListener('change', e => {
    state.rm = e.target.checked;
    saveState();
    applyRm();
  });
  mqDark.addEventListener('change', () => { if (state.theme === 'auto') applyTheme(); });

  /* Sheets + dialogs */
  $('#btnHowSide').addEventListener('click', () => openSheet($('#sheetHow')));
  $('#btnHowTop').addEventListener('click', () => openSheet($('#sheetHow')));
  $('#btnHowSet').addEventListener('click', () => openSheet($('#sheetHow')));
  $('#howClose').addEventListener('click', () => closeSheet($('#sheetHow')));
  $('#howClose2').addEventListener('click', () => closeSheet($('#sheetHow')));

  /* Test lab */
  $('#btnLab').addEventListener('click', () => { openSheet($('#sheetLab')); runLab(); });
  $('#labRun').addEventListener('click', runLab);
  $('#labClose').addEventListener('click', () => closeSheet($('#sheetLab')));

  /* First-launch onboarding */
  $('#onbGo').addEventListener('click', () => closeSheet($('#sheetOnb')));
  $('#onbSkip').addEventListener('click', () => closeSheet($('#sheetOnb')));
  $('#resClose').addEventListener('click', () => closeSheet($('#sheetResult')));
  $('#scrim').addEventListener('click', () => {
    if (sheetStack.length) closeSheet(sheetStack[sheetStack.length - 1]);
  });

  /* Result actions (delegate — result is re-rendered often) */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'copy') {
      const ok = await copyText(buildWarning());
      snack(ok ? t('copied') : t('err_generic'));
    } else if (act === 'share') {
      /* navigator.share available — one-tap share */
      try { await navigator.share({ title: 'ScamShield', text: buildWarning() }); snack(t('share_done')); }
      catch (err) { if (err && err.name !== 'AbortError') snack(t('err_generic')); }
    } else if (act === 'wa') {
      /* no navigator.share — copy the warning AND offer a wa.me link */
      const ok = await copyText(buildWarning());
      try { window.open('https://wa.me/?text=' + encodeURIComponent(buildWarning()), '_blank', 'noopener'); } catch (err) {}
      snack(ok ? t('share_open') : t('err_generic'));
    } else if (act === 'speak') {
      speakToggle();
    } else if (act === 'report') {
      try { window.open('https://cybercrime.gov.in', '_blank', 'noopener'); } catch (err) {}
      snack(t('reporting'));
    } else if (act === 'again') {
      clearResult(true);
    }
  });

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if ($('#scamOv').classList.contains('show')) { hideScamOv(); return; }
      if ($('#demoOv').classList.contains('show')) { hideDemo(); return; }
      if ($('#dlgClear').classList.contains('show')) { $('#dlgClear').classList.remove('show'); return; }
      if (sheetStack.length) { closeSheet(sheetStack[sheetStack.length - 1]); return; }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runCheck(); return; }
    const ae = document.activeElement;
    const typing = ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable);
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && /^[1-4]$/.test(e.key)) {
      switchScreen(TABS[Number(e.key) - 1]);
    }
  });

  /* Large-title collapse on scroll */
  let scrollTick = false;
  $('#main').addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      $('#topbar').classList.toggle('scrolled', $('#main').scrollTop > 70);
      scrollTick = false;
    });
  }, { passive: true });

  /* Layout breakpoint: move an open result sheet into the inline slot */
  mqDesk.addEventListener('change', () => {
    if (state.lastResult && !mqDesk.matches) return;
    if (state.lastResult && mqDesk.matches && $('#sheetResult').classList.contains('open')) {
      closeSheet($('#sheetResult'));
      presentResult(state.lastResult, state.lastText);
    }
  });
}

/* ---- Init --------------------------------------------------------------- */
export function initLegacy() {
  injectIcons(document);
  applyTheme();
  applyTextSize();
  applyRm();
  applyLang();          /* also renders examples, history, protect */
  enableSheetDrag();
  enableRipple();
  wireEvents();
  switchScreen('check');
  $('#smsBody').textContent = SIM_SMS_TEXT;
  buildDemoDots();
  /* Warm the speech voice list (they load asynchronously in Chrome). */
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  }
  /* First launch only — 3-card onboarding, shown once. */
  if (!state.onboarded) setTimeout(() => openSheet($('#sheetOnb')), 450);
}

