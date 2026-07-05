import { TICK_MS } from "../config.js";

export default class PlayInterpreter {
  constructor(playData) {
    this.playData = playData;
  }

  getName() {
    return this.playData.name;
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
      let effectiveStart = 0;
      for (const action of actions) {
        effectiveStart = Math.max(action.delay || 0, effectiveStart);
        const effectiveEnd = effectiveStart + (action.duration || 0);
        if (effectiveEnd > max) max = effectiveEnd;
        effectiveStart = effectiveEnd;
      }
    }
    return max + 1;
  }
}