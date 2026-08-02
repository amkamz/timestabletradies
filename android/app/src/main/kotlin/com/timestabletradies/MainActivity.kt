package com.timestabletradies

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.timestabletradies.core.designsystem.PopTheme
import com.timestabletradies.ui.TradiesApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            // The student's accessibility preferences sit above the theme,
            // because the theme is what applies them — and they have to
            // survive navigation, so they can't live inside a screen.
            var reducedMotion by remember { mutableStateOf(false) }
            var textScale by remember { mutableFloatStateOf(1f) }

            PopTheme(reducedMotion = reducedMotion, textScale = textScale) {
                TradiesApp(
                    onPreferences = { motion, scale ->
                        reducedMotion = motion
                        textScale = scale
                    },
                )
            }
        }
    }
}
