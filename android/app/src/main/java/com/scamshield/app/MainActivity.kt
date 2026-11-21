package com.scamshield.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Must run before super.onCreate so the bridge sees the plugin on load.
        registerPlugin(ScamShieldPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
