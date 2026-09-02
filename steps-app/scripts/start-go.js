/**
 * Starts Metro for Expo Go on this Windows machine, working around three
 * things that each independently stop the phone from loading the app.
 *
 * Run it with `npm run go`.
 *
 * 1. NordVPN installs virtual adapters (NordLynx on 10.5.x, OpenVPN on
 *    10.100.x) that Expo's auto-detection happily picks over the real WiFi
 *    card, advertising an address the phone cannot reach. We find the WiFi
 *    interface by name and pin REACT_NATIVE_PACKAGER_HOSTNAME to it.
 *
 * 2. `expo-dev-client` is a dependency, so a plain `expo start` hands out a
 *    `stepsapp://` link — which iOS routes to the *installed* Steps Academy
 *    app instead of Expo Go, so you sit there looking at a frozen build
 *    wondering why your edits never show up. `--go` forces the `exp://` URL.
 *
 * 3. `runtimeVersion: {policy: "fingerprint"}` makes Metro shell out to
 *    expo-updates on every manifest request, and that spawn dies here with a
 *    Windows DLL-init failure (0xC0000142), so every request 500s. The same
 *    command works fine run normally — so we run it once ourselves and hand
 *    the answer over in EXPO_UPDATES_FINGERPRINT_OVERRIDE, which expo-updates
 *    uses verbatim instead of spawning anything.
 */
const { execFileSync, spawn } = require("child_process");
const os = require("os");
const path = require("path");

/** The real WiFi card, never a VPN adapter. */
function findWifiAddress() {
  const interfaces = os.networkInterfaces();
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!/wi-?fi|wireless/i.test(name)) continue;
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
}

/**
 * Computed here rather than by Metro, because here it works. Failing to get it
 * is not fatal — without the override Metro tries for itself, which may well
 * succeed on a machine that does not have this problem.
 */
function resolveFingerprint() {
  const cli = path.join(__dirname, "..", "node_modules", "expo-updates", "bin", "cli.js");
  try {
    const output = execFileSync(process.execPath, [cli, "runtimeversion:resolve", "--platform", "ios"], {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(output).runtimeVersion ?? null;
  } catch {
    return null;
  }
}

const host = findWifiAddress();
const fingerprint = resolveFingerprint();

if (host) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
  console.log(`WiFi address:  ${host}`);
} else {
  console.warn("Could not find a WiFi adapter — letting Expo guess, which may pick a VPN adapter.");
}

if (fingerprint) {
  process.env.EXPO_UPDATES_FINGERPRINT_OVERRIDE = fingerprint;
  console.log(`Runtime:       ${fingerprint}`);
}

console.log("Scan the QR below with the Camera app — it should open Expo Go.\n");

spawn("npx", ["expo", "start", "--go", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
}).on("exit", (code) => process.exit(code ?? 0));
