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
  config.js                 # Field dimensions, formations, player constants, DEV_MODE flag
  scenes/
    BootScene.js            # Generates smiley face + ball textures programmatically
    FieldScene.js           # Draws vertical pitch (grass, lines, goals, center circle)
    PlayScene.js            # Creates 7 players + ball, loads/plays animations
    FormationEditorScene.js # Drag players to position, logs formation JSON to console + clipboard
    ActionEditorScene.js    # Drag players for run paths, ball for passes/shots, logs play JSON
  objects/
    Player.js               # Smiley face sprite with text label (container); enableDrag/disableDrag
    Ball.js                 # White ball sprite, follows carrier via update(); enableDrag/disableDrag
  animation/
    PlayInterpreter.js      # Wraps play JSON (name, description, commands)
    AnimationRunner.js      # Executes parallel groups sequentially via Phaser tweens
  plays/
    index.js                # Array of all play definitions
  ui/
    PlayControls.js         # Sidebar: playlist, play/pause, restart, speed slider, editor buttons
    EditorControls.js       # Bottom bar UI for Formation Editor and Action Editor
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
    { action: "pass", from: "CM", to: "LM", duration: 800 },
  ],
  // Group 2 — runs after group 1 completes
  [
    { action: "run", player: "LM", path: [{ x: 120, y: 220 }] },
    { action: "run", player: "CM", path: [{ x: 130, y: 270 }, { x: 65, y: 170 }] },
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
| `placeBall` | `at{x,y}` or `player` | Instantly place ball at position or on a player by name |
| `setFormation` | `name` | Snap all players to formation preset |

Speed constants (`RUN_SPEED`, `WALK_SPEED`) defined in `config.js`. All durations in milliseconds. `pass` and `shoot` require explicit `duration`; `run` and `walk` omit it (auto-computed).

## Formations

Defined in `config.js`. Current presets: `diamond`, `goalKick`, `kickoff`.

## Players

7 players: `GK`, `CM`, `LB`, `RB`, `LM`, `RM`, `FWD`. All smiley faces with text labels. Ball follows dribbling player via `attachTo()/detach()`.

## Controls

- Sidebar: click play buttons to load, Play/Pause, Restart, Speed slider (0.25x–3.0x)
- Step label shows current group progress

## Editor Mode (Dev Only)

Visible when `DEV_MODE = true` (auto-enabled during `npm run dev` via `import.meta.env.DEV`).

### Formation Editor
- All 7 players start on the sideline (off-field)
- Drag players onto the field to set positions
- Players dragged off-field snap back to sideline
- "Save Formation" logs JSON to console and copies to clipboard

### Action Editor
- Select a formation from the sidebar dropdown to start
- All players snap to that formation, ball starts on sideline
- **Recording runs**: Drag a player freely across the field. Path is sampled, simplified (Ramer-Douglas-Peucker), and recorded as a `run` command with waypoints
- **Recording passes**: Drag the ball from its carrier to another player → `pass` command
- **Recording shots**: Drag the ball to the goal area → `shoot` command
- **Groups**: Click "New Group" to start a new sequential parallel group. Actions within a group run simultaneously
- "Log Full Play" outputs the complete play JSON (with `setFormation` + `placeBall` preamble) to console and clipboard

## Adding New Plays

Edit `src/plays/index.js` and add an object to the exported array. All positions are in field-space (no offset needed — `AnimationRunner.toScreen()` handles it). Or use the Action Editor to create plays visually and paste the clipboard output into a new JSON file.