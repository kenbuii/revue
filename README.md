# Revue

This is a placeholder README. It will be updated as we keep going. This project is running on React Native, with a Supabase backend and deployed on Expo Go and on TestFlight.

## How to use github

1. commit *constantly*!!!!!!!!!
2. commit, and then push updates
3. pull from origin *before* you start editing code. no one wants to deal with merge error clearing/overwrites

## Instructions on running on local

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```
3. Find the QR code in the terminal output and scan it with your phone, OR open Expo Go on your phone and connect to the local server.

4. If there are issues, you likely need to update Expo Go or update the local Expo packages on your local machine. Try the following commands:
   ```bash
   npm install --global expo-cli
   ```

##ALL INSTRUCTIONS BELOW ARE BOILERPLATE. Ignore.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.
