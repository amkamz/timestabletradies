plugins {
    alias(libs.plugins.kotlin.jvm)
}

/**
 * Pure Kotlin. No Android, deliberately — this module is the part of the
 * client that iOS inherits (docs/native/README.md §0.3).
 *
 * Nothing here may import `android.*`, take a `Context`, or depend on an
 * Android library. The root build script fails the build if an Android plugin
 * is ever applied to it.
 */
kotlin {
    jvmToolchain(17)
}

dependencies {
    testImplementation(libs.junit)
}
