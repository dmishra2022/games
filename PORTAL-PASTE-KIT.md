# Portal paste kit — every field, copy-ready

Live arcade: https://dmishra2022.github.io/games/

Three games × four portals (CrazyGames, Y8, Poki, itch.io) + AdSense config. Every text field below is pre-filled — open the fence, copy, paste.

ZIP files to upload (already built in [`submission-artifacts/`](submission-artifacts)):
- `neon-plinko-crazygames.zip` (59 KB) — CrazyGames / Y8 if ZIP accepted
- `neon-plinko-itch.zip` (59 KB) — itch.io
- `neon-survivor-crazygames.zip` (62 KB) — CrazyGames / Y8
- `neon-survivor-itch.zip` (62 KB) — itch.io
- `tank-commander-crazygames.zip` (64 KB) — CrazyGames / Y8
- `tank-commander-itch.zip` (64 KB) — itch.io

> Note: Poki wants a hosted URL (the GitHub Pages link); no ZIP needed.

---

# Neon Plinko

Live: https://dmishra2022.github.io/games/neon-plinko/
Icon color: cyan `#5bc0eb`

## CrazyGames — Neon Plinko

Submit URL: https://developer.crazygames.com/ → Log in → Dashboard → Submit a game.

**Covers (CrazyGames requires all three)** — from `submission-artifacts/screenshots/`:
- Landscape 1920×1080 (16:9): `neon-plinko-1920x1080.png`
- Portrait  800×1200 (2:3):   `neon-plinko-800x1200.png`
- Square     800×800 (1:1):   `neon-plinko-800x800.png`

> CrazyGames prefers **hero art with title overlay**, not raw screenshots. Our derived covers satisfy the size requirement; consider upgrading to proper cover art later via Fiverr/Canva if the review team flags them.

**Preview videos** (both mandatory):
- Landscape 1920×1080 16:9, 15–20 s, ≤50MB MP4, no sound
- Portrait 1080×1620 2:3,   15–20 s, ≤50MB MP4, no sound

Capture via `Cmd+Shift+5` → "Record Selected Portion" on `https://dmishra2022.github.io/games/neon-plinko/` at the two aspect ratios.

**Title**
```
Neon Plinko
```
**URL slug**
```
neon-plinko
```
**Short description (120 chars)**
```
A chill one-click physics game. Drop neon balls through a glowing peg field and chain multipliers for huge scores.
```
**Long description (480 chars)**
```
Neon Plinko is a one-click physics arcade game. Drop glowing balls into a peg field, bounce them into score slots at the bottom, and chain multipliers for huge combos. Earn credits every run and spend them on persistent upgrades like extra balls, higher peg bounce, and multiplier boosts. Built with Vite + React + TypeScript + Canvas. Fully keyboard and touch friendly, no install required.
```
**Controls**
```
Mouse / tap to drop a ball. Click upgrade cards between runs to spend credits.
```
**Tags**
```
physics, casual, idle, arcade, upgrade, one-click
```
Orientation: **Both**. Fullscreen: **Yes**. Mobile: **Yes**. Save: **Yes (localStorage)**.
Upload: drag **`neon-plinko-crazygames.zip`**.

## Y8 — Neon Plinko

Submit URL: https://developer.y8.com/games (Add New Game)

> **Correction (2026-11-05)**: Y8's old `account.y8.com/account/upload_zone` URL is dead. Current portal is `developer.y8.com` (BETA). It does NOT accept URL-only submissions — you must upload a ZIP build + screenshots + a ≥15 s gameplay video. Already-pushed Neon Plinko draft lives at https://developer.y8.com/games/neon_plinko/edit (title, description, instructions, platforms, AI declaration all pre-filled; needs media uploads from `submission-artifacts/`).

Title / short / long / controls / tags: identical to CrazyGames above.
Category: **Arcade** (or **Skill**).

## Poki — Neon Plinko

Submit URL: https://developers.poki.com/ (apply first)

Playable URL:
```
https://dmishra2022.github.io/games/neon-plinko/
```
Title / short / long / controls / tags: identical to above.
Session length estimate: **90–180 seconds**.
Retention hook: **Meta-currency upgrades between runs; one-click accessible on any device.**
Monetization: `VITE_AD_PROVIDER=poki` (flip the GitHub Actions variable before Poki reviews).

## itch.io — Neon Plinko

Submit URL: https://itch.io/game/new

