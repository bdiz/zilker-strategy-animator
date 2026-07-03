import Phaser from "phaser";
import Player from "../objects/Player.js";
import Ball from "../objects/Ball.js";
import {
  FIELD, PLAYER_IDS, FORMATIONS,
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
    this.ballSetup = false;
    this.graphics = null;
    this.pathGraphics = null;
    this.formationName = "diamond";

    this.groups = [];
    this.currentGroupIndex = 0;
    this.lastGroupHadActions = false;

    this.recordingPath = null;
    this.recordingPlayerId = null;

    this.handleResize = this.handleResize.bind(this);

    this.scale.on("resize", this.handleResize);

    this.events.on("shutdown", () => {
      this.scale.off("resize", this.handleResize);
    });

    this.drawPitch();
    this.createPlayers();
    this.createBall();
    this.setupDrag();
    this.setFormation("diamond");

    this.events.emit("editor-ready");
  }

  handleResize() {
    const w = this.scale.width;
    const h = this.scale.height;
    const layout = computeLayout(w, h);
    setLayout(layout);
    this.drawPitch();
    this.redrawPaths();
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
      if (p) {
        p.setFieldPosition(pos.x, pos.y);
      }
    });
  }

  newGroup() {
    const last = this.groups[this.groups.length - 1];
    if (last && last.length === 0) return;
    this.groups.push([]);
    this.currentGroupIndex = this.groups.length - 1;
  }

  ensureGroup() {
    if (this.groups.length === 0) {
      this.groups.push([]);
      this.currentGroupIndex = 0;
    }
  }

  setupDrag() {
    this.dragBallPrevCarrier = null;

    this.input.on("dragstart", (_pointer, gameObject) => {
      if (gameObject.playerId) {
        this.startPathRecording(gameObject);
      } else {
        this.dragBallPrevCarrier = gameObject.carrier;
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
  }

  endPathRecording(player) {
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

    const cmd = {
      action: "run",
      player: player.playerId,
      path: simplified.map((p) => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
      })),
    };

    this.ensureGroup();
    this.groups[this.currentGroupIndex].push(cmd);
    this.logCommands();
    this.redrawPaths();

    this.recordingPath = null;
    this.recordingPlayerId = null;
  }

  handleBallDrop(ball) {
    const layout = getLayout();
    if (!layout) return;

    const droppedOn = this.findPlayerAt(ball.x, ball.y);
    const inGoal = this.isInGoal(ball.x, ball.y);

    if (droppedOn && droppedOn !== this.dragBallPrevCarrier) {
      if (this.dragBallPrevCarrier) {
        const cmd = {
          action: "pass",
          from: this.dragBallPrevCarrier.playerId,
          to: droppedOn.playerId,
          duration: 800,
        };
        this.ensureGroup();
        this.groups[this.currentGroupIndex].push(cmd);
        this.logCommands();
        this.ballSetup = true;
      } else {
        this.ballSetup = true;
      }
      this.ballCarrier = droppedOn;
      ball.attachTo(droppedOn);
    } else if (droppedOn === this.dragBallPrevCarrier) {
      ball.attachTo(droppedOn);
      this.ballCarrier = droppedOn;
    } else if (inGoal && this.dragBallPrevCarrier) {
      const f = toField(layout, ball.x, ball.y);
      const cmd = {
        action: "shoot",
        player: this.dragBallPrevCarrier.playerId,
        target: {
          x: Math.round((f ? f.x : FIELD.WIDTH / 2) * 10) / 10,
          y: ball.y < layout.offsetY + (FIELD.HEIGHT * layout.scale) / 2 ? 0 : FIELD.HEIGHT,
        },
        duration: 500,
      };
      this.ensureGroup();
      this.groups[this.currentGroupIndex].push(cmd);
      this.logCommands();
      this.ballCarrier = null;
      this.ballSetup = true;
    } else {
      const f = toField(layout, ball.x, ball.y);
      ball.detach();
      ball.setFieldPosition(f.x, f.y);
      this.ballCarrier = null;
      if (this.dragBallPrevCarrier) {
        const cmd = {
          action: "placeBall",
          at: { x: Math.round(f.x * 10) / 10, y: Math.round(f.y * 10) / 10 },
        };
        this.ensureGroup();
        this.groups[this.currentGroupIndex].push(cmd);
        this.logCommands();
        this.ballSetup = true;
      }
    }

    this.dragBallPrevCarrier = null;
    this.redrawPaths();
  }

  findPlayerAt(screenX, screenY) {
    const threshold = 30;
    let closest = null;
    let closestDist = threshold;
    Object.values(this.players).forEach((p) => {
      const dx = p.x - screenX;
      const dy = p.y - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = p;
      }
    });
    return closest;
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

  redrawPaths() {
    if (this.pathGraphics) {
      this.pathGraphics.destroy();
      this.pathGraphics = null;
    }

    const layout = getLayout();
    if (!layout) return;

    this.pathGraphics = this.add.graphics();

    this.groups.forEach((group) => {
      group.forEach((cmd) => {
        if (cmd.action === "run" && cmd.path && cmd.path.length > 0) {
          this.pathGraphics.lineStyle(2, 0xffff88, 0.6);
          this.pathGraphics.beginPath();
          const first = cmd.path[0];
          const sFirst = toScreen(layout, first);
          this.pathGraphics.moveTo(sFirst.x, sFirst.y);
          for (let i = 1; i < cmd.path.length; i++) {
            const sp = toScreen(layout, cmd.path[i]);
            this.pathGraphics.lineTo(sp.x, sp.y);
          }
          this.pathGraphics.strokePath();

          cmd.path.forEach((p) => {
            const sp = toScreen(layout, p);
            this.pathGraphics.fillStyle(0xffff88, 0.8);
            this.pathGraphics.fillCircle(sp.x, sp.y, 2);
          });
        }
        if (cmd.action === "pass" && cmd.from && cmd.to) {
          const from = this.players[cmd.from];
          const to = this.players[cmd.to];
          if (from && to) {
            this.pathGraphics.lineStyle(1.5, 0x88ff88, 0.5);
            this.pathGraphics.beginPath();
            this.pathGraphics.moveTo(from.x, from.y);
            this.pathGraphics.lineTo(to.x, to.y);
            this.pathGraphics.strokePath();
          }
        }
        if (cmd.action === "shoot" && cmd.player && cmd.target) {
          const player = this.players[cmd.player];
          if (player) {
            const target = toScreen(layout, cmd.target);
            this.pathGraphics.lineStyle(1.5, 0xff8888, 0.5);
            this.pathGraphics.beginPath();
            this.pathGraphics.moveTo(player.x, player.y);
            this.pathGraphics.lineTo(target.x, target.y);
            this.pathGraphics.strokePath();
          }
        }
      });
    });
  }

  logCommands() {
    const json = JSON.stringify(this.groups, null, 2);
    console.log("=== Commands ===");
    console.log(json);
    navigator.clipboard.writeText(json).catch(() => {});
  }

  logFullPlay() {
    const preamble = [{ action: "setFormation", name: this.formationName }];

    let firstCarrierId = null;
    for (const group of this.groups) {
      for (const cmd of group) {
        if (cmd.action === "pass" && cmd.from) { firstCarrierId = cmd.from; break; }
        if (cmd.action === "shoot" && cmd.player) { firstCarrierId = cmd.player; break; }
      }
      if (firstCarrierId) break;
    }

    if (firstCarrierId) {
      preamble.push({ action: "placeBall", player: firstCarrierId });
    }

    const nonEmpty = this.groups.filter((g) => g.length > 0);
    nonEmpty.unshift(preamble);

    const play = {
      name: "Custom Play",
      description: "Created with Action Editor",
      commands: nonEmpty,
    };
    const json = JSON.stringify(play, null, 2);
    console.log("=== Full Play ===");
    console.log(json);
    navigator.clipboard.writeText(json).catch(() => {});
  }

  clearAll() {
    this.groups = [];
    this.dragBallPrevCarrier = null;
    this.ballCarrier = null;
    this.ballSetup = false;
    this.setFormation(this.formationName);
    const sideY = FIELD.HEIGHT - 40 - SIDELINE_OFFSETS.GK * 30 - 20;
    this.ball.setFieldPosition(SIDELINE_X - 20, sideY);
    if (this.pathGraphics) {
      this.pathGraphics.destroy();
      this.pathGraphics = null;
    }
    this.logCommands();
  }

  update() {
    if (this.ball) this.ball.update();
  }
}