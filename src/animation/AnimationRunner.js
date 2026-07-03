import {
  FORMATIONS, PLAYER_RADIUS, RUN_SPEED,
  getLayout, toScreen, toField, TICK_MS,
} from "../config.js";

export default class AnimationRunner {
  constructor(scene, players, ball) {
    this.scene = scene;
    this.players = players;
    this.ball = ball;
    this.interpreter = null;
    this.playerTimelines = [];
    this.tickIndex = 0;
    this.maxTicks = 0;
    this.paused = true;
    this.speed = 1;
    this.accumulator = 0;
    this.callbacks = { onTickChange: null, onPlayEnd: null };
    this.graphics = null;
    this.prevTickStates = [];
    this.nextTickStates = [];
  }

  loadPlay(interpreter) {
    this.stop();
    this.interpreter = interpreter;
    this.tickIndex = 0;
    this.accumulator = 0;
    this.maxTicks = interpreter.getMaxTicks();

    const formationName = interpreter.getFormation();
    if (formationName) {
      this.applyFormation(formationName);
    }

    const placement = interpreter.getPlacement();
    if (placement && this.ball) {
      this.ball.detach();
      if (typeof placement === "string") {
        const p = this.getPlayer(placement);
        if (p) {
          this.ball.attachTo(p);
          this.ball.fieldX = p.fieldX;
          this.ball.fieldY = p.fieldY;
          this.ball.update();
        }
      } else if (placement.x != null && placement.y != null) {
        this.ball.setFieldPosition(placement.x, placement.y);
      }
    }

    this.buildTimelines();
  }

  buildTimelines() {
    this.playerTimelines = [];
    const groups = this.interpreter.getPlayerGroups();
    for (const group of groups) {
      const player = this.getPlayer(group.player);
      if (!player) {
        console.warn(`Player ${group.player} not found in timeline`);
        continue;
      }
      const actions = (group.actions || []).map((a) => ({ ...a }));
      this.playerTimelines.push({
        player,
        actions,
        currentActionIdx: 0,
        completed: actions.length === 0,
      });
    }
  }

  applyFormation(name) {
    const formation = FORMATIONS[name];
    if (!formation || !this.players) return;
    Object.entries(formation).forEach(([id, pos]) => {
      const p = this.players[id];
      if (p) p.setFieldPosition(pos.x, pos.y);
    });
  }

  getPlayer(id) {
    if (!this.players) return null;
    const p = this.players[id];
    if (!p) console.warn(`Player ${id} not found`);
    return p;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  play() {
    this.paused = false;
    this.accumulator = 0;
  }

  stop() {
    this.paused = true;
    this.accumulator = 0;
    this.prevTickStates = [];
    this.nextTickStates = [];
    this.clearGraphics();
  }

  clearGraphics() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }

  update(time, delta) {
    if (this.paused) return;
    if (this.tickIndex >= this.maxTicks) {
      this.paused = true;
      if (this.callbacks.onPlayEnd) this.callbacks.onPlayEnd();
      if (this.callbacks.onTickChange) {
        this.callbacks.onTickChange(this.tickIndex, this.maxTicks, "Play finished");
      }
      return;
    }

    this.accumulator += delta * this.speed;

    let advanced = 0;
    while (this.accumulator >= TICK_MS && this.tickIndex < this.maxTicks) {
      this.accumulator -= TICK_MS;
      advanced++;
      if (advanced === 1) {
        this.captureState("prev");
      }
      this.runTick(this.tickIndex);
      this.tickIndex++;

      if (this.callbacks.onTickChange) {
        const label = this.tickIndex >= this.maxTicks ? "Play finished" : `Tick ${this.tickIndex}/${this.maxTicks}`;
        this.callbacks.onTickChange(this.tickIndex, this.maxTicks, label);
      }

      if (this.tickIndex >= this.maxTicks) {
        this.paused = true;
        if (this.callbacks.onPlayEnd) this.callbacks.onPlayEnd();
      }
    }

    if (advanced > 0) {
      this.captureState("next");
    }

    if (this.accumulator > 0 && this.tickIndex < this.maxTicks && this.prevTickStates.length > 0) {
      const frac = this.accumulator / TICK_MS;
      this.interpolateState(frac);
    }
  }

