package com.timestabletradies.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopChoice
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.Storyboard
import com.timestabletradies.ui.state.TradieDraft
import kotlin.random.Random

/**
 * A5 · Pick your look — step 3 of 3.
 *
 * Models are numbered, never named by type, and there is no male/female toggle,
 * label or category anywhere in the flow. That is a data-model decision as much
 * as a UI one: nothing stored about a character can leak a gendered reading
 * because nothing gendered is ever collected (`lib/game/character.ts`).
 */
@Composable
fun CharacterGalleryScreen(
    draft: TradieDraft,
    onChange: (TradieDraft) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Paper) {
        StepHeader(step = 3, of = 3, label = "YOUR TRADIE", onBack = onBack)

        Text("Pick your look", style = PopType.DisplayMedium, color = PopTokens.Ink)

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .background(PopTokens.TealPale, RoundedCornerShape(PopTokens.RadiusLg))
                .border(
                    PopTokens.BorderWidth,
                    PopTokens.Ink,
                    RoundedCornerShape(PopTokens.RadiusLg),
                )
                .padding(12.dp),
        ) {
            PopArtSlot(
                label = "CHARACTER\nMODEL ${draft.model} / ${Storyboard.CHARACTER_MODELS}\n(full body)",
                modifier = Modifier.fillMaxWidth().height(236.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth().align(Alignment.CenterStart),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                GalleryArrow("‹", "Previous model") {
                    val next = if (draft.model <= 1) Storyboard.CHARACTER_MODELS else draft.model - 1
                    onChange(draft.copy(model = next))
                }
                GalleryArrow("›", "Next model") {
                    val next = if (draft.model >= Storyboard.CHARACTER_MODELS) 1 else draft.model + 1
                    onChange(draft.copy(model = next))
                }
            }
        }

        SwatchRow(
            label = "SKIN TONE",
            colours = Storyboard.skinTones,
            selectedIndex = draft.skinTone,
            shape = CircleShape,
            onSelect = { onChange(draft.copy(skinTone = it)) },
        )
        SwatchRow(
            label = "HAIR",
            colours = Storyboard.hairColours,
            selectedIndex = draft.hair,
            shape = CircleShape,
            onSelect = { onChange(draft.copy(hair = it)) },
        )

        PopGap(4.dp)

        PopButton(
            text = "LOOKS GOOD →",
            onClick = onNext,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(16.dp)
    }
}

@Composable
private fun GalleryArrow(glyph: String, spoken: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .background(PopTokens.White, CircleShape)
            .border(2.5.dp, PopTokens.Ink, CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = spoken },
        contentAlignment = Alignment.Center,
    ) {
        Text(glyph, style = PopType.Title, color = PopTokens.Ink)
    }
}

@Composable
private fun SwatchRow(
    label: String,
    colours: List<Color>,
    selectedIndex: Int,
    shape: androidx.compose.ui.graphics.Shape,
    onSelect: (Int) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = PopType.Small, color = PopTokens.Mud)
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            colours.forEachIndexed { index, colour ->
                val isOn = index == selectedIndex
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(colour, shape)
                        // Selection is a yellow ring, not a tick over the top:
                        // a swatch's whole job is showing its colour.
                        .border(
                            width = if (isOn) 4.dp else 2.5.dp,
                            color = if (isOn) PopTokens.Yellow else PopTokens.Ink,
                            shape = shape,
                        )
                        .clickable(role = Role.RadioButton) { onSelect(index) }
                        .semantics {
                            selected = isOn
                            contentDescription = "$label option ${index + 1}"
                        },
                )
            }
        }
    }
}

/**
 * A6 · Build your tradie name.
 *
 * Three vetted pools and no free text anywhere — which is what makes moderation
 * unnecessary rather than a queue someone has to staff. Ten of each pool is
 * served so the choice stays small for a child while the underlying variety
 * stays large (`lib/game/names.ts`).
 */
