package com.timestabletradies.ui.shop

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopCoin
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopReadout
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTabBody
import com.timestabletradies.core.designsystem.PopTag
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.LockerItem
import com.timestabletradies.ui.state.LockerSlot
import com.timestabletradies.ui.state.ShopCategory
import com.timestabletradies.ui.state.ShopItem

/**
 * F1 · The Hardware Store.
 *
 * **Coins only.** There is no real-money path anywhere on this screen or below
 * it: no dollar prices, no top-ups, no "get more coins" prompt, no ads. Every
 * item is purely cosmetic and none of them touch difficulty or rewards, which
 * is what keeps the shop from becoming a pay-to-win surface a parent has to
 * police (`lib/game/shop.ts`, and §4.5 for why reviewers check).
 */
@Composable
fun ShopScreen(
    coins: Int,
    items: List<ShopItem>,
    category: ShopCategory,
    onCategory: (ShopCategory) -> Unit,
    onPick: (ShopItem) -> Unit,
) {
    PopTabBody(
        // Fixed: the coin count is the one number that decides whether a tile is
        // reachable, so it has to stay on screen while the child browses.
        header = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                PopBanner(text = "HARDWARE STORE", fill = PopTokens.Red)
                PopReadout(
                    value = if (coins < 1000) "$coins" else "%,d".format(coins),
                    spoken = "$coins coins",
                    icon = { PopCoin() },
                )
            }

            CategoryTabs(category = category, onCategory = onCategory)
        },
    ) {
        val shown = items.filter { it.category == category }
        shown.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                row.forEach { item ->
                    ShopTile(
                        item = item,
                        affordable = coins >= item.priceCoins,
                        onClick = { onPick(item) },
                        modifier = Modifier.weight(1f),
                    )
                }
                // Keeps a lone item on the last row at half width rather than
                // stretching it into something that looks like a different card.
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }

        PopGap(24.dp)
    }
}

@Composable
private fun CategoryTabs(category: ShopCategory, onCategory: (ShopCategory) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ShopCategory.entries.forEach { entry ->
            val on = entry == category
            Box(
                modifier = Modifier
                    .background(
                        if (on) PopTokens.Ink else PopTokens.White,
                        RoundedCornerShape(999.dp),
                    )
                    .border(2.dp, PopTokens.Ink, RoundedCornerShape(999.dp))
                    .clickable(role = Role.Tab) { onCategory(entry) }
                    .semantics { selected = on }
                    .padding(horizontal = 14.dp, vertical = 7.dp),
            ) {
                Text(
                    text = entry.label,
                    style = PopType.Small,
                    color = if (on) PopTokens.White else PopTokens.Ink,
                )
            }
        }
    }
}

@Composable
private fun ShopTile(
    item: ShopItem,
    affordable: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PopTapCard(
        onClick = onClick,
        modifier = modifier,
        shadow = PopShadow.Small,
        padding = androidx.compose.foundation.layout.PaddingValues(10.dp),
        spoken = when {
            item.owned -> "${item.name}, owned"
            affordable -> "${item.name}, ${item.priceCoins} coins"
            else -> "${item.name}, ${item.priceCoins} coins, not enough yet"
        },
    ) {
        PopArtSlot(
            label = item.name.uppercase(),
            modifier = Modifier.fillMaxWidth().height(84.dp),
        )
        PopGap(8.dp)
        Text(
            text = item.name,
            style = PopType.Small,
            color = PopTokens.Ink,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        PopGap(6.dp)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    when {
                        item.owned -> PopTokens.SandPanel
                        affordable -> PopTokens.Yellow
                        else -> PopTokens.SandFill
                    },
                    RoundedCornerShape(10.dp),
                )
                .border(2.5.dp, PopTokens.Ink, RoundedCornerShape(10.dp))
                .padding(vertical = 5.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (item.owned) {
                Text("OWNED ✓", style = PopType.Small, color = PopTokens.TealDeep)
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    PopCoin(size = 14.dp)
                    Text(
                        text = "${item.priceCoins}",
                        style = PopType.Small,
                        color = if (affordable) PopTokens.Ink else PopTokens.Sand,
                    )
                }
            }
        }
    }
}

/**
 * F2 · Try it on.
 *
 * A preview before the coins go, on the tradie the child actually plays as.
 * Buyer's remorse over a purely cosmetic item is a small thing for an adult and
 * a large one for a seven-year-old who saved for four days.
 */