  captureState(kind) {
    const arr = kind === "prev" ? this.prevTickStates : this.nextTickStates;
    arr.length = 0;
    for (const timeline of this.playerTimelines) {
      if (timeline.completed) continue;
      const action = timeline.actions[timeline.currentActionIdx];
      if (!action) continue;
      arr.push({
        player: timeline.player,
        action,
        playerX: timeline.player.fieldX,
        playerY: timeline.player.fieldY,
        ballX: this.ball ? this.ball.fieldX : 0,
        ballY: this.ball ? this.ball.fieldY : 0,
        ballCarrier: this.ball ? this.ball.carrier : null,
      });
    }
  }

  interpolateState(frac) {
    const layout = getLayout();
    if (!layout) return;

    for (const next of this.nextTickStates) {
      const prev = this.prevTickStates.find((s) => s.player === next.player);
      if (!prev) continue;

      const pPos = {
        x: prev.playerX + (next.playerX - prev.playerX) * frac,
        y: prev.playerY + (next.playerY - prev.playerY) * frac,
      };
      const screen = toScreen(layout, pPos);
      next.player.setPosition(screen.x, screen.y);
      next.player.fieldX = pPos.x;
      next.player.fieldY = pPos.y;
    }

    if (this.ball) {
      const nextBall = this.nextTickStates.find((s) => s.ballX != null);
      const prevBall = this.prevTickStates.find((s) => s.ballX != null);
      if (nextBall && prevBall && !nextBall.ballCarrier) {
        const bPos = {
          x: prevBall.ballX + (nextBall.ballX - prevBall.ballX) * frac,
          y: prevBall.ballY + (nextBall.ballY - prevBall.ballY) * frac,
        };
        const screen = toScreen(layout, bPos);
        this.ball.setPosition(screen.x, screen.y);
        this.ball.fieldX = bPos.x;
        this.ball.fieldY = bPos.y;
      }
    }
  }

  runTick(tickIndex) {
    for (const timeline of this.playerTimelines) {
      if (timeline.completed) continue;
      this.processTimelineTick(timeline, tickIndex);
    }
  }

  processTimelineTick(timeline, tickIndex) {
    const { player, actions } = timeline;
    let idx = timeline.currentActionIdx;

    while (idx < actions.length) {
      const action = actions[idx];

      if (action.action === "pass" && !action._startPos && (!this.ball || this.ball.carrier !== player)) {
        break;
      }

      if (action._effectiveStart == null) {
        action._effectiveStart = Math.max(action.delay || 0, tickIndex);
      }
      const actionStart = action._effectiveStart;
      const actionEnd = actionStart + (action.duration || 0);

      if (tickIndex < actionStart) {
        break;
      }

      if (tickIndex < actionEnd) {
        const elapsed = tickIndex - actionStart;
        const t = elapsed / action.duration;
        this.executeActionTick(action, player, t);
        return;
      }

      if (tickIndex >= actionEnd) {
        this.finalizeAction(action, player);
        idx++;
        timeline.currentActionIdx = idx;
        if (idx < actions.length) {
          actions[idx]._effectiveStart = Math.max(actions[idx].delay || 0, tickIndex);
        }
      }
    }

    if (idx >= actions.length) {
      timeline.completed = true;
    }
  }

