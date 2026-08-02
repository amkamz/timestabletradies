plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

/**
 * Pure Kotlin. No Android, deliberately — this module is the part of the
 * client that iOS inherits (docs/native/README.md §0.3), and the root build
 * script fails the build if an Android plugin is ever applied to it.
 *
 * That constraint is why session storage is an interface here rather than
 * EncryptedSharedPreferences: keeping the platform's keystore out of this
 * module is exactly what makes it portable.
 */
kotlin {
    jvmToolchain(17)
}

dependencies {
    api(project(":core:model"))

    implementation(platform(libs.supabase.bom))
    api(libs.supabase.auth)
    api(libs.supabase.postgrest)
    api(libs.supabase.functions)
    implementation(libs.ktor.client.okhttp)

    api(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit)
}
