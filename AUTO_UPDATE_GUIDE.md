# Lexa Guard - Auto-Update System Guide

## 📦 Overview

Your app is now configured to automatically check for and install updates from GitHub Releases!

## 🔧 Setup Steps

### 1. Update Configuration Files

First, replace `YOUR_GITHUB_USERNAME` with your actual GitHub username in these files:

**electron-builder.json** (line 15):
```json
"owner": "YOUR_GITHUB_USERNAME",
```

**package.json** (line 11):
```json
"url": "https://github.com/YOUR_GITHUB_USERNAME/lexa-guard.git"
```

### 2. Create GitHub Repository (if not done)

1. Go to https://github.com/new
2. Create a repository named `lexa-guard`
3. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit with auto-update"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/lexa-guard.git
git push -u origin main
```

### 3. Generate GitHub Personal Access Token

You need a token to publish releases:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "Lexa Guard Releases"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### 4. Set Environment Variable

Add the token to your environment:

**macOS/Linux:**
```bash
export GH_TOKEN="your_token_here"
# Add to ~/.zshrc or ~/.bashrc to make it permanent
echo 'export GH_TOKEN="your_token_here"' >> ~/.zshrc
```

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="your_token_here"
# Or set it permanently in System Environment Variables
```

## 🚀 How to Release a New Version

### Step 1: Update Version Number

Edit `package.json` and bump the version:
```json
"version": "0.1.3",  // was 0.1.2
```

### Step 2: Commit Changes

```bash
git add .
git commit -m "Release version 0.1.3"
git push
```

### Step 3: Build and Publish

Run the build command with the publish flag:

```bash
# For all platforms:
npm run build:react && electron-builder --mac --win --linux --publish always

# Or for specific platforms:
npm run build:react && electron-builder --mac --publish always
npm run build:react && electron-builder --win --publish always
npm run build:react && electron-builder --linux --publish always
```

This will:
1. Build your app for the specified platforms
2. Create a GitHub Release with the version number
3. Upload all installers to the release
4. Generate update metadata files

### Step 4: Add Release Notes (Optional)

1. Go to https://github.com/YOUR_GITHUB_USERNAME/lexa-guard/releases
2. Find your release
3. Click "Edit"
4. Add release notes describing what's new
5. Click "Update release"

## 📱 How Auto-Update Works for Users

### Automatic Check
- The app checks for updates 3 seconds after startup
- Only happens in production (not in development mode)

### Update Flow
1. **Update Available**: User sees a dialog with "Download" or "Later"
2. **Downloading**: Progress bar shows in the taskbar/dock
3. **Downloaded**: User can choose "Restart Now" or "Later"
4. **Install**: Update installs when the app quits (or immediately if they choose "Restart Now")

### Manual Check
Users can manually check for updates:
- Menu: **Lexa Guard** → **Check for Updates...**

## 🎯 Update Behavior by Platform

### Windows (NSIS Installer)
- ✅ Full auto-update support
- Downloads and installs silently
- Requires admin rights only for first install

### Windows (Portable)
- ⚠️ Limited auto-update (downloads but may not auto-install)
- Users should use the installer version for best experience

### macOS (DMG)
- ✅ Full auto-update support
- Works on both Intel and Apple Silicon
- No code signing required (users will see Gatekeeper warning on first launch)

### Linux (AppImage)
- ✅ Full auto-update support
- Downloads new AppImage
- User needs to replace the old file

### Linux (DEB)
- ⚠️ Limited auto-update
- Better to use AppImage for auto-updates

## 🔍 Testing Auto-Update

To test without publishing:

1. Set up a local update server or use a test GitHub repository
2. Build with a lower version number (e.g., 0.1.1)
3. Publish a release with a higher version (e.g., 0.1.2)
4. Run the app with the lower version
5. It should detect and offer to download the update

## 📝 Update Schedule Best Practices

- **Major updates**: 0.x.0 → 1.x.0 (breaking changes, new features)
- **Minor updates**: 0.1.x → 0.2.x (new features, improvements)
- **Patch updates**: 0.1.1 → 0.1.2 (bug fixes, small changes)

## 🐛 Troubleshooting

### "Update not available" always shows
- Make sure the version in package.json is lower than the GitHub release
- Check that `GH_TOKEN` is set correctly
- Verify the GitHub username in config files

### Update check fails
- Check internet connection
- Verify GitHub repository is public or token has correct permissions
- Check console logs for error messages

### Update downloads but doesn't install
- Make sure `autoInstallOnAppQuit` is true in electron.js
- Try using the NSIS installer on Windows (not portable)
- Check if antivirus is blocking the update

## 📊 Monitoring Updates

Check GitHub Release analytics:
1. Go to your repository
2. Click on "Releases"
3. View download counts for each installer

## 🔐 Security Notes

- Never commit your `GH_TOKEN` to the repository
- Keep tokens in environment variables or CI/CD secrets
- For public apps, consider code signing for better security
- Users will see security warnings on first launch (unsigned apps)

## 🎉 You're All Set!

Your app will now:
- ✅ Check for updates automatically on startup
- ✅ Allow users to manually check for updates
- ✅ Download and install updates seamlessly
- ✅ Show progress during downloads
- ✅ Let users choose when to restart

Happy shipping! 🚀

