<p align="center">
  <a href="README.md">فارسی</a> &nbsp;|&nbsp; <strong>English</strong>
</p>

<h1 align="center">LAST STOP — LINE 13</h1>

<p align="center">
  A first-person survival shooter set in the night metro. Hold the platform, clear the waves, and ride the last train to the next station.
</p>

---

## About the Game

**LAST STOP — LINE 13** is a single-player FPS set in a city's underground transit system. Each sector throws a wave of hostiles at you. Hold the platform, manage your ammunition, and once the sector is clear, board the middle car to travel to the next station. The run is endless and every station is tougher than the last.

The game builds into a single self-contained HTML file that runs in a modern browser with no internet connection or installation required.

## Features

- **Procedural 3D world:** Stations, tunnels, the train, and environmental details are generated in code.
- **Three distinct weapons:** A semi-auto pistol, a full-auto SMG, and a pump-action shotgun.
- **Three enemy archetypes:** A fast rusher, a ranged gunner, and an armored brute.
- **Endless gameplay loop:** Wave → clear → train arrival → boarding → new station → harder wave.
- **Six station themes:** Each station has its own lighting, palette, and atmosphere. Themes cycle after the sixth sector.
- **Full HUD:** Minimap, wave tracker, health, armor, ammo, damage direction indicators, kill feed, and objective messages.
- **Procedural audio:** Music and sound effects are synthesized with the Web Audio API; no audio files are needed.
- **Salvage pickups:** Ammo cases, armor plates, and bio-gel.
- **End-of-run stats:** Sectors cleared, kills, accuracy, and survival time, with a best-run record saved in the browser.
- **No runtime dependencies:** Three.js, fonts, styles, and game code are all embedded in `index.html`.

## Quick Start

You do not need to install or build anything; the prebuilt file is included:

1. Open `index.html` in a modern browser (Chrome, Edge, or Firefox).
2. Click **ENTER THE PLATFORM**.
3. Click once on the game view to capture the mouse (Pointer Lock).

> **Note:** Double-clicking the file works as well. If your browser restricts local files, serve the project with a local web server:
>
> ```bash
> python -m http.server 8000
> ```
>
> Then open `http://localhost:8000`.

Headphones and fullscreen mode (F11) are recommended.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Look / aim |
| Left click | Fire |
| Right click | Aim down sights (ADS) |
| `R` | Reload |
| `E` | Interact / board the train |
| `1` `2` `3` | Select weapon |
| Mouse wheel | Cycle weapons |
| `Shift` | Sprint (forward movement only) |
| `Space` | Jump |
| `Esc` or `P` | Pause / resume |
| `M` | Mute / unmute audio |

> The game is designed for keyboard and mouse. Touch and gamepad controls are not supported yet.

## Gameplay Loop

1. **Clear the wave:** Hostiles enter from the service tunnels. Each wave is larger and mixes heavier enemy types.
2. **Secure the station:** When the last hostile falls, the train begins moving toward your platform.
3. **Board the middle car:** Move close to the open door and press `E`.
4. **Travel to the next station:** The ride screen shows the next stop and destination. Arriving restores a small amount of health and armor, but never a full reset.
5. **Repeat:** Every station is a new sector. The run continues as long as you survive, and your best score is tracked by sectors cleared.

**Survival tips:** Headshots deal the most damage, the shotgun is best for brutes and close quarters, and ammo cases disappear after a short time, so grab them before your magazine runs dry.

## Weapons

| Weapon | Class | Magazine | Reserve | Role |
| --- | --- | --- | --- | --- |
| **VANTAGE P9** | Semi-auto pistol | 15 | 135 | Accurate and ammo-efficient; ideal for mid-range and headshots |
| **VX-7 WASP** | Compact SMG | 32 | 208 | High rate of fire; strong in close quarters against multiple enemies |
| **BREACHER 12** | Pump-action shotgun | 6 | 42 | 8 pellets per shot; the best choice against brutes up close |

All three weapons are carried at all times and can be switched with `1`, `2`, `3`, or the mouse wheel. Press `R` to reload.

## Enemies

| Enemy | Type | Health | Behavior |
| --- | --- | --- | --- |
| **DRIFTER** | Melee rusher | 64 | Fast and aggressive; closes the distance and strikes |
| **HOLLOW** | Ranged gunner | 92 | Keeps its distance and fires projectiles |
| **RAVAGER** | Heavy brute | 265 | Slow but very tough and hard-hitting; use the shotgun or land headshots |

Enemy names are drawn from a pool of call signs each wave, so the same archetype may appear under a different name.

