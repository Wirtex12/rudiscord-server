# Voxit Client Debugging Guide

## Problem: Gray/Blank Electron Window

### Quick Fix

1. **Make sure Vite is running:**
   ```bash
   cd client
   npm run dev
   ```
   Wait for: `VITE v6.x.x ready in xxx ms`

2. **Then start Electron:**
   ```bash
   npm run electron:start
   ```

### Full Debug Steps

#### 1. Check Console Output

When you run `npm run electron:dev`, you should see:

```
[Electron] App starting...
[Electron] App is ready
[Electron] Creating window...
[Electron] Development mode detected
[Electron] Loading Vite dev server: http://localhost:5173
[Electron] Window created, waiting to load...
[Electron] Window ready to show
[Electron] Page loaded successfully
```

If you see errors, check the specific error message.

#### 2. Common Errors

**ERR_CONNECTION_REFUSED (-102)**
```
Cannot connect to Vite dev server at http://localhost:5173
```

**Solution:**
- Make sure Vite is running: `npm run dev`
- Check port 5173 is not blocked: `netstat -ano | findstr :5173`
- Try restarting Vite

**Failed to load preload.js**
```
Cannot find module 'preload.js'
```

**Solution:**
- Compile Electron files first: `npm run electron:compile`
- Check that `dist-electron/preload.js` exists

#### 3. Manual Testing

**Test Vite directly:**
```bash
cd client
npm run dev
```
Open browser: http://localhost:5173

If React app loads in browser → Vite is working ✓

**Test Electron compilation:**
```bash
cd client
npm run electron:compile
ls dist-electron/  # Should show: main.js, preload.js
```

#### 4. DevTools

DevTools should open automatically in development mode.

If not, press `Ctrl+Shift+I` in the Electron window.

Check Console tab for errors.

#### 5. Firewall Issues

If Windows Firewall blocks Electron:
1. Allow Electron through firewall
2. Or temporarily disable firewall for testing

#### 6. Complete Reset

```bash
cd client

# Delete compiled files
rmdir /s /q dist-electron
rmdir /s /q node_modules

# Reinstall dependencies
npm install

# Recompile Electron
npm run electron:compile

# Start fresh
npm run electron:dev
```

### File Structure Check

```
client/
├── electron/
│   ├── main.ts       ← Must exist
│   └── preload.ts    ← Must exist
├── dist-electron/
│   ├── main.js       ← Created after compile
│   └── preload.js    ← Created after compile
├── src/
│   └── App.tsx
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.electron.json
```

### Expected Behavior

1. **Vite starts** → Shows "VITE v6.x.x ready"
2. **wait-on checks** → Waits for port 5173
3. **Electron compiles** → Creates dist-electron/*.js
4. **Electron starts** → Opens window
5. **Page loads** → Shows Voxit login screen
6. **DevTools open** → For debugging

### Still Not Working?

1. Check Node.js version: `node -v` (should be 18+)
2. Check npm version: `npm -v` (should be 8+)
3. Clear npm cache: `npm cache clean --force`
4. Update dependencies: `npm update`

### Contact

If none of the above helps, check:
- Server logs (server terminal)
- Vite logs (client terminal)
- Electron console (DevTools)
