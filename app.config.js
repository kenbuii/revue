require('dotenv').config();

export default {
  expo: {
    name: "revue",
    slug: "revue",
    owner: "kenbui",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "revue",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.revue",
      deploymentTarget: "15.1"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourcompany.revue"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: "34.0.0"
          },
          ios: {
            deploymentTarget: "15.1"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
      googleBooksApiKey: process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY,
      nytApiKey: process.env.EXPO_PUBLIC_NYT_API_KEY,
      eas: {
        projectId: "64f09408-dc10-40fa-b5c8-f80bab5b018f"
      }
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/64f09408-dc10-40fa-b5c8-f80bab5b018f"
    }
  }
}; 