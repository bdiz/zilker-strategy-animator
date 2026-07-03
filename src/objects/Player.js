import Phaser from "phaser";
import { PLAYER_RADIUS, getLayout, toScreen } from "../config.js";

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, id, x, y) {
    super(scene, x, y);
    this.playerId = id;
    this.fieldX = 0;
    this.fieldY = 0;

    this.sprite = scene.add.image(0, 0, "smiley");

    this.label = scene.add.text(0, 0, id, {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.add([this.sprite, this.label]);
    scene.add.existing(this);

    this.refreshSpriteScale();
  }

  refreshSpriteScale() {
    const layout = getLayout() || { scale: 1 };
    const diameter = Math.max(1, PLAYER_RADIUS * 2 * 0.55 * layout.scale);
    const source = this.sprite.texture.source[0];
    const w = source ? source.width : this.sprite.width;
    const h = source ? source.height : this.sprite.height;
    const size = Math.min(w, h);
    const cx = w / 2;
    const cy = h / 2;
    this.sprite.setCrop(cx - size / 2, cy - size / 2, size, size);
    this.sprite.setDisplaySize(diameter, diameter);
    this.label.y = diameter / 2 + 4;
  }

  setFieldPosition(fieldX, fieldY) {
    this.fieldX = fieldX;
    this.fieldY = fieldY;
    const layout = getLayout() || { scale: 1, offsetX: 0, offsetY: 0 };
    const screen = toScreen(layout, { x: fieldX, y: fieldY });
    this.setPosition(screen.x, screen.y);
  }

  refreshFromLayout() {
    const layout = getLayout();
    if (!layout) return;
    const screen = toScreen(layout, { x: this.fieldX, y: this.fieldY });
    this.setPosition(screen.x, screen.y);
    this.refreshSpriteScale();
  }

  hasBall(ball) {
    return ball && ball.carrier === this;
  }

  enableDrag() {
    this.setInteractive(new Phaser.Geom.Rectangle(-25, -25, 50, 50), Phaser.Geom.Rectangle.Contains);
    this.scene.input.setDraggable(this);
    this.input.useHandCursor = true;
    this.input.alwaysEnabled = true;
  }

  disableDrag() {
    this.disableInteractive();
  }
}