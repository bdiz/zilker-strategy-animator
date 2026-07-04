import Phaser from "phaser";
import Player from "../objects/Player.js";
import {
  FIELD, PLAYER_IDS, FORMATIONS,
  getLayout, setLayout, computeLayout, toField, toScreen,
} from "../config.js";

const BOTTOM_LEFT_X = 28;

export default class FormationEditorScene extends Phaser.Scene {
  constructor() {
    super("FormationEditorScene");
  }

  create() {
    this.players = {};
    this.graphics = null;
    this.currentFormationName = null;

    this.handleResize = this.handleResize.bind(this);

    this.scale.on("resize", this.handleResize);

    this.events.on("shutdown", () => {
      this.scale.off("resize", this.handleResize);
    });

    this.drawPitch();
    this.createPlayers();
    this.setupDrag();

    if (window.__pendingFormationName) {
      this.setFormation(window.__pendingFormationName);
      window.__pendingFormationName = null;
    }

    this.events.emit("editor-ready");
  }

  setFormation(name) {
    const formation = FORMATIONS[name];
    if (!formation) return;
    this.currentFormationName = name;
    Object.entries(formation).forEach(([id, pos]) => {
      const p = this.players[id];
      if (p) p.setFieldPosition(pos.x, pos.y);
    });
    this.logFormation();
  }

  handleResize() {
    const w = this.scale.width;
    const h = this.scale.height;
    const layout = computeLayout(w, h);
    setLayout(layout);
    this.drawPitch();
    Object.values(this.players).forEach((p) => p.refreshFromLayout());
  }

  drawPitch() {
    const w = this.scale.width;
    const h = this.scale.height;
    const layout = computeLayout(w, h);
    setLayout(layout);

    if (this.graphics) this.graphics.destroy();
    this.graphics = this.add.graphics();

    const { scale, offsetX, offsetY } = layout;
    const ox = offsetX;
    const oy = offsetY;
    const fw = FIELD.WIDTH * scale;
    const fh = FIELD.HEIGHT * scale;
    const cx = ox + fw / 2;
    const cy = oy + fh / 2;

    const GRASS = FIELD.GRASS_COLOR;
    const LINE = FIELD.LINE_COLOR;

    this.graphics.fillStyle(GRASS, 1);
    this.graphics.fillRect(ox, oy, fw, fh);

    this.graphics.lineStyle(2 * scale, LINE, 0.9);
    this.graphics.strokeRect(ox, oy, fw, fh);
    this.graphics.lineBetween(ox, cy, ox + fw, cy);

    this.graphics.strokeCircle(cx, cy, FIELD.CENTER_CIRCLE_RADIUS * scale);
    this.graphics.fillStyle(LINE, 1);
    this.graphics.fillCircle(cx, cy, FIELD.CENTER_SPOT_RADIUS * scale);
    this.graphics.fillStyle(GRASS, 1);

    const paW = FIELD.PENALTY_AREA_WIDTH * scale;
    const paH = FIELD.PENALTY_AREA_HEIGHT * scale;
    const paX = ox + (fw - paH) / 2;
    this.graphics.strokeRect(paX, oy, paH, paW);
    this.graphics.strokeRect(paX, oy + fh - paW, paH, paW);

    const gaW = FIELD.GOAL_AREA_WIDTH * scale;
    const gaH = FIELD.GOAL_AREA_HEIGHT * scale;
    const gaX = ox + (fw - gaH) / 2;
    this.graphics.strokeRect(gaX, oy, gaH, gaW);
    this.graphics.strokeRect(gaX, oy + fh - gaW, gaH, gaW);

    const pSpotY = oy + FIELD.PENALTY_SPOT_DIST * scale;
    this.graphics.fillStyle(LINE, 1);
    this.graphics.fillCircle(cx, pSpotY, FIELD.CENTER_SPOT_RADIUS * scale);
    this.graphics.fillCircle(cx, oy + fh - FIELD.PENALTY_SPOT_DIST * scale, FIELD.CENTER_SPOT_RADIUS * scale);
    this.graphics.fillStyle(GRASS, 1);

    this.graphics.lineStyle(2 * scale, LINE, 0.6);
    const arcR = FIELD.PENALTY_ARC_RADIUS * scale;
    const pSpot = FIELD.PENALTY_SPOT_DIST * scale;
    const pEdge = paW;
    const dy = pEdge - pSpot;
    const halfW = Math.sqrt(arcR * arcR - dy * dy);
    const a1 = Math.atan2(dy, halfW);
    const a2 = Math.atan2(dy, -halfW);
    const topArcY = oy + pSpot;
    const botArcY = oy + fh - pSpot;
    this.graphics.beginPath();
    this.graphics.arc(cx, topArcY, arcR, a1, a2, false);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.arc(cx, botArcY, arcR, -a2, -a1, false);
    this.graphics.strokePath();

    const goalW = FIELD.GOAL_WIDTH * scale;
    const goalD = FIELD.GOAL_DEPTH * scale;
    const goalX = ox + (fw - goalW) / 2;
    this.graphics.lineStyle(3 * scale, LINE, 1);
    this.graphics.strokeRect(goalX, oy - goalD, goalW, goalD);
    this.graphics.strokeRect(goalX, oy + fh, goalW, goalD);
    this.graphics.fillStyle(0xcccccc, 0.3);
    this.graphics.fillRect(goalX, oy - goalD, goalW, goalD);
    this.graphics.fillRect(goalX, oy + fh, goalW, goalD);
  }

