import { emailConfigured } from "@/platform/email";
import { ghlConfigured } from "@/platform/ghl";
import { whatsappConfigured } from "@/platform/whatsapp";
import { optionalEnv } from "@/shared/env";
import type { Channel, ChannelMode } from "../types";

export function channelModes(): Record<Channel, ChannelMode> {
  return {
    email: emailConfigured() ? "api" : "link",
    whatsapp: whatsappConfigured() ? "api" : "link",
    sms: ghlConfigured() ? "api" : "link",
  };
}

export function testTarget(): { email: string; phone: string } {
  return { email: optionalEnv("TEST_EMAIL") ?? "", phone: optionalEnv("TEST_PHONE") ?? "" };
}
