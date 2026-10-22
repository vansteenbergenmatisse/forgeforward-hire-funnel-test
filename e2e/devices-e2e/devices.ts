import { existsSync } from "node:fs";
import { devices, type PlaywrightTestConfig } from "@playwright/test";

type Project = NonNullable<PlaywrightTestConfig["projects"]>[number];
type Use = NonNullable<Project["use"]>;

const chromiumArgs = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"];
const firefoxUserPrefs = { "media.navigator.streams.fake": true, "media.navigator.permission.disabled": true };
const grant = { permissions: ["camera", "microphone"] };

const edgePaths = [
  "/Applications/Microsoft Edge.app",
  "/opt/microsoft/msedge/msedge",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const hasEdge = edgePaths.some((p) => existsSync(p));

const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const WIN_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const LINUX_FF_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";

/** `skipTask` ends on the "Skip task" path (stage New); the others submit the task (stage Did task). */
export type DeviceProject = Project & { metadata: { skipTask: boolean } };

function p(name: string, use: Use, skipTask: boolean): DeviceProject {
  return { name, use, metadata: { skipTask } };
}

const apple = (name: string, descriptor: string, skipTask: boolean) => p(name, { ...devices[descriptor], ...grant }, skipTask);
const android = (name: string, descriptor: string, skipTask: boolean) =>
  p(name, { ...devices[descriptor], ...grant, launchOptions: { args: chromiumArgs } }, skipTask);

export const deviceProjects: DeviceProject[] = [
  apple("iphone-se", "iPhone SE", false),
  apple("iphone-13", "iPhone 13", true),
  apple("iphone-15", "iPhone 15", false),
  apple("iphone-15-pro-max", "iPhone 15 Pro Max", true),
  apple("ipad-pro-11", "iPad Pro 11", false),
  android("pixel-5", "Pixel 5", false),
  android("pixel-7", "Pixel 7", true),
  android("galaxy-s9-plus", "Galaxy S9+", false),
  android("galaxy-tab-s4", "Galaxy Tab S4", true),
  p("mac-chrome-1440", { ...devices["Desktop Chrome"], userAgent: MAC_UA, viewport: { width: 1440, height: 900 }, ...grant, launchOptions: { args: chromiumArgs } }, false),
  p("mac-firefox-1440", { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 }, launchOptions: { firefoxUserPrefs } }, true),
  p("mac-safari-1440", { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 }, ...grant }, false),
  p(
    hasEdge ? "windows-edge-1920" : "windows-chromium-1920",
    {
      ...devices["Desktop Chrome"],
      userAgent: WIN_UA,
      viewport: { width: 1920, height: 1080 },
      ...grant,
      ...(hasEdge ? { channel: "msedge" } : {}),
      launchOptions: { args: chromiumArgs },
    },
    true,
  ),
  p("linux-firefox-1366", { ...devices["Desktop Firefox"], userAgent: LINUX_FF_UA, viewport: { width: 1366, height: 768 }, launchOptions: { firefoxUserPrefs } }, false),
];
