import allPlays from "../plays/index.js";

export default class PlayControls {
  constructor(scene) {
    this.scene = scene;
    this.currentIndex = 0;
    this._draggingProgress = false;

    this.playlistEl = document.getElementById("playlist");
    this.playIcon = document.getElementById("play-icon");
    this.speedTrigger = document.getElementById("speed-trigger");
    this.speedOptions = document.getElementById("speed-options");
    this.stepLabel = document.getElementById("step-label");
    this.progressSlider = document.getElementById("progress-slider");
    this.progressLabel = document.getElementById("progress-label");

    this.setupPlaylist();
    this.setupControls();

    scene.onPlayChange = (index, name, desc) => {
      this.highlightPlay(index);
      this.stepLabel.textContent = desc || name;
    };

    scene.animationRunner.callbacks.onStepChange = (text) => {
      this.stepLabel.textContent = text;
    };
    scene.animationRunner.callbacks.onPlayEnd = () => {
      this.playIcon.textContent = "\u25B6";
    };
    scene.animationRunner.callbacks.onProgress = (current, total) => {
      this.updateProgress(current, total);
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
    this.playIcon.addEventListener("click", () => {
      const runner = this.scene.animationRunner;
      if (runner.running) {
        runner.stop();
        this.playIcon.textContent = "\u25B6";
        this.stepLabel.textContent = "Paused";
      } else {
        const total = runner.getTotalGroups();
        if (runner.groupIndex >= total && total > 0) {
          this.scene.restart();
          this.updateProgress(0, total);
        }
        this.scene.play();
        this.playIcon.textContent = "\u23F8";
      }
    });

    this.speedTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.speedOptions.classList.toggle("open");
    });

    this.speedOptions.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.dataset.value);
        this.speedTrigger.textContent = btn.textContent;
        this.speedOptions.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.speedOptions.classList.remove("open");
        this.scene.setSpeed(val);
      });
    });

    document.addEventListener("click", () => {
      this.speedOptions.classList.remove("open");
    });

    this.progressSlider.addEventListener("input", () => {
      this._draggingProgress = true;
      const total = this.scene.animationRunner.getTotalGroups();
      if (total === 0) return;
      const target = parseInt(this.progressSlider.value, 10);
      this.progressLabel.textContent = `${target}/${total}`;
      this.playIcon.textContent = "\u25B6";
      this.scene.seekTo(target);
    });

    this.progressSlider.addEventListener("change", () => {
      this._draggingProgress = false;
      const total = this.scene.animationRunner.getTotalGroups();
      if (total === 0) return;
      const target = parseInt(this.progressSlider.value, 10);
      this.progressLabel.textContent = `${target}/${total}`;
      this.playIcon.textContent = "\u25B6";
      this.scene.seekTo(target);
    });
  }

  updateProgress(current, total) {
    if (this._draggingProgress) return;
    this.progressSlider.max = total > 0 ? total : 1;
    this.progressSlider.value = current;
    this.progressLabel.textContent = `${current}/${total}`;
  }

  highlightPlay(index) {
    const btns = this.playlistEl.querySelectorAll(".play-btn");
    btns.forEach((b, i) => {
      b.classList.toggle("active", i === index);
    });
  }

  loadPlay(index) {
    this.scene.loadPlay(index);
    this.playIcon.textContent = "\u25B6";
    const total = this.scene.animationRunner.getTotalGroups();
    this.updateProgress(0, total);
  }
}