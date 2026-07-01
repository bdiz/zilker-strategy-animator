import Phaser from "phaser";
import { BALL_RADIUS } from "../config.js";

export default class Ball extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.carrier = null;

    this.sprite = scene.add.image(1, 1, "ball");
    this.add(this.sprite);
    scene.add.existing(this);
  }

  attachTo(player) {
    this.carrier = player;
  }

  detach() {
    this.carrier = null;
  }

  update() {
    if (this.carrier) {
      this.setPosition(this.carrier.x, this.carrier.y);
    }
  }
}