import type { Channel, ChannelMode, SendResult, TestDataCounts } from "./types";

/** Sends a test message to the admin's own address. A real implementation calls the server. */
export interface TestMessenger {
  target(): { email: string; phone: string };
  modes(): Record<Channel, ChannelMode>;
  send(channel: Channel): Promise<SendResult>;
}

/** Counts and removes rows and files flagged is_test. */
export interface TestDataStore {
  counts(): Promise<TestDataCounts>;
  deleteAll(): Promise<TestDataCounts>;
}
