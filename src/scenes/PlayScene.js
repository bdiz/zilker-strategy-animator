import Phaser from "phaser";
import Player from "../objects/Player.js";
import Ball from "../objects/Ball.js";
import PlayInterpreter from "../animation/PlayInterpreter.js";
import allPlays from "../plays/index.js";
import AnimationRunner from "../animation/AnimationRunner.js";

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
    this.onTickChange = null;

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
    const ids = ["GK", "CM", "LB", "RB", "LM", "RM", "FWD"];
    ids.forEach((id) => {
      const p = new Player(this, id, 0, 0);
      this.players[id] = p;
    });
  }

  createBall() {
    this.ball = new Ball(this, 0, 0);
  }

  loadPlay(index) {
    if (index < 0 || index >= allPlays.length) return;
    this.ensurePlayers();
    this.currentPlayIndex = index;
    this.animationRunner.stop();

    const playData = allPlays[index];
    const interpreter = new PlayInterpreter(playData);
    this.animationRunner.loadPlay(interpreter);

    if (this.onPlayChange) {
      this.onPlayChange(index, playData.name, playData.description);
    }
    if (this.onTickChange) {
      this.onTickChange(0, this.animationRunner.maxTicks, "");
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

  seekTo(tickIndex) {
    this.animationRunner.snapToTick(tickIndex);
  }

  update(time, delta) {
    this.animationRunner.update(time, delta);
    if (this.ball) {
      this.ball.update();
    }
  }
}