  executeActionTick(action, player, t) {
    const layout = getLayout();

    switch (action.action) {
      case "run": {
        if (!action.path || action.path.length === 0) break;
        const pos = this.lerpPath(action.path, Math.min(t, 1));
        if (layout) {
          const screen = toScreen(layout, pos);
          player.setPosition(screen.x, screen.y);
          player.fieldX = pos.x;
          player.fieldY = pos.y;
        }
        this.checkCollision(player);
        break;
      }
      case "pass": {
        if (!action.target) break;
        const startPos = action._startPos || this.getBallFieldPos();
        if (!action._startPos) action._startPos = startPos;
        const eased = this.easeLinear(Math.min(t, 1));
        const pos = {
          x: startPos.x + (action.target.x - startPos.x) * eased,
          y: startPos.y + (action.target.y - startPos.y) * eased,
        };
        if (layout) {
          const screen = toScreen(layout, pos);
          this.ball.setPosition(screen.x, screen.y);
          this.ball.fieldX = pos.x;
          this.ball.fieldY = pos.y;
          this.ball.detach();
        }
        break;
      }
      case "shoot": {
        if (!action.target) break;
        const startPos = action._startPos || this.getBallFieldPos();
        if (!action._startPos) action._startPos = startPos;
        const eased = this.easeLinear(Math.min(t, 1));
        const pos = {
          x: startPos.x + (action.target.x - startPos.x) * eased,
          y: startPos.y + (action.target.y - startPos.y) * eased,
        };
        if (layout) {
          const screen = toScreen(layout, pos);
          this.ball.setPosition(screen.x, screen.y);
          this.ball.fieldX = pos.x;
          this.ball.fieldY = pos.y;
          this.ball.detach();
        }
        break;
      }
    }
  }

  finalizeAction(action, player) {
    const layout = getLayout();
    switch (action.action) {
      case "run": {
        if (action.path && action.path.length > 0) {
          const end = action.path[action.path.length - 1];
          player.setFieldPosition(end.x, end.y);
          this.checkCollision(player);
        }
        break;
      }
      case "pass":
      case "shoot": {
        if (action.target) {
          const screen = toScreen(layout, action.target);
          this.ball.setPosition(screen.x, screen.y);
          this.ball.fieldX = action.target.x;
          this.ball.fieldY = action.target.y;
          this.ball.detach();
        }
        break;
      }
    }
  }

  checkCollision(player) {
    if (!this.ball) return;
    if (this.ball.carrier) return;

    const layout = getLayout();
    if (!layout) return;
    const threshold = PLAYER_RADIUS * 2 * layout.scale;
    const dx = player.x - this.ball.x;
    const dy = player.y - this.ball.y;
    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
      this.ball.attachTo(player);
    }
  }

  getBallFieldPos() {
    if (!this.ball) return { x: 0, y: 0 };
    if (this.ball.carrier) {
      return { x: this.ball.carrier.fieldX, y: this.ball.carrier.fieldY };
    }
    return { x: this.ball.fieldX, y: this.ball.fieldY };
  }

  lerpPath(path, t) {
    if (path.length === 0) return { x: 0, y: 0 };
    if (path.length === 1) return path[0];
    if (t >= 1) return path[path.length - 1];

    const totalLen = this.pathLength(path);
    if (totalLen === 0) return path[0];

    const targetDist = t * totalLen;
    let accumulated = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (accumulated + segLen >= targetDist) {
        const segT = (targetDist - accumulated) / segLen;
        return { x: a.x + dx * segT, y: a.y + dy * segT };
      }
      accumulated += segLen;
    }

    return path[path.length - 1];
  }

  pathLength(path) {
    let len = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  easeLinear(t) {
    return t;
  }

  snapToTick(targetTick) {
    if (!this.interpreter) return;
    this.stop();
    this.accumulator = 0;
    this.prevTickStates = [];
    this.nextTickStates = [];

    const formationName = this.interpreter.getFormation();
    if (formationName) {
      this.applyFormation(formationName);
    }

    const placement = this.interpreter.getPlacement();
    if (placement && this.ball) {
      this.ball.detach();
      if (typeof placement === "string") {
        const p = this.getPlayer(placement);
        if (p) {
          this.ball.attachTo(p);
          this.ball.fieldX = p.fieldX;
          this.ball.fieldY = p.fieldY;
          this.ball.update();
        }
      } else if (placement.x != null && placement.y != null) {
        this.ball.setFieldPosition(placement.x, placement.y);
      }
    }

    this.buildTimelines();
    this.tickIndex = 0;
    targetTick = Math.max(0, Math.min(targetTick, this.maxTicks));

    for (let i = 0; i < targetTick; i++) {
      this.runTick(i);
    }
    this.tickIndex = targetTick;

    if (this.callbacks.onTickChange) {
      const label = targetTick >= this.maxTicks ? "Play finished" : `Tick ${targetTick}/${this.maxTicks}`;
      this.callbacks.onTickChange(targetTick, this.maxTicks, label);
    }
  }
}