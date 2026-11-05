# Screenshots → Portal Field Map

Captured 2026-11-05 from live builds at `https://dmishra2022.github.io/games/`.

Masters are the 1920×1080 captures; all other sizes are derived via macOS `sips` (see `scripts/derive-screenshots.sh`).

## File inventory (per game)

Each game has the following sizes available under `submission-artifacts/screenshots/`:

| Size (px)  | File suffix            | Primary portal use                                                      |
|------------|------------------------|-------------------------------------------------------------------------|
| 1920 × 1080 | `-1920x1080.png`       | Y8 landscape promo, CrazyGames screenshot, Poki screenshot, itch gallery |
| 1280 × 720  | `-1280x720.png`        | Y8 widescreen screenshot                                                |
|  760 × 570  | `-760x570.png`         | Y8 standard screenshot **and** Y8 game card promo                        |
| 1080 × 1920 | `-1080x1920.png`       | Y8 portrait promo                                                       |
|  630 × 500  | `-630x500.png`         | itch.io cover image **and** CrazyGames thumbnail                         |
|  512 × 512  | `-512x512.png`         | Poki game icon, Google AdSense square unit                              |

Tank Commander additionally has `tank-commander-menu-1920x1080.png` (the title screen) — useful as a secondary screenshot or cover art.

## Y8 Neon Plinko form (https://developer.y8.com/games/neon_plinko/edit)

| Y8 field                      | File to drag                              |
|-------------------------------|-------------------------------------------|
| Standard Screenshot (760×570)  | `neon-plinko-760x570.png`                  |
| Widescreen Screenshot (1280×720) | `neon-plinko-1280x720.png`              |
| Landscape Promo (1920×1080)    | `neon-plinko-1920x1080.png`                |
| Portrait Promo (1080×1920)     | `neon-plinko-1080x1920.png`                |
| Game Card Promo (760×570)      | `neon-plinko-760x570.png` (re-use)          |

Repeat the pattern for `neon_survivor` and `tank_commander` (use `tank-commander-menu-1920x1080.png` as a bonus screenshot slot).

## CrazyGames

| CrazyGames field | File                            |
|------------------|---------------------------------|
| Screenshots (up to 5) | `<game>-1920x1080.png`     |
| Thumbnail        | `<game>-630x500.png`            |

## Poki

| Poki field       | File                            |
|------------------|---------------------------------|
| Screenshots (3–5) | `<game>-1920x1080.png`         |
| Icon (optional)  | `<game>-512x512.png`            |

## itch.io

| itch field       | File                            |
|------------------|---------------------------------|
| Cover (630×500)   | `<game>-630x500.png`            |
| Screenshots      | `<game>-1920x1080.png` + `<game>-1280x720.png` |

## What's still missing

- **Gameplay videos** (Y8 requires 16:9, ≥15s, MP4, ≤50MB). Not produced yet — screen-record each game with QuickTime (`Cmd+Shift+5` on macOS, "Record Selected Portion", 20 s of play) and save as MP4.
- **CrazyGames and Poki don't strictly require videos** — you can submit with screenshots only.
