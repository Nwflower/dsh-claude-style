// packages/host/src/hdsl.ts
var HDSL_CONTRACT = "1";
var DSH_LAUNCH_ENVIRONMENT_KEY = "launchEnvironment";
var HDSL_LAYERS = ["process", "user-env"];
function createHdslAccount(ctx) {
  let reading = null;
  const read = () => {
    if (reading !== null) return reading;
    reading = Promise.resolve().then(() => {
      const env = ctx.get(DSH_LAUNCH_ENVIRONMENT_KEY);
      if (typeof env?.getFrom !== "function") return { contract: false };
      const value = (name) => env.getFrom(name, HDSL_LAYERS)?.value;
      if (value("HDSL_ACCOUNT_CONTRACT") !== HDSL_CONTRACT) return { contract: false };
      const skinFile = value("HDSL_ACCOUNT_SKIN_FILE");
      const hasSkinImage = typeof skinFile === "string" && skinFile !== "";
      return {
        contract: true,
        name: value("HDSL_ACCOUNT_NAME") ?? null,
        vendor: value("HDSL_ACCOUNT_VENDOR") ?? null,
        kind: value("HDSL_ACCOUNT_KIND") ?? null,
        skin: value("HDSL_ACCOUNT_SKIN") ?? "default",
        skinModel: value("HDSL_ACCOUNT_SKIN_MODEL") ?? "default",
        hasSkinImage,
        skinFile: hasSkinImage ? skinFile : null
      };
    });
    return reading;
  };
  return { read };
}
export {
  createHdslAccount
};
