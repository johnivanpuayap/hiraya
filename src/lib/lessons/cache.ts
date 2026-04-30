export interface LessonCacheOptions {
  bypass?: boolean;
}

export interface LessonCache<T extends { contentHash: string }> {
  getOrLoad(
    slug: string,
    currentHash: string,
    loader: () => Promise<T>,
  ): Promise<T>;
}

export function createLessonCache<T extends { contentHash: string }>(
  options: LessonCacheOptions = {},
): LessonCache<T> {
  const map = new Map<string, T>();

  return {
    async getOrLoad(slug, currentHash, loader) {
      if (options.bypass) {
        return loader();
      }
      const cached = map.get(slug);
      if (cached && cached.contentHash === currentHash) {
        return cached;
      }
      const fresh = await loader();
      map.set(slug, fresh);
      return fresh;
    },
  };
}

/**
 * Determine whether the current runtime should bypass the cache.
 * Development bypasses so edits show up without restart.
 */
export function shouldBypassCache(): boolean {
  return process.env.NODE_ENV === "development";
}
