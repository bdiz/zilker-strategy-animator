import Phaser from "phaser";
import { PLAYER_RADIUS, PLAYER_COLOR, getLayout, toScreen } from "../config.js";

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, id, x, y) {
    super(scene, x, y);
    this.playerId = id;
    this.fieldX = 0;
    this.fieldY = 0;

    this.sprite = scene.add.image(0, 0, "smiley");
    this.sprite.setScale(0.75);

    this.label = scene.add.text(0, 22, id, {
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
  }

  hasBall(ball) {
    return ball && ball.carrier === this;
  }
}