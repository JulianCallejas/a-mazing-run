# A-mazing Run: final evidence (feature `maze-redesign`, branch `feat/redesign`)

- **Revision:** `d5b1c6b`.
- **Capture run:** `t9-pass-2`, manifest `artifacts/evidence.json`, checked by `check_evidence.py` (12/12 confirmed).

## Result

The playable game was rebuilt end to end:

- engine, camera, world, characters, UI, audio;
- QA tooling and a release build.

All 12 declared captures (6 states on desktop and mobile) pass on a **hardware GPU**: ANGLE Intel Iris Xe, D3D11. There are no browser errors, and every capture is inside the render budget for its tier.

Real-input bot runs win and lose as designed.

## Checks run on this revision

| Check | Result |
| --- | --- |
| `pnpm typecheck` | 0 errors |
| `pnpm lint` | 0 problems |
| `pnpm test` | 93 tests, 13 files, all pass |
| `pnpm build` | OK, no chunk-size warning |
| `pnpm audit` | No known vulnerabilities |

Bundle chunks, gzipped:

| Chunk | Size |
| --- | --- |
| three | 194 kB |
| react | 78 kB |
| r3f | 59 kB |
| app | 27 kB |
| game | 8 kB |

## Canvas inspector (t9-pass-2, `--seed 42`, hardware GPU)

| Mode | State | Entropy | Edges | Contrast | Dominant | Budget |
| --- | --- | --- | --- | --- | --- | --- |
| desktop | active-play | 4.42 | 0.365 | 81.1 | 0.30 | ok (139 calls, 71k tris) |
| desktop | aerial-map | 4.48 | 0.346 | 91.3 | 0.30 | ok (130 calls) |
| desktop | danger | 3.80 | 0.253 | 59.3 | 0.35 | ok (156 calls, 74k tris) |
| mobile | active-play | 4.45 | 0.335 | 80.6 | 0.25 | ok (110/150 calls, 52k tris) |
| mobile | aerial-map | 4.45 | 0.338 | 98.1 | 0.27 | ok (111/150 calls) |
| mobile | danger | 4.32 | 0.272 | 66.0 | 0.25 | ok (136/150 calls) |

Paused, victory and defeat are overlay states. Their lower entropy and contrast come from the intentional scrim. Screenshots and JSON reports are in `artifacts/t9-pass-2/`.

**A measurement trap I found:** the inspector samples the first `<canvas>` in the DOM, and the minimap used to be first. Every early metric was taken from the minimap. The WebGL canvas is now first in the DOM, and only post-fix numbers are reported above.

## Gameplay evidence (real input)

### Bot playtest (hardware GPU)

- **Setup:** Easy difficulty, map view, keyboard presses along the BFS path.
- **Win:**
  - Attempt 1 was intercepted by the guardian after 26 steps.
  - Attempt 2 won after 32 steps, scoring 67 points. The "A new legend" Hall of Fame rank was shown.
  - Earlier SwiftShader runs needed up to 4 attempts. The bot never dodges, so this shows the guardian AI applies real pressure.
- **Lose:** on mobile with touch emulation, the player stands still. The guardian catches them, and the defeat dialog and retry work.

### Other real-input checks

- **Restart:** the timer resets immediately.
- **Pause:** pausing freezes the timer, verified by playtest.
- **Touch:** the on-screen pad emits the same intents as the keyboard. Release, cancel and lost-capture are handled.

### Audio (browser)

- The audio context is locked before the first gesture and unlocked after a click.
- All 6 sound effects and the heartbeat ran with no exceptions.
- Mute and weather toggles work.

### Debug gating

Without `?debug`:

- the test hooks, the engine, the audio system and the diagnostics are all undefined;
- `/showcase` renders nothing.

### Motion

- A walk-cycle clip was recorded at `artifacts/t9-pass-1/locomotion.webm`.
- Frame sequences were reviewed during T6.
- Ending moments are captured in `artifacts/t9-pass-1/ending-*.png`.

## Visual scorecard

Calibrated against `scorecard-anchors/scene-1..3`.

- **Before:** the original build was primitive boxes and capsules on a flat brown floor, with a stat-card HUD. It reads at scene-1 level, about 1 on every category. No formal capture was made.
- **After:**

| Category | Score | Evidence |
| --- | --- | --- |
| Art direction | 2.5 | The night-castle theme drives forms, materials, UI and feedback: battlements, torches, an iron-and-gold UI, the horn and visor cues. |
| Hero/player | 2.5 | Hooded crimson cloak and lantern with real light. A locator ring stays visible through walls. Victory and defeat poses. |
| Obstacles/enemies | 2.5 | Distinct cursed-knight silhouette. Dormant to hunting states, a proximity ring, visor and rune glow, and the head tracks the hero. |
| Rewards/interactables | 2.5 | The exit arch has a portal shader and a beacon visible from far away. It flares on escape. The minimap reveals explored corridors. |
| World/environment | 2.5 | Instanced masonry, battlements, rubble and torches. Perimeter pines, horizon silhouettes, sky, stars and moon (near, mid and far layers). |
| Materials/textures | 2.0 | Procedural ashlar and flagstone with bump and roughness, a damp gradient and moss. The coping and merlon pattern is somewhat repetitive. |
| Lighting/render | 2.5 | ACES tone mapping, moon key light plus hemisphere fill, torch and lantern practicals, shadows, bloom on authored emissives only. Measured contrast is 81–98. |
| VFX/motion | 2.5 | Awaken banner and horn, danger vignette and heartbeat, lightning and thunder, GPU weather, gate flare, hit flash, distance-driven gait. |
| UI/HUD | 2.5 | Genre clusters, fog-of-war map, banners, pause, victory and defeat overlays, responsive layout and touch pad, verified on 390 px. |
| Performance evidence | 2.5 | Per-state renderer rows on both tiers on a hardware GPU, the quality tier, and chunking. No FPS figures are reported (see risks). |

**Average: 2.45.** No category is below 2, and no automatic failures were observed. That meets the scorecard's premium threshold, but this is a self-assessment against the anchors.

## Residual risks and known limits

- **One page error** ("reading 'x'") appeared once in 5 inspector runs, before the canvas reorder. It has not reproduced since: there were 0 in the next 4 full runs plus a targeted repro. It stays open, unexplained.
- **No FPS or frame-time numbers.** The headless runs used a hardware GPU, but FPS was not sampled. Validate on target devices, especially phones.
- **Camera at the start corner.** When the hero starts tight against the outer wall, the chase camera climbs steeply and the hero is mostly hidden by masonry. The locator ring mitigates this.
- **Score scale.** The spec formula gives small numbers, around 20–70 points for typical runs. That is per spec (S11) and unchanged.
- **Fonts** load from Google Fonts. Everything else is bundled.
- **Deployment.** The app is a static SPA with `base: '/'`. The host must rewrite unknown paths to `index.html`.

## Commits (feat/redesign)

| Commit | Content |
| --- | --- |
| `ef28384` | Dependencies upgraded (independently verified) |
| `31adfe2` | Core |
| `12fd36e` | Engine |
| `4163070` | Scene and camera |
| `b055406` | World |
| `0939ad2` | Characters |
| `d7e5665` | Audio |
| `d7dc807` | UI |
| `27cb4f7` | drei removed |
| `f7446f3` | Dev QA dependencies |
| `ae241b3` | Performance and QA hooks |
| `79196d8` | README |
| `d5b1c6b` | VFX polish |
