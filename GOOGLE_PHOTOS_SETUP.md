# Google Photos Integration Setup

## Overview
The app now has **working Google Photos integration** that:
- ✅ Users authenticate with their own Google account
- ✅ Automatically fetches photos from their trip dates
- ✅ Displays photos in the journal grouped by day
- ✅ Each user sees only their own photos (separate authentication)

## What You Need

### 1. Google Cloud Project with OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing one)
3. Enable these APIs:
   - **Google Photos Library API**
   - **Google Drive API** (optional, for future Drive backups)

4. Create OAuth 2.0 Client ID:
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Web application**
   - Add Authorized redirect URIs:
     - `http://localhost:8080/oauth-callback.html` (development)
     - `https://your-domain.com/oauth-callback.html` (production)

5. Copy your **Client ID** and **Client Secret**

### 2. Backend Server (Node.js)
The app needs a backend to securely exchange OAuth codes for access tokens (required by Google's security policy).

**Install dependencies:**
```bash
npm install # Already installs the backend dependencies
```

**Start the backend:**
```bash
export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
node backend.js
```

The backend will run on `http://localhost:3001` and proxy requests from the frontend (localhost:8080) to Google's APIs.

**For production**, deploy `backend.js` to a hosting service:
- **Heroku** (free tier available)
- **Railway** (simple deployment)
- **AWS Lambda** / **Google Cloud Functions** (serverless)
- Your own VPS

After deployment, update the redirect URI in Google Cloud Console to point to your production domain.

## How It Works

### User Flow:
1. User clicks "חבר Google Photos" (Connect Google Photos) in the Journal tab
2. Opens Google OAuth login in a popup
3. User authorizes the app to access their Google Photos (read-only)
4. App receives an authorization code and sends it to the backend
5. Backend exchanges the code for an access token securely
6. Token is stored in the user's device (localStorage on web, Preferences on iOS/Android)
7. App automatically fetches photos from the trip dates
8. Photos are displayed in the Journal, grouped by day

### Data Flow:
```
User's Browser (app)
      ↓
Frontend JavaScript (www/app/app.js)
      ↓
Backend Node.js (localhost:3001)
      ↓
Google OAuth & Photos APIs
      ↓
User's Google Account
```

## Configuration

### For Development (localhost):
```bash
# Terminal 1: Start the web app
npm start

# Terminal 2: Start the backend
export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
node backend.js

# Open: http://localhost:8080
```

### For Production:
1. Deploy `backend.js` to your hosting
2. Update Google Cloud Console redirect URIs to your production domain
3. Update the client ID in `www/app/app-plan.js` (line 306):
   ```javascript
   const clientId = "YOUR_PRODUCTION_CLIENT_ID.apps.googleusercontent.com";
   ```

## Testing

1. Open the app in your browser
2. Go to **יומן** (Journal) tab
3. Click **חבר Google Photos** (Connect Google Photos)
4. Log in with your Google account
5. Grant permission to access Google Photos (read-only)
6. Wait for photos to load (may take a few seconds)
7. Photos should appear in the Journal under each day

## Troubleshooting

### "שגיאה בחיבור" (Connection Error)
- ✅ Check backend is running: `node backend.js`
- ✅ Verify CLIENT_ID and CLIENT_SECRET are correct
- ✅ Check Google Cloud Console has the API enabled

### No photos appear
- ✅ Check app has access to your Google Photos
- ✅ Verify the app was given "Google Photos Library API" permission
- ✅ Make sure your trip dates are set in **תכנון** (Plan) tab

### "אנדפוינט לא קיים" (Endpoint not found)
- ✅ The backend at localhost:3001 is not running
- ✅ You need to run `node backend.js` in a separate terminal

## Security Notes

- **OAuth tokens are stored securely** in localStorage (device only)
- **Tokens are never sent to any server** except Google's APIs
- **No photos are stored** on the server — only fetched on-demand from Google
- **Read-only access** — the app cannot delete or modify photos
- Each user authenticates with **their own Google account** — no shared credentials

## Architecture

The integration has three parts:

1. **Frontend** (`www/app/app.js`, `www/app/app-plan.js`)
   - OAuth popup flow
   - Fetches photos from backend
   - Displays them in the journal

2. **Backend** (`backend.js`)
   - Exchanges OAuth code for access token securely
   - Fetches photos from Google Photos Library API
   - Never exposes client secret to frontend

3. **OAuth Redirect Handler** (`www/oauth-callback.html`)
   - Google redirects here after user authenticates
   - Passes authorization code back to main app window

## Next Steps

- Deploy the backend to production
- Update Google Cloud Console with production redirect URIs
- Update the client ID in the code
- Test with your Google account on the live domain
