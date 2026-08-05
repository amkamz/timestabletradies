package com.timestabletradies.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTag
import com.timestabletradies.core.designsystem.PopTextField
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.dashedBorder

/** A profile being set up. Names are typed by the parent, above the gate. */
data class StudentDraft(val name: String, val year: String)

/**
 * A4 · Who's on the crew? — step 2 of 3.
 *
 * Parent-facing, so it is one of the few screens allowed to mention a price
 * (`FAMILY_LIMITS.maxStudents` is five, and extra children cost). Nothing on
 * this screen is ever shown below the grown-up gate — the child's half of
 * onboarding starts at A5.
 */
@Composable
fun AddStudentScreen(
    students: List<StudentDraft>,
    onAdd: (StudentDraft) -> Unit,
    onRemove: (Int) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    maxStudents: Int = 5,
) {
    var adding by remember { mutableStateOf(students.isEmpty()) }
    var name by remember { mutableStateOf("") }
    var year by remember { mutableStateOf("") }

    PopFullScreen(backdrop = PopTokens.Paper) {
        StepHeader(step = 2, of = 3, label = "PROFILES", onBack = onBack)

        Text("Who's on the crew?", style = PopType.DisplayMedium, color = PopTokens.Ink)

        students.forEachIndexed { index, student ->
            PopCard(
                modifier = Modifier.fillMaxWidth(),
                padding = androidx.compose.foundation.layout.PaddingValues(12.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    AvatarSlot(tint = avatarTint(index))
                    Column(Modifier.weight(1f)) {
                        Text(student.name, style = PopType.Title, color = PopTokens.Ink)
                        Text(student.year, style = PopType.Small, color = PopTokens.Mud)
                    }
                    PopTag(
                        text = "READY",
                        fill = PopTokens.TealTint,
                        content = PopTokens.TealDeep,
                        borderColor = PopTokens.Teal,
                    )
                    PopButton(
                        text = "✕",
                        onClick = { onRemove(index) },
                        tone = PopTone.White,
                        size = PopSize.Small,
                        shadow = PopShadow.Small,
                        modifier = Modifier.semantics {
                            contentDescription = "Remove ${student.name}"
                        },
                    )
                }
            }
        }

        if (adding && students.size < maxStudents) {
            PopCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PopTextField(
                        label = "Their name",
                        value = name,
                        onValueChange = { name = it },
                        placeholder = "Charlie",
                    )
                    PopTextField(
                        label = "Age and year",
                        value = year,
                        onValueChange = { year = it },
                        placeholder = "Age 8 · Year 3",
                        imeAction = ImeAction.Done,
                    )
                    PopButton(
                        text = "ADD TO THE CREW",
                        onClick = {
                            onAdd(StudentDraft(name.trim(), year.trim().ifEmpty { "Year —" }))
                            name = ""
                            year = ""
                            adding = false
                        },
                        tone = PopTone.Teal,
                        size = PopSize.Small,
                        fullWidth = true,
                        enabled = name.isNotBlank(),
                    )
                }
            }
        } else if (students.size < maxStudents) {
            AddAnotherRow(onClick = { adding = true })
        }

        // Parent-facing, above the gate, so the price is allowed to be here —
        // and only here. Nothing below the gate ever names a number in dollars.
        Text(
            text = "${students.size} of $maxStudents profiles used · " +
                "each extra child is \$25/year",
            style = PopType.Small,
            color = PopTokens.Mud,
        )

        PopGap(4.dp)

        PopButton(
            text = "NEXT: PICK LOOKS",
            onClick = onNext,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            enabled = students.isNotEmpty(),
            shadow = PopShadow.Large,
        )

        PopGap(16.dp)
    }
}

@Composable
private fun AddAnotherRow(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .dashedBorder(PopTokens.SandLight, PopTokens.BorderWidth, PopTokens.RadiusMd)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .border(PopTokens.BorderWidth, PopTokens.SandLight, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text("+", style = PopType.DisplayMedium, color = PopTokens.SandLight)
        }
        Text("Add another kid", style = PopType.Body, color = PopTokens.Sand)
    }
}

/**
 * A profile's avatar, before any art exists.
 *
 * Striped rather than blank so two profiles are still distinguishable at a
 * glance on the picker — which is the one screen where a child has to find
 * themselves in a list without reading.
 */
@Composable
fun AvatarSlot(
    tint: Color,
    modifier: Modifier = Modifier,
    size: androidx.compose.ui.unit.Dp = 38.dp,
) {
    val shape = RoundedCornerShape(11.dp)
    Box(
        modifier
            .size(size)
            .background(tint, shape)
            .border(2.5.dp, PopTokens.Ink, shape)
            .semantics { contentDescription = "Profile picture placeholder" },
    )
}

/** Distinct tints so siblings never look the same in a list. */
fun avatarTint(index: Int): Color = AVATAR_TINTS[index % AVATAR_TINTS.size]

private val AVATAR_TINTS = listOf(
    Color(0xFFFFD27A),
    Color(0xFFA7D8FF),
    Color(0xFFC8E6C0),
    Color(0xFFE8C0C0),
    Color(0xFFD8C0E8),
)
