const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function stamp() {
  const d = new Date();
  return [
    d.getFullYear(),
    pad2(d.getMonth() + 1),
    pad2(d.getDate()),
    "-",
    pad2(d.getHours()),
    pad2(d.getMinutes()),
    pad2(d.getSeconds()),
  ].join("");
}

const repoRoot = path.resolve(__dirname, "..");
const logsDir = path.join(repoRoot, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const logPath = path.join(logsDir, `run-${stamp()}.log`);
const out = fs.createWriteStream(logPath, { flags: "a" });

const electronBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron.cmd" : "electron"
);

const args = [
  ".",
  "--enable-logging",
  "--v=1",
  "--log-file=" + logPath,
];

const spawnCmd = process.platform === "win32";
const child = spawn(
  spawnCmd ? "cmd.exe" : electronBin,
  spawnCmd ? ["/c", electronBin, ...args] : args,
  {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: "1",
    },
  }
);

function tee(data) {
  try {
    out.write(data);
  } catch (_) {}
  try {
    process.stdout.write(data);
  } catch (_) {}
}

child.stdout.on("data", tee);
child.stderr.on("data", tee);
child.on("exit", (code) => {
  out.end();
  process.exit(code ?? 0);
});

console.log(`[start:log] Logging to ${logPath}`);
