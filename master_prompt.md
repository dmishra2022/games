Role & Objective:
You are an expert full-stack web game developer, UI/UX designer, and software architect specializing in highly performance-optimized HTML5/JavaScript browser games. Your task is to build a complete, production-ready, mobile-responsive browser game based on the specifications below.

Game Concept & Core Mechanics:
- Genre: [e.g., Casual Physics Puzzle / Endless Clicker / Roguelike Deckbuilder]
- Target Theme/Aesthetic: [e.g., Cyberpunk minimalist, vibrant neon arcade, cozy pixel art]
- Core Gameplay Loop: [Describe exactly what the player does over and over. E.g., Player clicks to launch a neon ball -> Ball bounces off pegs scoring points -> Ball lands in moving buckets -> Player buys upgrades with points to launch more balls.]

Technical Stack Requirements:
- Frontend: Single-page application using React, Vite, and Tailwind CSS.
- Rendering: [Choose one: HTML5 Canvas for heavy 2D graphics / Standard React DOM elements with Tailwind animations for simple text/clicker games].
- State Management: Pure, centralized React state or a clean React Context. Do not use external state libraries unless explicitly requested.
- State Persistence: Automatically save the game state (high scores, currency, unlocked items) to localStorage so progress is kept on refresh.
- Responsiveness: The layout must scale beautifully using a fixed-aspect-ratio viewport or responsive CSS grid, running flawlessly on both desktop browsers and mobile touchscreens.

Architecture & Implementation Strategy (Step-by-Step):
1. Phase 1: Core Engine Loop. Build the bare minimum playable prototype first. Implement the mathematical game loop, physics engine, or core click tracking logic using simple placeholder boxes/circles.
2. Phase 2: Interface & State. Layer the UI screens on top: Main Menu, Game Over Screen, HUD (Score, Level, Currency displays), and an Upgrades/Settings overlay panel.
3. Phase 3: Visual Polish & Sound. Replace placeholders with beautiful Tailwind styling, dynamic particle effects, CSS keyframe animations, and safe, browser-compatible Web Audio API sound synths (no external audio file dependencies).
4. Phase 4: Monetization & Integration Hooks. Create explicit wrapper functions where ad placements or platform SDKs (e.g., CrazyGames, Poki, or AdSense) can be easily pasted in later (e.g., `triggerRewardedAd()`, `showInterstitialAd()`).

UI/UX & Accessibility Guidelines:
- Implement clear, responsive touch controls for mobile alongside standard keyboard/mouse mapping for desktop.
- Maintain high-contrast visual hierarchies with smooth transitions between menus and active gameplay states.
- Ensure all interactive buttons have clear hover, active, and disabled states.

Code Quality Standards:
- Write modular, cleanly commented TypeScript/JavaScript inside a structured component directory.
- Avoid nesting complex math inside render loops; separate calculations from visual updates.
- Ensure the game loop handles frame rate variations using a delta-time implementation (`requestAnimationFrame`).

Begin by initializing Phase 1. Write the foundational project structure and the absolute core gameplay mechanic loop first. Do not add menus or complex styles yet; focus entirely on making the primary gameplay loop work perfectly.


Phase 2: Host It Globally (For Free) Github pages Push your code directly to a repository and enable "Pages" in the settings panel.


Phase 3: Monetize the Game

Browser games rely heavily on high volumes of casual traffic. The most effective ways to monetize include:

1. Web Game Portals (High Traffic Ad Revenue Share)

Instead of relying solely on your own URL, submit your game to established casual gaming portals. They embed high-paying programmatic advertisements (pre-roll, mid-roll, and rewarded video ads) and split the revenue with you.
• CrazyGames Developer Portal: One of the largest web game portals with excellent revenue split programs.
• Y8 Games Studio: Highly accessible platform with built-in SDKs for ad insertion.
• Poki for Developers: A curated platform that offers high traffic for highly engaging, polished games

2. Self-Hosted On-Canvas Advertising

If you are hosting the game on your own domain (e.g., via Vercel), you can place ad tags directly inside your game layout.
• Google AdSense for Games: Allows you to insert video, interstitial, and text ads smoothly into HTML5 browser-based games.
• AdinPlay: A monetization platform tailored specifically for web games.

3. Casual Microtransactions & Donations

• itch.io: Host your game here using a "Name Your Own Price" model, allowing loyal players to tip or purchase premium downloadable asset packs