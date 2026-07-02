import Phaser from "phaser";
import Player from "../objects/Player.js";
import Ball from "../objects/Ball.js";
import PlayInterpreter from "../animation/PlayInterpreter.js";
import allPlays from "../plays/index.js";
import AnimationRunner from "../animation/AnimationRunner.js";
import { FORMATIONS, getLayout, toScreen } from "../config.js";

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  create() {
    this.players = {};
    this.ball = null;
    this.currentPlayIndex = 0;
    this.animationRunner = null;
    this.onPlayChange = null;
    this.onStepChange = null;

    this.createPlayers();
    this.createBall();
    this.setFormation("diamond");

    this.animationRunner = new AnimationRunner(this, this.players, this.ball);

    if (allPlays.length > 0) {
      this.loadPlay(0);
    }
  }

  createPlayers() {
    const ids = ["GK", "CM", "LB", "RB", "LM", "RM", "FWD"];
    ids.forEach((id) => {
      const p = new Player(this, id, 0, 0);
      this.players[id] = p;
    });
  }

  createBall() {
    this.ball = new Ball(this, 0, 0);
  }

  setFormation(name) {
    const formation = FORMATIONS[name];
    if (!formation) return;
    const layout = getLayout() || { scale: 1, offsetX: 0, offsetY: 0 };
    Object.entries(formation).forEach(([id, pos]) => {
      const p = this.players[id];
      if (p) {
        const screen = toScreen(layout, pos);
        p.setPosition(screen.x, screen.y);
      }
    });
  }

  loadPlay(index) {
    if (index < 0 || index >= allPlays.length) return;
    this.currentPlayIndex = index;
    this.setFormation("diamond");
    this.animationRunner.stop();

    const playData = allPlays[index];
    const interpreter = new PlayInterpreter(playData);
    this.animationRunner.loadPlay(interpreter);

    const firstGroup = interpreter.getGroups()[0];
    if (firstGroup) {
      const placeCmd = firstGroup.find(c => c.action === "placeBall" && c.at);
      if (placeCmd) {
        const layout = getLayout();
        if (layout) {
          const pos = toScreen(layout, placeCmd.at);
          this.ball.setPosition(pos.x, pos.y);
        }
      }
    }

    if (this.onPlayChange) {
      this.onPlayChange(index, playData.name, playData.description);
    }
    if (this.onStepChange) {
      this.onStepChange("");
    }
  }

  play() {
    this.animationRunner.play();
  }

  restart() {
    this.loadPlay(this.currentPlayIndex);
  }

  setSpeed(speed) {
    this.animationRunner.setSpeed(speed);
  }

  seekTo(index) {
    this.animationRunner.snapToGroup(index);
  }

  update() {
    if (this.ball) {
      this.ball.update();
    }
  }
}