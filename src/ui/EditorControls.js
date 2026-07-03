import { FORMATIONS } from "../config.js";

export default class EditorControls {
  constructor(game) {
    this.game = game;

    this.editorControls = this.buildEditorBar();
    this.formationPanel = this.editorControls.querySelector("#editor-formation-controls");
    this.actionPanel = this.editorControls.querySelector("#editor-action-controls");
    this.playControls = document.getElementById("controls-overlay");

    this.setupFormationControls();
    this.setupActionControls();

    const scene = game.scene.getScene("ActionEditorScene");
    if (scene) {
      scene.events.on("actions-changed", (summary) => {
        const el = document.getElementById("action-summary");
        if (el) el.textContent = summary;
      });
    }
  }

  buildEditorBar() {
    const existing = document.getElementById("editor-controls");
    if (existing) return existing;

    const bar = document.createElement("div");
    bar.id = "editor-controls";
    bar.style.cssText = "display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#0f1a30;padding:12px 16px;border-top:2px solid #f0c040;font-family:'Segoe UI',Arial,sans-serif;color:#d0d8e8;";

    const fmtPanel = document.createElement("div");
    fmtPanel.id = "editor-formation-controls";
    fmtPanel.style.cssText = "display:flex;align-items:center;gap:10px;flex-wrap:wrap;";
    fmtPanel.innerHTML = `<span style="font-size:12px;color:#f0c040;">Formation Editor</span>
<button id="btn-save-formation" class="ec-btn">Save Formation</button>
<button id="btn-clear-formation" class="ec-btn">Clear</button>`;
    bar.appendChild(fmtPanel);

    const actPanel = document.createElement("div");
    actPanel.id = "editor-action-controls";
    actPanel.style.cssText = "display:none;align-items:center;gap:10px;flex-wrap:wrap;";
    actPanel.innerHTML = `<button id="btn-play-preview" class="ec-btn" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;color:#f0c040;background:none;border:none;cursor:pointer;" onmouseover="this.style.color='#ffe070'" onmouseout="this.style.color='#f0c040'">
  <svg viewBox="0 0 24 24" style="width:100%;height:100%;fill:currentColor;"><polygon points="6,4 20,12 6,20"/></svg>
</button>
<span style="font-size:12px;color:#f0c040;">Action Editor</span>
<span id="action-summary" style="font-size:11px;color:#88aacc;flex:1;">No actions recorded</span>
<button id="btn-copy-play" class="ec-btn">Copy to Clipboard</button>
<button id="btn-clear-action" class="ec-btn">Clear</button>`;
    bar.appendChild(actPanel);

    const style = document.createElement("style");
    style.textContent = `
      .ec-btn{padding:6px 14px;background:#1a3355;color:#d0d8e8;border:1px solid #2a4a7a;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit}
      .ec-btn:hover{background:#2a4a7a;border-color:#f0c040}
      #btn-play-preview:disabled{opacity:0.4;cursor:default}
    `;
    bar.appendChild(style);

    document.body.appendChild(bar);
    return bar;
  }

  setupFormationControls() {
    document.getElementById("btn-save-formation").addEventListener("click", () => {
      const scene = this.game.scene.getScene("FormationEditorScene");
      if (scene && scene.logFormation) scene.logFormation();
    });
    document.getElementById("btn-clear-formation").addEventListener("click", () => {
      const scene = this.game.scene.getScene("FormationEditorScene");
      if (scene && scene.clearAll) scene.clearAll();
    });
  }

  setupActionControls() {
    document.getElementById("btn-play-preview").addEventListener("click", () => {
      const scene = this.game.scene.getScene("ActionEditorScene");
      if (scene && scene.startPreview) {
        scene.startPreview();
        document.getElementById("btn-play-preview").disabled = true;
      }
    });

    document.getElementById("btn-copy-play").addEventListener("click", () => {
      const scene = this.game.scene.getScene("ActionEditorScene");
      if (scene && scene.copyToClipboard) scene.copyToClipboard();
    });

    document.getElementById("btn-clear-action").addEventListener("click", () => {
      const scene = this.game.scene.getScene("ActionEditorScene");
      if (scene && scene.clearAll) {
        scene.clearAll();
      }
    });

    const scene = this.game.scene.getScene("ActionEditorScene");
    if (scene) {
      scene.events.on("preview-ended", () => {
        document.getElementById("btn-play-preview").disabled = false;
      });
    }
  }

  showFormationEditor() {
    this.playControls.style.display = "none";
    this.editorControls.style.display = "block";
    this.formationPanel.style.display = "flex";
    this.actionPanel.style.display = "none";
  }

  showActionEditor(formationName) {
    this.playControls.style.display = "none";
    this.editorControls.style.display = "block";
    this.formationPanel.style.display = "none";
    this.actionPanel.style.display = "flex";

    const scene = this.game.scene.getScene("ActionEditorScene");
    if (scene && scene.setFormation && FORMATIONS[formationName]) {
      scene.setFormation(formationName);
    }

    const summaryEl = document.getElementById("action-summary");
    if (summaryEl && scene) {
      summaryEl.textContent = scene.getActionSummary ? scene.getActionSummary() : "No actions recorded";
    }
  }

  hide() {
    this.editorControls.style.display = "none";
    this.formationPanel.style.display = "none";
    this.actionPanel.style.display = "none";
    this.playControls.style.display = "";
  }
}