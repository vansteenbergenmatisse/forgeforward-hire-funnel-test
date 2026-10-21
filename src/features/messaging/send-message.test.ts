import { describe, expect, it, vi } from "vitest";
import { sendMessage } from "./send-message";

const base = { applicantId: "a1", channel: "whatsapp" as const, phoneE164: "+1555", email: "a@b.co", body: "Hi" };

describe("sendMessage", () => {
  it("link mode saves opened_link and opens the URL", () => {
    const addMessage = vi.fn();
    const open = vi.fn();
    sendMessage({ addMessage }, { ...base, mode: "link" }, open);
    expect(addMessage).toHaveBeenCalledWith("a1", expect.objectContaining({ direction: "out", mode: "link", status: "opened_link" }));
    expect(open).toHaveBeenCalledWith("https://wa.me/1555?text=Hi");
  });
  it("api mode saves sent and opens nothing", () => {
    const addMessage = vi.fn();
    const open = vi.fn();
    sendMessage({ addMessage }, { ...base, mode: "api" }, open);
    expect(addMessage).toHaveBeenCalledWith("a1", expect.objectContaining({ mode: "api", status: "sent" }));
    expect(open).not.toHaveBeenCalled();
  });
});
