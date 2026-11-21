package com.scamshield.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class ScanRecord(
    val packageName: String,
    val verdict: String,
    val score: Int,
    val at: Long,
    val snippet: String,
)

/**
 * The only thing persisted from a scan: source app, verdict, score, timestamp and
 * a snippet with every digit run of four or more masked. The full message text is
 * never written to disk and never leaves the device.
 */
class RecentStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun add(record: ScanRecord) {
        val items = all().toMutableList()
        items.add(0, record)
        val trimmed = items.take(MAX_ITEMS)
        val array = JSONArray()
        for (item in trimmed) {
            array.put(
                JSONObject()
                    .put("packageName", item.packageName)
                    .put("verdict", item.verdict)
                    .put("score", item.score)
                    .put("at", item.at)
                    .put("snippet", item.snippet)
            )
        }
        prefs.edit().putString(KEY, array.toString()).apply()
    }

    fun all(): List<ScanRecord> {
        val raw = prefs.getString(KEY, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).mapNotNull { index ->
                val obj = array.optJSONObject(index) ?: return@mapNotNull null
                ScanRecord(
                    packageName = obj.optString("packageName"),
                    verdict = obj.optString("verdict"),
                    score = obj.optInt("score"),
                    at = obj.optLong("at"),
                    snippet = obj.optString("snippet"),
                )
            }
        } catch (t: Throwable) {
            emptyList()
        }
    }

    fun clear() {
        prefs.edit().remove(KEY).apply()
    }

    companion object {
        private const val PREFS = "scamshield.recent"
        private const val KEY = "scans"
        const val MAX_ITEMS = 25
    }
}
