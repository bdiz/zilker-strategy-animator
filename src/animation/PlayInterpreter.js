import { TICK_MS } from "../config.js";

export default class PlayInterpreter {
  constructor(playData) {
    this.playData = playData;
  }

  getName() {
    return this.playData.name;
  }

  getDescription() {
    return this.playData.description || "";
  }

  getFormation() {
    return this.playData.formation || null;
  }

  getPlacement() {
    return this.playData.placement || null;
  }

  getPlayerGroups() {
    return this.playData.commands || [];
  }

  getMaxTicks() {
    const groups = this.getPlayerGroups();
    if (groups.length === 0) return 0;
    let max = 0;
    for (const group of groups) {
      const actions = group.actions || [];
      let end = 0;
      for (const action of actions) {
        const aEnd = (action.delay || 0) + (action.duration || 0);
        if (aEnd > end) end = aEnd;
      }
      if (end > max) max = end;
    }
    return max;
  }
}