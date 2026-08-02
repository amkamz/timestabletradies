package com.timestabletradies.core.network

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest

/**
 * Where the client is built.
 *
 * The publishable key is safe in the binary — it is designed to be, and RLS is
 * what actually protects the data. Anyone who extracts it can still only read
 * rows their session is entitled to, which for an unauthenticated key is none.
 *
 * [sessionManager] is injected rather than defaulted because storing a refresh
 * token is inherently platform work: Android wants EncryptedSharedPreferences,
 * iOS wants the Keychain. Keeping that decision outside this module is what
 * lets the module stay pure Kotlin.
 */
fun createTradiesClient(
    supabaseUrl: String,
    publishableKey: String,
    sessionManager: SessionManager,
): SupabaseClient = createSupabaseClient(
    supabaseUrl = supabaseUrl,
    supabaseKey = publishableKey,
) {
    install(Auth) {
        this.sessionManager = sessionManager
        // The parent's session is long-lived by design — a child handing the
        // tablet back to a parent for a re-login every hour is not a product.
        alwaysAutoRefresh = true
        autoLoadFromStorage = true
    }
    install(Postgrest)

    // Reads go straight to Postgres through RLS; *writes* that mint anything
    // go through Edge Functions, so the server stays the authority on what a
    // run earned (§0.1).
    install(Functions)
}
