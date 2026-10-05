package com.fitmitra.core.platform.android

import android.content.Context
import android.speech.tts.TextToSpeech
import com.fitmitra.core.platform.interfaces.ISpeechProvider
import java.util.Locale

/**
 * Text-to-speech engine wrapper with throttling lockout to prevent overlapping voice prompts.
 */
class AndroidSpeechProvider(
    context: Context,
    private val throttleIntervalMs: Long = 4000L
) : ISpeechProvider {

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private var isEnabled = true
    private var lastSpokeTimestamp = 0L

    init {
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.US
                tts?.setSpeechRate(1.05f)
                isInitialized = true
            }
        }
    }

    override fun speak(text: String, priority: Boolean) {
        if (!isEnabled || !isInitialized) return

        val now = System.currentTimeMillis()
        if (!priority && (now - lastSpokeTimestamp) < throttleIntervalMs) {
            return
        }

        lastSpokeTimestamp = now
        val queueMode = if (priority) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
        tts?.speak(text, queueMode, null, text.hashCode().toString())
    }

    override fun cancel() {
        tts?.stop()
    }

    override fun setEnabled(enabled: Boolean) {
        this.isEnabled = enabled
        if (!enabled) {
            cancel()
        }
    }

    override fun isEnabled(): Boolean = isEnabled

    override fun release() {
        try {
            cancel()
            tts?.shutdown()
        } catch (_: Exception) {
        } finally {
            tts = null
            isInitialized = false
        }
    }
}
