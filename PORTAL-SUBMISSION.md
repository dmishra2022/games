# Portal-submission checklist

Live arcade: https://dmishra2022.github.io/games/

This file is the practical "what to upload where" checklist for the portals named in [`master_prompt.md`](master_prompt.md). Each section is one portal. Nothing here changes the code — it's the metadata and assets the portal review teams ask for.

---

## Shared game metadata

Reuse these three blurbs across every portal:

### Neon Plinko
- **URL:** https://dmishra2022.github.io/games/neon-plinko/
- **Tagline:** Drop neon balls, chain multipliers, upgrade.
- **Short (120 char):** A chill one-click physics game. Drop neon balls through a glowing peg field and chain multipliers for huge scores.
- **Long (480 char):** Neon Plinko is a one-click physics arcade game. Drop glowing balls into a peg field, bounce them into score slots at the bottom, and chain multipliers for huge combos. Earn credits every run and spend them on persistent upgrades like extra balls, higher peg bounce, and multiplier boosts. Built with Vite + React + TypeScript + Canvas. Fully keyboard and touch friendly, no install required.
- **Tags:** physics, casual, idle, arcade, upgrade, one-click
- **Controls:** Mouse / tap to drop balls. Buttons to buy upgrades.
- **Orientation:** landscape and portrait both work; renders responsively.

### Neon Survivor
- **URL:** https://dmishra2022.github.io/games/neon-survivor/
- **Tagline:** Dodge, auto-fire, level up.
- **Short (120 char):** A bullet-heaven rogue-lite. Dodge waves of glitching enemies, auto-fire your blaster, level up new weapons.
- **Long (480 char):** Neon Survivor is a bullet-heaven rogue-lite in a glitching neon arena. Move to dodge, your blaster auto-fires, and every level-up offers a choice of new weapons or stat boosts. Collect XP orbs from downed enemies, survive longer, and spend meta chips between runs on permanent perks like extra max HP, pickup range, and damage. Full keyboard, mouse, and touch controls.
- **Tags:** bullet-heaven, rogue-lite, action, survival, auto-fire, arcade
- **Controls:** WASD / arrow keys / left stick to move. Blaster auto-fires. Level-up card picks the next upgrade.
- **Orientation:** landscape-first; works portrait on mobile.

### Tank Commander
- **URL:** https://dmishra2022.github.io/games/tank-commander/
- **Tagline:** Pilot an iron beast.
- **Short (120 char):** Dual-stick tank arcade. Hull drives independently of the turret, shells explode on impact, four enemy archetypes.
- **Long (480 char):** Tank Commander is a top-down dual-axis tank arcade. The hull and turret rotate independently so you can strafe while covering an enemy. Clear three arenas of five waves each against four enemy archetypes — grunts, snipers, flankers, and heavies — using explosive shells with area damage. Earn credits every run and upgrade reinforced hull, heavy ordnance, autoloader, and composite armor back at HQ.
- **Tags:** tank, action, dual-stick, arcade, war, shooter
- **Controls:** WASD / arrows to drive, mouse to aim, left-click or space to fire. Touch: dual joystick, auto-fire snaps to nearest enemy.
- **Orientation:** landscape.

---

## 1 · CrazyGames Developer Portal

**Submit at:** https://developer.crazygames.com/

CrazyGames expects a packaged ZIP of the built game (not a URL). You can either upload each game as its own submission (recommended — three listings), or submit the whole arcade as one.

### Prepare each ZIP

```bash
cd neon-plinko      # repeat for neon-survivor / tank-commander
npm ci
VITE_AD_PROVIDER=crazygames npm run build
cd dist && zip -r ../neon-plinko.zip . && cd ..
```

The ZIP root must contain `index.html` (it already does — `base: './'` keeps assets relative).

### Required assets per game

| Asset | Size | Where to generate |
| --- | --- | --- |
| Logo | 512×512 PNG | Any editor (keep the SVG favicon from `index.html` as a starting point) |
| Thumbnail | 1600×900 JPG | Screenshot gameplay; add the title text in the corner |
| Screenshots | min 3 × 1280×720 JPG | `F12` → device toolbar → `1280×720` → capture mid-session |
| Short desc | 120 chars | Use the blurbs above |
| Long desc | 480 chars | Use the blurbs above |
| Tags | 4–8 | Use the tags above |
| Controls | plain text | Use the Controls lines above |

