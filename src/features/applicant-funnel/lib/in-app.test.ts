import { describe, expect, it } from "vitest";
import { buildChromeIntentUrl, detectInAppBrowser, isAndroid } from "./in-app";

describe("detectInAppBrowser", () => {
  it.each([
    "Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/430.0]",
    "Mozilla/5.0 (Linux; Android 13) Instagram 300.0",
    "Mozilla/5.0 musical_ly TikTok 30.0",
    "Mozilla/5.0 Bytedance",
    "Mozilla/5.0 LinkedInApp",
    "Mozilla/5.0 Line/13.0.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Snapchat/12.0",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Pinterest/12.0",
    "Mozilla/5.0 (Linux; Android 13) MicroMessenger/8.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Twitter for iPhone",
    "Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A; wv) AppleWebKit/537.36 Version/4.0 Chrome/120 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  ])("flags %s", (ua) => expect(detectInAppBrowser(ua)).toBe(true));

  it("passes normal browsers", () => {
    expect(detectInAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit Safari/604.1")).toBe(false);
    expect(detectInAppBrowser("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36")).toBe(false);
    expect(detectInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(detectInAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")).toBe(false);
  });
});

describe("buildChromeIntentUrl", () => {
  it("builds an intent link", () => {
    expect(buildChromeIntentUrl("https://hire.example.com/a/setter?utm_source=fb#x")).toBe(
      "intent://hire.example.com/a/setter?utm_source=fb#x#Intent;scheme=https;package=com.android.chrome;end",
    );
  });
  it("rejects other schemes and junk", () => {
    expect(buildChromeIntentUrl("javascript:alert(1)")).toBeNull();
    expect(buildChromeIntentUrl("nope")).toBeNull();
  });
  it("detects android", () => {
    expect(isAndroid("Mozilla/5.0 (Linux; Android 13)")).toBe(true);
    expect(isAndroid("iPhone")).toBe(false);
  });
});
