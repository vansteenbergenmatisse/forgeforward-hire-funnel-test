export {};
declare global {
  interface Window {
    __funnelMock?: { applicants: number; tasks: number; skips: number; videos: number };
  }
}
