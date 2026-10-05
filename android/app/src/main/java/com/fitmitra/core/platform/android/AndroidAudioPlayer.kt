package com.fitmitra.core.platform.android

import android.media.AudioManager
import android.media.ToneGenerator
import com.fitmitra.core.platform.interfaces.AudioCue
import com.fitmitra.core.platform.interfaces.IAudioPlayer

/**
 * Low-latency audio cue player using Android ToneGenerator.
 * Provides immediate auditory feedback for reps, timers, and form cues without loading heavy audio assets.
 */
class AndroidAudioPlayer : IAudioPlayer {

    private var toneGenerator: ToneGenerator? = null
    private var isMuted = false

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 85)
        } catch (_: Exception) {
            toneGenerator = null
        }
    }

    override fun playCue(cue: AudioCue) {
        if (isMuted) return
        val gen = toneGenerator ?: return

        try {
            when (cue) {
                AudioCue.REP_SUCCESS -> {
                    // High-pitch positive chirp (120ms)
                    gen.startTone(ToneGenerator.TONE_PROP_BEEP, 120)
                }
                AudioCue.COUNTDOWN_TICK -> {
                    // Short soft tick (60ms)
                    gen.startTone(ToneGenerator.TONE_PROP_PROMPT, 60)
                }
                AudioCue.WORKOUT_COMPLETE -> {
                    // Ascending affirmative alert (350ms)
                    gen.startTone(ToneGenerator.TONE_PROP_ACK, 350)
                }
                AudioCue.FORM_WARNING -> {
                    // Double warning beep (150ms)
                    gen.startTone(ToneGenerator.TONE_PROP_BEEP2, 150)
                }
                AudioCue.BREAK_BELL -> {
                    // Keypad bell tone (200ms)
                    gen.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 200)
                }
            }
        } catch (_: Exception) {
            // Non-fatal audio exception
        }
    }

    override fun setMuted(muted: Boolean) {
        this.isMuted = muted
    }

    override fun isMuted(): Boolean = isMuted

    override fun release() {
        try {
            toneGenerator?.release()
        } catch (_: Exception) {
        } finally {
            toneGenerator = null
        }
    }
}
