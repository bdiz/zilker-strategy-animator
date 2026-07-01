import allPlays from "../plays/index.js";

export default class PlayControls {
  constructor(scene) {
    this.scene = scene;
    this.currentIndex = 0;

    this.playlistEl = document.getElementById("playlist");
    this.playBtn = document.getElementById("btn-play");
    this.restartBtn = document.getElementById("btn-restart");
    this.speedSlider = document.getElementById("speed-slider");
    this.speedLabel = document.getElementById("speed-label");
    this.stepLabel = document.getElementById("step-label");

    this.setupPlaylist();
    this.setupControls();

    scene.onPlayChange = (index, name, desc) => {
      this.highlightPlay(index);
      this.stepLabel.textContent = desc || name;
    };
    scene.onStepChange = (text) => {
      this.stepLabel.textContent = text;
    };
    scene.animationRunner.callbacks.onStepChange = (text) => {
      this.stepLabel.textContent = text;
    };
    scene.animationRunner.callbacks.onPlayEnd = () => {
      this.playBtn.textContent = "▶ Play";
    };
  }

  setupPlaylist() {
    this.playlistEl.innerHTML = "";
    allPlays.forEach((play, index) => {
      const btn = document.createElement("button");
      btn.className = "play-btn";
      btn.textContent = play.name;
      btn.addEventListener("click", () => {
        this.loadPlay(index);
        closeMenu();
      });
      this.playlistEl.appendChild(btn);
    });
  }

  setupControls() {
    this.playBtn.addEventListener("click", () => {
      if (this.scene.animationRunner.running) {
        this.scene.animationRunner.stop();
        this.playBtn.textContent = "▶ Play";
        this.scene.time.timeScale = 1;
        this.stepLabel.textContent = "Paused";
      } else {
        this.scene.play();
        this.playBtn.textContent = "⏸ Pause";
      }
    });

    this.restartBtn.addEventListener("click", () => {
      this.scene.restart();
      this.playBtn.textContent = "▶ Play";
    });

    this.speedSlider.addEventListener("input", () => {
      const val = parseFloat(this.speedSlider.value);
      this.speedLabel.textContent = val.toFixed(2) + "x";
      this.scene.setSpeed(val);
    });
  }

  highlightPlay(index) {
    const btns = this.playlistEl.querySelectorAll(".play-btn");
    btns.forEach((b, i) => {
      b.classList.toggle("active", i === index);
    });
  }

  loadPlay(index) {
    this.scene.loadPlay(index);
    this.playBtn.textContent = "▶ Play";
  }
}