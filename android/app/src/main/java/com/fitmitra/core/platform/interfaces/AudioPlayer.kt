package com.fitmitra.core.platform.interfaces

enum class AudioCue {
    REP_SUCCESS,
    COUNTDOWN_TICK,
    WORKOUT_COMPLETE,
    FORM_WARNING,
    BREAK_BELL
}

interface IAudioPlayer {
    fun playCue(cue: AudioCue)
    fun setMuted(muted: Boolean)
    fun isMuted(): Boolean
    fun release()
}
