# MapBox Setup Guide

Your app is now configured to use **MapBox** for displaying maps! Follow these steps to complete the setup.

## Why MapBox?
- ✅ **Free Tier**: 50,000 map loads/month (perfect for family tracking)
- ✅ **Cross-Platform**: Same maps on iOS and Android
- ✅ **Open Source**: Community-driven, no vendor lock-in
- ✅ **Beautiful Styles**: Multiple map styles to choose from
- ✅ **Real-time**: Perfect for tracking multiple family members

---

## Step 1: Get Your MapBox Access Token (Free)

1. **Sign up for MapBox** (if you don't have an account):
   - Go to: https://account.mapbox.com/auth/signup/
   - Sign up with your email

2. **Get your Access Token**:
   - After signing up, you'll be at: https://account.mapbox.com/
   - You'll see your **Default public token** - copy it
   - It looks like: `pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsxxxxxxxxxxxxx`

3. **Add the token to your .env file**:
   ```bash
   # Open .env file and replace:
   MAPBOX_ACCESS_TOKEN=pk.YOUR_MAPBOX_TOKEN_HERE
   
   # With your actual token:
   MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsxxxxxxxxxxxxx
   ```

---

## Step 2: Configure Android (Google Maps API Key Still Needed)

Even with MapBox, Android still needs a Google Maps API key for the base maps library.

### Get Google Maps API Key:

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/
   - Select your project: **sheild-097**

2. **Enable Maps SDK for Android**:
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Maps SDK for Android"
   - Click "Enable"

3. **Create API Key**:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Copy the API key

4. **Add to Android Manifest**:
   ```bash
   # Open: android/app/src/main/AndroidManifest.xml
   # Replace this line:
   android:value="YOUR_GOOGLE_MAPS_API_KEY"
   
   # With your actual key:
   android:value="AIzaSyAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

5. **Restrict the API Key** (Important for security):
   - In Google Cloud Console, click on your API key
   - Under "Application restrictions":
     - Select "Android apps"
     - Click "Add an item"
     - Package name: `com.sheild` (your app's package)
     - Get SHA-1 fingerprint:
       ```bash
       cd android
       ./gradlew signingReport
       # Copy the SHA-1 from "debug" variant
       ```
   - Under "API restrictions":
     - Select "Restrict key"
     - Check "Maps SDK for Android"
   - Click "Save"

---

## Step 3: Rebuild Your App

After adding the tokens:

### For iOS:
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

### For Android:
```bash
npx react-native run-android
```

---

## Step 4: Test the Map

1. **Open the app** and go to "Track Me" tab
2. **Grant location permission** when prompted
3. **You should see**:
   - A beautiful MapBox map
   - Your current location marked with a user icon
   - GPS coordinates and address below the map
   - Pull-to-refresh to update location
   - Recenter button (top-right)
   - "Open in Google Maps" button (bottom-right)

---

## Future: Multiple Users on Same Map

Your setup is ready for showing multiple family members! Here's how it will work:

### Example Code for Multiple Markers:
```tsx
{familyMembers.map((member) => (
  <Marker
    key={member.id}
    coordinate={{
      latitude: member.location.latitude,
      longitude: member.location.longitude,
    }}
    title={member.name}
  >
    <View style={styles.customMarker}>
      <Icon name="account-circle" size={40} color={member.color} />
    </View>
  </Marker>
))}
```

### To implement family tracking:
1. Create a WebSocket connection for real-time location updates
2. Store family member locations in your MongoDB
3. Update the map when any family member moves
4. Show different colors for each family member

---

## MapBox Features You Can Use

### Custom Map Styles:
- `mapType="standard"` - Default style
- `mapType="satellite"` - Satellite view
- `mapType="hybrid"` - Satellite + labels
- `mapType="terrain"` - Topographic view

### Advanced Features (Available in MapBox):
- **Traffic layers** - Show real-time traffic
- **Heat maps** - Visualize location density
- **Route drawing** - Show paths between locations
- **Offline maps** - Download maps for offline use
- **3D buildings** - Show building heights
- **Custom markers** - Any image or component as marker

---

## Pricing (Don't Worry - You're Covered!)

**MapBox Free Tier includes:**
- 50,000 map loads/month
- Unlimited map styles
- Real-time location updates
- All features included

**For a family tracking app with 100 active users:**
- Average: ~10,000 map loads/month
- **You're well within the free tier!** 🎉

---

## Troubleshooting

### Map not showing on Android?
- ✅ Check if Google Maps API key is added to AndroidManifest.xml
- ✅ Ensure Maps SDK for Android is enabled in Google Cloud Console
- ✅ Rebuild the app: `npx react-native run-android`

### Map not showing on iOS?
- ✅ Run `cd ios && pod install`
- ✅ Rebuild: `npx react-native run-ios`

### Location not showing?
- ✅ Check location permissions are granted
- ✅ Enable GPS/Location Services on device
- ✅ Try pulling down to refresh

### Need help?
- MapBox Docs: https://docs.mapbox.com/
- React Native Maps: https://github.com/react-native-maps/react-native-maps

---

## Next Steps

1. ✅ Get MapBox token and add to .env
2. ✅ Get Google Maps API key for Android
3. ✅ Rebuild the app
4. ✅ Test location tracking
5. 🚀 Build family tracking features!

---

**Your app is now ready with MapBox! 🗺️**
