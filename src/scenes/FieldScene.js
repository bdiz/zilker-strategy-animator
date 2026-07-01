import Phaser from "phaser";
import { FIELD, computeLayout, setLayout } from "../config.js";

export default class FieldScene extends Phaser.Scene {
  constructor() {
    super("FieldScene");
  }

  create() {
    this.gfx = this.add.graphics();
    this.scale.on("resize", this.handleResize, this);
    this.handleResize(this.scale.width, this.scale.height);
    this.scene.launch("PlayScene");
  }

  handleResize(w, h) {
    const layout = computeLayout(w, h);
    setLayout(layout);
    this.drawPitch(layout);
  }

  drawPitch(layout) {
    const g = this.gfx;
    g.clear();

    const { scale, offsetX, offsetY } = layout;
    const ox = offsetX;
    const oy = offsetY;
    const fw = FIELD.WIDTH * scale;
    const fh = FIELD.HEIGHT * scale;
    const cx = ox + fw / 2;
    const cy = oy + fh / 2;

    const GRASS = FIELD.GRASS_COLOR;
    const LINE = FIELD.LINE_COLOR;

    g.fillStyle(GRASS, 1);
    g.fillRect(ox, oy, fw, fh);

    g.lineStyle(2 * scale, LINE, 0.9);
    g.strokeRect(ox, oy, fw, fh);
    g.lineBetween(ox, cy, ox + fw, cy);

    g.strokeCircle(cx, cy, FIELD.CENTER_CIRCLE_RADIUS * scale);
    g.fillStyle(LINE, 1);
    g.fillCircle(cx, cy, FIELD.CENTER_SPOT_RADIUS * scale);
    g.fillStyle(GRASS, 1);

    const paW = FIELD.PENALTY_AREA_WIDTH * scale;
    const paH = FIELD.PENALTY_AREA_HEIGHT * scale;
    const paX = ox + (fw - paH) / 2;
    g.strokeRect(paX, oy, paH, paW);
    g.strokeRect(paX, oy + fh - paW, paH, paW);

    const gaW = FIELD.GOAL_AREA_WIDTH * scale;
    const gaH = FIELD.GOAL_AREA_HEIGHT * scale;
    const gaX = ox + (fw - gaH) / 2;
    g.strokeRect(gaX, oy, gaH, gaW);
    g.strokeRect(gaX, oy + fh - gaW, gaH, gaW);

    const pSpotY = oy + FIELD.PENALTY_SPOT_DIST * scale;
    g.fillStyle(LINE, 1);
    g.fillCircle(cx, pSpotY, FIELD.CENTER_SPOT_RADIUS * scale);
    g.fillCircle(cx, oy + fh - FIELD.PENALTY_SPOT_DIST * scale, FIELD.CENTER_SPOT_RADIUS * scale);
    g.fillStyle(GRASS, 1);

    g.lineStyle(2 * scale, LINE, 0.6);
    const arcR = FIELD.PENALTY_ARC_RADIUS * scale;
    const pSpot = FIELD.PENALTY_SPOT_DIST * scale;
    const pEdge = paW;
    const dy = pEdge - pSpot;
    const halfW = Math.sqrt(arcR * arcR - dy * dy);
    const a1 = Math.atan2(dy, halfW);
    const a2 = Math.atan2(dy, -halfW);
    const topArcY = oy + pSpot;
    const botArcY = oy + fh - pSpot;
    g.beginPath();
    g.arc(cx, topArcY, arcR, a1, a2, false);
    g.strokePath();
    g.beginPath();
    g.arc(cx, botArcY, arcR, -a2, -a1, false);
    g.strokePath();

    const goalW = FIELD.GOAL_WIDTH * scale;
    const goalD = FIELD.GOAL_DEPTH * scale;
    const goalX = ox + (fw - goalW) / 2;
    g.lineStyle(3 * scale, LINE, 1);
    g.strokeRect(goalX, oy - goalD, goalW, goalD);
    g.strokeRect(goalX, oy + fh, goalW, goalD);
    g.fillStyle(0xcccccc, 0.3);
    g.fillRect(goalX, oy - goalD, goalW, goalD);
    g.fillRect(goalX, oy + fh, goalW, goalD);
  }
}