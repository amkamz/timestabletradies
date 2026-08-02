pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "TimesTableTradies"

include(":app")

// Pure-Kotlin modules. These must never gain an Android dependency — see
// docs/native/README.md §0.3 and the check in build.gradle.kts.
include(":core:model")
include(":core:network")

// Android-aware modules.
include(":core:designsystem")