  createPlayers() {
    PLAYER_IDS.forEach((id) => {
      const p = new Player(this, id, 0, 0);
      p.enableDrag();
      const idx = PLAYER_IDS.indexOf(id);
      p.setFieldPosition(BOTTOM_LEFT_X, FIELD.HEIGHT - 15 - idx * 42);
      this.players[id] = p;
    });
  }

  setupDrag() {
    this.input.on("drag", (_pointer, gameObject, dragX, dragY) => {
      gameObject.setPosition(dragX, dragY);

      if (gameObject.playerId) {
        const layout = getLayout();
        if (layout) {
          const f = toField(layout, dragX, dragY);
          gameObject.fieldX = f.x;
          gameObject.fieldY = f.y;
        }
      }
    });

    this.input.on("dragend", (_pointer, gameObject) => {
      if (!gameObject.playerId) return;
      this.handlePlayerDrop(gameObject);
    });
  }

  handlePlayerDrop(player) {
    const layout = getLayout();
    if (!layout) return;

    const inBounds = this.isOnField(player.x, player.y);
    if (!inBounds) {
      const idx = PLAYER_IDS.indexOf(player.playerId);
      player.setFieldPosition(BOTTOM_LEFT_X, FIELD.HEIGHT - 15 - idx * 42);
    } else {
      const f = toField(layout, player.x, player.y);
      player.fieldX = f.x;
      player.fieldY = f.y;
    }

    this.logFormation();
  }

  isOnField(screenX, screenY) {
    const layout = getLayout();
    if (!layout) return false;
    const margin = 20 * layout.scale;
    const { x: fx, y: fy } = toScreen(layout, { x: 0, y: 0 });
    const { x: fw, y: fh } = toScreen(layout, { x: FIELD.WIDTH, y: FIELD.HEIGHT });
    return (
      screenX >= fx - margin &&
      screenX <= fw + margin &&
      screenY >= fy - margin &&
      screenY <= fh + margin
    );
  }

  logFormation() {
    const layout = getLayout();
    if (!layout) return;
    const formation = {};
    Object.values(this.players).forEach((p) => {
      const f = toField(layout, p.x, p.y);
      formation[p.playerId] = { x: Math.round(f.x), y: Math.round(f.y) };
    });
    const json = JSON.stringify(formation, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
  }

  clearAll() {
    PLAYER_IDS.forEach((id) => {
      const p = this.players[id];
      const idx = PLAYER_IDS.indexOf(id);
      p.setFieldPosition(BOTTOM_LEFT_X, FIELD.HEIGHT - 15 - idx * 42);
    });
    this.logFormation();
  }
}