- Kind of project: **HTML**
- Title: `Neon Plinko`
- Short description: *same as above*
- Upload: **`neon-plinko-itch.zip`**, tick *"This file will be played in the browser"*, viewport: `1024×768` or `Fit the entire window`.
- Pricing: `No payments required` (or `Name your own price`, suggested `$2`).
- Tags: `physics`, `casual`, `html5`, `upgrade`, `one-click`.
- Genre: `Simulation` → `Physics` (closest match).

---

# Neon Survivor

Live: https://dmishra2022.github.io/games/neon-survivor/
Icon color: magenta `#ff61d4`

## CrazyGames — Neon Survivor

**Covers** (all three required):
- Landscape 1920×1080: `neon-survivor-1920x1080.png`
- Portrait  800×1200:  `neon-survivor-800x1200.png`
- Square     800×800:  `neon-survivor-800x800.png`

**Preview videos**: landscape 16:9 + portrait 2:3, both 15-20 s, no sound.

**Title**
```
Neon Survivor
```
**URL slug**
```
neon-survivor
```
**Short description (120 chars)**
```
A bullet-heaven rogue-lite. Dodge waves of glitching enemies, auto-fire your blaster, level up new weapons.
```
**Long description (480 chars)**
```
Neon Survivor is a bullet-heaven rogue-lite in a glitching neon arena. Move to dodge, your blaster auto-fires, and every level-up offers a choice of new weapons or stat boosts. Collect XP orbs from downed enemies, survive longer, and spend meta chips between runs on permanent perks like extra max HP, pickup range, and damage. Full keyboard, mouse, and touch controls.
```
**Controls**
```
WASD / arrow keys / left stick to move. Blaster auto-fires. Pick an upgrade card on level-up. Esc or P to pause.
```
**Tags**
```
bullet-heaven, rogue-lite, action, survival, auto-fire, arcade
```
Orientation: **Landscape primary**. Fullscreen: **Yes**. Mobile: **Yes**. Save: **Yes**.
Upload: **`neon-survivor-crazygames.zip`**.

## Y8 — Neon Survivor

URL:
```
https://dmishra2022.github.io/games/neon-survivor/
```
Same title/short/long/controls/tags. Category: **Action**.

## Poki — Neon Survivor

```
https://dmishra2022.github.io/games/neon-survivor/
```
Session length estimate: **3–6 minutes per run**.
Retention hook: **Permanent meta-upgrades between runs + rotating weapon pool = high replay.**

## itch.io — Neon Survivor

Upload: **`neon-survivor-itch.zip`**. Viewport `1280×720` or `Fit the entire window`.
Genre: `Action` → `Survival`.
Tags: `bullet-heaven`, `rogue-lite`, `auto-fire`, `html5`, `arcade`.

---

# Tank Commander

Live: https://dmishra2022.github.io/games/tank-commander/
Icon color: olive `#6b7a35`

## CrazyGames — Tank Commander

**Covers** (all three required):
- Landscape 1920×1080: `tank-commander-1920x1080.png` (or `tank-commander-menu-1920x1080.png` — the title screen has a nice big "TANK COMMANDER" wordmark)
- Portrait  800×1200:  `tank-commander-800x1200.png`
- Square     800×800:  `tank-commander-800x800.png`

**Preview videos**: landscape 16:9 + portrait 2:3, both 15-20 s, no sound.

**Title**
```
Tank Commander
```
**URL slug**
```
tank-commander
```
**Short description (120 chars)**
```
Dual-stick tank arcade. Hull drives independently of the turret, shells explode on impact, four enemy archetypes.
```
**Long description (480 chars)**
```
Tank Commander is a top-down dual-axis tank arcade. The hull and turret rotate independently so you can strafe while covering an enemy. Clear three arenas of five waves each against four enemy archetypes — grunts, snipers, flankers, and heavies — using explosive shells with area damage. Earn credits every run and upgrade reinforced hull, heavy ordnance, autoloader, and composite armor back at HQ.
```
**Controls**
```
WASD / arrows to drive, mouse to aim, left-click or Space to fire. Touch: dual joystick, auto-fire snaps to nearest enemy. Esc or P to pause.
```
**Tags**
```
tank, action, dual-stick, arcade, war, shooter
```
Orientation: **Landscape**. Fullscreen: **Yes**. Mobile: **Yes**. Save: **Yes**.
Upload: **`tank-commander-crazygames.zip`**.

## Y8 — Tank Commander

URL:
```
https://dmishra2022.github.io/games/tank-commander/
```
Same title/short/long/controls/tags. Category: **Tanks** or **Shooting**.

## Poki — Tank Commander

