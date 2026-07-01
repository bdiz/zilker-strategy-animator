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
    const source = this.sprite.texture.source[0];
    const w = source ? source.width : this.sprite.width;
    const h = source ? source.height : this.sprite.height;
    const size = Math.min(w, h);
    const cx = w / 2;
    const cy = h / 2;
    this.sprite.setCrop(cx - size / 2, cy - size / 2, size, size);
    this.sprite.setDisplaySize(diameter, diameter * 0.8);
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