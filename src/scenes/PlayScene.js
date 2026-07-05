import Phaser from "phaser";
import Player from "../objects/Player.js";
import Ball from "../objects/Ball.js";
import PlayInterpreter from "../animation/PlayInterpreter.js";
import allPlays from "../plays/index.js";
import AnimationRunner from "../animation/AnimationRunner.js";

let _userPosition = null;
let _userName = "";

export function getUserSelection() {
  return { position: _userPosition, name: _userName };
}

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
    this.applyUserSelection(_userPosition, _userName);
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

    this.applyUserSelection(_userPosition, _userName);

    if (this.onPlayChange) {
      this.onPlayChange(index, playData.name);
    }
  }

  applyUserSelection(position, name) {
    if (!this.players) return;
    _userPosition = position;
    _userName = name || "";
    Object.values(this.players).forEach(p => p.setUserSelection(_userPosition, _userName));
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