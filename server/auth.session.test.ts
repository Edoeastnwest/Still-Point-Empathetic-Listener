import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

describe.skipIf(!ENV.appId || !ENV.cookieSecret)("session app binding", () => {
  it("accepts a session minted for this app", async () => {
    const token = await sdk.signSession({ openId: "test-user", appId: ENV.appId, name: "Test User" });
    await expect(sdk.verifySession(token)).resolves.toMatchObject({ openId: "test-user", appId: ENV.appId });
  });

  it("accepts users whose display name is empty", async () => {
    const token = await sdk.signSession({ openId: "test-user", appId: ENV.appId, name: "" });
    await expect(sdk.verifySession(token)).resolves.toMatchObject({ openId: "test-user", name: "" });
  });

  it("rejects a session minted for a different app", async () => {
    const token = await sdk.signSession({ openId: "test-user", appId: "another-app", name: "Test User" });
    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });
});
