import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("ball", `${import.meta.env.BASE_URL}soccer-ball.png`);
  }

  create() {
    this.generateSmileyTexture();
    this.scene.start("FieldScene");
  }

  generateSmileyTexture() {
    const r = 18;
    const d = r * 2 + 2;
    const g = this.add.graphics();

    g.fillStyle(0xffdd44, 1);
    g.fillCircle(r + 1, r + 1, r);

    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(r + 1, r + 1, r);

    g.fillStyle(0x000000, 1);
    g.fillCircle(r + 1 - 5, r + 1 - 3, 2.5);
    g.fillCircle(r + 1 + 5, r + 1 - 3, 2.5);

    g.lineStyle(2, 0x000000, 1);
    g.beginPath();
    g.arc(r + 1, r + 1 + 2, 7, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();

    g.generateTexture("smiley", d, d);
    g.destroy();
  }
}