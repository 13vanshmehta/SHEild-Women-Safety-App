# SHEild Frontend

React Native mobile application for SHEild, a women safety platform that combines emergency SOS activation, trusted contacts, group communication, location sharing, safe-place discovery, and voice-triggered safety monitoring.

## Purpose

The frontend is the user-facing mobile client. It handles onboarding, authentication, emergency workflows, real-time group messaging, location visibility, and device capability access such as contacts, geolocation, audio, voice recognition, and haptics.

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | React Native 0.82, React 19 |
| Language | TypeScript |
| State and persistence | React Context, AsyncStorage |
| Networking | Fetch API, centralized API service |
| Real-time transport | Socket.IO client |
| Maps and location | React Native Maps, Geolocation Service, Geoapify static maps |
| Native capabilities | Contacts, Call Log, Device Info, Image Picker, Audio Toolkit, Voice Recognition, Background Actions |
| Testing | Jest, React Test Renderer |
| Platforms | Android and iOS |

## Main Capabilities

- Splash and onboarding flow for first-time users.
- Email/password authentication with OTP verification.
- Google authentication support through backend endpoints.
- JWT-based session storage with `AsyncStorage`.
- Profile viewing, updating, logout, and account deletion.
- Emergency contact management and bulk import from the phone contact book.
- SOS activation from manual button and voice keyword detection.
- Current location capture and periodic location update during active SOS.
- Network/device status awareness for emergency metadata.
- Group creation, join-code based joining, member management, pinning, favorites, and settings.
- Real-time group chat with text, image, audio, and location messages.
- Track Me screen for shared live locations and emergency contact context.
- Safe Spots screen backed by place/map services.

## Directory Structure

```text
frontend/
├── App.tsx                         # App root, AuthProvider, main navigator mount
├── index.js                        # React Native entry point
├── src/
│   ├── assets/images/              # App logo and onboarding/home imagery
│   ├── components/                 # Shared UI and navigation components
│   ├── constants/                  # API, app, and color constants
│   ├── contexts/                   # AuthContext and persisted auth state
│   ├── screens/                    # App screens and feature flows
│   ├── services/                   # API, auth, location, socket, voice, media, contacts
│   └── types/                      # Type declarations and shims
├── android/                        # Android native project
├── ios/                            # iOS native project
└── __tests__/                      # Jest tests
```

## Important Screens

| Screen | Responsibility |
| --- | --- |
| `SplashScreen` | Starts app health check and transitions into onboarding/authenticated flow. |
| `OnboardingFlow` | Introduces core app safety features. |
| `AuthNavigator` | Coordinates login, signup, OTP, forgot password, and reset password screens. |
| `MainAppScreen` | Hosts authenticated application tabs. |
| `HomeScreen` | Main dashboard and quick access surface. |
| `SOSScreen` | Manual SOS, voice safety mode, location capture, and SOS location updates. |
| `GroupsScreen` | Emergency contacts, groups, real-time messaging, media, and location messages. |
| `TrackMeScreen` | Shared user location visualization. |
| `SafeSpotsScreen` | Nearby safe place discovery. |
| `ProfileScreen` | User profile and account actions. |

## Service Layer

| Service | Role |
| --- | --- |
| `apiService.ts` | Central HTTP wrapper, JSON requests, multipart upload, auth headers, health checks. |
| `authService.ts` | Register, login, OTP verification, Google auth, profile, logout, account deletion. |
| `socketService.ts` | Authenticated Socket.IO connection reuse and disconnect handling. |
| `emergencyContactService.ts` | CRUD and bulk import for emergency contacts. |
| `contactService.ts` | Native phone contact permission and contact reading. |
| `locationService.ts` | Device geolocation permission and current position utilities. |
| `userLocationService.ts` | Backend location update, visible locations, sharing settings, online status, reverse geocoding, and live update subscription. |
| `voiceSafetyService.ts` | Background voice recognition, keyword monitoring, auto-restart, and SOS callback execution. |
| `voiceStateService.ts` | Persistence for voice safety state. |
| `audioService.ts` | Audio recording/playback support for group messages. |
| `mediaCacheService.ts` | Local media caching helpers. |
| `geoapifyMapService.ts` | Static map URL generation for shared locations. |
| `placesService.ts` | Nearby place lookup support. |
| `permissionService.ts` | Platform permission helpers. |
| `recentContactService.ts` | Recent contact persistence. |

## Backend Integration

The mobile app reads its backend base URL from `src/constants/api.ts`.

```ts
BASE_URL: 'http://192.168.29.17:8000'
```

Main backend integrations:

| Feature | Backend route family |
| --- | --- |
| Email auth, OTP, profile | `/api/auth/*` |
| Google auth | `/api/auth/google/*` |
| Emergency contacts | `/api/emergency-contacts/*` |
| Groups and messages | `/api/groups/*` |
| SOS alerts | `/api/sos/*` |
| Location sharing | `/api/location/*` |
| Health check | `/onbaording` |

Socket.IO is connected to the same base URL and authenticates with the stored JWT.

## Environment Configuration

The app uses `react-native-config`. A local `.env` file can provide:

```env
GEOAPIFY_API_KEY=your_geoapify_key
```

The current code contains a fallback Geoapify key in `src/constants/api.ts`. For production, keep API keys outside source control and inject them through environment configuration.

## Setup

Install dependencies:

```sh
npm install
```

Start Metro:

```sh
npm start
```

Run on Android:

```sh
npm run android
```

Run on iOS:

```sh
bundle install
bundle exec pod install --project-directory=ios
npm run ios
```

Run tests:

```sh
npm test
```

Build Android release artifacts:

```sh
npm run android:release
npm run android:bundle
```

## Runtime Requirements

- Node.js 20 or newer.
- Android Studio and Android SDK for Android builds.
- Xcode, Ruby Bundler, and CocoaPods for iOS builds.
- A running backend service reachable from the device/emulator.
- Location, contacts, microphone, and notification permissions enabled on the mobile device for full functionality.

## Notes for Research Documentation

The frontend architecture diagram is maintained in [`../docs/architecture-diagrams.md`](../docs/architecture-diagrams.md). It separates the mobile app into presentation, state/session, service, native capability, backend integration, and external provider layers so it can be exported cleanly for papers or presentations.
