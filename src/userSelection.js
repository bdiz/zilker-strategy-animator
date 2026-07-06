let _userPosition = null;
let _userName = "";

export function getUserSelection() {
  return { position: _userPosition, name: _userName };
}

export function setUserSelection(position, name) {
  _userPosition = position;
  _userName = name || "";
}