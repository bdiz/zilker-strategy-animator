import Phaser from "phaser";
import { FORMATIONS, PLAYER_RADIUS, getLayout, toScreen } from "../config.js";

const LINE_COLOR = 0xffffff;
const LINE_ALPHA = 0.6;

export default class AnimationRunner {
  constructor(scene, players, ball) {
    this.scene = scene;
    this.players = players;
    this.ball = ball;
    this.interpreter = null;
    this.groupIndex = 0;
    this.speed = 1;
    this.running = false;
    this.tweens = [];
    this.graphics = null;
    this.callbacks = { onStepChange: null, onPlayEnd: null };
  }

  loadPlay(interpreter) {
    this.stop();
    this.interpreter = interpreter;
    this.groupIndex = 0;
    this.running = false;
  }

  setSpeed(speed) {
    this.speed = speed;
    if (this.running) {
      this.scene.time.timeScale = speed;
    }
  }

  stop() {
    this.running = false;
    this.scene.time.timeScale = 1;
    this.tweens.forEach((t) => t.stop());
    this.tweens = [];
    this.clearGraphics();
  }

  clearGraphics() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }

  play() {
    if (!this.interpreter) return;
    this.running = true;
    this.scene.time.timeScale = this.speed;
    this.groupIndex = 0;
    this.runGroup(0);
  }

  runGroup(index) {
    if (!this.running) return;
    const groups = this.interpreter.getGroups();
    if (index >= groups.length) {
      this.running = false;
      this.scene.time.timeScale = 1;
      this.ball.detach();
      if (this.callbacks.onPlayEnd) this.callbacks.onPlayEnd();
      if (this.callbacks.onStepChange) this.callbacks.onStepChange("Play finished");
      return;
    }

    const group = groups[index];
    this.groupIndex = index;
    if (this.callbacks.onStepChange) {
      this.callbacks.onStepChange(`Step ${index + 1} of ${groups.length}`);
    }

    let maxDuration = 0;
    const groupTweens = [];

    group.forEach((cmd) => {
      const dur = this.executeCommand(cmd, groupTweens);
      if (dur > maxDuration) maxDuration = dur;
    });

    if (maxDuration <= 0) {
      this.runGroup(index + 1);
      return;
    }

    this.scene.time.delayedCall(maxDuration, () => {
      if (this.running) {
        groupTweens.forEach((t) => {
          const idx = this.tweens.indexOf(t);
          if (idx >= 0) this.tweens.splice(idx, 1);
        });
        this.clearGraphics();
        this.runGroup(index + 1);
      }
    });
  }

  executeCommand(cmd, groupTweens) {
    switch (cmd.action) {
      case "pass": return this.doPass(cmd, groupTweens);
      case "dribble": return this.doDribble(cmd, groupTweens);
      case "run": return this.doRun(cmd, groupTweens);
      case "walk": return this.doWalk(cmd, groupTweens);
      case "shoot": return this.doShoot(cmd, groupTweens);
      case "placeBall": return this.doPlaceBall(cmd);
      case "setFormation": return this.doSetFormation(cmd);
      default: return 0;
    }
  }

  getPlayer(id) {
    const p = this.players[id];
    if (!p) console.warn(`Player ${id} not found`);
    return p;
  }

  toScreen(p) {
    const layout = getLayout();
    if (!layout) return { x: p.x, y: p.y };
    return {
      x: layout.offsetX + p.x * layout.scale,
      y: layout.offsetY + p.y * layout.scale,
    };
  }

  doPass(cmd, groupTweens) {
    const from = this.getPlayer(cmd.from);
    const to = this.getPlayer(cmd.to);
    if (!from || !to) return 0;

    this.ball.detach();

    const layout = getLayout() || { scale: 1 };
    const offset = PLAYER_RADIUS * 0.8 * layout.scale;

    const duration = (cmd.duration || 600) / this.speed;
    const startX = this.ball.x;
    const startY = this.ball.y;
    const endX = to.x + offset;
    const endY = to.y + offset;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 40;

    this.drawPassArc(startX, startY, midX, midY, endX, endY, duration);

    const tween = this.scene.tweens.add({
      targets: this.ball,
      x: { value: endX, duration },
      y: { value: endY, duration },
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.ball.attachTo(to);
        this.clearGraphics();
      },
    });
    groupTweens.push(tween);
    this.tweens.push(tween);
    return duration;
  }

  doDribble(cmd, groupTweens) {
    const player = this.getPlayer(cmd.player);
    if (!player || !cmd.path || cmd.path.length === 0) return 0;

    this.ball.attachTo(player);

    const duration = (cmd.duration || 1000) / this.speed;
    const last = cmd.path[cmd.path.length - 1];
    const pts = cmd.path.map((p) => this.toScreen(p));
    const points = [{ x: player.x, y: player.y }, ...pts];

    this.drawDribblePath(points);

    const tween = this.scene.tweens.add({
      targets: player,
      x: { value: pts[pts.length - 1].x, duration },
      y: { value: pts[pts.length - 1].y, duration },
      ease: "Linear",
    });
    groupTweens.push(tween);
    this.tweens.push(tween);
    return duration;
  }

  doRun(cmd, groupTweens) {
    const player = this.getPlayer(cmd.player);
    if (!player || !cmd.path || cmd.path.length === 0) return 0;

    const duration = (cmd.duration || 1000) / this.speed;
    const last = cmd.path[cmd.path.length - 1];
    const dest = this.toScreen(last);

    const tween = this.scene.tweens.add({
      targets: player,
      x: { value: dest.x, duration },
      y: { value: dest.y, duration },
      ease: "Linear",
    });
    groupTweens.push(tween);
    this.tweens.push(tween);
    return duration;
  }

  doWalk(cmd, groupTweens) {
    return this.doRun(cmd, groupTweens);
  }

  doShoot(cmd, groupTweens) {
    const player = this.getPlayer(cmd.player);
    if (!player) return 0;

    this.ball.detach();

    const duration = (cmd.duration || 500) / this.speed;
    const startX = player.x;
    const startY = player.y;
    const target = this.toScreen(cmd.target);
    const endX = target.x;
    const endY = target.y;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 30;

    this.drawPassArc(startX, startY, midX, midY, endX, endY, duration);

    const tween = this.scene.tweens.add({
      targets: this.ball,
      x: { value: endX, duration },
      y: { value: endY, duration },
      ease: "Sine.easeIn",
      onComplete: () => { this.clearGraphics(); },
    });
    groupTweens.push(tween);
    this.tweens.push(tween);
    return duration;
  }

  doPlaceBall(cmd) {
    if (cmd.at) {
      this.ball.detach();
      const pos = this.toScreen(cmd.at);
      this.ball.setPosition(pos.x, pos.y);
    }
    return 0;
  }

  doSetFormation(cmd) {
    const formation = FORMATIONS[cmd.name];
    if (!formation) return 0;
    const layout = getLayout() || { scale: 1, offsetX: 0, offsetY: 0 };
    Object.entries(formation).forEach(([id, pos]) => {
      const p = this.players[id];
      if (p) {
        const screen = toScreen(layout, pos);
        p.setPosition(screen.x, screen.y);
      }
    });
    this.ball.detach();
    return 0;
  }

  drawPassArc(x1, y1, x2, y2, x3, y3, duration) {
    this.clearGraphics();
    this.graphics = this.scene.add.graphics();
    this.graphics.lineStyle(2, LINE_COLOR, LINE_ALPHA);

    const steps = Math.max(20, Math.floor(duration / 20));
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const qx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * x2 + t * t * x3;
      const qy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * y2 + t * t * y3;
      points.push({ x: qx, y: qy });
    }

    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.strokePath();

    points.forEach((p) => {
      this.graphics.fillStyle(LINE_COLOR, LINE_ALPHA * 0.5);
      this.graphics.fillCircle(p.x, p.y, 1);
    });
  }

  drawDribblePath(points) {
    this.clearGraphics();
    this.graphics = this.scene.add.graphics();
    this.graphics.lineStyle(1.5, 0xffff88, 0.4);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.strokePath();
  }
}