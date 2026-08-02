package com.timestabletradies.data

import android.content.Context
import com.timestabletradies.BuildConfig
import com.timestabletradies.core.network.TradiesRepository
import com.timestabletradies.core.network.createTradiesClient

/**
 * Hand-rolled dependency wiring.
 *
 * Deliberately not Koin yet — there are two objects. The plan picks Koin over
 * Hilt when this grows (§2.1), because Koin is KMP-viable and Hilt is
 * Android-only, and that choice is what keeps `:core:network` portable. Adding
 * a container for two singletons now would be ceremony.
 */
object Graph {

    @Volatile
    private var repository: TradiesRepository? = null

    fun repository(context: Context): TradiesRepository =
        repository ?: synchronized(this) {
            repository ?: build(context).also { repository = it }
        }

    private fun build(context: Context): TradiesRepository {
        val client = createTradiesClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            publishableKey = BuildConfig.SUPABASE_KEY,
            sessionManager = EncryptedSessionManager(context),
        )
        return TradiesRepository(client)
    }

    /** True when `.env.local` was missing at build time. */
    val isConfigured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_KEY.isNotBlank()
}
