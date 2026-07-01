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

  getGroups() {
    return this.playData.commands || [];
  }
}