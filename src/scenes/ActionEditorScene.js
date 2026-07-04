import Phaser from "phaser";
import Player from "../objects/Player.js";
import Ball from "../objects/Ball.js";
import AnimationRunner from "../animation/AnimationRunner.js";
import PlayInterpreter from "../animation/PlayInterpreter.js";
import {
  FIELD, PLAYER_IDS, FORMATIONS, RUN_SPEED, TICK_MS, PLAYER_RADIUS,
  getLayout, setLayout, computeLayout, toField, toScreen,
} from "../config.js";

const SIDELINE_X = -50;
const SIDELINE_OFFSETS = { GK: 0, CM: 1, LB: 2, RB: 3, LM: 4, RM: 5, FWD: 6 };
const PATH_SAMPLE_DIST = 15;

function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, maxIdx + 1), epsilon);
    const right = rdp(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpendicularDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

export default class ActionEditorScene extends Phaser.Scene {
  constructor() {
    super("ActionEditorScene");
  }

  create() {
    this.players = {};
    this.ball = null;
    this.ballCarrier = null;
    this.graphics = null;
    this.pathGraphics = null;
    this.livePathGraphics = null;
    this.formationName = "offensive";
    this.previewMode = false;
    this.animationRunner = null;

    this.playerActions = {
      GK: [], CM: [], LB: [], RB: [], LM: [], RM: [], FWD: [],
    };

    this.recordingPath = null;
    this.recordingPlayerId = null;
    this.dragBallPrevCarrier = null;

    this.actionHitZones = [];
    this._pointerDownPos = null;
    this.selectedActionInfo = null;
    this._hoveredZone = null;

    this.handleResize = this.handleResize.bind(this);

    this.scale.on("resize", this.handleResize);

    this.events.on("shutdown", () => {
      this.scale.off("resize", this.handleResize);
    });

    this.drawPitch();
    this.createPlayers();
    this.createBall();
    this.setupDrag();

    const pending = window.__pendingActionEditorPlay;
    if (pending) {
      window.__pendingActionEditorPlay = null;
      this.loadPlayData(pending);
    } else {
      this.setFormation("offensive");
    }

    this.events.emit("editor-ready");
  }

  handleResize() {
    const w = this.scale.width;
    const h = this.scale.height;
    const layout = computeLayout(w, h);
    setLayout(layout);
    this.drawPitch();
    this.redrawAllPaths();
    Object.values(this.players).forEach((p) => p.refreshFromLayout());
    if (this.ball) this.ball.refreshFromLayout();
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
      this.players[id] = p;
    });
  }

  createBall() {
    this.ball = new Ball(this, 0, 0);
    this.ball.enableDrag();
    const sideY = FIELD.HEIGHT - 40 - SIDELINE_OFFSETS.GK * 30 - 20;
    this.ball.setFieldPosition(SIDELINE_X - 20, sideY);
  }

  setFormation(name) {
    this.formationName = name;
    const formation = FORMATIONS[name];
    if (!formation) return;
    Object.entries(formation).forEach(([id, pos]) => {
      const p = this.players[id];
      if (p) p.setFieldPosition(pos.x, pos.y);
    });
  }

  loadPlayData(playData) {
    this.setFormation(playData.formation);

    this.playerActions = {
      GK: [], CM: [], LB: [], RB: [], LM: [], RM: [], FWD: [],
    };

    playData.commands.forEach(({ player, actions }) => {
      if (this.playerActions[player] !== undefined) {
        this.playerActions[player] = actions.map((a) => ({ ...a }));
      }
    });

    let ballPos;
    if (playData.placement) {
      if (typeof playData.placement === "string") {
        const f = FORMATIONS[playData.formation];
        const ppos = f && f[playData.placement] ? f[playData.placement] : null;
        ballPos = ppos ? { x: ppos.x, y: ppos.y } : { x: SIDELINE_X, y: 170 };
      } else {
        ballPos = { x: playData.placement.x, y: playData.placement.y };
      }
    } else {
      const sideY = FIELD.HEIGHT - 40 - SIDELINE_OFFSETS.GK * 30 - 20;
      ballPos = { x: SIDELINE_X, y: sideY };
    }

    if (playData.placement) {
      this.ball.detach();
      this.ballCarrier = null;
      if (typeof playData.placement === "string") {
        const p = this.players[playData.placement];
        if (p) {
          this.ball.placeBehind(p);
          this.ballCarrier = p;
        }
      } else if (typeof playData.placement === "object" && playData.placement.x != null) {
        this.ball.setFieldPosition(playData.placement.x, playData.placement.y);
      }
    }

    this.redrawAllPaths();
    this.notifyActionChange();
    this.buildActionHitZones();
  }

  setupDrag() {
    this.input.on("pointerdown", (pointer) => {
      this._pointerDownPos = { x: pointer.x, y: pointer.y };
      this._pointerMoved = false;
      this._hoveredZone = null;
      this.input.setDefaultCursor("default");
    });

    this.input.on("pointermove", (pointer) => {
      this._pointerMoved = true;
      if (this.previewMode) return;
      const hit = this.hitTestAction(pointer.x, pointer.y);
      if (hit !== this._hoveredZone) {
        this._hoveredZone = hit;
        this.input.setDefaultCursor(hit ? "pointer" : "default");
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (this.previewMode) return;
      if (this._pointerMoved) return;
      if (!this._pointerDownPos) return;
      const dx = pointer.x - this._pointerDownPos.x;
      const dy = pointer.y - this._pointerDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 6) return;

      const hit = this.hitTestAction(pointer.x, pointer.y);
      if (hit) {
        this.selectedActionInfo = hit;
        this.events.emit("action-clicked", hit);
      } else {
        this.selectedActionInfo = null;
        this.events.emit("action-deselected");
      }
    });

    this.input.on("dragstart", (_pointer, gameObject) => {
      if (gameObject.playerId) {
        if (this.ball && this.ball.carrier === gameObject) {
          this.dragBallPrevCarrier = gameObject.playerId;
          this.ball.detach();
          this.ballCarrier = null;
        }
        this.startPathRecording(gameObject);
      } else {
        if (gameObject.carrier) {
          this.dragBallPrevCarrier = gameObject.carrier.playerId;
        } else {
          this.dragBallPrevCarrier = null;
        }
        gameObject.detach();
      }
    });

    this.input.on("drag", (_pointer, gameObject, dragX, dragY) => {
      gameObject.setPosition(dragX, dragY);
      if (gameObject.playerId) {
        const layout = getLayout();
        if (layout) {
          const f = toField(layout, dragX, dragY);
          gameObject.fieldX = f.x;
          gameObject.fieldY = f.y;
          this.recordPathPoint(gameObject, dragX, dragY);
          if (this.ball && !this.ball.carrier) {
            const threshold = PLAYER_RADIUS * 2 * 0.44 * layout.scale;
            const dx = dragX - this.ball.x;
            const dy = dragY - this.ball.y;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) {
              this.ball.placeBehind(gameObject);
              this.ballCarrier = gameObject;
            }
          }
        }
      }
    });

    this.input.on("dragend", (_pointer, gameObject) => {
      if (gameObject.playerId) {
        this.endPathRecording(gameObject);
      } else {
        this.handleBallDrop(gameObject);
      }
    });
  }

  startPathRecording(player) {
    this.recordingPlayerId = player.playerId;
    this.recordingPath = [{ x: player.fieldX, y: player.fieldY }];
    this.clearLivePath();
  }

  recordPathPoint(player, screenX, screenY) {
    const layout = getLayout();
    if (!layout) return;
    const f = toField(layout, screenX, screenY);
    player.fieldX = f.x;
    player.fieldY = f.y;

    const last = this.recordingPath[this.recordingPath.length - 1];
    const dx = f.x - last.x;
    const dy = f.y - last.y;
    if (Math.sqrt(dx * dx + dy * dy) >= PATH_SAMPLE_DIST) {
      this.recordingPath.push({ x: f.x, y: f.y });
    }

    this.drawLivePath();
  }

  drawLivePath() {
    this.clearLivePath();
    if (!this.recordingPath || this.recordingPath.length < 2) return;

    const layout = getLayout();
    if (!layout) return;

    this.livePathGraphics = this.add.graphics();

    this.livePathGraphics.lineStyle(2, 0xffff88, 0.8);
    this.livePathGraphics.beginPath();
    const first = this.recordingPath[0];
    const sFirst = toScreen(layout, first);
    this.livePathGraphics.moveTo(sFirst.x, sFirst.y);
    for (let i = 1; i < this.recordingPath.length; i++) {
      const sp = toScreen(layout, this.recordingPath[i]);
      this.livePathGraphics.lineTo(sp.x, sp.y);
    }
    this.livePathGraphics.strokePath();

    this.recordingPath.forEach((p) => {
      const sp = toScreen(layout, p);
      this.livePathGraphics.fillStyle(0xffff88, 0.9);
      this.livePathGraphics.fillCircle(sp.x, sp.y, 2.5);
    });
  }

  clearLivePath() {
    if (this.livePathGraphics) {
      this.livePathGraphics.destroy();
      this.livePathGraphics = null;
    }
  }

  endPathRecording(player) {
    this.clearLivePath();

    if (!this.recordingPath || this.recordingPath.length < 2) {
      this.recordingPath = null;
      this.recordingPlayerId = null;
      return;
    }

    const lastField = { x: player.fieldX, y: player.fieldY };
    this.recordingPath.push(lastField);

    const simplified = rdp(this.recordingPath, 4);
    if (simplified.length < 2) {
      this.recordingPath = null;
      this.recordingPlayerId = null;
      return;
    }

    const playerId = player.playerId;
    const pathLength = this.computePathLength(simplified);
    const duration = Math.ceil(pathLength / RUN_SPEED / TICK_MS * 1000);
    const delay = 5;

    const path = simplified.map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));

    this.playerActions[playerId].push({
      action: "run",
      path,
      duration: Math.max(1, duration),
      delay,
    });

    this.redrawAllPaths();
    this.notifyActionChange();
    this.buildActionHitZones();

    this.recordingPath = null;
    this.recordingPlayerId = null;
  }

  handleBallDrop(ball) {
    const layout = getLayout();
    if (!layout) return;
    const f = toField(layout, ball.x, ball.y);

    const inGoal = this.isInGoal(ball.x, ball.y);

    if (this.dragBallPrevCarrier) {
      const delay = 5;
      const ballStart = { x: ball.fieldX, y: ball.fieldY };

      if (inGoal) {
        this.playerActions[this.dragBallPrevCarrier].push({
          action: "shoot",
          _ballStart: ballStart,
          target: {
            x: Math.round(f.x * 10) / 10,
            y: ball.y < layout.offsetY + (FIELD.HEIGHT * layout.scale) / 2 ? 0 : FIELD.HEIGHT,
          },
          duration: 8,
          delay,
        });
        ball.setFieldPosition(f.x, f.y);
        ball.detach();
        this.ballCarrier = null;
      } else {
        this.playerActions[this.dragBallPrevCarrier].push({
          action: "pass",
          _ballStart: ballStart,
          target: {
            x: Math.round(f.x * 10) / 10,
            y: Math.round(f.y * 10) / 10,
          },
          duration: 8,
          delay,
        });
        ball.setFieldPosition(f.x, f.y);
        ball.detach();
        this.ballCarrier = null;
      }

      this.drawBallDropLine(this.dragBallPrevCarrier, f);
    } else {
      let attached = false;
      const threshold = PLAYER_RADIUS * 2 * 0.44 * (layout ? layout.scale : 1);
      for (const id of PLAYER_IDS) {
        const p = this.players[id];
        if (!p) continue;
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          ball.placeBehind(p);
          this.ballCarrier = p;
          attached = true;
          break;
        }
      }
      if (!attached) {
        ball.setFieldPosition(f.x, f.y);
        ball.detach();
        this.ballCarrier = null;
      }
    }

    this.dragBallPrevCarrier = null;
    this.redrawAllPaths();
    this.notifyActionChange();
    this.buildActionHitZones();
  }

  drawBallDropLine(playerId, targetField) {
    const layout = getLayout();
    if (!layout) return;
    if (!this.ball) return;

    const tempGfx = this.add.graphics();
    const from = toScreen(layout, { x: this.ball.fieldX, y: this.ball.fieldY });
    const to = toScreen(layout, targetField);

    tempGfx.lineStyle(2, 0x88ff88, 0.7);
    tempGfx.beginPath();
    tempGfx.moveTo(from.x, from.y);
    tempGfx.lineTo(to.x, to.y);
    tempGfx.strokePath();

    tempGfx.fillStyle(0x88ff88, 0.9);
    tempGfx.fillCircle(to.x, to.y, 3);

    this.time.delayedCall(800, () => {
      tempGfx.destroy();
    });
  }

  computePathLength(path) {
    let len = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  isInGoal(screenX, screenY) {
    const layout = getLayout();
    if (!layout) return false;
    const s = layout.scale;
    const gx = layout.offsetX + ((FIELD.WIDTH - FIELD.GOAL_WIDTH) / 2) * s;
    const gw = FIELD.GOAL_WIDTH * s;
    const topGoalBottom = layout.offsetY + 0;
    const bottomGoalTop = layout.offsetY + FIELD.HEIGHT * s;
    return (
      screenX >= gx &&
      screenX <= gx + gw &&
      (screenY <= topGoalBottom || screenY >= bottomGoalTop)
    );
  }

  buildActionHitZones() {
    this.actionHitZones = [];
    const layout = getLayout();
    if (!layout) return;

    Object.entries(this.playerActions).forEach(([playerId, actions]) => {
      actions.forEach((action, actionIdx) => {
        if (action.action === "run" && action.path && action.path.length > 0) {
          const segments = [];
          for (let i = 0; i < action.path.length - 1; i++) {
            const a = toScreen(layout, action.path[i]);
            const b = toScreen(layout, action.path[i + 1]);
            segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
          }
          this.actionHitZones.push({ playerId, actionIndex: actionIdx, segments, actionType: "run" });
        }
        if ((action.action === "pass" || action.action === "shoot") && action.target) {
          const origin = this.getPassShootOrigin(playerId, actionIdx);
          const from = toScreen(layout, origin);
          const to = toScreen(layout, action.target);
          this.actionHitZones.push({
            playerId, actionIndex: actionIdx,
            segments: [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }],
            actionType: action.action,
          });
        }
      });
    });
  }

  hitTestAction(px, py) {
    const HIT_THRESHOLD = 18;
    for (const zone of this.actionHitZones) {
      for (const seg of zone.segments) {
        const d = this.pointToSegmentDist(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
        if (d < HIT_THRESHOLD) return zone;
      }
    }
    return null;
  }

  pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  redrawAllPaths() {
    if (this.pathGraphics) {
      this.pathGraphics.destroy();
      this.pathGraphics = null;
    }

    const layout = getLayout();
    if (!layout) return;

    this.pathGraphics = this.add.graphics();

    Object.entries(this.playerActions).forEach(([playerId, actions]) => {
      const player = this.players[playerId];
      if (!player) return;

      actions.forEach((action, actionIdx) => {
        if (action.action === "run" && action.path && action.path.length > 0) {
          this.pathGraphics.lineStyle(2, 0xffff88, 0.6);
          this.pathGraphics.beginPath();
          const first = action.path[0];
          const sFirst = toScreen(layout, first);
          this.pathGraphics.moveTo(sFirst.x, sFirst.y);
          for (let i = 1; i < action.path.length; i++) {
            const sp = toScreen(layout, action.path[i]);
            this.pathGraphics.lineTo(sp.x, sp.y);
          }
          this.pathGraphics.strokePath();

          action.path.forEach((p) => {
            const sp = toScreen(layout, p);
            this.pathGraphics.fillStyle(0xffff88, 0.8);
            this.pathGraphics.fillCircle(sp.x, sp.y, 2);
          });
        }

        if (action.action === "pass" && action.target) {
          const origin = this.getPassShootOrigin(playerId, actionIdx);
          const from = toScreen(layout, origin);
          const to = toScreen(layout, action.target);
          this.pathGraphics.lineStyle(1.5, 0x88ff88, 0.5);
          this.pathGraphics.beginPath();
          this.pathGraphics.moveTo(from.x, from.y);
          this.pathGraphics.lineTo(to.x, to.y);
          this.pathGraphics.strokePath();
        }

        if (action.action === "shoot" && action.target) {
          const origin = this.getPassShootOrigin(playerId, actionIdx);
          const from = toScreen(layout, origin);
          const to = toScreen(layout, action.target);
          this.pathGraphics.lineStyle(1.5, 0xff8888, 0.5);
          this.pathGraphics.beginPath();
          this.pathGraphics.moveTo(from.x, from.y);
          this.pathGraphics.lineTo(to.x, to.y);
          this.pathGraphics.strokePath();
        }
      });
    });

    this.buildActionHitZones();
  }

  notifyActionChange() {
    this.events.emit("actions-changed", this.getActionSummary());
  }

  getActionSummary() {
    const parts = [];
    Object.entries(this.playerActions).forEach(([id, actions]) => {
      if (actions.length > 0) {
        parts.push(`${id}: ${actions.length} action${actions.length > 1 ? "s" : ""}`);
      }
    });
    return parts.join(" | ") || "No actions recorded";
  }

  copyToClipboard() {
    let firstCarrierId = null;
    for (const [playerId, actions] of Object.entries(this.playerActions)) {
      for (const a of actions) {
        if (a.action === "pass" || a.action === "shoot") {
          firstCarrierId = playerId;
          break;
        }
      }
      if (firstCarrierId) break;
    }

    const commands = Object.entries(this.playerActions)
      .filter(([_, actions]) => actions.length > 0)
      .map(([player, actions]) => ({ player, actions }));

    const play = {
      name: "Custom Play",
      formation: this.formationName,
      placement: firstCarrierId || null,
      commands,
    };
    const json = JSON.stringify(play, null, 2);
    console.log("=== Full Play ===");
    console.log(json);
    navigator.clipboard.writeText(json).catch(() => {});
  }

  clearAll() {
    this.playerActions = {
      GK: [], CM: [], LB: [], RB: [], LM: [], RM: [], FWD: [],
    };
    this.dragBallPrevCarrier = null;
    this.ballCarrier = null;
    this.selectedActionInfo = null;
    this.events.emit("action-deselected");
    this.setFormation(this.formationName);
    const sideY = FIELD.HEIGHT - 40 - SIDELINE_OFFSETS.GK * 30 - 20;
    this.ball.setFieldPosition(SIDELINE_X - 20, sideY);
    if (this.pathGraphics) {
      this.pathGraphics.destroy();
      this.pathGraphics = null;
    }
    this.clearLivePath();
    this.notifyActionChange();
    this.buildActionHitZones();
  }

  updateActionField(playerId, actionIndex, field, value) {
    const action = this.playerActions[playerId]?.[actionIndex];
    if (!action) return;
    if (field === "duration") {
      action.duration = Math.max(1, value);
    } else if (field === "delay") {
      action.delay = Math.max(0, value);
    }
    this.redrawAllPaths();
    this.notifyActionChange();
  }

  deleteAction(playerId, actionIndex) {
    const actions = this.playerActions[playerId];
    if (!actions || actionIndex < 0 || actionIndex >= actions.length) return;
    actions.splice(actionIndex, 1);
    this.selectedActionInfo = null;
    this.events.emit("action-deselected");
    this.redrawAllPaths();
    this.notifyActionChange();
  }

  getPassShootOrigin(playerId, currentActionIndex) {
    const a = this.playerActions[playerId]?.[currentActionIndex];
    if (a && a._ballStart) {
      return { ...a._ballStart };
    }

    const formation = FORMATIONS[this.formationName];
    const startPos = formation && formation[playerId]
      ? { x: formation[playerId].x, y: formation[playerId].y }
      : { x: 0, y: 0 };

    const actions = this.playerActions[playerId] || [];
    let pos = { ...startPos };

    for (let i = 0; i < currentActionIndex; i++) {
      const a = actions[i];
      if (a.action === "run" && a.path && a.path.length > 0) {
        const last = a.path[a.path.length - 1];
        pos = { x: last.x, y: last.y };
      }
    }

    return pos;
  }

  startPreview() {
    const totalActions = Object.values(this.playerActions).reduce((sum, a) => sum + a.length, 0);
    if (totalActions === 0) {
      console.warn("No actions to preview");
      return;
    }

    Object.values(this.players).forEach((p) => p.disableDrag());
    this.ball.disableDrag();

    if (this.pathGraphics) {
      this.pathGraphics.setVisible(false);
    }

    const playObj = this.buildPreviewPlay();
    const interpreter = new PlayInterpreter(playObj);

    this.animationRunner = new AnimationRunner(this, this.players, this.ball);
    this.animationRunner.callbacks.onPlayEnd = () => this.stopPreview();
    this.animationRunner.loadPlay(interpreter);
    this.animationRunner.play();

    this.previewMode = true;
  }

  stopPreview() {
    if (this.animationRunner) {
      this.animationRunner.stop();
      this.animationRunner = null;
    }

    this.previewMode = false;

    Object.values(this.players).forEach((p) => p.enableDrag());
    this.ball.enableDrag();

    this.redrawAllPaths();

    this.events.emit("preview-ended");
  }

  buildPreviewPlay() {
    let firstCarrierId = null;
    for (const [playerId, actions] of Object.entries(this.playerActions)) {
      for (const a of actions) {
        if (a.action === "pass" || a.action === "shoot") {
          firstCarrierId = playerId;
          break;
        }
      }
      if (firstCarrierId) break;
    }

    const commands = Object.entries(this.playerActions)
      .filter(([_, actions]) => actions.length > 0)
      .map(([player, actions]) => ({
        player,
        actions: actions.map((a) => ({ ...a })),
      }));

    return {
      name: "Preview",
      formation: this.formationName,
      placement: firstCarrierId || null,
      commands,
    };
  }

  update(time, delta) {
    if (this.previewMode && this.animationRunner) {
      this.animationRunner.update(time, delta);
      if (this.ball) this.ball.update();
    } else if (this.ball) {
      this.ball.update();
    }
  }
}