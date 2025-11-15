import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${RNFS.DocumentDirectoryPath}/sheild_media_cache`;
const INDEX_KEY = 'sheild_media_cache_index_v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface MediaCacheEntry {
  path: string;
  createdAt: number;
}

export type MediaCacheIndex = Record<string, MediaCacheEntry>;

async function ensureCacheDir(): Promise<void> {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    await RNFS.mkdir(CACHE_DIR);
  }
}

async function loadIndex(): Promise<MediaCacheIndex> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MediaCacheIndex;
  } catch (e) {
    console.warn('Failed to load media cache index', e);
    return {};
  }
}

async function saveIndex(index: MediaCacheIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('Failed to save media cache index', e);
  }
}

function buildFileName(url: string): string {
  // Simple hash: strip non-alphanumerics
  const safe = url.replace(/[^a-zA-Z0-9]/g, '_');
  return `${safe}.bin`;
}

export async function getOrDownloadMedia(url: string): Promise<string> {
  await ensureCacheDir();
  const index = await loadIndex();
  const now = Date.now();

  const existing = index[url];
  if (existing) {
    const isFresh = now - existing.createdAt < MAX_AGE_MS;
    const fileExists = await RNFS.exists(existing.path);
    if (isFresh && fileExists) {
      return existing.path;
    }
  }

  const fileName = buildFileName(url);
  const dst = `${CACHE_DIR}/${fileName}`;

  try {
    await RNFS.downloadFile({
      fromUrl: url,
      toFile: dst,
    }).promise;

    index[url] = { path: dst, createdAt: now };
    await saveIndex(index);
    return dst;
  } catch (e) {
    console.warn('Failed to download media for cache, falling back to remote URL', e);
    return url;
  }
}

export async function cleanupOldMedia(): Promise<void> {
  try {
    await ensureCacheDir();
    const index = await loadIndex();
    const now = Date.now();
    let changed = false;

    for (const [url, entry] of Object.entries(index)) {
      if (now - entry.createdAt >= MAX_AGE_MS) {
        try {
          if (await RNFS.exists(entry.path)) {
            await RNFS.unlink(entry.path);
          }
        } catch (e) {
          console.warn('Failed to remove old cached media', e);
        }
        delete index[url];
        changed = true;
      }
    }

    if (changed) {
      await saveIndex(index);
    }
  } catch (e) {
    console.warn('cleanupOldMedia error', e);
  }
}