### Toggle the SDK

In **GitHub → Settings → Secrets and variables → Actions → Variables** add `VITE_AD_PROVIDER=crazygames` before the final ZIP build. The adapter in `*/src/monetization/providers/crazygames.ts` auto-loads the SDK and wires `requestAd('midgame' | 'rewarded')`.

Revenue split and payout schedule are configured inside the CrazyGames dashboard after the game is approved.

---

## 2 · Y8 Games Studio

**Submit at:** https://account.y8.com/account/upload_zone

Y8 accepts either a hosted URL or a ZIP. Since the arcade is already on GitHub Pages, submit the URL for each game. Y8 wraps the game in its own ad player, so you do **not** need to flip the ad provider for Y8 submissions.

- Upload a 512×512 logo per game (same as CrazyGames).
- Upload three 1280×720 screenshots per game.
- Paste short + long descriptions.
- Controls text (see Shared metadata above).
- Pick one category tag: `Action`, `Arcade`, or `Tanks`.

Y8 review usually finishes in 1–3 business days.

---

## 3 · Poki for Developers

**Submit at:** https://developers.poki.com/

Poki is more selective — expect feedback and iteration rounds. They want:

- A hosted playable URL (use `https://dmishra2022.github.io/games/<game>/`).
- 1280×720 thumbnail + 512×512 square.
- At least five 1280×720 screenshots.
- A 20–40 s MP4 trailer (optional but strongly recommended).
- A design doc page covering target audience, average session length, retention hook, and monetization intent.

### Toggle the SDK before submission

Set `VITE_AD_PROVIDER=poki` in GitHub Actions Variables and push. The adapter in `*/src/monetization/providers/poki.ts` auto-loads `poki-sdk.js` and wires `commercialBreak()`, `rewardedBreak()`, `gameplayStart/Stop`. Poki's reviewers verify these fire at the right lifecycle moments, so after flipping the variable, open DevTools → Network on the live build and confirm the SDK script loads before submitting.

---

## 4 · Google AdSense for Games (self-hosted ads)

**Sign up at:** https://www.google.com/adsense/

Only relevant if you keep traffic on `dmishra2022.github.io` instead of (or in addition to) portal distribution. Steps:

1. Apply for AdSense; AdSense approves domains, not individual pages. GitHub Pages works but review can be slow.
2. Once approved, copy the publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`).
3. In **GitHub → Settings → Secrets and variables → Actions → Variables** add:
   - `VITE_AD_PROVIDER=adsense`
   - `VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX`
4. Push to rebuild. The adapter in `*/src/monetization/providers/adsense.ts` loads `adsbygoogle.js` with your client ID.
5. Create ad units in the AdSense dashboard; the adapter currently pushes a generic `adsbygoogle.push({})` — you'll want to replace that with the specific ad-unit snippet AdSense generates for you.

---

## 5 · itch.io (name-your-own-price)

**Submit at:** https://itch.io/game/new

Great for direct donations + tracking a dedicated fan base. Steps per game:

1. Build with `VITE_AD_PROVIDER=none` (no ads on itch).
2. `cd <game>/dist && zip -r ../<game>-itch.zip .`
3. On itch: **Create new project** → kind of project **HTML**.
4. Upload the ZIP, tick **"This file will be played in the browser"**, set **viewport** to 1280×720 (or `Fit the entire window`).
5. Pricing: **"No payments required"** or **"Name your own price"** with a suggested $2 default.
6. Add the same cover + screenshots as CrazyGames.
7. Enable **Community → Comments** for feedback.

---

## Submission state tracker

| Game | CrazyGames | Y8 | Poki | AdSense | itch.io |
| --- | --- | --- | --- | --- | --- |
| Neon Plinko | ☐ | ☐ | ☐ | ☐ | ☐ |
| Neon Survivor | ☐ | ☐ | ☐ | ☐ | ☐ |
| Tank Commander | ☐ | ☐ | ☐ | ☐ | ☐ |

Tick each as you submit; keep the submission email + review URL in a password manager or a private notes file (don't commit review URLs — they often contain tokens).