```
https://dmishra2022.github.io/games/tank-commander/
```
Session length estimate: **4–8 minutes per run**.
Retention hook: **Three distinct arenas + four enemy archetypes + four permanent upgrades. Tight, chunky, satisfying.**

## itch.io — Tank Commander

Upload: **`tank-commander-itch.zip`**. Viewport `1280×720`.
Genre: `Action` → `Shooter`.
Tags: `tank`, `dual-stick`, `war`, `html5`, `arcade`.

---

# AdSense (self-hosted, optional)

Only relevant if you want ads on `dmishra2022.github.io/games/` directly instead of (or in addition to) the portals.

1. Apply at https://www.google.com/adsense/ with the hosted URL `https://dmishra2022.github.io/games/`.
2. Once approved, copy your publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`).
3. On GitHub: **Settings → Secrets and variables → Actions → Variables → New variable**, add two:
   - Name `VITE_AD_PROVIDER`, value `adsense`
   - Name `VITE_ADSENSE_CLIENT`, value `ca-pub-XXXXXXXXXXXXXXXX`
4. Push an empty commit or trigger the workflow to rebuild with ads enabled: `git commit --allow-empty -m "ads: enable adsense" && git push`.

---

# Flipping the ad SDK per portal

Each portal has its own SDK that the bundled code can call once the env var is set. **Only change the variable, never the code.**

| Portal           | GitHub Actions Variable                               |
| ---------------- | ----------------------------------------------------- |
| CrazyGames       | `VITE_AD_PROVIDER=crazygames`                         |
| Y8               | leave default (`none`); Y8 wraps its own ad player    |
| Poki             | `VITE_AD_PROVIDER=poki`                               |
| itch.io          | leave default (`none`); itch forbids 3rd-party ads    |
| AdSense (own)    | `VITE_AD_PROVIDER=adsense` + `VITE_ADSENSE_CLIENT=…`  |

Only one GitHub Pages build at a time, so pick the portal driving the most traffic as the "canonical" build on `main`. For the CrazyGames and Poki ZIPs you submit directly, I pre-baked them with the right provider already (`-crazygames.zip` / rebuild with `VITE_AD_PROVIDER=poki` when Poki asks for a packaged build).

---

# Assets status

## Already produced (2026-11-05)

Screenshots at every portal-required size are in [`submission-artifacts/screenshots/`](submission-artifacts/screenshots) (gitignored on disk). See [`docs/SCREENSHOTS-MAP.md`](docs/SCREENSHOTS-MAP.md) for the per-portal file mapping:

- 1920×1080 (CrazyGames, Poki, Y8 landscape promo, itch gallery)
- 1280×720 (Y8 widescreen)
- 1080×1920 (Y8 portrait promo)
- 760×570 (Y8 standard + Y8 game card)
- 630×500 (itch cover, CrazyGames thumbnail)
- 512×512 (Poki icon, AdSense square)

## Still needed (you must produce)

- **Gameplay videos** (Y8 requires 16:9 ≥15 s MP4; Poki wants a trailer 20–40 s)

Fastest capture flow:
1. Open the live game at `https://dmishra2022.github.io/games/<game>/`.
2. `Cmd+Shift+5` → "Record Selected Portion" → draw 1920×1080 rect over game area → Record → play 20–30 s → Stop.
3. QuickTime auto-saves to Desktop as `.mov`; drag into [CloudConvert](https://cloudconvert.com/mov-to-mp4) for MP4, or use `ffmpeg -i in.mov -crf 23 out.mp4`.

## itch.io automation — ready to run

Butler CLI already downloaded to [`tools/butler`](tools/butler) (gitignored, re-run `./scripts/push-to-itch.sh` to self-install from https://broth.itch.zone/butler/darwin-amd64/LATEST on a fresh clone).

```bash
export BUTLER_API_KEY=<from https://itch.io/user/settings/api-keys>
export ITCH_USER=dmishra2022
./scripts/push-to-itch.sh   # pushes all 3 ZIPs; creates unlisted drafts on first run
```

---

# Submission state tracker

Tick as you go.

| Game             | CrazyGames | Y8 | Poki | AdSense | itch.io |
| ---------------- | ---------- | -- | ---- | ------- | ------- |
| Neon Plinko      | ☐          | ☐  | ☐    | ☐       | ☐       |
| Neon Survivor    | ☐          | ☐  | ☐    | ☐       | ☐       |
| Tank Commander   | ☐          | ☐  | ☐    | ☐       | ☐       |
