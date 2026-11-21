package com.scamshield.app

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * The only bridge between the WebView and the notification listener. Nothing is
 * scanned here; this plugin reports access state, opens the system settings and
 * hands the UI the stored (already masked) records.
 */
@CapacitorPlugin(
    name = "ScamShield",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])]
)
class ScamShieldPlugin : Plugin() {

    private val recordListener: (ScanRecord, String) -> Unit = { record, label ->
        val payload = recordToJson(record, label)
        notifyListeners("notificationScanned", payload)
    }

    override fun load() {
        ScanBus.subscribe(recordListener)
    }

    override fun handleOnDestroy() {
        ScanBus.unsubscribe(recordListener)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun isListenerEnabled(call: PluginCall) {
        val context = context
        val result = JSObject()
        result.put("enabled", ScamShieldListenerService.hasAccess(context))
        result.put("scanning", ScamShieldListenerService.isScanningEnabled(context))
        result.put("postNotifications", canPostNotifications())
        result.put("debug", BuildConfig.DEBUG)
        result.put("sdk", Build.VERSION.SDK_INT)
        call.resolve(result)
    }

    @PluginMethod
    fun openListenerSettings(call: PluginCall) {
        val context = context
        var opened = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Per-app detail page where "Allow restricted settings" lives.
            val detail = Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
                putExtra(
                    Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                    ComponentName(context, ScamShieldListenerService::class.java).flattenToString()
                )
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            opened = try {
                context.startActivity(detail)
                true
            } catch (_: Throwable) {
                false
            }
        }
        if (!opened) {
            val list = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            opened = try {
                context.startActivity(list)
                true
            } catch (_: Throwable) {
                false
            }
        }
        call.resolve(JSObject().put("opened", opened))
    }

    @PluginMethod
    fun requestPostNotifications(call: PluginCall) {
        if (canPostNotifications() || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAlias("notifications", call, "notificationsCallback")
    }

    @PermissionCallback
    private fun notificationsCallback(call: PluginCall) {
        call.resolve(JSObject().put("granted", canPostNotifications()))
    }

    @PluginMethod
    fun setScanning(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: true
        ScamShieldListenerService.setScanningEnabled(context, enabled)
        call.resolve(JSObject().put("enabled", enabled))
    }

    @PluginMethod
    fun getRecent(call: PluginCall) {
        val items = JSArray()
        for (record in RecentStore(context).all()) {
            items.put(recordToJson(record, ScamShieldListenerService.appLabel(context, record.packageName)))
        }
        call.resolve(JSObject().put("items", items))
    }

    @PluginMethod
    fun clearRecent(call: PluginCall) {
        RecentStore(context).clear()
        call.resolve(JSObject().put("cleared", true))
    }

    /** Opens this app's system page, where "Allow restricted settings" can be reached. */
    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val opened = try {
            context.startActivity(intent)
            true
        } catch (_: Throwable) {
            false
        }
        call.resolve(JSObject().put("opened", opened))
    }

    private fun canPostNotifications(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    private fun recordToJson(record: ScanRecord, label: String): JSObject = JSObject().apply {
        put("packageName", record.packageName)
        put("appLabel", label)
        put("verdict", record.verdict)
        put("score", record.score)
        put("at", record.at)
        put("snippet", record.snippet)
    }
}
