# Revue App - EAS Deployment Guide

## Overview
This guide covers deploying the Revue React Native app using Expo Application Services (EAS), including build configuration, update management, and troubleshooting common issues.

## Prerequisites

### 1. System Requirements
- **Node.js**: Version 18+ (EAS default as of Nov 2023)
- **npm/yarn**: Latest version
- **Android Studio**: With Android SDK and NDK installed
- **Xcode**: Version 15+ (for iOS builds)

### 2. Android SDK Setup (Addressing GitHub Issue #997)
The most common local build failure is related to Android SDK configuration. Ensure:

```bash
# Set Android SDK environment variables
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
```

**Required Android Components:**
- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android NDK (latest version)
- CMake
- LLDB

Install these through Android Studio SDK Manager.

### 3. Install EAS CLI
```bash
npm install -g eas-cli
```

## Deployment Strategy: Persistent Staging Flow

We're implementing a persistent staging flow with the following environments:
- **Development**: For local development builds
- **Staging**: For internal testing (TestFlight/Play Store Internal)
- **Production**: For app store releases
- **Preview**: For quick preview builds

## Setup Instructions

### Step 1: Initialize EAS Project
```bash
# Login to your Expo account
eas login

# Initialize EAS in your project
eas init

# This will:
# - Create/link an EAS project
# - Generate a project ID
# - Update your app.config.js with project ID
```

### Step 2: Update Environment Variables
Create a `.env` file with your actual values:
```bash
# Copy from .env.example and fill in real values
cp .env.example .env
```

**Required Environment Variables:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_TMDB_API_KEY`
- `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`
- `EXPO_PUBLIC_NYT_API_KEY`

### Step 3: Install Required Dependencies
```bash
# Install EAS CLI locally and build properties plugin
npm install eas-cli expo-build-properties --save-dev

# Install dependencies
npm install
```

### Step 4: Configure Build Credentials

#### Android Configuration
```bash
# Generate Android keystore
eas credentials -p android

# Follow prompts to:
# - Generate new keystore
# - Set up signing credentials
```

#### iOS Configuration
```bash
# Set up iOS credentials
eas credentials -p ios

# This will:
# - Set up Apple Developer account
# - Generate provisioning profiles
# - Handle certificates
```

### Step 5: Create Initial Builds

#### Development Build (for local testing)
```bash
npm run build:development
```

#### Staging Build (for TestFlight/Internal testing)
```bash
npm run build:staging
```

#### Production Build (for App Store)
```bash
npm run build:production
```

## Build Profiles Explained

### Development Profile
- **Purpose**: Internal testing with dev features
- **Distribution**: Internal
- **Features**: Development client enabled, debug configuration

### Staging Profile
- **Purpose**: Pre-production testing
- **Distribution**: Internal (TestFlight/Play Store Internal Track)
- **Channel**: `staging`
- **Environment**: `EXPO_PUBLIC_ENV=staging`

### Production Profile
- **Purpose**: App store releases
- **Distribution**: Store
- **Channel**: `production`
- **Environment**: `EXPO_PUBLIC_ENV=production`
- **Android**: AAB format for Play Store
- **iOS**: Release configuration

### Preview Profile
- **Purpose**: Quick preview builds for stakeholders
- **Distribution**: Internal
- **Format**: APK for easy installation

## Update Management with EAS Update

### Setting Up Updates
```bash
# Configure update branches
eas update:configure

# Deploy staging update
npm run update:staging

# Deploy production update (after testing)
npm run update:production
```

### Update Workflow
1. **Development**: Test changes locally
2. **Staging Update**: Deploy to staging channel for testing
3. **Staging Validation**: Test on staging builds
4. **Production Update**: Deploy to production channel

## Troubleshooting Common Issues

### Issue 1: Android SDK Not Found (GitHub #997)
**Error**: `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable`

**Solution**:
```bash
# Set environment variables permanently
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"' >> ~/.zshrc
source ~/.zshrc

# Install NDK through Android Studio SDK Manager
# Ensure CMake and LLDB are installed
```

### Issue 2: Node.js Version Compatibility
**Error**: Build fails with Node.js version issues

**Solution**:
- Use Node.js 18+ (EAS default since Nov 2023)
- Update locally: `nvm use 18` or `nvm install 18`

### Issue 3: expo-av Configuration Error
**Error**: `A problem occurred configuring project ':expo-av'`

**Solution**:
- Ensure Android NDK is installed
- Check that `expo-build-properties` plugin is configured
- Verify `compileSdkVersion` and `targetSdkVersion` are set

### Issue 4: Metro Bundle Errors
**Error**: `Task :app:bundleReleaseJsAndAssets FAILED`

**Solution**:
```bash
# Test bundle locally first
npx expo export

# Clear cache if needed
npx expo start --clear
```

### Issue 5: Local Build vs Remote Build Differences
**Symptoms**: Builds work remotely but fail locally

**Solution**:
1. Ensure identical Node.js versions
2. Check environment variables
3. Verify all dependencies are in package.json
4. Test with `eas build --local` for debugging

## CI/CD Integration

### GitHub Actions Example
```yaml
name: EAS Build
on:
  push:
    branches: [main, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --non-interactive --platform all --profile staging
```

## Monitoring and Maintenance

### Build Monitoring
- Monitor build status on [EAS Dashboard](https://expo.dev/)
- Set up build webhooks for notifications
- Track build performance and success rates

### Update Monitoring
- Monitor update adoption rates
- Track rollback needs
- Use EAS Insights for analytics

## Security Considerations

### Environment Variables
- Never commit `.env` files
- Use EAS Secrets for sensitive data
- Different API keys per environment

### Code Signing
- Secure keystore management
- Regular certificate renewal
- Team member access control

## Performance Optimization

### Build Optimization
- Use appropriate build profiles
- Optimize bundle size with Metro
- Monitor build times

### Update Optimization
- Minimize update size
- Test updates thoroughly
- Use gradual rollouts

## Support and Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Expo Discord Community](https://chat.expo.dev/)
- [EAS Build Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)

## Quick Reference Commands

```bash
# Build commands
npm run build:development  # Development build
npm run build:staging     # Staging build  
npm run build:production  # Production build

# Update commands
npm run update:staging     # Deploy staging update
npm run update:production  # Deploy production update

# Submission commands
npm run submit:android     # Submit to Play Store
npm run submit:ios        # Submit to App Store

# Utility commands
eas build --clear-cache    # Clear build cache
eas credentials           # Manage credentials
eas update:configure      # Configure updates
``` 