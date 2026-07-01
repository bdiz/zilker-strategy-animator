import Phaser from "phaser";
import { PLAYER_RADIUS, PLAYER_COLOR } from "../config.js";

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, id, x, y) {
    super(scene, x, y);
    this.playerId = id;

    this.sprite = scene.add.image(0, 0, "smiley");
    this.sprite.setScale(0.85);

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

  hasBall(ball) {
    return ball && ball.carrier === this;
  }
}