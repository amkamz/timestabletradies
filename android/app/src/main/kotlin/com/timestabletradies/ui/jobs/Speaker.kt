package com.timestabletradies.ui.jobs

import android.speech.tts.TextToSpeech
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import java.util.Locale

/**
 * Read-aloud, for the `read_aloud` accessibility setting (§2.7).
 *
 * Android's `TextToSpeech`; iOS gets `AVSpeechSynthesizer` for the same
 * behaviour. This is the reason [com.timestabletradies.core.model.Question]
 * carries a separate `spoken` field — "seven times eight" rather than "seven
 * multiplication-sign eight", which is what a synthesiser makes of `7 × 8`.
 *
 * It is deliberately *not* a substitute for TalkBack. A child using a screen
 * reader gets the question through the semantics tree; this is for a child who
 * can see the screen and cannot yet read it fluently, and both have to work.
 */
class Speaker(private val engine: TextToSpeech?) {
    fun say(text: String) {
        engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tradies-read-aloud")
    }

    fun stop() {
        engine?.stop()
    }
}

/**
 * A synthesiser bound to the composition's lifetime.
 *
 * Shut down on dispose rather than left running — an orphaned engine keeps an
 * audio focus request alive, which on some devices ducks whatever the family
 * had playing in the car.
 */
@Composable
fun rememberSpeaker(enabled: Boolean): Speaker {
    val context = LocalContext.current
    if (!enabled) return remember { Speaker(null) }

    val holder = remember { arrayOfNulls<TextToSpeech>(1) }

    DisposableEffect(context) {
        val tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                holder[0]?.language = Locale.getDefault()
            }
        }
        holder[0] = tts
        onDispose {
            tts.stop()
            tts.shutdown()
            holder[0] = null
        }
    }

    return remember(holder) { Speaker(holder[0]) }
}
