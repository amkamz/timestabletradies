import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

/**
 * Supabase config, read from the web app's `.env.local` so there is one copy.
 *
 * The publishable key is meant to ship in client code — RLS is what protects
 * the data, and an unauthenticated key can read nothing. Duplicating it into a
 * second file would only create a second thing to rotate.
 */
val envProperties = Properties().apply {
    val envFile = rootProject.file("../.env.local")
    if (envFile.exists()) envFile.inputStream().use { load(it) }
}

fun env(key: String): String = envProperties.getProperty(key).orEmpty()

android {
    namespace = "com.timestabletradies"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.timestabletradies"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "SUPABASE_URL", "\"${env("NEXT_PUBLIC_SUPABASE_URL")}\"")
        buildConfigField(
            "String",
            "SUPABASE_KEY",
            "\"${env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")}\"",
        )

        // The Godot library ships native engine builds for every Android ABI,
        // and each one is tens of megabytes. Shipping all four would quadruple
        // the APK to carry three the device can never load — arm64 is every
        // phone and tablet this will run on. Play delivers per-ABI splits at
        // release; this is what keeps the debug build installable.
        ndk {
            abiFilters += listOf("arm64-v8a")
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        jvmToolchain(17)
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    androidResources {
        /*
         * Leave the Godot pack uncompressed in the APK.
         *
         * `AssetManager.openFd()` only works on *stored* assets — ask it for a
         * deflated one and it throws FileNotFoundException. AAPT compresses
         * `.pck` by default, so the engine's data was in the APK the whole time
         * and every check for it said no. The failure is silent and reads
         * exactly like a missing file.
         *
         * It is also wasted work: a .pck is already a packed archive, and this
         * one deflated by 7%.
         */
        noCompress += listOf("pck", "sparsepck")

        /*
         * Keep dot-directories in assets.
         *
         * AAPT's default ignore pattern contains `.*`, which silently drops
         * every dotfile and dot-directory under `assets/`. Godot's exported
         * project keeps its imported resources and its script class cache in
         * `assets/.godot/`, so the default pattern removed the entire compiled
         * half of the project on the way into the APK — and the engine then
         * booted, initialised Vulkan, and failed reading its own class cache.
         *
         * This is the AGP default with `.*` taken out and nothing else changed.
         */
        ignoreAssetsPattern =
            "!.svn:!.git:!.ds_store:!*.scc:<dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"
    }
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:designsystem"))
    implementation(project(":core:network"))
    implementation(libs.androidx.security.crypto)

    /*
     * The Godot engine, as a library.
     *
     * Extracted from `libs/debug/godot-lib.template_debug.aar` inside
     * `android_source.zip` inside the 1.2 GB export templates archive — which
     * is the only place it is published. Not committed: see android/.gitignore
     * and `godot/export-pck.ps1` for how the pair is produced.
     *
     * An .aar carries no transitive dependencies, so anything it compiles
     * against has to be declared here. Fragment is the one that matters —
     * `GodotFragment` is an AndroidX fragment, which is also why MainActivity
     * had to become a FragmentActivity.
     */
    implementation(files("libs/godot-lib.template_debug.aar"))
    implementation("androidx.fragment:fragment-ktx:1.8.5")

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