@Composable
fun NameGeneratorScreen(
    draft: TradieDraft,
    onChange: (TradieDraft) -> Unit,
    onConfirm: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Paper) {
        StepHeader(step = 3, of = 3, label = "YOUR NAME", onBack = onBack)

        Text("Build your tradie name", style = PopType.DisplayMedium, color = PopTokens.Ink)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(PopTokens.Ink, RoundedCornerShape(PopTokens.RadiusMd))
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text("YOUR NAME", style = PopType.Small, color = PopTokens.TealLight)
            Text(
                text = draft.fullName,
                style = PopType.DisplayMedium,
                color = PopTokens.Yellow,
            )
        }

        NamePool(
            label = "TRADE",
            options = Storyboard.tradeNames,
            selected = draft.trade,
            selectedFill = PopTokens.Yellow,
            selectedContent = PopTokens.Ink,
            onSelect = { onChange(draft.copy(trade = it)) },
        )
        NamePool(
            label = "ADJECTIVE",
            options = Storyboard.adjectives,
            selected = draft.adjective,
            selectedFill = PopTokens.Teal,
            selectedContent = PopTokens.White,
            onSelect = { onChange(draft.copy(adjective = it)) },
        )
        NamePool(
            label = "SURNAME",
            options = Storyboard.surnames,
            selected = draft.surname,
            selectedFill = PopTokens.Red,
            selectedContent = PopTokens.White,
            onSelect = { onChange(draft.copy(surname = it)) },
        )

        PopGap(4.dp)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton(
                text = "🎲 SHUFFLE",
                onClick = {
                    onChange(
                        draft.copy(
                            trade = Storyboard.tradeNames.random(Random.Default),
                            adjective = Storyboard.adjectives.random(Random.Default),
                            surname = Storyboard.surnames.random(Random.Default),
                        ),
                    )
                },
                tone = PopTone.White,
                size = PopSize.Large,
                modifier = Modifier.weight(1f),
            )
            PopButton(
                text = "THAT'S ME!",
                onClick = onConfirm,
                tone = PopTone.Teal,
                size = PopSize.Large,
                modifier = Modifier.weight(1f),
                shadow = PopShadow.Large,
            )
        }

        PopGap(16.dp)
    }
}

@Composable
private fun NamePool(
    label: String,
    options: List<String>,
    selected: String,
    selectedFill: Color,
    selectedContent: Color,
    onSelect: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = PopType.Small, color = PopTokens.Mud)
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            options.forEach { option ->
                PopChoice(
                    text = option,
                    isSelected = option == selected,
                    onClick = { onSelect(option) },
                    selectedFill = selectedFill,
                    selectedContent = selectedContent,
                )
            }
        }
    }
}

/**
 * A7 · Meet your tradie.
 *
 * The handover from setup to play, and the last screen before the site. It says
 * one thing — this is you, get to work — because the next tap has to land on a
 * job rather than another form.
 */
@Composable
fun MeetTradieScreen(
    draft: TradieDraft,
    onStart: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Red) {
        PopGap(10.dp)

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            PopBanner(
                text = "WELCOME TO THE SITE!",
                fill = PopTokens.Yellow,
                content = PopTokens.Ink,
            )

            PopArtSlot(
                label = "FINISHED\nTRADIE ART\n(chosen look)",
                modifier = Modifier.fillMaxWidth().height(250.dp),
                content = PopTokens.White,
            )

            Text(
                text = draft.fullName,
                style = PopType.DisplayMedium,
                color = PopTokens.White,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "FIRST-YEAR APPRENTICE · READY FOR WORK",
                style = PopType.Small,
                color = PopTokens.RedTint,
                textAlign = TextAlign.Center,
            )
        }

        PopGap(6.dp)

        PopButton(
            text = "START MY FIRST JOB ▸",
            onClick = onStart,
            tone = PopTone.Ink,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}
