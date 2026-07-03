import Phaser from "phaser";
import { BALL_RADIUS, PLAYER_RADIUS, getLayout, toField, toScreen } from "../config.js";

export default class Ball extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.carrier = null;
    this.fieldX = 0;
    this.fieldY = 0;

    this.sprite = scene.add.image(0, 0, "ball");
    this.setSizeFromLayout();
    this.add(this.sprite);
    scene.add.existing(this);

    scene.scale.on("resize", this.onResize, this);
  }

  onResize() {
    this.setSizeFromLayout();
    this.refreshFromLayout();
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

  setFieldPosition(fieldX, fieldY) {
    this.fieldX = fieldX;
    this.fieldY = fieldY;
    this.detach();
    const layout = getLayout() || { scale: 1, offsetX: 0, offsetY: 0 };
    const screen = toScreen(layout, { x: fieldX, y: fieldY });
    this.setPosition(screen.x, screen.y);
  }

  refreshFromLayout() {
    if (this.carrier) return;
    const layout = getLayout();
    if (!layout) return;
    const screen = toScreen(layout, { x: this.fieldX, y: this.fieldY });
    this.setPosition(screen.x, screen.y);
  }

  attachTo(player, dx, dy) {
    this.carrier = player;
  }

  detach() {
    this.carrier = null;
  }

  placeBehind(player, dx, dy) {
    this.carrier = player;
    const layout = getLayout() || { scale: 1 };
    const dist = PLAYER_RADIUS * 0.8 * layout.scale;
    const ox = dx != null ? dx : 0.7;
    const oy = dy != null ? dy : 0.7;
    const sx = player.x + ox * dist;
    const sy = player.y + oy * dist;
    this.setPosition(sx, sy);
    const fp = toField(layout, sx, sy);
    this.fieldX = fp.x;
    this.fieldY = fp.y;
  }

  update() {
    if (this.carrier) {
      const dir = this.carrier.getDirection();
      if (!dir) return;

      const layout = getLayout() || { scale: 1 };
      const dist = PLAYER_RADIUS * 0.8 * layout.scale;
      const sx = this.carrier.x + dir.x * dist;
      const sy = this.carrier.y + dir.y * dist;
      this.setPosition(sx, sy);

      const fp = toField(layout, sx, sy);
      this.fieldX = fp.x;
      this.fieldY = fp.y;
    }
  }

  enableDrag() {
    this.setInteractive(new Phaser.Geom.Rectangle(-20, -20, 40, 40), Phaser.Geom.Rectangle.Contains);
    this.scene.input.setDraggable(this);
    this.input.useHandCursor = true;
    this.input.alwaysEnabled = true;
  }

  disableDrag() {
    this.disableInteractive();
  }
}