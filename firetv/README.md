# StreamHub for Android-based Fire TV

This folder packages the existing StreamHub web application as a **Fire TV launcher app** using the platform's built-in Android WebView. No credentials or Supabase secrets are included in the APK. It loads the existing website over HTTPS, so improvements to the website appear in the app automatically.

## Build (free GitHub Actions path)

1. Open GitHub **Actions → Build StreamHub Fire TV APK**.
2. Select **Run workflow** (or let a change under `firetv/` trigger the build).
3. Open the successful workflow run, then download the **StreamHub-FireTV-debug-APK** artifact.
4. Unzip the artifact and install `app-debug.apk` on a compatible **Fire OS / Android-based** Fire TV device using ADB. Keep the same APK/application ID for subsequent debug updates.

The automated APK is **debug-signed** for personal testing, not a Play Store or Amazon Appstore release. When ready to distribute a release build, use a private release signing key, not one stored in this repository.

## On-device behavior

- Appears in the TV app launcher via `LEANBACK_LAUNCHER`
- Displays StreamHub in landscape with TV Mode enabled, supports D-pad navigation through website controls
- Keeps web local storage and Supabase login cookies within this app's WebView
- Loads only `https://johnck78.github.io/streamhub/` as a main-frame page; network requests for images, TMDB, and Supabase remain possible
- Needs Wi-Fi / internet; no offline catalog is bundled

## Important limitations

- Not compatible with **Vega OS** devices. Vega OS requires a different native app packaging workflow.
- Before giving anyone else the APK, test sign-in, email entry with the on-screen keyboard, directional navigation, and web session persistence on a real Fire TV.
- The site still requires TMDB API configuration on a newly installed device. Do not add private API keys or Supabase service-role keys to source control.
- Browser-based authentication and email links on Fire TV can be inconvenient; use the password sign-in supported by StreamHub v0.7+.
- First run and network failures need actual Fire TV validation.

Official installation instructions: https://developer.amazon.com/docs/fire-tv/installing-and-running-your-app.html
