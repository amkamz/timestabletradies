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
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:designsystem"))
    implementation(project(":core:network"))
    implementation(libs.androidx.security.crypto)

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
