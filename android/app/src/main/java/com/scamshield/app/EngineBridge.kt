package com.scamshield.app

import android.content.Context
import app.cash.quickjs.QuickJs
import org.json.JSONObject
import java.text.Normalizer

data class EngineVerdict(val verdict: String, val score: Int)

/**
 * Runs the bundled detector (src/detection via esbuild) inside QuickJS.
 *
 * QuickJS has no ICU, so the text is normalised with java.text.Normalizer
 * (exact NFKC, ICU-backed) before it goes in; NFKC is idempotent, so the bundle's
 * own normalize call is a no-op there. src/native/androidEngineGolden.test.ts
 * proves this path returns every golden verdict and score exactly.
 *
 * QuickJs is not thread-safe: one instance, one lock, created lazily.
 */
class EngineBridge(context: Context) {
    private val appContext = context.applicationContext
    private val lock = Any()
    private var js: QuickJs? = null
    private var broken: String? = null

    private fun runtimeLocked(): QuickJs? {
        js?.let { return it }
        broken?.let { return null }
        return try {
            val source = appContext.assets.open("engine/engine.js").bufferedReader().use { it.readText() }
            val instance = QuickJs.create()
            instance.evaluate(source)
            js = instance
            instance
        } catch (t: Throwable) {
            broken = t.message ?: t.javaClass.simpleName
            null
        }
    }

    /** Null when the bundle or the message could not be analysed. Never throws. */
    fun detect(rawText: String): EngineVerdict? = synchronized(lock) {
        val runtime = runtimeLocked() ?: return null
        return try {
            val input = Normalizer.normalize(rawText, Normalizer.Form.NFKC)
            // org.json quotes a valid JS string literal (quotes and control
            // characters escaped), so no interpolation of raw text happens.
            val literal = JSONObject.quote(input)
            val json = runtime.evaluate("JSON.stringify(ShadowEngine.detectLocal($literal))") as? String ?: return null
            val obj = JSONObject(json)
            EngineVerdict(obj.optString("verdict", "safe"), obj.optInt("score", 0))
        } catch (t: Throwable) {
            null
        }
    }

    fun loadError(): String? = broken
}
