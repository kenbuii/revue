require('dotenv').config();

export default {
  expo: {
    name: "revue",
    slug: "revue-cs278",
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
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
      googleBooksApiKey: process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY,
    }
  }
}; 