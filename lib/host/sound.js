// packages/contracts/src/sound.ts
var SOUND_POP = "pop";
var SOUND_TINK = "tink";
var SOUND_NAMES = [SOUND_POP, SOUND_TINK];
var SOUND_LEVEL_OFF = "off";
var SOUND_LEVEL_SOFT = "soft";
var SOUND_LEVEL_CLEAR = "clear";
var SOUND_GAIN = {
  [SOUND_LEVEL_OFF]: 0,
  [SOUND_LEVEL_SOFT]: 0.2,
  [SOUND_LEVEL_CLEAR]: 0.55
};

// packages/host/src/sound.ts
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
var PLAYER = "/usr/bin/afplay";
var DIRECTORY = "/System/Library/Sounds";
var FILES = {
  [SOUND_POP]: "Pop.aiff",
  [SOUND_TINK]: "Tink.aiff"
};
var VOLUME_MIN = 0.02;
var VOLUME_MAX = 1;
function playable() {
  return process.platform === "darwin" && existsSync(PLAYER) && SOUND_NAMES.every((name) => existsSync(join(DIRECTORY, FILES[name])));
}
function soundCapability() {
  return playable() ? { ok: true, playback: "system", sounds: [...SOUND_NAMES] } : { ok: true, playback: "browser", sounds: [] };
}
function isSoundName(value) {
  return typeof value === "string" && SOUND_NAMES.includes(value);
}
function clampSoundVolume(value) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, number));
}
function playSystemSound(name, volume) {
  return new Promise((resolve, reject) => {
    const child = spawn(PLAYER, ["-v", volume.toFixed(2), join(DIRECTORY, FILES[name])], { stdio: "ignore" });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}
export {
  clampSoundVolume,
  isSoundName,
  playSystemSound,
  soundCapability
};
