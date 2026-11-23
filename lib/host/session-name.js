// packages/host/src/session-name.ts
var ESCAPE = /^[0-9A-F]{4}$/;
function sessionDirectoryName(id) {
  if (id === ".") return "~002E";
  if (id === "..") return "~002E~002E";
  let name = "";
  for (let index = 0; index < id.length; index += 1) {
    const unit = id.charAt(index);
    name += unit !== "~" && /^[A-Za-z0-9._-]$/.test(unit) ? unit : `~${id.charCodeAt(index).toString(16).toUpperCase().padStart(4, "0")}`;
  }
  return name;
}
function sessionIdFromDirectoryName(name) {
  let id = "";
  for (let index = 0; index < name.length; index += 1) {
    const hex = name.charAt(index) === "~" ? name.slice(index + 1, index + 5) : "";
    if (ESCAPE.test(hex)) {
      id += String.fromCharCode(Number.parseInt(hex, 16));
      index += 4;
      continue;
    }
    id += name.charAt(index);
  }
  return id;
}
export {
  sessionDirectoryName,
  sessionIdFromDirectoryName
};
