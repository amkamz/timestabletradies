package com.timestabletradies.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.network.StudentDto
import com.timestabletradies.core.network.TradiesRepository

/**
 * Which tradie is playing.
 *
 * On the web this selection is an httpOnly cookie the client cannot set. Here
 * it is held in memory for the session, which is weaker — and §0.5 of the plan
 * is the fix: a `student_id` claim minted into the JWT, so RLS itself scopes
 * writes to the chosen profile. Until that lands, RLS still stops any
 * cross-*family* access; what it doesn't yet stop is a sibling's profile
 * within the same family.
 */
@Composable
fun StudentPickerScreen(
    repository: TradiesRepository,
    onPicked: (StudentDto) -> Unit,
    onSignOut: () -> Unit,
) {
    var students by remember { mutableStateOf<List<StudentDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        runCatching { repository.students() }
            .onSuccess { students = it }
            .onFailure { error = it.message ?: "Couldn't load profiles." }
    }

    PopScreen(title = "Who's working today?") {
        when {
            error != null -> ErrorCard(error!!)

            students == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }

            students!!.isEmpty() -> PopCard(
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.SandPanel,
            ) {
                Text("No tradies yet", style = PopType.Title, color = PopTokens.Ink)
                Text(
                    text = "Add a child profile on the website — onboarding " +
                        "isn't built in the app yet.",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }

            else -> students!!.forEach { student ->
                StudentCard(student = student, onClick = { onPicked(student) })
            }
        }

        Spacer(Modifier.height(8.dp))

        PopButton(
            text = "Sign out",
            onClick = onSignOut,
            tone = PopTone.White,
            size = PopSize.Small,
        )

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StudentCard(student: StudentDto, onClick: () -> Unit) {
    PopCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onClick),
        shadow = PopShadow.Medium,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            // Character art is a labelled placeholder throughout the app,
            // pending an illustrator — see the README.
            Column(
                modifier = Modifier
                    .size(48.dp)
                    .popSurface(
                        fill = PopTokens.TealTint,
                        radius = PopTokens.RadiusSm,
                        shadow = PopShadow.Small,
                    ),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = student.displayName.take(1).uppercase(),
                    style = PopType.Title,
                    color = PopTokens.TealDeep,
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(student.displayName, style = PopType.Title, color = PopTokens.Ink)
                Text(
                    text = student.tradieName.takeIf { it != student.displayName }
                        ?: "Tap to start",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }
            Text("→", style = PopType.Title, color = PopTokens.Ink)
        }
    }
}

@Composable
internal fun ErrorCard(message: String) {
    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.RedTint) {
        Text("Something went wrong", style = PopType.Title, color = PopTokens.RedDeep)
        Text(message, style = PopType.Small, color = PopTokens.Ink)
    }
}
