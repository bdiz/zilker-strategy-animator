const defaultOverlapPlay = {
  name: "CDM Overlap & Score",
  description: "CDM passes to LM → LM draws defender → CDM overlaps outside → FWD lays off → CDM scores",
  commands: [
    [
      { action: "pass", from: "CDM", to: "LM", duration: 800 },
    ],
    [
      { action: "dribble", player: "LM", path: [
        { x: 105, y: 220 },
        { x: 125, y: 215 },
      ], duration: 1500 },
      { action: "run", player: "CDM", path: [
        { x: 130, y: 270 },
        { x: 90, y: 230 },
        { x: 65, y: 170 },
      ], duration: 2500 },
      { action: "run", player: "FWD", path: [
        { x: 150, y: 130 },
      ], duration: 2000 },
    ],
    [
      { action: "pass", from: "LM", to: "FWD", duration: 600 },
    ],
    [
      { action: "pass", from: "FWD", to: "CDM", duration: 700 },
    ],
    [
      { action: "dribble", player: "CDM", path: [
        { x: 80, y: 130 },
        { x: 120, y: 65 },
      ], duration: 1500 },
    ],
    [
      { action: "shoot", player: "CDM", target: { x: 170, y: 0 }, duration: 500 },
    ],
  ],
};

const goalKickPlay = {
  name: "Goal Kick Build-Up",
  description: "CDM takes goal kick short to LB → carries up → plays to LM → switches to RM",
  commands: [
    [
      { action: "setFormation", name: "goalKick" },
      { action: "placeBall", at: { x: 170, y: 470 } },
    ],
    [
      { action: "walk", player: "CDM", path: [
        { x: 160, y: 440 },
      ], duration: 800 },
      { action: "run", player: "LB", path: [
        { x: 80, y: 360 },
      ], duration: 800 },
    ],
    [
      { action: "pass", from: "CDM", to: "LB", duration: 600 },
    ],
    [
      { action: "dribble", player: "LB", path: [
        { x: 80, y: 320 },
        { x: 85, y: 270 },
        { x: 95, y: 220 },
      ], duration: 2200 },
      { action: "run", player: "CDM", path: [
        { x: 150, y: 300 },
        { x: 170, y: 250 },
      ], duration: 2200 },
      { action: "run", player: "LM", path: [
        { x: 120, y: 200 },
      ], duration: 1400 },
    ],
    [
      { action: "pass", from: "LB", to: "LM", duration: 600 },
    ],
    [
      { action: "dribble", player: "LM", path: [
        { x: 140, y: 190 },
        { x: 170, y: 180 },
      ], duration: 1500 },
    ],
    [
      { action: "pass", from: "LM", to: "RM", duration: 800 },
    ],
    [
      { action: "dribble", player: "RM", path: [
        { x: 250, y: 200 },
        { x: 260, y: 230 },
      ], duration: 1200 },
    ],
  ],
};

export default [defaultOverlapPlay, goalKickPlay];