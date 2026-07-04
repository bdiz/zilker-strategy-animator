import { FORMATIONS } from "../config.js";

export default class EditorControls {
  constructor(game) {
    this.game = game;

    this.editorControls = this.buildEditorBar();
    this.formationPanel = this.editorControls.querySelector("#editor-formation-controls");
    this.actionPanel = this.editorControls.querySelector("#editor-action-controls");
    this.actionModal = this.editorControls.querySelector("#action-edit-modal");
    this.playControls = document.getElementById("controls-overlay");

    this.setupFormationControls();
    this.setupActionControls();
    this.setupModalEvents();

    this._currentEdit = null;

    const scene = game.scene.getScene("ActionEditorScene");
    if (scene) {
      scene.events.on("action-clicked", (hit) => this.openEditModal(hit));
      scene.events.on("action-deselected", () => this.closeEditModal());
    }
  }

  buildEditorBar() {
    const existing = document.getElementById("editor-controls");
    if (existing) return existing;

    const bar = document.createElement("div");
    bar.id = "editor-controls";
    bar.style.cssText = "display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#0f1a30;padding:14px 16px 22px;border-top:2px solid #f0c040;font-family:'Segoe UI',Arial,sans-serif;color:#d0d8e8;";

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
<div style="margin-left:auto;display:flex;gap:10px;">
<button id="btn-copy-play" class="ec-btn">Copy to Clipboard</button>
<button id="btn-clear-action" class="ec-btn">Clear</button>
</div>`;
    bar.appendChild(actPanel);

    const modal = document.createElement("div");
    modal.id = "action-edit-modal";
    modal.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;";
    modal.innerHTML = `
<div id="action-edit-panel" style="background:#0f1a30;border:2px solid #f0c040;border-radius:8px;padding:20px 24px;min-width:280px;max-width:360px;color:#d0d8e8;position:relative;">
  <button id="modal-close-btn" style="position:absolute;top:8px;right:10px;background:none;border:none;color:#8899aa;cursor:pointer;font-size:18px;line-height:1;">&times;</button>
  <div style="font-size:14px;font-weight:bold;color:#f0c040;margin-bottom:12px;" id="modal-title">Edit Action</div>
  <div style="font-size:12px;color:#8899aa;margin-bottom:14px;" id="modal-subtitle"></div>

  <div style="margin-bottom:10px;">
    <div style="font-size:11px;color:#8899aa;margin-bottom:4px;">Duration (ticks)</div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="modal-inc-btn" data-field="duration" data-dir="-1" style="width:30px;height:30px;background:#1a3355;border:1px solid #2a4a7a;border-radius:4px;color:#d0d8e8;cursor:pointer;font-size:16px;">−</button>
      <span id="modal-duration-value" style="font-size:16px;min-width:30px;text-align:center;font-variant-numeric:tabular-nums;">0</span>
      <button class="modal-inc-btn" data-field="duration" data-dir="1" style="width:30px;height:30px;background:#1a3355;border:1px solid #2a4a7a;border-radius:4px;color:#d0d8e8;cursor:pointer;font-size:16px;">+</button>
      <button class="modal-inc-btn" data-field="duration" data-dir="5" style="width:30px;height:30px;background:#1a3355;border:1px solid #2a4a7a;border-radius:4px;color:#d0d8e8;cursor:pointer;font-size:13px;">+5</button>
    </div>
  </div>

  <div style="margin-bottom:14px;">
    <div style="font-size:11px;color:#8899aa;margin-bottom:4px;">Delay (ticks)</div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="modal-inc-btn" data-field="delay" data-dir="-1" style="width:30px;height:30px;background:#1a3355;border:1px solid #2a4a7a;border-radius:4px;color:#d0d8e8;cursor:pointer;font-size:16px;">−</button>
      <span id="modal-delay-value" style="font-size:16px;min-width:30px;text-align:center;font-variant-numeric:tabular-nums;">0</span>
      <button class="modal-inc-btn" data-field="delay" data-dir="1" style="width:30px;height:30px;background:#1a3355;border:1px solid #2a4a7a;border-radius:4px;color:#d0d8e8;cursor:pointer;font-size:16px;">+</button>
      <button class="modal-inc-btn" data-field="delay" data-dir="5" style="width:30px;height:30px;background:#1a3355;border:1px solid #2a4a7a;border-radius:4px;color:#d0d8e8;cursor:pointer;font-size:13px;">+5</button>
    </div>
  </div>

  <div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #2a4a7a;padding-top:12px;">
    <button id="modal-delete-btn" class="ec-btn" style="background:#5c1a1a;border-color:#8a2a2a;color:#ff8888;margin-right:auto;">Delete Action</button>
    <button id="modal-done-btn" class="ec-btn" style="background:#1a3355;">Done</button>
  </div>
</div>`;
    bar.appendChild(modal);

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
        this.closeEditModal();
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
        this.closeEditModal();
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

  setupModalEvents() {
    document.getElementById("modal-close-btn").addEventListener("click", () => this.closeEditModal());
    document.getElementById("modal-done-btn").addEventListener("click", () => this.closeEditModal());
    document.getElementById("modal-delete-btn").addEventListener("click", () => {
      if (!this._currentEdit) return;
      const scene = this.game.scene.getScene("ActionEditorScene");
      if (scene && scene.deleteAction) {
        scene.deleteAction(this._currentEdit.playerId, this._currentEdit.actionIndex);
        this.closeEditModal();
      }
    });

    this.actionModal.addEventListener("click", (e) => {
      if (e.target === this.actionModal) this.closeEditModal();
    });

    this.actionModal.querySelectorAll(".modal-inc-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this._currentEdit) return;
        const field = btn.dataset.field;
        const dir = parseInt(btn.dataset.dir, 10);
        const scene = this.game.scene.getScene("ActionEditorScene");
        if (!scene || !scene.updateActionField) return;
        const action = this._currentEdit.action;
        const current = action[field] || 0;
        const newVal = Math.max(field === "duration" ? 1 : 0, current + dir);
        scene.updateActionField(this._currentEdit.playerId, this._currentEdit.actionIndex, field, newVal);
        action[field] = newVal;
        document.getElementById(`modal-${field}-value`).textContent = newVal;
      });
    });
  }

  openEditModal(hit) {
    const scene = this.game.scene.getScene("ActionEditorScene");
    if (!scene) return;
    const action = scene.playerActions[hit.playerId]?.[hit.actionIndex];
    if (!action) return;

    this._currentEdit = { ...hit, action };

    const typeLabel = action.action.charAt(0).toUpperCase() + action.action.slice(1);
    document.getElementById("modal-title").textContent = `${hit.playerId} — ${typeLabel} #${hit.actionIndex + 1}`;
    document.getElementById("modal-subtitle").textContent = action.action === "run"
      ? `${action.path.length} waypoints`
      : `Target: (${action.target.x}, ${action.target.y})`;
    document.getElementById("modal-duration-value").textContent = action.duration || 0;
    document.getElementById("modal-delay-value").textContent = action.delay || 0;

    this.actionModal.style.display = "flex";
  }

  closeEditModal() {
    this.actionModal.style.display = "none";
    this._currentEdit = null;
  }

  showFormationEditor(formationName) {
    this.playControls.style.display = "none";
    this.editorControls.style.display = "block";
    this.formationPanel.style.display = "flex";
    this.actionPanel.style.display = "none";
    this.closeEditModal();

    const label = this.formationPanel.querySelector("span");
    if (label) {
      label.textContent = formationName
        ? "Formation Editor — " + formationName.charAt(0).toUpperCase() + formationName.slice(1)
        : "Formation Editor";
    }
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
  }

  hide() {
    this.editorControls.style.display = "none";
    this.formationPanel.style.display = "none";
    this.actionPanel.style.display = "none";
    this.playControls.style.display = "";
    this.closeEditModal();
  }
}