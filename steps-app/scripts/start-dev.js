/**
 * Starts Metro for the development build on this Windows machine, working
 * around three things that each independently stop the phone from loading.
 *
 * Run it with `npm run dev`.
 *
 * Expo Go is no longer an option: iOS only ever serves the newest Expo Go,
 * that build moved to SDK 57, and this project is pinned to 54 while a
 * submission sits in App Store review. The development build is compiled from
 * this project, so its SDK always matches.
 *
 * 1. NordVPN installs virtual adapters (NordLynx on 10.5.x, OpenVPN on
 *    10.100.x) that Expo's auto-detection happily picks over the real WiFi
 *    card, advertising an address the phone cannot reach. We find the WiFi
 *    interface by name and pin REACT_NATIVE_PACKAGER_HOSTNAME to it.
 *
 * 2. `--dev-client` is explicit rather than inferred. Metro serves a different
 *    URL for each client, and pointing the development build at an Expo Go
 *    server is what produces "no development servers found" on the launcher.
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

console.log("Scan the QR below with the Camera app — it opens the Steps dev build.\n");

spawn("npx", ["expo", "start", "--dev-client", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
}).on("exit", (code) => process.exit(code ?? 0));
