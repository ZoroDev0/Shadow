package com.scamshield.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The same 101 golden entries the web app and the Python mirror use, run through
 * the on-device QuickJS bridge. Requires a phone or emulator:
 *   ./gradlew connectedDebugAndroidTest
 *
 * backend/golden.json is copied into the androidTest assets at build time by the
 * copyGoldenForAndroidTest task, so there is no committed duplicate to drift.
 */
@RunWith(AndroidJUnit4::class)
class EngineGoldenTest {

    @Test
    fun everyGoldenEntryMatchesVerdictAndScore() {
        val testContext = InstrumentationRegistry.getInstrumentation().context
        val targetContext = InstrumentationRegistry.getInstrumentation().targetContext
        val raw = testContext.assets.open("golden.json").bufferedReader().use { it.readText() }
        val golden = JSONArray(raw)

        val engine = EngineBridge(targetContext)
        val failures = ArrayList<String>()
        var checked = 0

        for (index in 0 until golden.length()) {
            val entry = golden.getJSONObject(index)
            val id = entry.optString("id")
            val expected = entry.getJSONObject("result")
            val got = engine.detect(entry.getString("text"))
            checked++
            if (got == null) {
                failures.add("$id: engine returned null (${engine.loadError()})")
            } else if (got.verdict != expected.getString("verdict") || got.score != expected.getInt("score")) {
                failures.add("$id: expected ${expected.getString("verdict")}/${expected.getInt("score")}, got ${got.verdict}/${got.score}")
            }
        }

        assertEquals("golden entries present", 101, checked)
        if (failures.isNotEmpty()) fail(failures.joinToString("\n"))
    }
}
