import allPlays from "../plays/index.js";
import { DEV_MODE, FORMATIONS } from "../config.js";
import EditorControls from "./EditorControls.js";

export default class PlayControls {
  constructor(scene) {
    this.scene = scene;
    this.currentIndex = 0;
    this._draggingProgress = false;
    this.editorControls = null;

    this.playlistEl = document.getElementById("playlist");
    this.playSvg = document.getElementById("play-svg");
    this.pauseSvg = document.getElementById("pause-svg");
    this.playIcon = document.getElementById("play-icon");
    this.speedTrigger = document.getElementById("speed-trigger");
    this.speedOptions = document.getElementById("speed-options");
    this.stepLabel = document.getElementById("step-label");
    this.progressSlider = document.getElementById("progress-slider");

    this.setupPlaylist();
    this.setupEditorButtons();
    this.setupControls();

    scene.onPlayChange = (index, name, desc) => {
      this.highlightPlay(index);
      this.stepLabel.textContent = desc || name;
    };

    scene.animationRunner.callbacks.onTickChange = (tick, maxTicks, label) => {
      this.stepLabel.textContent = label;
      this.updateProgress(tick, maxTicks);
    };
    scene.animationRunner.callbacks.onPlayEnd = () => {
      this.showPlayIcon();
    };
  }

  setupEditorButtons() {
    if (!DEV_MODE) return;

    const divider = document.createElement("hr");
    divider.style.border = "none";
    divider.style.borderTop = "1px solid #2a4a7a";
    divider.style.margin = "12px 0";
    this.playlistEl.appendChild(divider);

    const formationBtn = document.createElement("button");
    formationBtn.className = "play-btn";
    formationBtn.textContent = "✎ Formation Editor";
    formationBtn.addEventListener("click", () => this.openFormationEditor());
    this.playlistEl.appendChild(formationBtn);

    const actionHeader = document.createElement("div");
    actionHeader.style.cssText = "font-size:12px;color:#8899aa;padding:8px 4px 2px;";
    actionHeader.textContent = "✎ Action Editor";
    this.playlistEl.appendChild(actionHeader);

    const subContainer = document.createElement("div");
    subContainer.style.cssText = "display:flex;flex-direction:column;gap:3px;padding-left:8px;margin-bottom:4px;";
    Object.keys(FORMATIONS).forEach((name) => {
      const btn = document.createElement("button");
      btn.className = "play-btn";
      btn.style.cssText = "font-size:12px;padding:6px 8px;";
      btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      btn.addEventListener("click", () => this.openActionEditor(name));
      subContainer.appendChild(btn);
    });
    this.playlistEl.appendChild(subContainer);

    const playActionHeader = document.createElement("div");
    playActionHeader.style.cssText = "font-size:12px;color:#8899aa;padding:6px 4px 2px;";
    playActionHeader.textContent = "From Plays";
    this.playlistEl.appendChild(playActionHeader);

    const playSubContainer = document.createElement("div");
    playSubContainer.style.cssText = "display:flex;flex-direction:column;gap:3px;padding-left:8px;margin-bottom:4px;";
    allPlays.forEach((play, index) => {
      const btn = document.createElement("button");
      btn.className = "play-btn";
      btn.style.cssText = "font-size:12px;padding:6px 8px;";
      btn.textContent = play.name;
      btn.addEventListener("click", () => this.openActionEditorWithPlay(index));
      playSubContainer.appendChild(btn);
    });
    this.playlistEl.appendChild(playSubContainer);
  }

  openFormationEditor() {
    const game = this.scene.game;
    this.scene.animationRunner.stop();
    this.scene.scene.pause();

    if (!this.editorControls) {
      this.editorControls = new EditorControls(game);
    }

    game.scene.run("FormationEditorScene");
    this.editorControls.showFormationEditor();
    window.playSelected = true;
    closeMenu();
  }

  openActionEditor(formationName) {
    const game = this.scene.game;
    this.scene.animationRunner.stop();
    this.scene.scene.pause();

    if (!this.editorControls) {
      this.editorControls = new EditorControls(game);
    }

    game.scene.run("ActionEditorScene");
    this.editorControls.showActionEditor(formationName);
    window.playSelected = true;
    closeMenu();
  }

  openActionEditorWithPlay(playIndex) {
    const game = this.scene.game;
    const playData = allPlays[playIndex];
    this.scene.animationRunner.stop();
    this.scene.scene.pause();

    if (!this.editorControls) {
      this.editorControls = new EditorControls(game);
    }

    window.__pendingActionEditorPlay = playData;
    game.scene.run("ActionEditorScene");
    this.editorControls.showActionEditor(playData.formation);
    window.playSelected = true;
    closeMenu();
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
    this.showPlayIcon = () => {
      this.playSvg.style.display = "";
      this.pauseSvg.style.display = "none";
    };
    this.showPauseIcon = () => {
      this.playSvg.style.display = "none";
      this.pauseSvg.style.display = "";
    };

    this.playIcon.addEventListener("click", () => {
      const runner = this.scene.animationRunner;
      if (!runner.paused) {
        runner.stop();
        this.showPlayIcon();
        this.stepLabel.textContent = "Paused";
      } else {
        const maxTicks = runner.maxTicks;
        if (runner.tickIndex >= maxTicks && maxTicks > 0) {
          this.scene.restart();
          this.updateProgress(0, maxTicks);
        }
        this.scene.play();
        this.showPauseIcon();
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
      const maxTicks = this.scene.animationRunner.maxTicks;
      if (maxTicks === 0) return;
      const target = parseInt(this.progressSlider.value, 10);
      this.showPlayIcon();
      this.scene.seekTo(target);
    });

    this.progressSlider.addEventListener("change", () => {
      this._draggingProgress = false;
      const maxTicks = this.scene.animationRunner.maxTicks;
      if (maxTicks === 0) return;
      const target = parseInt(this.progressSlider.value, 10);
      this.showPlayIcon();
      this.scene.seekTo(target);
    });
  }

  updateProgress(current, total) {
    if (this._draggingProgress) return;
    this.progressSlider.max = total > 0 ? total : 1;
    this.progressSlider.value = current;
  }

  highlightPlay(index) {
    const btns = this.playlistEl.querySelectorAll(".play-btn");
    btns.forEach((b, i) => {
      b.classList.toggle("active", i === index);
    });
  }

  loadPlay(index) {
    this.cleanupEditor();
    this.scene.loadPlay(index);
    this.showPlayIcon();
    window.playSelected = true;
    const maxTicks = this.scene.animationRunner.maxTicks;
    this.updateProgress(0, maxTicks);
  }

  cleanupEditor() {
    const game = this.scene.game;
    if (game.scene.isActive("FormationEditorScene")) {
      game.scene.stop("FormationEditorScene");
    }
    if (game.scene.isActive("ActionEditorScene")) {
      game.scene.stop("ActionEditorScene");
    }
    if (this.editorControls) {
      this.editorControls.hide();
    }
    this.scene.scene.resume();
    this.scene.ensurePlayers();
    this.scene.animationRunner.stop();
  }
}