# Truck4u Mobile App 📱

React Native mobile application for Truck4u built with Expo.

## 🏗️ Architecture

### Tech Stack
- **Framework:** React Native 0.73 + Expo 50
- **Navigation:** React Navigation v6
- **State Management:** Zustand (from `@truck4u/logic`)
- **UI Components:** Shared components from `@truck4u/ui`
- **Maps:** React Native Maps
- **Real-time:** Socket.io-client

### Project Structure
```
apps/mobile/
├── src/
│   ├── navigation/          # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── CustomerNavigator.tsx
│   │   └── DriverNavigator.tsx
│   └── screens/
│       ├── auth/            # Login, Register
│       ├── customer/        # Customer-specific screens
│       └── driver/          # Driver-specific screens
├── App.tsx                  # Entry point
├── app.json                 # Expo configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation
```bash
# From project root
cd apps/mobile
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📦 Code Sharing with Web

The mobile app shares code with the web app through workspace packages:

### `@truck4u/ui`
Shared UI components:
- `Button` - Cross-platform button component
- `Input` - Text input with validation
- More components to be added...

### `@truck4u/logic`
Shared business logic:
- `useAuth()` - Authentication hook
- `useAuthStore()` - Auth state management (Zustand)
- `apiClient` - Axios instance with interceptors
- More hooks and utilities to be added...

### Code Sharing Benefits
- **80%+ code reuse** between web and mobile
- **Single source of truth** for business logic
- **Consistent UX** across platforms
- **Faster development** - write once, use everywhere

## 🔐 Authentication Flow

1. User opens app → Shows Login/Register
2. Login/Register → Receives JWT tokens
3. Tokens stored in Zustand store (persisted to AsyncStorage)
4. API requests automatically include access token
5. On 401 error → Auto-refresh token
6. On refresh fail → Logout user

## 🗺️ Navigation Structure

### Customer Flow
```
Login/Register → Home (Request Ride)
                 ├── Rides (History)
                 ├── Wallet
                 └── Profile
```

### Driver Flow
```
Login/Register → Dashboard
                 ├── Available Rides
                 ├── Active Ride
                 ├── Earnings
                 └── Profile
```

## 📱 Platform-Specific Features

### iOS
- Background location tracking for driver app
- Push notifications for ride requests
- Apple Pay integration (future)

### Android
- Background location service
- FCM push notifications
- Google Pay integration (future)

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```bash
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
```

### Expo Configuration
See `app.json` for:
- App name, slug, version
- iOS bundle identifier
- Android package name
- Location permissions
- Deep linking scheme

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📦 Building for Production

### EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Build
```bash
# iOS
expo build:ios

# Android
expo build:android
```

## 🚀 Deployment

### TestFlight (iOS)
1. Build with EAS: `eas build --platform ios`
2. Submit to TestFlight: `eas submit --platform ios`

### Google Play Internal Testing (Android)
1. Build with EAS: `eas build --platform android`
2. Submit to Play Console: `eas submit --platform android`

## 🎨 Design System

Using shared design tokens from `@truck4u/ui`:
- **Primary Color:** #007AFF (iOS Blue)
- **Success Color:** #34C759 (iOS Green)
- **Danger Color:** #FF3B30 (iOS Red)
- **Font:** System default (San Francisco on iOS, Roboto on Android)

## 📝 TODOs

- [ ] Implement map view with pickup/dropoff markers
- [ ] Add address autocomplete
- [ ] Integrate Socket.io for real-time updates
- [ ] Add push notifications
- [ ] Implement background location tracking (driver)
- [ ] Add payment integration (Flouci, Cash, Card)
- [ ] Implement ride tracking
- [ ] Add driver KYC flow
- [ ] Add ride rating system
- [ ] Implement wallet transactions

## 🤝 Contributing

See main project README for contribution guidelines.

## 📄 License

Private - All rights reserved
