package com.scamshield.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScanPolicyTest {
    private fun payload(
        pkg: String = "com.whatsapp",
        title: String = "SBI",
        lines: List<String> = listOf("Your account is blocked. Update KYC now: http://sbi-kyc-update.xyz"),
        ongoing: Boolean = false,
        summary: Boolean = false,
    ) = NotificationPayload(pkg, title, lines, ongoing, summary)

    @Test fun `allowlist covers the six supported apps`() {
        assertEquals(6, ScanPolicy.MESSAGING_PACKAGES.size)
        for (pkg in ScanPolicy.MESSAGING_PACKAGES) assertTrue(pkg, ScanPolicy.isAllowedPackage(pkg, false))
    }

    @Test fun `unlisted apps are ignored, shell only in debug`() {
        assertFalse(ScanPolicy.isAllowedPackage("com.example.bank", false))
        assertFalse(ScanPolicy.isAllowedPackage(ScanPolicy.SHELL_PACKAGE, false))
        assertTrue(ScanPolicy.isAllowedPackage(ScanPolicy.SHELL_PACKAGE, true))
    }

    @Test fun `own notifications never scan`() {
        assertFalse(ScanPolicy.shouldScan(payload(pkg = ScanPolicy.OWN_PACKAGE), true))
    }

    @Test fun `ongoing and group summaries are skipped`() {
        assertFalse(ScanPolicy.shouldScan(payload(ongoing = true), true))
        assertFalse(ScanPolicy.shouldScan(payload(summary = true), true))
    }

    @Test fun `empty and redacted bodies are skipped`() {
        assertFalse(ScanPolicy.shouldScan(payload(title = "", lines = listOf("   ")), true))
        assertFalse(ScanPolicy.shouldScan(payload(title = "", lines = listOf("Redacted")), true))
        assertFalse(ScanPolicy.shouldScan(payload(title = "", lines = listOf("[Redacted]")), true))
    }

    @Test fun `a real message scans and joins title with body`() {
        val p = payload()
        assertTrue(ScanPolicy.shouldScan(p, false))
        assertTrue(ScanPolicy.messageText(p).startsWith("SBI: Your account is blocked"))
    }

    @Test fun `long messages are capped at 4000 characters`() {
        val text = ScanPolicy.messageText(payload(title = "", lines = listOf("x".repeat(9000))))
        assertEquals(4000, text.length)
    }

    @Test fun `digit runs of four or more are masked`() {
        // A fixed placeholder, not a same-length mask: the original digit count
        // is one more thing the stored snippet should not reveal.
        assertEquals("OTP •••• for •••• do not share", ScanPolicy.maskDigits("OTP 1234 for 98765 do not share"))
        assertEquals("Order 123 is ready", ScanPolicy.maskDigits("Order 123 is ready"))
        assertEquals("Call ••••", ScanPolicy.maskDigits("Call 9876543210"))
    }

    @Test fun `snippet collapses whitespace and caps length`() {
        assertEquals("Hi there", ScanPolicy.snippet("  Hi   there \n"))
        assertEquals(160, ScanPolicy.snippet("a".repeat(400)).length)
    }

    @Test fun `duplicate notification inside the gap is dropped`() {
        var now = 1_000L
        val dedupe = ScanDedupe(clock = { now })
        assertTrue(dedupe.accept("com.whatsapp", "hello"))
        now += 500
        assertFalse("same text inside 1.5s", dedupe.accept("com.whatsapp", "hello"))
        now += 2_000
        assertTrue("different text later", dedupe.accept("com.whatsapp", "hello again"))
    }

    @Test fun `a burst is rate limited`() {
        var now = 0L
        val dedupe = ScanDedupe(clock = { now }, maxPerWindow = 3, windowMs = 60_000)
        repeat(3) { i -> assertTrue(dedupe.accept("org.telegram.messenger", "msg $i")); now += 2_000 }
        assertFalse(dedupe.accept("org.telegram.messenger", "msg 3"))
        now += 61_000
        assertTrue(dedupe.accept("org.telegram.messenger", "msg 4"))
    }
}
