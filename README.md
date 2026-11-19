# A-mazing Run

**Escape the cursed labyrinth before its guardians wake.**

A 3D medieval maze game for the browser. You wake on a rune circle inside a night castle labyrinth that is generated fresh every run. Find the golden gate before the cursed knights hunt you down.

Built with React 19, React Three Fiber and Three.js. Every model, texture, sound and effect is procedural; the project ships no binary assets.

## Play

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

| Keys | Chase view | Map view |
| --- | --- | --- |
| `W` / `↑` | Walk forward | Move north |
| `S` / `↓` | Walk back | Move south |
| `A` / `←` | Turn 90° left | Move west |
| `D` / `→` | Turn 90° right | Move east |
| `C` | Switch to map view | Back to chase view |
| `Esc` / `P` | Pause | Pause |

- **Mouse wheel** zooms the chase camera.
- **Touch devices** get an on-screen pad. It sends the same game intents as the keyboard.
- **Holding a direction** keeps you running.
- **A turn pressed early** is remembered and taken at the next tile.

### Rules

- **Maze:** 10×10 to 100×100 cells (0 path, 1 wall, 2 start, 3 exit), with complete wall collision. Size depends on difficulty: 15, 21, 27 or 33.
- **Movement:** one tile every 0.4 s.
- **Guardians:** A* pathfinding, after a short grace period. Easy and Medium have 1 guardian; Hard and Very Hard have 2. Their speed is 80%, 90%, 100% or 110% of yours.
- **Score:** `multiplier × (1000 / seconds) + weather bonus`.
  - Multipliers: Easy 0.9, Medium 1, Hard 1.05, Very Hard 1.1.
  - Weather bonus: Fog +179, Snow +163, Storm +147.
  - The top 10 scores are kept in `localStorage` under `amazing-run-scores`.

### What you'll see

- **World:** a night castle maze.
  - Instanced ashlar walls with battlements, worn flagstones, torches with flickering light, rubble.
  - A golden portal gate with a beacon.
  - Pine forest, horizon silhouettes, sky, stars and moon.
- **Weather:** clear night, fog, snowfall (snow settles on the castle) and storm (rain with lightning and thunder).
- **Characters:**
  - A hooded hero with a lantern that lights the corridors.
  - Armoured guardians with burning visors. Their visor, chest rune, a red ground ring and a red screen vignette all intensify as they close in.
- **HUD:** run timer, a fog-of-war minimap, event banners, pause, victory (with Hall of Fame rank) and defeat screens.
- **Audio:** procedural Web Audio.
  - Ambient drone, wind or rain, distant bells.
  - Footsteps, wall bumps, a horn when the guardians wake, thunder.
  - A heartbeat that speeds up as danger rises.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Serves the production build |
| `pnpm test` | Unit tests (Vitest) for the pure game core |
| `pnpm typecheck` | TypeScript, app and config |
| `pnpm lint` | ESLint, including the React Compiler hook rules |

## Architecture

```
src/
├── game/
│   ├── core/              # Pure TypeScript, no React or Three; fully unit tested
│   │   ├── maze.ts        #   seeded generator, grid helpers, BFS distances
│   │   ├── engine.ts      #   60 Hz fixed-step simulation and state machine
│   │   ├── pathfinding.ts #   A* with a binary heap
│   │   ├── controls.ts    #   key → intent mapping, camera-relative moves
│   │   ├── cameraMath.ts  #   yaw, damping, occlusion march
│   │   ├── dressing.ts    #   deterministic set dressing (torches, rubble, …)
│   │   ├── gait.ts        #   distance-driven walk cycle
│   │   ├── exploration.ts #   minimap fog of war
│   │   ├── scoring.ts / highScores.ts
│   │   └── autopilot.ts   #   deterministic QA driver
│   ├── art/               # procedural textures, atmospheres, quality tier, character builders
│   └── scene/             # R3F components: loop, camera rig, avatars, world, input, QA hooks
├── systems/               # procedural Web Audio
├── store/                 # settings-only zustand store
└── ui/                    # screens, HUD, overlays, touch controls, design-system pieces
```

- **Simulation and rendering are decoupled.** The engine advances in fixed steps. React components read engine state through refs every frame, so there are no per-frame React renders.
- **The camera has a single owner.** `CameraRig` follows the hero with damping above the wall tops and climbs to keep line of sight when a wall stands behind.
- **One quality tier per device.** Touch-first or narrow screens drop prop shadows and bloom, use a 1024 shadow map and cap DPR at 1.5. This keeps them inside the mobile render budget.

## QA tooling (debug only)

Load the app with `?debug` (for example `/?debug`) to enable:

- `window.__THREE_GAME_DIAGNOSTICS__` and `window.__mazeDiagnostics`: renderer counters.
- `window.__THREE_GAME_TEST_HOOKS__`: `seed`, `setState` and `setPausedForScreenshot`.
  - States: `active-play`, `aerial-map`, `paused`, `danger`, `victory`, `defeat`.
- `/showcase`: a character turntable.

None of these exist in normal play.

```bash
pnpm build && pnpm preview --host 127.0.0.1 --port 5188
node .claude/skills/threejs-qa-release/scripts/inspect-threejs-canvas.mjs \
  --manifest artifacts/evidence.json --url "http://127.0.0.1:5188/game?debug" --seed 42
```

## Deploy

`pnpm build` produces a static site in `dist/` for the root path (`base: '/'`).

- The app uses client-side routing. Configure the host to serve `index.html` for unknown paths (`/game`, `/about`, …).
- Fonts load from Google Fonts. Everything else is bundled.
- Supported browsers: current evergreen browsers with WebGL 2.

## Credits

Crafted by [jc-develop](https://jc-develop.com).
