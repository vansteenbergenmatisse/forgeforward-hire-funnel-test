const MOCK_PREFIXES = ["mock://", "/__mock-upload/"];
const MOCK_FAIL_PREFIX = "/__mock-upload/fail/";
let mockPutCalls = 0;

function simulateFailure(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("sim") === "fail-upload";
  } catch {
    return false;
  }
}

/** Timed fake progress for mock:// URLs. With ?sim=fail-upload the first 2 attempts fail. */
function mockPut(url: string, onProgress: (fraction: number) => void): Promise<void> {
  const attempt = ++mockPutCalls;
  const shouldFail = (url.startsWith(MOCK_FAIL_PREFIX) || simulateFailure()) && attempt <= 2;
  return new Promise((resolve, reject) => {
    let step = 0;
    const steps = 10;
    const timer = setInterval(() => {
      step++;
      if (shouldFail && step === 5) {
        clearInterval(timer);
        reject(new Error("Simulated upload failure"));
        return;
      }
      onProgress(step / steps);
      if (step >= steps) {
        clearInterval(timer);
        resolve();
      }
    }, 120);
  });
}

/** An upload that makes no progress for this long is cut, so the retry can run. */
export const STALL_MS = 45_000;

/** PUT with progress. XMLHttpRequest because fetch cannot report upload progress. */
export function uploadWithProgress(url: string, blob: Blob, mime: string, onProgress: (fraction: number) => void, stallMs = STALL_MS): Promise<void> {
  if (MOCK_PREFIXES.some((p) => url.startsWith(p))) return mockPut(url, onProgress);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    // A stalled socket (tunnel, handover, suspended tab) never fires onerror, so cut it ourselves.
    const arm = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        reject(new Error("Upload stalled")); // first, so the abort event below cannot reject with a vaguer error
        xhr.abort();
      }, stallMs);
    };
    const settle = (fn: () => void) => {
      clearTimeout(watchdog);
      fn();
    };
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (e) => {
      arm();
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        settle(() => {
          onProgress(1);
          resolve();
        });
      } else {
        settle(() => reject(new Error(`Upload failed with status ${xhr.status}`)));
      }
    };
    xhr.onerror = () => settle(() => reject(new Error("Network error during upload")));
    xhr.ontimeout = () => settle(() => reject(new Error("Upload timed out")));
    xhr.onabort = () => settle(() => reject(new Error("Upload aborted")));
    arm();
    xhr.send(blob);
  });
}
