# Photon POS Android App

A complete Android Studio project that wraps the Photon POS web app in a native WebView.

## What you get

- `AndroidManifest.xml`
- Kotlin `MainActivity` with back-button handling
- Gradle wrapper and build files
- Launcher icons generated from the PWA icon

## Build instructions

1. Install [Android Studio](https://developer.android.com/studio).
2. Extract `Photon-POS-Android.zip` and open the `android-app` folder in Android Studio.
3. Wait for Gradle sync to finish (it will download the SDK components).
4. Connect a device or start an emulator.
5. Click **Run** (the green triangle) to install the debug APK.

## Release APK / Play Store

1. In Android Studio: **Build → Generate Signed App Bundle or APK**.
2. Create or choose a signing keystore.
3. Select **APK** for sideloading or **Android App Bundle (AAB)** for Google Play.

## Changing the URL

Edit `app/src/main/res/values/strings.xml` and change `app_url`:

```xml
<string name="app_url">https://your-custom-domain.com</string>
```

## Notes

- This wrapper requires an internet connection at the shop because it loads the published web app.
- For a more "native" feel, consider a Trusted Web Activity (TWA). This WebView wrapper is the simplest path to a downloadable APK.
