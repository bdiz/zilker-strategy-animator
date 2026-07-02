import Phaser from "phaser";
import Player from "../objects/Player.js";
import Ball from "../objects/Ball.js";
import PlayInterpreter from "../animation/PlayInterpreter.js";
import allPlays from "../plays/index.js";
import AnimationRunner from "../animation/AnimationRunner.js";
import { FORMATIONS } from "../config.js";

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  create() {
    this.players = null;
    this.ball = null;
    this.currentPlayIndex = 0;
    this.animationRunner = null;
    this.onPlayChange = null;
    this.onStepChange = null;

    this.animationRunner = new AnimationRunner(this, null, null);

    this.scale.on("resize", this.handleResize, this);
  }

  handleResize() {
    if (!this.players) return;
    Object.values(this.players).forEach((p) => p.refreshFromLayout());
    if (this.ball) this.ball.refreshFromLayout();
  }

  ensurePlayers() {
    if (!this.players) {
      this.players = {};
      this.createPlayers();
      this.createBall();
      this.animationRunner.players = this.players;
      this.animationRunner.ball = this.ball;
    }
  }

  createPlayers() {
    const ids = ["GK", "CDM", "LB", "RB", "LM", "RM", "FWD"];
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
    Object.entries(formation).forEach(([id, pos]) => {
      const p = this.players[id];
      if (p) {
        p.setFieldPosition(pos.x, pos.y);
      }
    });
  }

  loadPlay(index) {
    if (index < 0 || index >= allPlays.length) return;
    this.ensurePlayers();
    this.currentPlayIndex = index;
    this.setFormation("diamond");
    this.animationRunner.stop();

    const playData = allPlays[index];
    const interpreter = new PlayInterpreter(playData);
    this.animationRunner.loadPlay(interpreter);

    this.placeBallAtFirstPasser(playData);

    if (this.onPlayChange) {
      this.onPlayChange(index, playData.name, playData.description);
    }
    if (this.onStepChange) {
      this.onStepChange("");
    }
  }

  placeBallAtFirstPasser(playData) {
    this.ball.detach();
    for (const group of playData.commands) {
      for (const cmd of group) {
        if (cmd.action === "placeBall" && cmd.at) {
          this.ball.setFieldPosition(cmd.at.x, cmd.at.y);
          return;
        }
        if (cmd.action === "pass") {
          const player = this.players[cmd.from];
          if (player) {
            this.ball.attachTo(player);
            this.ball.update();
          }
          return;
        }
      }
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