# Hydrate 💧 — Cross-Platform Hydration Accountability

A multi-platform hydration accountability app with seamless real-time bidirectional synchronization between **Native iOS (SwiftUI)** and the **Web Dashboard**, powered by Firebase Free Spark Tier (Authentication + Cloud Firestore).

---

## 🌟 Key Features

1. **Multi-Platform Support**:
   - **Native iOS App**: Built in modern SwiftUI for Xcode, ready for one-click installation on your personal iPhone.
   - **Redesigned Web App**: Public product showcase with a **"Download iOS App"** button that dynamically transforms into the full hydration tracking dashboard upon sign-in.

2. **Real-Time Bidirectional Sync**:
   - Log a drink on your iPhone lock screen or in the app, and the desktop web dashboard instantly updates with live fluid progress animations via Cloud Firestore WebSocket listeners (`onSnapshot` / `addSnapshotListener`).
   - Log a drink on the web, and your iPhone instantly updates in real time.

3. **Zero-Friction Authentication**:
   - One-tap **Sign in with Apple** and **Google Sign-In**.
   - No email verification links, no passwords, no confirmation codes.

4. **3-Step Personalized Onboarding**:
   - **Step 1: Nickname**: *"What should we call you?"* (Custom display name for notifications).
   - **Step 2: Daily Target**: *"What's your goal for each day?"* (Check-in count: 6, 8, 10, 12, or custom stepper).
   - **Step 3: Daily Routine**: *"When does your day start and end?"* (Wake up and wind-down hours).

5. **Differentiated & Personalized Notifications**:
   - **iOS App**: Interactive actionable notifications right on your lock screen with **`[Yes, I drank 💧]`** and **`[Not yet]`** buttons. Tapping "Yes" logs directly in the background without launching the app!
   - **Personalized Reminders**: 2–3 reminders per day call you by your custom nickname (e.g. *"Hey Alex, it's time to hydrate! 💧"* or *"Alex, did you drink your water?"*).
   - **Web App**: Browser notification prompts linking directly to the web logger.

6. **Goal Proximity Accountability**:
   - **No volume tracking**: Zero tedious typing of milliliters, ounces, or cup sizes.
   - Pure accountability focused on hitting your target hydration moments throughout your active hours.

---

## 📁 Project Directory Structure

```text
/Users/goutham/Desktop/Vibe Code/P/Hydrate/
├── ios/                             <-- Native iOS Xcode Project
│   ├── Hydrate.xcodeproj            <-- Open with Xcode
│   └── Hydrate/
│       ├── App/
│       │   ├── HydrateApp.swift
│       │   └── AppDelegate.swift    <-- Handles lock-screen actions & Firebase
│       ├── Models/
│       │   ├── UserProfile.swift
│       │   └── CheckInRecord.swift
│       ├── ViewModels/
│       │   ├── AuthViewModel.swift  <-- Apple & Google Sign-In
│       │   ├── HydrationViewModel.swift <-- Real-time Firestore sync
│       │   └── NotificationManager.swift <-- Interactive lock-screen actions
│       ├── Views/
│       │   ├── Auth/
│       │   │   ├── SignInView.swift
│       │   │   └── OnboardingView.swift (3-step flow)
│       │   ├── Dashboard/
│       │   │   ├── DashboardView.swift
│       │   │   ├── FluidWaveRingView.swift
│       │   │   └── MomentsListView.swift
│       │   ├── Calendar/
│       │   │   └── CalendarHistoryView.swift
│       │   └── Settings/
│       │       └── SettingsView.swift
│       └── Resources/
│           ├── Assets.xcassets
│           ├── GoogleService-Info.plist
│           └── Info.plist
│
├── web/                             <-- Redesigned Web Experience
│   ├── index.html                   <-- Public landing + Live tracker
│   ├── app.js                       <-- Real-time Firestore sync & auth
│   ├── styles.css                   <-- Clean modern hydration theme
│   ├── manifest.json
│   └── sw.js
│
├── worker/                          <-- Cloudflare Worker backend
│   ├── worker.js
│   └── wrangler.jsonc
│
└── README.md
```

---

## 🚀 How to Run & Test

### 1. Web Application

You can open the web app directly in any browser:
```bash
# Option A: Quick local static server
npx serve "/Users/goutham/Desktop/Vibe Code/P/Hydrate/web"

# Option B: Or open directly in browser
open "/Users/goutham/Desktop/Vibe Code/P/Hydrate/web/index.html"
```
- **Logged out**: You'll see the public landing page with interactive demo ring, feature highlights, and the **"Get iOS App"** button.
- **Sign In**: Tap **"Sign In to Sync"** and choose Google or Apple.
- **Onboarding**: For new accounts, complete the 3 quick steps (Nickname, Daily Goal, Routine).
- **Dashboard**: Track your hydration moments with live fluid animations!

---

### 2. Native iOS App (Installing Directly on Your Personal iPhone)

1. **Open the Project in Xcode**:
   - Double-click `/Users/goutham/Desktop/Vibe Code/P/Hydrate/ios/Hydrate.xcodeproj` in Finder, or run:
     ```bash
     open "/Users/goutham/Desktop/Vibe Code/P/Hydrate/ios/Hydrate.xcodeproj"
     ```

2. **Select Your Free Apple ID Team**:
   - In Xcode's left sidebar, click the top **Hydrate** project blueprint icon.
   - Select the **Hydrate** target under Targets.
   - Go to the **Signing & Capabilities** tab.
   - Under **Team**, select your **Personal Team** (associated with your free Apple ID; no $99/yr account required).

3. **Connect Your iPhone**:
   - Plug your iPhone into your Mac using a lightning / USB-C cable (or connect wirelessly if enabled).
   - In Xcode's top destination toolbar (where it says device or simulator), click and select your physical iPhone.

4. **Enable Developer Mode on iPhone**:
   - On your iPhone, open **Settings > Privacy & Security > Developer Mode** and switch it **On** (your phone will prompt for a quick reboot).

5. **Build & Run (`⌘ + R`)**:
   - In Xcode, press **Cmd + R** (or click the Play ▶️ button).
   - Xcode will compile the app and install it directly onto your iPhone.

6. **Trust Developer Certificate (First-time only)**:
   - On your iPhone, go to **Settings > General > VPN & Device Management**.
   - Tap your developer Apple ID and tap **Trust "Apple Development: ..."**.
   - Tap the **Hydrate** app icon on your home screen to launch!

---

## 🔒 Security Rules (Cloud Firestore)

In your [Firebase Console](https://console.firebase.google.com/) under **Firestore Database > Rules**, make sure your rules allow signed-in users to access their own records:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 💧 Consistency Over Perfection

Hydrate is designed to remove the friction of volume counting and replace it with reliable, mindful moments of hydration throughout your day.
