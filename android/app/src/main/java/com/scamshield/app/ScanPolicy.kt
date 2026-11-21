package com.scamshield.app

/**
 * Device-independent scanning rules. No Android imports on purpose: this file is
 * covered by plain JVM unit tests (`src/test/...`), so the filtering, masking and
 * de-duplication logic runs without a phone or an emulator.
 */
data class NotificationPayload(
    val packageName: String,
    val title: String,
    val lines: List<String>,
    val isOngoing: Boolean = false,
    val isGroupSummary: Boolean = false,
    val isClearable: Boolean = true,
)

object ScanPolicy {
    const val OWN_PACKAGE = "com.scamshield.app"
    const val MAX_MESSAGE_CHARS = 4000
    const val MIN_MESSAGE_CHARS = 4
    /** Shown by the system instead of the body when the lock screen hides content. */
    private val REDACTED = setOf("redacted", "[redacted]")

    /** Messaging apps only. Group-chat and broadcast apps that ship SMS are NOT here. */
    val MESSAGING_PACKAGES: Set<String> = setOf(
        "com.google.android.apps.messaging", // Google Messages
        "com.samsung.android.messaging",     // Samsung Messages
        "com.whatsapp",                      // WhatsApp
        "com.whatsapp.w4b",                  // WhatsApp Business
        "org.telegram.messenger",            // Telegram
        "com.truecaller",                    // Truecaller
    )

    /** Debug builds also accept `adb shell cmd notification post`, which posts as the shell. */
    const val SHELL_PACKAGE = "com.android.shell"

    fun isAllowedPackage(packageName: String, debuggable: Boolean): Boolean =
        packageName in MESSAGING_PACKAGES || (debuggable && packageName == SHELL_PACKAGE)

    /** Title and body joined, capped, with the source app's own boilerplate removed. */
    fun messageText(payload: NotificationPayload): String {
        val body = payload.lines
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .joinToString(" ")
        val title = payload.title.trim()
        val text = when {
            title.isEmpty() -> body
            body.isEmpty() -> title
            else -> "$title: $body"
        }
        return text.trim().take(MAX_MESSAGE_CHARS)
    }

    fun shouldScan(payload: NotificationPayload, debuggable: Boolean): Boolean {
        if (payload.packageName == OWN_PACKAGE) return false
        if (!isAllowedPackage(payload.packageName, debuggable)) return false
        if (payload.isOngoing) return false          // media players, foreground services
        if (payload.isGroupSummary) return false     // the summary repeats the children
        val text = messageText(payload)
        if (text.length < MIN_MESSAGE_CHARS) return false
        if (text.lowercase() in REDACTED) return false
        if (text.all { it.isWhitespace() }) return false
        return true
    }

    /** Digit runs of four or more are masked before anything is stored. */
    fun maskDigits(text: String): String = text.replace(Regex("\\d{4,}"), "••••")

    /** Short, storage-safe preview: masked digits, collapsed whitespace, capped. */
    fun snippet(text: String, limit: Int = 160): String =
        maskDigits(text.replace(Regex("\\s+"), " ").trim()).take(limit)
}

/**
 * Drops repeats and bursts. A notification is accepted when the same source+text
 * was not seen within [sameGapMs] and fewer than [maxPerWindow] were accepted in
 * the last [windowMs]. The clock is injectable so tests are deterministic.
 */
class ScanDedupe(
    private val clock: () -> Long = System::currentTimeMillis,
    private val windowMs: Long = 60_000,
    private val maxPerWindow: Int = 10,
    private val sameGapMs: Long = 1_500,
) {
    private val lastByKey = HashMap<String, Long>()
    private val accepted = ArrayDeque<Long>()

    @Synchronized
    fun accept(packageName: String, text: String): Boolean {
        val now = clock()
        while (accepted.isNotEmpty() && now - accepted.first() > windowMs) accepted.removeFirst()
        if (accepted.size >= maxPerWindow) return false
        val key = packageName + "|" + text.hashCode()
        val previous = lastByKey[key]
        if (previous != null && now - previous < sameGapMs) return false
        lastByKey[key] = now
        if (lastByKey.size > 200) lastByKey.keys.filter { k -> now - (lastByKey[k] ?: 0L) > windowMs }.forEach { lastByKey.remove(it) }
        accepted.addLast(now)
        return true
    }
}
