export const DEV_MODE = import.meta.env.DEV;

export const TICK_MS = 143;

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
  GK: "GK", CM: "CM", LB: "LB", RB: "RB", LM: "LM", RM: "RM", FWD: "FWD",
};

export const PLAYER_IDS = ["GK", "CM", "LB", "RB", "LM", "RM", "FWD"];

import offensive from './formations/offensive.json';
import offensiveLb from './formations/offensive-lb.json';
import goalKick from './formations/goal-kick.json';
import kickoff from './formations/kickoff.json';
import cornerRight from './formations/corner-right.json';
import teamGarret from './formations/team-garret.json';

export const FORMATIONS = { kickoff, offensive, offensiveLb, goalKick, cornerRight, teamGarret };

export const PLAYER_RADIUS = 16;
export const BALL_RADIUS = 15;
export const RUN_SPEED = 80;
export const WALK_SPEED = 50;
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
  const gd = FIELD.GOAL_DEPTH;
  const overlayPad = 60;
  const visH = canvasH - overlayPad;
  const margin = gd + 8;
  const hMargin = 18;
  const effW = fw + hMargin * 2;
  const effH = fh + margin * 2;
  const scale = Math.min(canvasW / effW, visH / effH);
  const offsetX = (canvasW - fw * scale) / 2;
  const offsetY = (visH - fh * scale) / 2;
  return { scale, offsetX, offsetY, canvasW, canvasH };
}

export function toScreen(layout, p) {
  return {
    x: layout.offsetX + p.x * layout.scale,
    y: layout.offsetY + p.y * layout.scale,
  };
}

export function toField(layout, screenX, screenY) {
  return {
    x: (screenX - layout.offsetX) / layout.scale,
    y: (screenY - layout.offsetY) / layout.scale,
  };
}
