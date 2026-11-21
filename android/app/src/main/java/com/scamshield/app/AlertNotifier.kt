package com.scamshield.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Posts the local "possible scam" alert. The message body is never included:
 * only the verdict, a coarse risk band and the source app, so the alert itself
 * cannot leak the content it warns about.
 */
class AlertNotifier(private val context: Context) {

    fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.alert_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.alert_channel_description)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            setShowBadge(true)
        }
        NotificationManagerCompat.from(context).createNotificationChannel(channel)
    }

    /** True when the alert was actually posted (permission and channel present). */
    fun post(record: ScanRecord, appLabel: String): Boolean {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        ensureChannel()

        val scam = record.verdict == "scam"
        val title = context.getString(if (scam) R.string.alert_title_scam else R.string.alert_title_careful)
        val band = when {
            record.score >= 85 -> context.getString(R.string.alert_band_high)
            record.score >= 65 -> context.getString(R.string.alert_band_medium)
            else -> context.getString(R.string.alert_band_low)
        }
        val text = context.getString(R.string.alert_body, band, appLabel)

        val open = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_OPEN_RECENT, true)
            putExtra(EXTRA_SCAN_AT, record.at)
        }
        val pending = PendingIntent.getActivity(
            context,
            (record.at % Int.MAX_VALUE).toInt(),
            open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_shield_mono)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(pending)
            .build()

        return try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
            true
        } catch (t: SecurityException) {
            false
        }
    }

    companion object {
        const val CHANNEL_ID = "scamshield_alerts"
        const val NOTIFICATION_ID = 4101
        const val EXTRA_OPEN_RECENT = "openRecent"
        const val EXTRA_SCAN_AT = "scanAt"
    }
}
