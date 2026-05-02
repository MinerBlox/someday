# Someday — Your Personal Bucket List

A beautiful, private bucket list app that lives on your phone.

## Deploy to GitHub Pages

1. Create a new **public** repository on GitHub (e.g. `someday`)
2. Upload all these files to the repo (drag & drop in the GitHub UI, or use git)
3. Go to **Settings → Pages**
4. Set Source to **Deploy from a branch → main → / (root)**
5. Your app will be live at `https://yourusername.github.io/someday/`

## Add to iPhone Home Screen

1. Open the URL in **Safari** (must be Safari for PWA install)
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

The app will now open full-screen like a native app, with no browser chrome.

## Important Note on Storage

All your data is saved in **localStorage** in your browser. This means:
- ✅ Works offline once installed
- ✅ Completely private — no servers, no accounts
- ⚠️ Data is tied to the browser/device. Use **Settings → Export Data** to back up.
- ⚠️ If you clear Safari's website data, you'll lose your list — export first!

**Tip:** Export your JSON backup occasionally and keep it somewhere safe (Notes, iCloud Drive, etc).

## Files

```
someday/
├── index.html          # Main app
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── css/
│   └── style.css       # All styles
├── js/
│   ├── data.js         # Data layer (localStorage)
│   ├── ui.js           # UI helpers & renderers
│   └── app.js          # App logic
└── icons/
    ├── icon-192.png    # App icon
    └── icon-512.png    # App icon (large)
```
