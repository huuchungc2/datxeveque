const path = require("path");
const fs = require("fs");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const backendEnv = loadEnvFile(path.join(__dirname, "../backend/.env"));

module.exports = {
  apps: [
    {
      name: "dat-xe-ve-que-api",
      cwd: path.join(__dirname, "../backend"),
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        ...backendEnv,
        NODE_ENV: backendEnv.NODE_ENV || "production",
        PORT: backendEnv.PORT || 4002,
      },
    },
  ],
};
