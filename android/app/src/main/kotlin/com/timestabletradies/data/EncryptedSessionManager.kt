package com.timestabletradies.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.serialization.json.Json

/**
 * Where the parent's refresh token lives.
 *
 * This is the Android half of the split described in `SupabaseFactory` — the
 * `:core:network` module defines *that* a session is stored, and this decides
 * *how*, because a keystore is inherently platform work. iOS will supply a
 * Keychain-backed equivalent and share everything else.
 *
 * It matters that this is encrypted rather than plain SharedPreferences. On
 * the web the session sits in httpOnly cookies a script cannot touch; on a
 * device the equivalent guarantee is the hardware keystore. The account this
 * protects is the *parent's* — it reaches billing and every child in the
 * family, which is precisely why kids never get one of their own.
 */
class EncryptedSessionManager(context: Context) : SessionManager {

    private val json = Json { ignoreUnknownKeys = true }

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context.applicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context.applicationContext,
            FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override suspend fun saveSession(session: UserSession) {
        // Explicit serializer: the reified overload collides with the one
        // taking a SerializationStrategy and picks the wrong one here.
        val encoded = json.encodeToString(UserSession.serializer(), session)
        prefs.edit().putString(KEY_SESSION, encoded).apply()
    }

    override suspend fun loadSession(): UserSession? {
        val stored = prefs.getString(KEY_SESSION, null) ?: return null
        // A session that won't parse is a session we can't refresh from, so
        // drop it and make the parent sign in rather than failing obscurely
        // on every request afterwards.
        return runCatching { json.decodeFromString(UserSession.serializer(), stored) }
            .getOrElse {
                prefs.edit().remove(KEY_SESSION).apply()
                null
            }
    }

    override suspend fun deleteSession() {
        prefs.edit().remove(KEY_SESSION).apply()
    }

    private companion object {
        const val FILE_NAME = "tradies_session"
        const val KEY_SESSION = "supabase_session"
    }
}
