import { describe, it, expect, beforeEach } from "vitest";

import { createLessonCache } from "../cache";

describe("lesson cache", () => {
  let parseCount: number;

  beforeEach(() => {
    parseCount = 0;
  });

  async function fakeLoad() {
    parseCount += 1;
    return { value: "parsed", contentHash: "hash-v1" };
  }

  it("returns cached value on second call when hash matches", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>();
    const a = await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    const b = await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    expect(a).toEqual(b);
    expect(parseCount).toBe(1);
  });

  it("reloads when hash differs", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>();
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    await cache.getOrLoad("slug-a", "hash-v2", fakeLoad);
    expect(parseCount).toBe(2);
  });

  it("caches per slug independently", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>();
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    await cache.getOrLoad("slug-b", "hash-v1", fakeLoad);
    expect(parseCount).toBe(2);
  });

  it("bypass mode always calls loader", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>({
      bypass: true,
    });
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    expect(parseCount).toBe(2);
  });
});
