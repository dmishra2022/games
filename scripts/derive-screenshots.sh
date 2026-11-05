#!/bin/bash
# Derive portal-specific screenshot sizes from 1920x1080 masters.
# Uses macOS built-in `sips` (no deps).
#
# Output naming (per game):
#   <game>-1920x1080.png   (master; CrazyGames landscape cover 16:9, Y8 landscape promo, Poki, itch gallery)
#   <game>-1280x720.png    (Y8 widescreen)
#   <game>-760x570.png     (Y8 standard screenshot + Y8 game card promo — 4:3)
#   <game>-1080x1920.png   (Y8 portrait promo — 9:16)
#   <game>-800x1200.png    (CrazyGames portrait cover — 2:3)
#   <game>-800x800.png     (CrazyGames square cover — 1:1)
#   <game>-630x500.png     (itch.io cover + CrazyGames thumbnail ~5:4)
#   <game>-512x512.png     (Poki icon + Google AdSense square)
set -euo pipefail
SHOTS="/Users/dharmendra/misc/game/submission-artifacts/screenshots"

for game in neon-plinko neon-survivor tank-commander; do
  master="$SHOTS/$game-1920x1080.png"
  [ -f "$master" ] || { echo "SKIP $game (no master)"; continue; }

  # 760x570 standard (4:3) - scale 1920x1080 down to width 1013, then crop to 760x570 center
  # Simpler: pad and scale
  sips --resampleWidth 760 "$master" --out "$SHOTS/${game}-760x570-wide.png" >/dev/null
  # Crop vertically centered to 570
  sips --cropToHeightWidth 570 760 "$SHOTS/${game}-760x570-wide.png" --out "$SHOTS/${game}-760x570.png" >/dev/null
  rm "$SHOTS/${game}-760x570-wide.png"

  # 630x500 (itch/CrazyGames thumbnail ~5:4) - center crop and scale
  sips --resampleWidth 630 "$master" --out "$SHOTS/${game}-630x500-wide.png" >/dev/null
  sips --cropToHeightWidth 500 630 "$SHOTS/${game}-630x500-wide.png" --out "$SHOTS/${game}-630x500.png" >/dev/null
  rm "$SHOTS/${game}-630x500-wide.png"

  # 512x512 square (Poki icon / AdSense) - center crop and scale
  # First scale by height to 512 (preserves game), then center-crop width to 512
  sips --resampleHeight 512 "$master" --out "$SHOTS/${game}-512-tall.png" >/dev/null
  sips --cropToHeightWidth 512 512 "$SHOTS/${game}-512-tall.png" --out "$SHOTS/${game}-512x512.png" >/dev/null
  rm "$SHOTS/${game}-512-tall.png"

  # 1080x1920 portrait (Y8 portrait promo). Rotating landscape → portrait is lossy;
  # best strategy: center-crop the master's central 608x1080 column, then upscale to 1080x1920.
  # Formula: width = 1080*1080/1920 = 607.5
  sips --cropToHeightWidth 1080 608 "$master" --out "$SHOTS/${game}-crop-portrait.png" >/dev/null
  sips --resampleWidth 1080 "$SHOTS/${game}-crop-portrait.png" --out "$SHOTS/${game}-1080x1920.png" >/dev/null
  rm "$SHOTS/${game}-crop-portrait.png"

  # 800x1200 portrait (CrazyGames portrait cover, 2:3 ratio).
  # Center-crop master to 2:3 (720x1080 of the central column), then resample to 800x1200.
  sips --cropToHeightWidth 1080 720 "$master" --out "$SHOTS/${game}-crop-2x3.png" >/dev/null
  sips --resampleWidth 800 "$SHOTS/${game}-crop-2x3.png" --out "$SHOTS/${game}-800x1200.png" >/dev/null
  rm "$SHOTS/${game}-crop-2x3.png"

  # 800x800 square (CrazyGames square cover).
  sips --cropToHeightWidth 1080 1080 "$master" --out "$SHOTS/${game}-crop-sq.png" >/dev/null
  sips --resampleWidth 800 "$SHOTS/${game}-crop-sq.png" --out "$SHOTS/${game}-800x800.png" >/dev/null
  rm "$SHOTS/${game}-crop-sq.png"

  echo "OK $game"
done

echo
echo "Final set:"
ls -1 "$SHOTS"/
