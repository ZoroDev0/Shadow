package com.scamshield.app

import java.util.concurrent.CopyOnWriteArrayList

/** In-process only: the listener service notifies the open app, nothing else. */
object ScanBus {
    private val listeners = CopyOnWriteArrayList<(ScanRecord, String) -> Unit>()

    fun subscribe(listener: (ScanRecord, String) -> Unit) {
        listeners.addIfAbsent(listener)
    }

    fun unsubscribe(listener: (ScanRecord, String) -> Unit) {
        listeners.remove(listener)
    }

    fun emit(record: ScanRecord, appLabel: String) {
        for (listener in listeners) {
            try {
                listener(record, appLabel)
            } catch (_: Throwable) {
                // A broken WebView must never break the scan path.
            }
        }
    }
}
