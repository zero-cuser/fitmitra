package com.fitmitra.core.platform.interfaces

interface ISpeechProvider {
    fun speak(text: String, priority: Boolean = false)
    fun cancel()
    fun setEnabled(enabled: Boolean)
    fun isEnabled(): Boolean
    fun release()
}
