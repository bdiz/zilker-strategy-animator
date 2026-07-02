# Bowie's Team Soccer Strategy Animator

A browser-based 2D soccer strategy animator built with **Phaser.js 3** and **Vite**.

## Quick Start

```bash
npm run dev     # Dev server (http://localhost:5173)
npm run build   # Production build → dist/
```

## Project Structure

```
src/
  main.js                   # Phaser game config, entry point
  config.js                 # Field dimensions, formations, player constants
  scenes/
    BootScene.js            # Generates smiley face + ball textures programmatically
    FieldScene.js           # Draws vertical pitch (grass, lines, goals, center circle)
    PlayScene.js            # Creates 7 players + ball, loads/plays animations
  objects/
    Player.js               # Smiley face sprite with text label (container)
    Ball.js                 # White ball sprite, follows carrier via update()
  animation/
    PlayInterpreter.js      # Wraps play JSON (name, description, commands)
    AnimationRunner.js      # Executes parallel groups sequentially via Phaser tweens
  plays/
    index.js                # Array of all play definitions
  ui/
    PlayControls.js         # Sidebar: playlist, play/pause, restart, speed slider
```

## Field Coordinate System

- Field-space coordinates: `x: 0-340, y: 0-520` (top-left origin, goals at top/bottom)
- `AnimationRunner` automatically translates to screen coords via `FIELD.X_OFFSET`/`Y_OFFSET`
- Goals: top (defending) and bottom (attacking)
- Current canvas: 780×580 with 220px sidebar

## Play Format (JSON)

Each play has `name`, `description`, and `commands` — an **array of arrays** (parallel groups):

```js
commands: [
  // Group 1 — runs in parallel
  [
    { action: "pass", from: "CDM", to: "LM", duration: 800 },
  ],
  // Group 2 — runs after group 1 completes
  [
    { action: "run", player: "LM", path: [{ x: 120, y: 220 }] },
    { action: "run", player: "CDM", path: [{ x: 130, y: 270 }, { x: 65, y: 170 }] },
  ],
]
```

## Available Actions

| Action | Params | Description |
|---|---|---|
| `pass` | `from`, `to`, `duration` | Bezier arc ball animation, attaches ball to receiver on complete |
| `run` | `player`, `path[]` | Player moves to last path point. Duration auto-computed from distance at `RUN_SPEED` (80 units/s). Ball follows automatically if player has it attached. |
| `walk` | `player`, `path[]` | Same as run but at `WALK_SPEED` (50 units/s). |
| `shoot` | `player`, `target{x,y}`, `duration` | Ball shoots to target, no receiver attachment |
| `placeBall` | `at{x,y}` | Instantly place ball at position |
| `setFormation` | `name` | Snap all players to formation preset |

Speed constants (`RUN_SPEED`, `WALK_SPEED`) defined in `config.js`. All durations in milliseconds. `pass` and `shoot` require explicit `duration`; `run` and `walk` omit it (auto-computed).

> **Important:** Every play **must** include a `placeBall` command in the first group to position the ball before the first action. The `at` position should be at the starting player's location plus a bottom-right offset (e.g., `{ x: 183, y: 323 }` for CDM at `{ x: 170, y: 310 }`). This ensures the ball is visible on the field before pressing play.

## Formations

Defined in `config.js`. Current presets: `diamond`, `goalKick`, `kickoff`.

## Players

7 players: `GK`, `CDM`, `LB`, `RB`, `LM`, `RM`, `FWD`. All smiley faces with text labels. Ball follows dribbling player via `attachTo()/detach()`.

## Controls

- Sidebar: click play buttons to load, Play/Pause, Restart, Speed slider (0.25x–3.0x)
- Step label shows current group progress

## Adding New Plays

Edit `src/plays/index.js` and add an object to the exported array. All positions are in field-space (no offset needed — `AnimationRunner.toScreen()` handles it).