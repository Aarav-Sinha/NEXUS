# 🔺 Nexus — Setup Guide
### Developed by Aarav Sinha

---

## What's included
- `index.html` — Main app shell
- `style.css` — Ambient dark aesthetic styles
- `app.js` — Full Firebase app logic
- `firestore.rules` — Security rules (paste in Firebase Console)

---

## Step-by-step Firebase Setup

### 1. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it `nexus-study`
3. Disable Google Analytics (optional) → **Create Project**

### 2. Enable Google Auth
1. In your project: **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Set support email → Save

### 3. Create Firestore Database
1. **Firestore Database** → **Create database**
2. Choose **Production mode** (we'll add rules next)
3. Pick a region (e.g. `asia-south1` for India)

### 4. Set Security Rules
1. **Firestore** → **Rules** tab
2. Paste contents of `firestore.rules` → **Publish**

### 5. Get Your Config
1. **Project Settings** (gear icon) → **Your apps**
2. Click **</>** (Web app) → Register app named `nexus`
3. Copy the `firebaseConfig` object

### 6. Plug Config into app.js
Open `app.js` and replace the `FIREBASE_CONFIG` object at the top:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "nexus-study-xxxx.firebaseapp.com",
  projectId: "nexus-study-xxxx",
  storageBucket: "nexus-study-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 7. Add Authorized Domain
1. **Authentication** → **Settings** → **Authorized domains**
2. Add your domain (e.g. GitHub Pages URL or custom domain)
3. `localhost` is already there for local testing

---

## Hosting (Free)
### Option A — GitHub Pages
1. Push all 3 files to a GitHub repo
2. Settings → Pages → Branch: main → Save
3. Your site: `https://yourusername.github.io/nexus/`

### Option B — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# public dir: . (current folder)
# single page: No
firebase deploy
```

---

## How to Use as Admin

### Adding Content
1. Log in with `aaravhfs@gmail.com` via Google
2. The **⚡ Admin** badge and **+ Add** button will appear
3. Click **+ Add** to add subjects, folders, chapters, PDFs

### Recommended Structure
```
Subject (e.g. "English Class 11 ISC")
  └── Book (Folder: "Rhapsody — Poetry")
        └── Chapter (e.g. "The Voice of the Rain")
              ├── PDF (Textbook PDF — Google Drive link)
              └── Study Material (notes, extras)
```

### Google Drive PDF Links
When adding a PDF, you can paste a Google Drive share link:
```
https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
```
The app automatically converts it to an embeddable preview URL.

**To make Drive PDFs embeddable:**
1. Right-click file in Drive → **Share**
2. Change access to **"Anyone with the link"**
3. Copy the link and paste in Nexus

---

## Study Material Uploads
Since this is pure HTML/JS (no backend storage), all files must be:
- Hosted on **Google Drive** (recommended)
- Or any direct PDF URL

For Drive: share the file → copy link → paste in Nexus.

---

## Credits
**Developed by Aarav Sinha**
Built with Firebase Firestore + vanilla HTML/CSS/JS
