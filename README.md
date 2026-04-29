# 🛡️ SHEild Frontend
> **Empowering Safety through Technology**

SHEild is a premium React Native mobile application designed for women's safety. It combines real-time SOS activation, voice-triggered monitoring, trusted circle communication, and live location sharing into a seamless, high-performance experience.

---

## ✨ Features
- 🚨 **One-Tap SOS**: Instant alert system for emergency situations.
- 🗣️ **Voice Safety Mode**: Hands-free SOS activation via keyword detection.
- 📍 **Trust Circle**: Live location sharing with trusted contacts.
- 💬 **Safe Chat**: Real-time group messaging with location and media support.
- 🔍 **Safe Spots**: Discovery of nearby safe locations using Map services.
- 💎 **Premium UI**: iOS-inspired glassmorphism design for a modern feel.

---

## 🛠️ Technology Stack
- **Framework**: React Native 0.82 (New Architecture / Fabric)
- **State**: React Context API & AsyncStorage
- **Real-time**: Socket.IO for instant communication
- **Maps**: React Native Maps & Geoapify
- **Native**: Background Services, Voice Recognition, Haptics, and Secure Storage

---

## 🚀 Getting Started

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
- **Node.js**: v20+
- **Android Studio**: Latest version with SDK 34/35.
- **Java**: JDK 17+
- **CocoaPods**: (For iOS developers)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/sheild-app.git
cd sheild-app/frontend
npm install
```

### 3. Environment Setup
The app uses environment variables for API configuration.
1. Create a `.env` file in the `frontend/` root.
2. Copy the contents from `.env.example` and fill in your values:
```env
API_BASE_URL=http://your-local-ip:8000
GEOAPIFY_API_KEY=your_key_here
```

### 4. Firebase Configuration
To enable notifications and authentication:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named `SHEild`.
3. Add an Android App with package name `com.sheild`.
4. Download the `google-services.json` and place it in:
   `frontend/android/app/google-services.json`

---

## 📱 Running the App

### Development Mode
Start the Metro bundler:
```bash
npm start
```
Run on Android:
```bash
npm run android
```
Run on iOS:
```bash
cd ios && pod install && cd ..
npm run ios
```

### Release Build (APK)
To generate a signed production APK:
1. Ensure your keystore is in `android/app/`.
2. Configure your credentials in `~/.gradle/gradle.properties` (Recommended) or edit `android/gradle.properties` temporarily.
3. Run the build command:
```bash
npm run android:release
```
The APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📂 Project Structure
```text
frontend/
├── src/
│   ├── assets/        # Images, Fonts, Animations
│   ├── components/    # Reusable UI components
│   ├── constants/     # API paths and Theme tokens
│   ├── contexts/      # Auth and Global State
│   ├── screens/       # Main screen modules
│   ├── services/      # API, Socket, and Native wrappers
│   └── types/         # TypeScript definitions
└── android/           # Native Android project
```

---

## 🛡️ Security Note
**Never commit the following files to GitHub:**
- `.env`
- `*.keystore`
- `google-services.json`
- `gradle.properties` (containing actual passwords)

These files are already included in `.gitignore`.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## 📄 License
This project is private. (c) 2026 SHEild Team.
ion, and external provider layers so it can be exported cleanly for papers or presentations.
