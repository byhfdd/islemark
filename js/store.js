import { DEFAULT_SETTINGS } from './constants.js';

const SETTINGS_KEY = 'settings';
const LOCAL_SETTINGS_KEY = 'bs.settings';
const WALLPAPER_KEY = 'wallpaper';
const LOCAL_WALLPAPER_KEY = 'bs.wallpaper';
const LAST_QUERY_KEY = 'lastQuery';
const LOCAL_LAST_QUERY_KEY = 'bs.lastQuery';

const hasSync = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
const hasLocal = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

/** 用默认值补齐缺失字段，保证旧版本配置也能正常使用 */
function mergeDefaults(base, extra) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!isPlainObject(extra)) return out;
  Object.keys(out).forEach((key) => {
    const baseValue = out[key];
    const extraValue = extra[key];
    if (isPlainObject(baseValue)) {
      out[key] = mergeDefaults(baseValue, extraValue);
    } else if (extraValue !== undefined) {
      out[key] = extraValue;
    }
  });
  return out;
}

async function readKey(key, localKey, area) {
  try {
    if (area) {
      const data = await area.get(key);
      if (data && data[key] != null) return data[key];
      return null;
    }
  } catch {
    /* 忽略存储异常 */
  }
  try {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeKey(key, localKey, value, area) {
  try {
    if (area) {
      await area.set({ [key]: value });
      return;
    }
  } catch {
    /* 忽略存储异常 */
  }
  try {
    if (value == null) localStorage.removeItem(localKey);
    else localStorage.setItem(localKey, JSON.stringify(value));
  } catch {
    /* 忽略存储异常 */
  }
}

export async function loadSettings() {
  const stored = await readKey(SETTINGS_KEY, LOCAL_SETTINGS_KEY, hasSync);
  return mergeDefaults(cloneDefaults(), stored);
}

const persistSettings = debounceAsync(async (value) => {
  await writeKey(SETTINGS_KEY, LOCAL_SETTINGS_KEY, value, hasSync);
}, 350);

export function saveSettings(value) {
  persistSettings(value);
}

export async function loadWallpaper() {
  const stored = await readKey(WALLPAPER_KEY, LOCAL_WALLPAPER_KEY, hasLocal);
  return typeof stored === 'string' ? stored : null;
}

export async function saveWallpaper(dataUrl) {
  await writeKey(WALLPAPER_KEY, LOCAL_WALLPAPER_KEY, dataUrl, hasLocal);
}

export async function clearWallpaper() {
  await writeKey(WALLPAPER_KEY, LOCAL_WALLPAPER_KEY, null, hasLocal);
}

export async function loadLastQuery() {
  const stored = await readKey(LAST_QUERY_KEY, LOCAL_LAST_QUERY_KEY, hasLocal);
  return typeof stored === 'string' ? stored : '';
}

export async function saveLastQuery(query) {
  await writeKey(LAST_QUERY_KEY, LOCAL_LAST_QUERY_KEY, query || null, hasLocal);
}

function debounceAsync(fn, wait) {
  let timer = 0;
  let pending = null;
  return (arg) => {
    pending = arg;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const value = pending;
      pending = null;
      fn(value);
    }, wait);
  };
}

export function cloneSettings() {
  return cloneDefaults();
}
