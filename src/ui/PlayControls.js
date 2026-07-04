import allPlays from "../plays/index.js";
import { DEV_MODE, FORMATIONS } from "../config.js";
import EditorControls from "./EditorControls.js";
import { initRouter, navigate, toSlug, playSlug, formationSlug, lookupSlug } from "./Router.js";

export default class PlayControls {
  constructor(scene) {
    this.scene = scene;
    this.currentIndex = 0;
    this.activeEditorKey = null;
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

    this.zilkerClicks = 0;
    this._editorButtonsCreated = false;
    this.zilkerTitle = document.querySelector("#sidebar h1");
    if (this.zilkerTitle) {
      this.zilkerTitle.style.cursor = "pointer";
      this.zilkerTitle.addEventListener("click", () => {
        this.zilkerClicks++;
        if (this.zilkerClicks >= 5 && !this._editorButtonsCreated) {
          this.setupEditorButtons();
        }
      });
    }

    this.setupPlaylist();
    this.setupControls();

    if (DEV_MODE) {
      this.setupEditorButtons();
    }

    scene.onPlayChange = (index, name) => {
      this.highlightPlay(index);
      this.stepLabel.textContent = name;
    };

    scene.animationRunner.callbacks.onTickChange = (tick, maxTicks, label) => {
      this.stepLabel.textContent = label;
      this.updateProgress(tick, maxTicks);
    };
    scene.animationRunner.callbacks.onPlayEnd = () => {
      this.showPlayIcon();
    };

    document.getElementById("menu-toggle").addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      if (!sidebar.classList.contains("open")) {
        this.refreshActiveButton();
      }
    });

    this._destroyRouter = initRouter((route) => this.handleRoute(route));
  }

  handleRoute(route) {
    switch (route.page) {
      case "play": {
        const entry = lookupSlug("play", route.slug);
        if (entry) {
          this.loadPlay(entry.index);
          closeMenu();
        } else {
          this.handleRoute({ page: "home" });
        }
        break;
      }
      case "editor-formation": {
        this.openFormationEditor();
        closeMenu();
        break;
      }
      case "editor-action": {
        const entry = lookupSlug("action", route.slug);
        if (entry) {
          this.openActionEditor(entry.name);
          closeMenu();
        } else {
          this.handleRoute({ page: "home" });
        }
        break;
      }
      case "editor-from-play": {
        const entry = lookupSlug("play", route.slug);
        if (entry) {
          this.openActionEditorWithPlay(entry.index);
          closeMenu();
        } else {
          this.handleRoute({ page: "home" });
        }
        break;
      }
      case "home":
      default:
        openMenu();
        break;
    }
  }

  setupEditorButtons() {
    if (this._editorButtonsCreated) return;
    this._editorButtonsCreated = true;

    const divider = document.createElement("hr");
    divider.style.border = "none";
    divider.style.borderTop = "1px solid #2a4a7a";
    divider.style.margin = "12px 0";
    this.playlistEl.appendChild(divider);

    const formationBtn = document.createElement("button");
    formationBtn.className = "play-btn";
    formationBtn.dataset.editorKey = "formation-editor";
    formationBtn.textContent = "New formation";
    formationBtn.addEventListener("click", () => navigate("editor/formation"));
    this.playlistEl.appendChild(formationBtn);

    const actionHeader = document.createElement("div");
    actionHeader.style.cssText = "font-size:12px;color:#8899aa;padding:8px 4px 2px;";
    actionHeader.textContent = "Add plays";
    this.playlistEl.appendChild(actionHeader);

    const subContainer = document.createElement("div");
    subContainer.style.cssText = "display:flex;flex-direction:column;gap:3px;padding-left:8px;margin-bottom:4px;";
    Object.keys(FORMATIONS).forEach((name) => {
      const btn = document.createElement("button");
      btn.className = "play-btn";
      btn.dataset.editorKey = "action-editor-" + name;
      btn.style.cssText = "font-size:12px;padding:6px 8px;";
      btn.textContent = "New " + name.charAt(0).toUpperCase() + name.slice(1) + " play";
      btn.addEventListener("click", () => navigate("editor/action/" + formationSlug(name)));
      subContainer.appendChild(btn);
    });
    this.playlistEl.appendChild(subContainer);

    const playActionHeader = document.createElement("div");
    playActionHeader.style.cssText = "font-size:12px;color:#8899aa;padding:6px 4px 2px;";
    playActionHeader.textContent = "Edit plays";
    this.playlistEl.appendChild(playActionHeader);

    const playSubContainer = document.createElement("div");
    playSubContainer.style.cssText = "display:flex;flex-direction:column;gap:3px;padding-left:8px;margin-bottom:4px;";
    allPlays.forEach((play, index) => {
      const btn = document.createElement("button");
      btn.className = "play-btn";
      btn.dataset.editorKey = "play-action-" + index;
      btn.style.cssText = "font-size:12px;padding:6px 8px;";
      btn.textContent = play.name;
      btn.addEventListener("click", () => navigate("editor/from-play/" + playSlug(index)));
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
    this.highlightEditor("formation-editor");
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
    this.highlightEditor("action-editor-" + formationName);
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
    this.highlightEditor("play-action-" + playIndex);
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
        navigate("play/" + playSlug(index));
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
    this.currentIndex = index;
    this.activeEditorKey = null;
    const btns = this.playlistEl.querySelectorAll(".play-btn");
    btns.forEach((b) => b.classList.remove("active"));
    btns.forEach((b, i) => {
      if (i === index) b.classList.add("active");
    });
  }

  highlightEditor(key) {
    this.currentIndex = null;
    this.activeEditorKey = key;
    const btns = this.playlistEl.querySelectorAll(".play-btn");
    btns.forEach((b) => b.classList.remove("active"));
    btns.forEach((b) => {
      if (b.dataset.editorKey === key) b.classList.add("active");
    });
  }

  refreshActiveButton() {
    if (this.currentIndex != null) {
      this.highlightPlay(this.currentIndex);
    } else if (this.activeEditorKey) {
      this.highlightEditor(this.activeEditorKey);
    } else {
      const btns = this.playlistEl.querySelectorAll(".play-btn");
      btns.forEach((b) => b.classList.remove("active"));
    }
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