# Tilt Rush

A tilt-controlled top-down racing game. Steer by tilting your phone, shake or hold the screen for nitro.

- **Modes:** Career (10 missions on a map: finish in time, overtake, collect coins, no-crash, rival race, police chase), Endless, Time Trial, Free Ride
- **Cars:** 8 cars with their own factory colour, plus paint, stripes and spoiler customisation
- **Garage & Shop:** upgrade power, handling, nitro and magnet; buy cars and paints with cash or gold
- **Extras:** obstacles (cones, oil), power-ups (shield, magnet, slow-mo), star ratings, sound effects, low-graphics fallback

Plain HTML/JS/canvas, no build step for the web version.

## Play in a browser

Serve the folder over HTTPS (phones only expose tilt sensors on secure origins), e.g. GitHub Pages, Netlify Drop, or:

```bash
python -m http.server 8000
```

(`localhost` counts as secure on the same machine; for a phone use an HTTPS tunnel.)

## Android APK (Capacitor)

Requires Node, a JDK and the Android SDK.

```bash
npm install
npm run www          # copy the web files into www/
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. A ready-built copy is in `release/`.

## Controls

| Action | Phone | Desktop |
| --- | --- | --- |
| Steer | tilt left / right | mouse, or arrow keys |
| Nitro | hold screen or shake | hold mouse / Space |
| Pause | on-screen button | Esc |