@Composable
fun TryOnScreen(
    item: ShopItem,
    coins: Int,
    onBuy: () -> Unit,
    onNotNow: () -> Unit,
    onBack: () -> Unit,
) {
    val affordable = coins >= item.priceCoins

    PopFullScreen(backdrop = PopTokens.TealPale) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopButton(
                text = "‹",
                onClick = onBack,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Back to the shop" },
            )
            Text(item.name, style = PopType.Title, color = PopTokens.Ink)
        }

        PopCard(modifier = Modifier.fillMaxWidth()) {
            PopArtSlot(
                label = "TRADIE WEARING\n${item.name.uppercase()}\n(live preview)",
                modifier = Modifier.fillMaxWidth().height(300.dp),
            )
            PopGap(10.dp)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PopTokens.Yellow, RoundedCornerShape(999.dp))
                    .border(2.5.dp, PopTokens.Ink, RoundedCornerShape(999.dp))
                    .padding(vertical = 6.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("SPIN TO VIEW ↻", style = PopType.Small, color = PopTokens.Ink)
            }
        }

        if (!affordable) {
            // No price in dollars, no route to buy coins — the only way past
            // this is more practice, and that is the entire economy.
            Text(
                text = "You need ${item.priceCoins - coins} more coins. Finish a few " +
                    "more jobs and come back.",
                style = PopType.Small,
                color = PopTokens.Mud,
            )
        }

        PopGap(4.dp)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton(
                text = "NOT NOW",
                onClick = onNotNow,
                tone = PopTone.White,
                size = PopSize.Large,
                modifier = Modifier.weight(1f),
            )
            PopButton(
                text = "BUY · ${item.priceCoins}",
                onClick = onBuy,
                tone = PopTone.Red,
                size = PopSize.Large,
                enabled = affordable && !item.owned,
                modifier = Modifier.weight(1f),
                shadow = PopShadow.Large,
            )
        }

        PopGap(20.dp)
    }
}

/**
 * F3 · The Locker.
 *
 * Where owned gear gets worn. Rare boss drops live here too and are tagged as
 * such — they can never appear in the shop, which is the point of them.
 */
@Composable
fun LockerScreen(
    tradieName: String,
    items: List<LockerItem>,
    slot: LockerSlot,
    onSlot: (LockerSlot) -> Unit,
    onEquip: (LockerItem) -> Unit,
) {
    PopTabBody(
        // Fixed: the preview is the whole point of the screen. Equipping a hat
        // and having to scroll back up to see it lands the change too late to
        // read as cause and effect.
        header = {
            PopBanner(
                text = "${tradieName.uppercase()}'S LOCKER",
                fill = PopTokens.Yellow,
                content = PopTokens.Ink,
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .background(PopTokens.TealPale, RoundedCornerShape(PopTokens.RadiusMd))
                    .border(
                        PopTokens.BorderWidth,
                        PopTokens.Ink,
                        RoundedCornerShape(PopTokens.RadiusMd),
                    )
                    .padding(12.dp),
            ) {
                PopArtSlot(
                    label = "TRADIE\nPREVIEW\n(dress-up)",
                    modifier = Modifier.fillMaxWidth().height(196.dp),
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LockerSlot.entries.forEach { entry ->
                    val on = entry == slot
                    Box(
                        modifier = Modifier
                            .background(
                                if (on) PopTokens.Yellow else PopTokens.White,
                                RoundedCornerShape(PopTokens.RadiusSm),
                            )
                            .border(2.5.dp, PopTokens.Ink, RoundedCornerShape(PopTokens.RadiusSm))
                            .clickable(role = Role.Tab) { onSlot(entry) }
                            .semantics { selected = on }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                    ) {
                        Text(entry.label, style = PopType.Small, color = PopTokens.Ink)
                    }
                }
            }
        },
    ) {
        val shown = items.filter { it.slot == slot }
        shown.chunked(3).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                row.forEach { item ->
                    LockerTile(item = item, onClick = { onEquip(item) }, modifier = Modifier.weight(1f))
                }
                repeat(3 - row.size) { Box(Modifier.weight(1f)) }
            }
        }

        PopGap(24.dp)
    }
}

@Composable
private fun LockerTile(item: LockerItem, onClick: () -> Unit, modifier: Modifier = Modifier) {
    PopTapCard(
        onClick = onClick,
        modifier = modifier,
        shadow = PopShadow.Small,
        enabled = item.owned && !item.equipped,
        padding = androidx.compose.foundation.layout.PaddingValues(8.dp),
        spoken = when {
            !item.owned -> "${item.name}, locked"
            item.equipped -> "${item.name}, worn"
            else -> "${item.name}, tap to wear"
        },
    ) {
        if (item.rare) {
            PopTag(text = "RARE", fill = PopTokens.Teal, content = PopTokens.White)
            PopGap(4.dp)
        }
        PopArtSlot(
            label = item.name.uppercase(),
            modifier = Modifier.fillMaxWidth().height(62.dp),
        )
        PopGap(6.dp)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    when {
                        !item.owned -> PopTokens.SandPanel
                        item.equipped -> PopTokens.Teal
                        else -> PopTokens.Yellow
                    },
                    RoundedCornerShape(8.dp),
                )
                .border(2.dp, PopTokens.Ink, RoundedCornerShape(8.dp))
                .padding(vertical = 4.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = when {
                    !item.owned -> "LOCKED"
                    item.equipped -> "ON"
                    else -> "WEAR"
                },
                style = PopType.Small,
                color = when {
                    !item.owned -> PopTokens.Sand
                    item.equipped -> PopTokens.White
                    else -> PopTokens.Ink
                },
            )
        }
    }
}