## Stations

| Sector | Station | Atmosphere |
| --- | --- | --- |
| 01 | HARBOR HEIGHTS | Amber and industrial |
| 02 | MERIDIAN EXCHANGE | Cool teal |
| 03 | BLACKWATER | Red and dangerous |
| 04 | ASH CROSS | Olive and ashen |
| 05 | CIVIC CENTER | Blue and civic |
| 06 | NORTHGATE | Cream and sterile |

After Sector 06 the station themes cycle again, while enemy counts and difficulty continue to climb.

## Project Structure

```text
Subway FPS Game/
├─ index.html             # Final, ready-to-run build (everything is inlined)
├─ build.js               # Build script for the final file
├─ three.min.js           # Three.js r152
├─ fonts.css              # Reference copy of the Google @font-face rules (not used by the build)
├─ src/
│  ├─ shell.html          # HTML template with {{FONTS}}, {{STYLES}}, {{THREE}}, {{GAME}} tokens
│  ├─ styles.css          # HUD, menus, visual effects, and responsive styles
│  ├─ fonts/              # woff2 fonts embedded as Base64 during the build
│  └─ game/
│     ├─ 00-core.js       # Constants, weapon data, themes, game state, shared helpers
│     ├─ 10-audio.js      # Procedural audio engine and music (Web Audio)
│     ├─ 20-worldbase.js  # Renderer, lighting, procedural textures, floor reflection
│     ├─ 21-station.js    # Station, tunnel, and environment construction
│     ├─ 22-train.js      # Train model, doors, and lighting
│     ├─ 30-weapons.js    # Weapon logic, firing, reloading, and effects
│     ├─ 31-enemies.js    # Enemy models, AI, projectiles, and pickups
│     ├─ 32-player.js     # Movement, collision, camera, and player health
│     ├─ 33-flow.js       # Wave flow, train arrival, boarding, and station travel
│     ├─ 34-hud.js        # HUD updates and minimap rendering
│     └─ 35-main.js       # Boot, input handling, pause flow, and the render loop
```

## Building and Development

### Requirements

- Node.js 16 or newer
- No `npm install` or external dependencies required

### Build the final file

```bash
node build.js
```

`build.js` performs the following steps:

1. Converts every `src/fonts/*.woff2` font to Base64.
2. Reads `src/styles.css` and `src/shell.html`.
3. Inlines `three.min.js` into the page.
4. Reads every `src/game/*.js` file in alphabetical order, joins them, and wraps the result in an IIFE.
5. Writes the output to `index.html`.

The output is roughly 1 MB and runs without any companion files.

> **Important:** `index.html` is a generated file. Make changes in `src/` and run `node build.js` again; otherwise the next build will overwrite your edits.

### Customization

| What you want to change | Where |
| --- | --- |
| Weapon damage, magazine size, fire rate, accuracy | `src/game/00-core.js` → `WEAPON_DATA` |
| Enemy health, speed, and behavior | `src/game/31-enemies.js` → `ENEMY_TYPES` |
| Number of enemies per wave | `src/game/31-enemies.js` → `getEnemyCount` |
| Station colors, lighting, and names | `src/game/00-core.js` → `THEMES` |
| Menu and HUD copy | `src/shell.html` |
| Visual style and layout | `src/styles.css` |
| Movement speed, jumping, and camera | `src/game/32-player.js` |

## Save Data

The best run is stored in browser `localStorage` under the key `lastStopBestWaves`. To clear it, remove the site data in your browser settings or run:

```js
localStorage.removeItem('lastStopBestWaves');
```

## Browser Support and Limitations

- Chromium-based desktop browsers (Chrome, Edge) and Firefox are recommended.
- WebGL (WebGL 2 recommended) and Pointer Lock are required.
- The game is built for keyboard and mouse; there is no touch or gamepad support.
- Audio starts only after the first user click, as required by browser autoplay policies.
- If the mouse is not captured, click once on the game canvas.
- Ammo and health persist between stations, but there is no mid-run save. Closing the page ends the run.

## Credits

- 3D engine: [Three.js](https://threejs.org/) r152
- Fonts: Barlow Condensed and Rajdhani (Google Fonts, SIL Open Font License)
- Game design, code, and content: this project

## License

There is currently no `LICENSE` file in the project, so all rights are reserved. If you plan to publish, redistribute, or use the project commercially, add an appropriate license (for example, MIT) first.

---

<p align="center">
  <a href="README.md">← این راهنما را به فارسی بخوانید</a>
</p>
