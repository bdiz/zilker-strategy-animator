import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import FieldScene from "./scenes/FieldScene.js";
import PlayScene from "./scenes/PlayScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  scene: [BootScene, FieldScene, PlayScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

game.events.on("ready", () => {
  const tryInit = () => {
    const scene = game.scene.getScene("PlayScene");
    if (scene && scene.animationRunner) {
      import("./ui/PlayControls.js").then(({ default: PlayControls }) => {
        new PlayControls(scene);
      });
    } else {
      setTimeout(tryInit, 100);
    }
  };
  tryInit();
});