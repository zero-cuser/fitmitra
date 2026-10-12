# FitMitra Android ProGuard / R8 Rules

# Keep Kotlin serialization and domain models
-keepclassmembers class * implements java.io.Serializable { *; }
-keep class com.fitmitra.core.domain.models.** { *; }

# Google ML Kit Pose Detection
-keep class com.google.mlkit.vision.pose.** { *; }
-dontwarn com.google.mlkit.**

# AndroidX CameraX
-keep class androidx.camera.core.** { *; }
-keep class androidx.camera.camera2.** { *; }
-keep class androidx.camera.lifecycle.** { *; }
-keep class androidx.camera.view.** { *; }
-dontwarn androidx.camera.**

# AndroidX DataStore Preferences
-keep class androidx.datastore.preferences.** { *; }

# Jetpack Compose
-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}
