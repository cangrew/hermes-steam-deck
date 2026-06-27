import { afterEach, describe, expect, it, vi } from "vitest";
import { quitApp } from "./quit";

afterEach(() => vi.restoreAllMocks());

describe("quitApp", () => {
  it("POSTs to the control server's /__exit__ route", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bye", { status: 200 }));
    vi.spyOn(window, "close").mockImplementation(() => {});
    await quitApp();
    expect(fetchMock).toHaveBeenCalledWith("/__exit__", { method: "POST" });
  });

  it("still resolves when the control server isn't present", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no server"));
    vi.spyOn(window, "close").mockImplementation(() => {});
    await expect(quitApp()).resolves.toBeUndefined();
  });
});
