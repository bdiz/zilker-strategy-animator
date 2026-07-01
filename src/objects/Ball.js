import Phaser from "phaser";
import { BALL_RADIUS, PLAYER_RADIUS, getLayout } from "../config.js";

export default class Ball extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.carrier = null;

    this.sprite = scene.add.image(0, 0, "ball");
    this.setSizeFromLayout();
    this.add(this.sprite);
    scene.add.existing(this);

    scene.scale.on("resize", this.setSizeFromLayout, this);
  }

  setSizeFromLayout() {
    const layout = getLayout() || { scale: 1 };
    const diameter = Math.max(1, BALL_RADIUS * 2 * layout.scale);
    this.sprite.setDisplaySize(diameter, diameter);
  }

  attachTo(player) {
    this.carrier = player;
  }

  detach() {
    this.carrier = null;
  }

  update() {
    if (this.carrier) {
      const layout = getLayout() || { scale: 1 };
      const offset = PLAYER_RADIUS * 0.8 * layout.scale;
      this.setPosition(this.carrier.x + offset, this.carrier.y + offset);
    }
  }
}