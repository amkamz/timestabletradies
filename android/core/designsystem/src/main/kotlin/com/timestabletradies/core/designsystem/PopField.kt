package com.timestabletradies.core.designsystem

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

/**
 * A labelled text field in the Toolbox Pop treatment.
 *
 * Only the grown-up-facing screens use one — account setup, invite codes,
 * redeeming a crew link. Nothing a child touches asks them to type words, which
 * is why the keypad rather than this is the app's main input.
 *
 * The label is a real label rather than a placeholder: placeholder-only fields
 * lose their name the moment a value is typed, and these are the fields a
 * parent is most likely to be filling in while distracted.
 */
@Composable
fun PopTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    isPassword: Boolean = false,
    enabled: Boolean = true,
    fill: Color = PopTokens.White,
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            text = label.uppercase(),
            style = PopType.Small.copy(fontWeight = FontWeight.Black, fontSize = PopType.Small.fontSize * 0.85f),
            color = PopTokens.Mud,
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .popSurface(
                    fill = if (enabled) fill else PopTokens.SandPanel,
                    radius = PopTokens.RadiusSm,
                )
                .padding(horizontal = 13.dp, vertical = 12.dp),
        ) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                enabled = enabled,
                singleLine = true,
                textStyle = PopType.Body.copy(color = PopTokens.Ink),
                cursorBrush = SolidColor(PopTokens.Red),
                visualTransformation = if (isPassword) {
                    PasswordVisualTransformation()
                } else {
                    VisualTransformation.None
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = keyboardType,
                    imeAction = imeAction,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = label },
                decorationBox = { inner ->
                    if (value.isEmpty() && placeholder.isNotEmpty()) {
                        Text(placeholder, style = PopType.Body, color = PopTokens.Sand)
                    }
                    inner()
                },
            )
        }
    }
}
