# Arcade — free HTML5 browser games

**Live:** [https://dmishra2022.github.io/games/](https://dmishra2022.github.io/games/)

A tiny arcade of zero-install browser games built with **Vite + React + TypeScript + Tailwind** and a unit-tested Canvas game engine for each. Three complete games live here:

| Game | Path | Tech | Tests |
| --- | --- | --- | --- |
| [Neon Plinko](neon-plinko/) | `neon-plinko/` | Vite + Canvas + Vitest | 32 |
| [Neon Survivor](neon-survivor/) | `neon-survivor/` | Vite + Canvas + Vitest | 40 |
| [Tank Commander](tank-commander/) | `tank-commander/` | Vite + Canvas + Vitest | 63 |

Each game follows a 4-phase **spec-driven development** process (see each game's `docs/SPEC-*.md`): engine → UI/state → polish/audio → monetization.

---

## Phase 2 — Host it globally on GitHub Pages

The workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds all three games on every push to `main`, assembles them into a single static site, and deploys to GitHub Pages:

```
site/
├── index.html          ← landing page (links to each game)
├── neon-plinko/        ← built Vite output
├── neon-survivor/
└── tank-commander/
```

Each game's `vite.config.ts` uses `base: './'` so the same build runs under any sub-path.

### Enabling Pages for the first time

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under *Build and deployment* → *Source*, choose **GitHub Actions**.
4. Trigger the workflow — either push to `main` or run **Actions → Build & Deploy Arcade to GitHub Pages → Run workflow**.
5. When it finishes, Pages shows the public URL (`https://<user>.github.io/<repo>/`).

### Preview locally

```bash
# Run any one game in dev mode
cd neon-plinko && npm install && npm run dev

# Or build the whole site locally the same way CI does:
cd neon-plinko && npm install && npm run build && cd ..
cd neon-survivor && npm install && npm run build && cd ..
cd tank-commander && npm install && npm run build && cd ..
rm -rf site && mkdir -p site
cp -R landing/. site/
mkdir -p site/neon-plinko && cp -R neon-plinko/dist/. site/neon-plinko/
mkdir -p site/neon-survivor && cp -R neon-survivor/dist/. site/neon-survivor/
mkdir -p site/tank-commander && cp -R tank-commander/dist/. site/tank-commander/
touch site/.nojekyll
python3 -m http.server --directory site 7845   # open http://localhost:7845
```

---

## Phase 3 — Monetize

Each game ships a pluggable ad-provider adapter. A single build-time env var picks the portal — no code changes needed:

| `VITE_AD_PROVIDER` | Behaviour | Where to submit |
| --- | --- | --- |
| `none` *(default)* | Ads are a no-op. UI hides ad buttons in prod. | — |
| `crazygames` | Loads [CrazyGames SDK v3](https://docs.crazygames.com/sdk/html5/). Rewarded + interstitial. | [CrazyGames Developer Portal](https://developer.crazygames.com/) |
| `poki` | Loads [Poki SDK v2](https://sdk.poki.com/). Rewarded + commercial break. | [Poki for Developers](https://developers.poki.com/) |
| `adsense` | Loads [AdSense H5](https://support.google.com/adsense/answer/9183549). Requires `VITE_ADSENSE_CLIENT`. | [Google AdSense](https://www.google.com/adsense/) |

Set the env var either locally:

```bash
VITE_AD_PROVIDER=crazygames npm run build
```

or in the repo on GitHub:

**Settings → Secrets and variables → Actions → Variables → New repository variable**
Name: `VITE_AD_PROVIDER`, Value: `crazygames` (or `poki`, `adsense`).

For AdSense, also set `VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX`.

### Where ads fire

| Placement | Trigger | Frequency cap |
| --- | --- | --- |
| **Rewarded** (revive / repair / continue) | Defeat overlay button in each game | Once per run |
| **Interstitial** | Returning from a run to the main menu | 90–120 s between plays, 3 / session |

All three games test the ad surface with `provider: 'none'` so CI stays green without portal credentials.

### Submission checklist

A step-by-step checklist of **exactly** what to upload where (assets, blurbs, SDK toggles) lives at [`PORTAL-SUBMISSION.md`](PORTAL-SUBMISSION.md).

### Submission links from the master prompt

- **High-traffic portals (best revenue share for casual browser games):**
  - [CrazyGames Developer Portal](https://developer.crazygames.com/)
  - [Y8 Games Studio](https://account.y8.com/account/upload_zone)
  - [Poki for Developers](https://developers.poki.com/)
- **Self-hosted ads:**
  - [Google AdSense for Games](https://support.google.com/adsense/answer/9183549)
  - [AdinPlay](https://www.adinplay.com/)
- **Direct donations / premium bundles:**
  - [itch.io](https://itch.io/) — name-your-own-price releases

Each portal has its own SDK contract; the adapter in `src/monetization/providers/` (or `src/ads/providers/` for Tank Commander) is where that contract lives. Add more by dropping a new `AdProvider` file and extending `providers/index.ts`.

---

## Repo layout

```
.
├── .github/workflows/pages.yml   # CI build + Pages deploy
├── docs/                         # Shared SPEC drafts (Phase 1 for Plinko)
├── landing/
│   └── index.html                # Arcade landing page
├── master_prompt.md              # Original brief
├── neon-plinko/                  # Game 1
├── neon-survivor/                # Game 2
├── tank-commander/               # Game 3
└── README.md
```

## Dev commands (any game)

```bash
npm install       # install
npm run dev       # dev server
npm run build     # production build (./dist)
npm test          # vitest run
```
