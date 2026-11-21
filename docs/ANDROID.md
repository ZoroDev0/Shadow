# Android app — build, permissions and testing

The Android app is the same web app wrapped with Capacitor 8.6.2, plus a Kotlin
`NotificationListenerService` that scans **notifications** on the device.

## What is real and what is simulated

| Surface | Real notification scanning? |
| --- | --- |
| Android app (`com.scamshield.app`) | **Yes**, after you grant notification access. Reads notifications only. |
| Web app / PWA | **No.** The Protect switches are labelled **Simulation** and the incoming-SMS banner is a demo. |
| Browser extension | Real URL checks only. It never reads messages or notifications. |

What the Android service reads: the title, body, big text, text lines and
MessagingStyle messages of notifications posted by the apps in
`ScanPolicy.MESSAGING_PACKAGES` — Google Messages, Samsung Messages, WhatsApp,
WhatsApp Business, Telegram, Truecaller — plus `com.android.shell` in **debug**
builds (for adb testing).

What it never reads: the SMS database (`READ_SMS` / `RECEIVE_SMS` are **not**
requested or declared), contacts, the clipboard, the screen, or any other app's
data. Nothing is sent anywhere: there is no network call in the scan path, no
analytics and no logging of message text.

What it stores: source app, verdict, score, timestamp and a snippet with every
digit run of four or more masked. The full text is kept in memory only long
enough to show the result screen; the alert notification never contains the
message body. History can be cleared from the app (HISTORY → clear).

## Prerequisites

- **JDK 21** — Capacitor 8 compiles its modules for Java 21 (`capacitor.build.gradle`
  sets `sourceCompatibility = VERSION_21`). JDK 17 is **not** enough; a JDK 21 is
  configured in `android/gradle.properties` as `org.gradle.java.home` on this
  machine.
- **Android SDK** with platform 36 and build-tools 36 (`ANDROID_HOME` set), or
  Android Studio.
- **Node 20+** for the web build and the engine bundle.
- A phone with **Android 8.0 (API 24)** or newer, USB debugging on.

## Build and install

```bash
npm ci
npm run sync:android          # vite build + engine bundle + npx cap sync android
cd android
./gradlew assembleDebug       # -> app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug        # or: adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`npm run sync:android` is the only supported way to refresh the WebView assets:
it runs `npm run build`, `npm run build:android-engine` (esbuild → one 97 KB
script in `android/app/src/main/assets/engine/`) and `npx cap sync android`.
`./gradlew assembleDebug` fails with a clear message if the engine asset is
missing, so a stale APK cannot silently ship without a detector.

Do not commit `android/local.properties`, `android/.gradle/`, `android/**/build/`,
`assets/public/`, `assets/engine/` or any `*.apk`, `*.aab`, `*.jks`, `*.keystore`.
All of those are in `.gitignore`.

Measured on this machine: debug APK **7.6 MB** (13.5 MB uncompressed), of which
QuickJS `.so` files are 854 KB (arm64-v8a), 538 KB (armeabi-v7a), 878 KB (x86)
and 928 KB (x86_64). A release build would split per ABI and shrink further.

### Why QuickJS

The listener service has no WebView. Instead of porting the rules to Kotlin
(which would drift), `src/detection` is bundled by esbuild into one script and
executed by **QuickJS** (`app.cash.quickjs:quickjs-android:0.9.2`, Apache-2.0 —
a small embeddable ES2020 engine, no JIT, no network, ~0.9 MB per ABI). It is the
same JavaScript the web app runs, so there is exactly one detection brain.

QuickJS has no ICU, so `EngineBridge` normalises text with
`java.text.Normalizer` (exact NFKC) before calling in, and the bundle's
`normalize()` call becomes a no-op. `src/native/androidEngineGolden.test.ts`
proves this path against all **101** golden entries inside real QuickJS with
normalisation removed — same verdict and same score on every entry.

## Grant notification access

1. Open the app → **PROTECT** → *Android notification scanner* → **Open
   notification access settings**.
2. In the system list, find **ScamShield** and turn it on. (Path varies:
   *Settings → Notifications → Device & app notifications* on Pixel,
   *Settings → Apps → Special access → Notification access* on Samsung.)
3. On Android 13+ the app also asks for the notification permission so it can
   post its own alert.
4. Return to the app: the card re-checks on resume and shows
   *Notification access is on*.

**Sideloaded builds (Android 13+):** if the switch is greyed out and Android says
the setting is restricted, open **App info → three-dot menu → Allow restricted
settings**, then try again. The same instruction is in the app, in English and
Hindi.

Some brands (Xiaomi, Oppo, Vivo, Samsung) stop background services to save
battery. If alerts stop arriving, allow ScamShield to run in the background in
the phone's battery settings; the Protect screen carries this tip too.

## Test with adb

The debug allowlist includes `com.android.shell`, so notifications posted from
adb are scanned. Release builds ignore them.

```bash
# 1. Scam link -> SCAM alert
adb shell cmd notification post -S bigtext -t "SBI" "scamtest" \
  "Your account is blocked. Update KYC now: http://sbi-kyc-update.xyz"
#    expected: verdict scam, score 100, alert "Possible scam message"

# 2. Genuine OTP -> silent, no alert
adb shell cmd notification post -S bigtext -t "HDFC Bank" "otptest" \
  "4821 is your OTP for HDFC Bank card ending 1234. Do not share it with anyone."
#    expected: verdict safe, score 3, nothing posted

# 3. Hindi scam -> SCAM alert
adb shell cmd notification post -S bigtext -t "SBI" "scamtest-hi" \
  "आपका SBI खाता ब्लॉक हो जाएगा। तुरंत KYC अपडेट करें: http://sbi-kyc-update.xyz"
#    expected: verdict scam, score 100
```

Posting twice within 1.5 s with the same text is de-duplicated; more than 10
scans in a minute are rate-limited. The alert opens the app on the stored
result, and the History tab shows `Notification · <app>` with the masked
snippet.

## Tests

```bash
# Host: JVM logic + QuickJS golden parity for the Android bundle
npm test                                     # 57 tests, includes the 101-entry QuickJS golden test

# Android: pure JVM unit tests (no device needed)
cd android && ./gradlew testDebugUnitTest     # 12 tests: allowlist, filtering, masking, dedupe

# On a phone/emulator only — NOT run in this repo's automated gate
cd android && ./gradlew connectedDebugAndroidTest
```

`EngineGoldenTest` (instrumented) runs the same `backend/golden.json` — copied
into the androidTest assets at build time, never duplicated in git — through the
on-device QuickJS bridge and asserts verdict **and** score on all 101 entries.

## Limits (read before a demo)

- **No real-phone test has been run.** The APK builds, the JVM tests pass and the
  QuickJS parity holds on the host, but nobody has installed this build on a
  phone yet.
- Notification access is granted by the user in system settings; without it the
  app is silent.
- Only the six listed apps are scanned. A bank's own app notifications and SMS
  from senders not covered by those apps are not scanned (the SMS inbox is never
  read — that is a deliberate choice, not an oversight).
- The message body is not stored, so a result opened later shows the verdict, the
  score and a masked snippet, not the original text.
- iOS cannot do this: there is no public API to read other apps' notifications.
  No iOS project exists in this repo.
- Google Play distribution is **not** done: a notification-listener app needs a
  privacy policy and a sensitive-permission declaration. The hackathon build is
  a sideloaded debug APK.
- Uninstalling the app removes the stored history; nothing is synced anywhere.
