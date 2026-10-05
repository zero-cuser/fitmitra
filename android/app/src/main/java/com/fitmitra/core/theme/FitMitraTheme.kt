package com.fitmitra.core.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = FitMitraColors.Primary,
    onPrimary = FitMitraColors.TextPrimary,
    primaryContainer = FitMitraColors.SurfaceElevated,
    onPrimaryContainer = FitMitraColors.PrimaryBright,
    secondary = FitMitraColors.Secondary,
    onSecondary = FitMitraColors.TextPrimary,
    secondaryContainer = FitMitraColors.SurfaceElevated,
    onSecondaryContainer = FitMitraColors.Secondary,
    tertiary = FitMitraColors.Accent,
    onTertiary = FitMitraColors.Background,
    background = FitMitraColors.Background,
    onBackground = FitMitraColors.TextPrimary,
    surface = FitMitraColors.Surface,
    onSurface = FitMitraColors.TextPrimary,
    surfaceVariant = FitMitraColors.SurfaceElevated,
    onSurfaceVariant = FitMitraColors.TextSecondary,
    error = FitMitraColors.Danger,
    onError = FitMitraColors.TextPrimary
)

@Composable
fun FitMitraAppTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
