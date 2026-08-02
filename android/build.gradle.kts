plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}

/**
 * Guard the iOS inheritance — docs/native/README.md §0.3, §4.2.
 *
 * `:core:model`, and later `:core:network` and `:core:data`, must stay free of
 * Android dependencies. If they do, converting them to Kotlin Multiplatform
 * when iOS starts is a build-file change. If they don't, iOS starts from
 * nothing.
 *
 * Convention will not survive a deadline, so this fails the build instead.
 */
val pureKotlinModules = setOf(":core:model", ":core:network")

subprojects {
    if (path in pureKotlinModules) {
        afterEvaluate {
            plugins.all {
                val id = this::class.java.name
                check(!id.contains("com.android")) {
                    "$path must stay pure Kotlin — it carries the iOS port. " +
                        "An Android plugin was applied to it."
                }
            }
        }
    }
}
