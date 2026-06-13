# Google Photos & Drive Integration Setup

## Overview
The app now includes a complete infrastructure for Google Photos and Google Drive integration. Each user authenticates with their own Google account separately, so they only see their own photos and files.

## What's Implemented

### 1. Map Navigation Menu
- Added a hamburger menu icon (☰) at the top-left of the map page
- Clicking it navigates back to the home screen
- Users can now find their way back to the app from the map

### 2. Google OAuth Flow
- Users click "חבר Google Photos" (Connect Google Photos) or "חבר Drive" (Connect Drive)
- Opens a Google OAuth login popup
- After authentication, tokens are stored securely in localStorage (Preferences on native iOS/Android)
- Users can disconnect anytime by clicking the button again

### 3. Photo Fetching API
- `APP.fetchGooglePhotos(startDate, endDate)` function available
- Queries Google Photos Library API by date range
- Returns up to 25 photos matching the date filter
- Can be used to automatically sync photos to journal entries

## Backend Setup Required

To make this fully functional, you need to set up:

### 1. Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - Google Photos Library API
   - Google Drive API

### 2. OAuth 2.0 Credentials
1. Go to Credentials → Create OAuth 2.0 Client ID
2. Choose "Web application"
3. Set Authorized redirect URIs:
   ```
   https://your-domain.com/oauth-callback.html
   http://localhost:8080/oauth-callback.html (for development)
   ```
4. Copy the Client ID

### 3. Backend Endpoint
Create an endpoint at `/api/google-oauth-exchange` that:
- Receives: `{ code: string, service: "photos" | "drive" }`
- Exchanges the code for an access token using your Client Secret
- Returns: `{ accessToken: string }` or `{ error: string }`

Example Node.js endpoint:
```javascript
app.post("/api/google-oauth-exchange", async (req, res) => {
  const { code, service } = req.body;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "https://your-domain.com/oauth-callback.html",
        grant_type: "authorization_code"
      })
    });
    const data = await response.json();
    res.json({ accessToken: data.access_token });
  } catch (error) {
    res.json({ error: error.message });
  }
});
```

### 4. Update Client ID
In `www/app/app-plan.js`, update this line:
```javascript
const clientId = "YOUR_GOOGLE_CLIENT_ID";
```

## How It Works

### For Each User
1. User clicks "חבר Google Photos"
2. Logs in with their personal Google account
3. Grants permission to read their Google Photos
4. Token stored securely in their phone's storage (Preferences for iOS/Android)
5. App can now fetch their photos and display them in the journal

### Storage
- Web: `localStorage.getItem("vie_google_auth")`
- Native iOS/Android: `Capacitor.Plugins.Preferences.get({ key: "vie_google_auth" })`

## Usage Example

```javascript
// Check if user is connected
const auth = APP.LS.get("google_auth", { photos: null, drive: null });
if (auth.photos) {
  // User is connected to Google Photos
}

// Fetch photos from a date range
const startDate = new Date("2024-06-01");
const endDate = new Date("2024-06-02");
const photos = await APP.fetchGooglePhotos(startDate, endDate);
// Returns: [{ id, productUrl, baseUrl, mediaMetadata: { creationTime, width, height } }]

// Disconnect
const newAuth = { ...auth, photos: null };
APP.LS.set("google_auth", newAuth);
```

## Security Notes
- Access tokens are stored on device only
- No tokens sent to any server except Google's OAuth endpoint
- Each user has their own isolated auth token
- Refresh tokens should be stored server-side and tokens refreshed as needed

## Testing
Run the existing tests to ensure nothing broke:
```bash
npm test
```

All 26 tests should pass, including route editing and app initialization tests.
