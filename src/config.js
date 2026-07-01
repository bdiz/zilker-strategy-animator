export const FIELD = {
  WIDTH: 340,
  HEIGHT: 520,
  GOAL_WIDTH: 60,
  GOAL_DEPTH: 15,
  PENALTY_AREA_WIDTH: 100,
  PENALTY_AREA_HEIGHT: 200,
  GOAL_AREA_WIDTH: 32,
  GOAL_AREA_HEIGHT: 90,
  CENTER_CIRCLE_RADIUS: 35,
  CENTER_SPOT_RADIUS: 3,
  PENALTY_SPOT_DIST: 70,
  PENALTY_ARC_RADIUS: 40,
  LINE_WIDTH: 2,
  GRASS_COLOR: 0x2d8a4e,
  LINE_COLOR: 0xffffff,
};

export const PLAYER_NAMES = {
  GK: "GK", CDM: "CDM", LB: "LB", RB: "RB", LM: "LM", RM: "RM", FWD: "FWD",
};

export const PLAYER_IDS = ["GK", "CDM", "LB", "RB", "LM", "RM", "FWD"];

export const FORMATIONS = {
  diamond: {
    GK:  { x: 170, y: 480 },
    CDM: { x: 170, y: 310 },
    LB:  { x: 60, y: 350 },
    RB:  { x: 280, y: 350 },
    LM:  { x: 85, y: 210 },
    RM:  { x: 255, y: 210 },
    FWD: { x: 170, y: 100 },
  },
  goalKick: {
    GK:  { x: 170, y: 480 },
    CDM: { x: 170, y: 450 },
    LB:  { x: 70, y: 390 },
    RB:  { x: 270, y: 390 },
    LM:  { x: 110, y: 270 },
    RM:  { x: 230, y: 270 },
    FWD: { x: 170, y: 160 },
  },
  kickoff: {
    GK:  { x: 170, y: 480 },
    CDM: { x: 120, y: 310 },
    LB:  { x: 70, y: 370 },
    RB:  { x: 270, y: 370 },
    LM:  { x: 100, y: 220 },
    RM:  { x: 240, y: 220 },
    FWD: { x: 220, y: 100 },
  },
};

export const PLAYER_RADIUS = 16;
export const BALL_RADIUS = 15;
export const PLAYER_COLOR = 0xffdd44;
export const BALL_COLOR = 0xffffff;
export const BALL_SHADOW_COLOR = 0xcccccc;

let _layout = null;

export function getLayout() {
  return _layout;
}

export function setLayout(layout) {
  _layout = layout;
}

export function computeLayout(canvasW, canvasH) {
  const fw = FIELD.WIDTH;
  const fh = FIELD.HEIGHT;
  const scale = Math.min(canvasW / fw, canvasH / fh);
  const offsetX = (canvasW - fw * scale) / 2;
  const offsetY = (canvasH - fh * scale) / 2;
  return { scale, offsetX, offsetY, canvasW, canvasH };
}

export function toScreen(layout, p) {
  return {
    x: layout.offsetX + p.x * layout.scale,
    y: layout.offsetY + p.y * layout.scale,
  };
}