package com.timestabletradies

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.timestabletradies.core.designsystem.PopTheme
import com.timestabletradies.ui.TradiesApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            // reducedMotion and textScale will come from student_settings once
            // there is a session; the theme already ORs in the OS preference.
            PopTheme {
                TradiesApp()
            }
        }
    }
}
