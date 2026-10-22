import { describe, expect, it } from "vitest";
import { detectDevice } from "./device";

describe("detectDevice", () => {
  it("detects iPhone Safari", () => {
    expect(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1")).toBe("iphone");
  });
  it("detects Android Chrome", () => {
    expect(detectDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36")).toBe("android");
  });
  it("treats a touch-screen Mac user agent as an iPad", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
    expect(detectDevice(mac, 5)).toBe("iphone");
    expect(detectDevice(mac, 0)).toBe("desktop");
  });
  it("falls back to desktop", () => {
    expect(detectDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36")).toBe("desktop");
    expect(detectDevice("")).toBe("desktop");
  });
});
