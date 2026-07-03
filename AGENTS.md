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
  config.js                 # Field dimensions, formations, player constants, TICK_MS
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
    PlayInterpreter.js      # Wraps play JSON (name, description, commands, formation, placement)
    AnimationRunner.js      # Tick-based execution: runs per-player timelines each tick
  plays/
    index.js                # Array of all play definitions
  formations/
    diamond.json            # Diamond formation positions
    goalKick.json           # Goal kick formation
    kickoff.json            # Kickoff formation
  ui/
    PlayControls.js         # Sidebar: playlist, play/pause, restart, speed slider, editor buttons
    EditorControls.js       # Bottom bar UI for Formation Editor and Action Editor
```

## Field Coordinate System

- Field-space coordinates: `x: 0-340, y: 0-520` (top-left origin, goals at top/bottom)
- `AnimationRunner` automatically translates to screen coords via `FIELD.X_OFFSET`/`Y_OFFSET`
- Goals: top (defending) and bottom (attacking)
- Current canvas: 780×580 with 220px sidebar

## Tick System

- **100ms ticks** (10 ticks per second). All `duration` and `delay` values are integers (ticks).
- No Phaser tweens — `AnimationRunner` manually interpolates positions each tick in `update()`.
- The progress slider steps by tick index from 0 to `maxTicks`.
- Scrubbing calls `snapToTick(tickIndex)` which replays all actions up to that tick.

## Play Format (JSON)

Each play has `name`, `description`, `formation`, `placement`, and `commands` — an array of **per-player timelines**:

```js
{
  "name": "CM Overlap & Score",
  "description": "CM passes to LM → LM draws defender → CM overlaps outside → FWD lays off → CM scores",
  "formation": "diamond",
  "placement": "CM",
  "commands": [
    { "player": "CM", "actions": [
      { "action": "pass", "target": {x:105,y:220}, "duration": 8, "delay": 0 },
      { "action": "run",  "path": [{x:130,y:270},{x:90,y:230},{x:65,y:170}], "duration": 20, "delay": 8 },
      { "action": "run",  "path": [{x:80,y:130},{x:120,y:65}], "duration": 16, "delay": 28 },
      { "action": "shoot","target": {x:170,y:0}, "duration": 5, "delay": 44 },
    ]},
    { "player": "LM", "actions": [
      { "action": "run",  "path": [{x:105,y:220},{x:125,y:215}], "duration": 5, "delay": 8 },
      { "action": "pass", "target": {x:150,y:130}, "duration": 6, "delay": 13 },
    ]},
  ]
}
```

## Rules

- All entries in `commands` run **in parallel** (one per player timeline)
- Within a player, `actions` run **sequentially** (one completes before next starts)
- `delay` is absolute offset from T=0 (in ticks). Sequential actions use cumulative delay
- `duration` is in ticks (required for all actions)
- `formation` is a top-level property (preset name from `FORMATIONS`) — applied on play load
- `placement` is a top-level property — playerId string (ball starts on them) or `{x,y}` object, or `null`
- `run` action: moves player along all waypoints using the full `duration`
- `pass` action: ball animates from its current position to `target` in straight line. No auto-attach.
- `shoot` action: ball animates to `target` in straight line.
- Passes and shots use straight-line animation (no Bezier arcs).

## Available Actions

| Action | Params | Description |
|---|---|---|
| `pass` | `target{x,y}`, `duration`, `delay` | Straight-line ball animation to target coordinates. Ball pickup via collision. |
| `run` | `path[]`, `duration`, `delay` | Player moves along path waypoints over given duration. |
| `shoot` | `target{x,y}`, `duration`, `delay` | Ball shoots to target in straight line, no receiver. |

`run` actions compute duration based on distance at `RUN_SPEED` (80 units/s). All durations in ticks (100ms each).

## Collision Detection

In `AnimationRunner.update()` every tick during `run` actions:
1. If `ball.carrier` is already this player → skip
2. If `ball.carrier` is set to someone else → skip
3. Compute distance from ball screen position to player screen position
4. If distance < `PLAYER_RADIUS * 2 * scale` → `ball.attachTo(thisPlayer)`

This handles: CM passes ball to coordinates (ball in-flight, detached). LM's run runs in parallel. When LM crosses near the ball, LM picks it up.

## Formations

Defined in `config.js` / `src/formations/`. Current presets: `diamond`, `goalKick`, `kickoff`.

## Players

7 players: `GK`, `CM`, `LB`, `RB`, `LM`, `RM`, `FWD`. All smiley faces with text labels. Ball follows dribbling player via `attachTo()/detach()`.

## Controls

- Sidebar: click play buttons to load, Play/Pause, Restart, Speed slider (0.25x–3.0x)
- Step label shows "Tick X/Y" or "Play finished"
- Progress slider: 0..maxTicks, scrubbing via `snapToTick()`

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
- **Recording runs**: Drag a player freely across the field. Path is sampled, simplified (Ramer-Douglas-Peucker), and recorded as a `run` action with waypoints. Live path line drawn during drag.
- **Recording passes**: Drag the ball from its carrier to a target coordinate → `pass` action with `target{x,y}`
- **Recording shots**: Drag the ball to the goal area → `shoot` action
- Actions are recorded per-player, sequentially. Each run/pass/shoot appends to the player's action list with cumulative delay.
- "Log Full Play" outputs the complete play JSON (with `formation` + `placement`) to console and clipboard

## Adding New Plays

Edit `src/plays/index.js` and add an import + entry to the exported array. All positions are in field-space (no offset needed — `AnimationRunner.toScreen()` handles it). Or use the Action Editor to create plays visually and paste the clipboard output into a new JSON file.