package com.scamshield.app

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import java.util.concurrent.Executors

/**
 * REAL notification scanning, Android only. The web app keeps its labelled
 * simulations; this service is the only place a real message is read.
 *
 * What is read: title, text, big text, text lines and MessagingStyle messages of
 * notifications posted by the messaging apps in [ScanPolicy.MESSAGING_PACKAGES]
 * (and com.android.shell in debug builds, for adb testing).
 * What is never read: the SMS database, contacts, the clipboard, the screen.
 * What is stored: source app, verdict, score, timestamp and a digit-masked
 * snippet. The full text stays in memory for the tapped result screen only.
 */
class ScamShieldListenerService : NotificationListenerService() {

    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var engine: EngineBridge
    private lateinit var store: RecentStore
    private lateinit var notifier: AlertNotifier
    private val dedupe = ScanDedupe()

    override fun onCreate() {
        super.onCreate()
        engine = EngineBridge(this)
        store = RecentStore(this)
        notifier = AlertNotifier(this)
        notifier.ensureChannel()
    }

    override fun onDestroy() {
        worker.shutdownNow()
        super.onDestroy()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        // Some brands kill the listener; ask the system to bind it again.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, ScamShieldListenerService::class.java))
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn?.notification ?: return
        val payload = toPayload(sbn, notification)
        if (!ScanPolicy.shouldScan(payload, BuildConfig.DEBUG)) return
        if (!isScanningEnabled(this)) return

        val text = ScanPolicy.messageText(payload)
        if (!dedupe.accept(payload.packageName, text)) return

        worker.execute {
            val verdict = engine.detect(text) ?: return@execute
            if (BuildConfig.DEBUG) {
                android.util.Log.d(
                    TAG,
                    "scanned pkg=${payload.packageName} verdict=${verdict.verdict} score=${verdict.score}"
                )
            }
            if (verdict.verdict != "scam" && verdict.verdict != "suspicious") return@execute

            val record = ScanRecord(
                packageName = payload.packageName,
                verdict = verdict.verdict,
                score = verdict.score,
                at = System.currentTimeMillis(),
                snippet = ScanPolicy.snippet(text),
            )
            store.add(record)
            val label = appLabel(this, payload.packageName)
            notifier.post(record, label)
            ScanBus.emit(record, label)
        }
    }

    private fun toPayload(sbn: StatusBarNotification, notification: Notification): NotificationPayload {
        val extras = notification.extras ?: android.os.Bundle.EMPTY
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val lines = ArrayList<String>()

        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let { lines.add(it) }
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let { lines.add(it) }
        extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { it?.toString()?.let(lines::add) }

        try {
            val style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification)
            style?.messages?.forEach { message -> message.text?.toString()?.let(lines::add) }
        } catch (_: Throwable) {
            // Non-messaging styles have nothing to extract.
        }

        // EXTRA_TEXT usually repeats the first MessagingStyle message.
        val unique = lines.map { it.trim() }.filter { it.isNotEmpty() }.distinct()

        val flags = notification.flags
        return NotificationPayload(
            packageName = sbn.packageName,
            title = title,
            lines = unique,
            isOngoing = (flags and Notification.FLAG_ONGOING_EVENT) != 0 ||
                (flags and Notification.FLAG_FOREGROUND_SERVICE) != 0,
            isGroupSummary = (flags and Notification.FLAG_GROUP_SUMMARY) != 0,
            isClearable = sbn.isClearable,
        )
    }

    companion object {
        private const val TAG = "ScamShieldListener"
        private const val PREFS = "scamshield.settings"
        private const val KEY_SCANNING = "scanning_enabled"

        fun isScanningEnabled(context: Context): Boolean =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_SCANNING, true)

        fun setScanningEnabled(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_SCANNING, enabled).apply()
        }

        /** True when the user has granted notification access to this app. */
        fun hasAccess(context: Context): Boolean {
            val enabled = android.provider.Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val component = ComponentName(context, ScamShieldListenerService::class.java).flattenToString()
            return enabled.split(':').any { it.equals(component, ignoreCase = true) || it.startsWith(context.packageName + "/") }
        }

        fun appLabel(context: Context, packageName: String): String = try {
            val info = context.packageManager.getApplicationInfo(packageName, 0)
            context.packageManager.getApplicationLabel(info).toString()
        } catch (_: Throwable) {
            packageName
        }
    }
}
