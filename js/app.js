import { BACKGROUND_PRESETS, QUOTES, SYSTEM_SHORTCUT_DEFS, shortcutUrl } from './constants.js';
import { loadSettings, saveSettings, loadWallpaper, saveWallpaper, clearWallpaper, cloneSettings } from './store.js';
import { fetchTiles } from './bookmarks.js';
import { createGrid } from './grid.js';
import { createFolderPanel } from './folder-panel.js';
import { createSearch } from './search.js';
import { createSettingsPanel } from './settings-panel.js';
import { debounce, el, svgIcon, isExtension } from './util.js';

const state = {
  settings: null,
  wallpaper: null,
  tiles: [],
};

const dom = {
  page: document.querySelector('.page'),
  bg: document.getElementById('bg'),
  bgDim: document.getElementById('bgDim'),
  gridViewport: document.getElementById('gridViewport'),
  gridTrack: document.getElementById('gridTrack'),
  gridPager: document.getElementById('gridPager'),
  dots: document.getElementById('dots'),
  pagePrev: document.getElementById('pagePrev'),
  pageNext: document.getElementById('pageNext'),
  empty: document.getElementById('emptyState'),
  emptyTitle: document.querySelector('.empty-title'),
  emptyDesc: document.querySelector('.empty-desc'),
  emptyRefresh: document.getElementById('emptyRefresh'),
  clockBlock: document.getElementById('clockBlock'),
  clockLine: document.getElementById('clockLine'),
  clockTime: document.getElementById('clockTime'),
  clockDate: document.getElementById('clockDate'),
  clockQuote: document.getElementById('clockQuote'),
  menuWrap: document.getElementById('menuWrap'),
  menuBtn: document.getElementById('menuBtn'),
  quickMenu: document.getElementById('quickMenu'),
  quickGrid: document.getElementById('quickGrid'),
  quickHint: document.getElementById('quickHint'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
};

const grid = createGrid({
  viewport: dom.gridViewport,
  track: dom.gridTrack,
  onOpen: (tile) => {
    search.closeMenus();
    if (tile.type === 'folder') {
      folderPanel.open(tile);
    } else {
      openUrl(tile.url);
    }
  },
  onReorder: () => refreshBookmarks(),
});

const folderPanel = createFolderPanel({
  onOpen: (tile) => openUrl(tile.url),
  getIconMode: () => state.settings.features.iconMode,
  onReorder: () => refreshBookmarks(),
});

let search = null;
let settingsPanel = null;

function openUrl(url) {
  if (!url) return;
  if (/^(chrome|edge|about):\/\//i.test(url)) {
    if (isExtension()) chrome.tabs.create({ url });
    return;
  }
  if (state.settings.features.openInNewTab && isExtension()) {
    chrome.tabs.create({ url });
    return;
  }
  window.location.href = url;
}

function applyFont() {
  const root = document.documentElement;
  root.style.setProperty('--font-size', `${state.settings.font.size}px`);
  root.style.setProperty('--font-color', state.settings.font.color);
  root.style.setProperty('--label-shadow', state.settings.font.shadow ? '0 1px 6px rgba(0,0,0,.55)' : 'none');
}

function applySearchState() {
  document.body.classList.toggle('no-search', state.settings.search.hidden);
  if (search) search.sync();
}

function applyPositions() {
  const root = document.documentElement;
  root.style.setProperty('--search-y', `${state.settings.search.offsetY}vh`);
  root.style.setProperty('--folder-y', `${state.settings.layout.folderY}vh`);
}

function applyBackground() {
  const config = state.settings.background;
  const bg = dom.bg;
  if (config.type === 'image' && state.wallpaper) {
    bg.style.backgroundImage = `url("${state.wallpaper}")`;
    bg.style.backgroundColor = '#000';
  } else if (config.type === 'color') {
    bg.style.backgroundImage = 'none';
    bg.style.backgroundColor = config.color;
  } else {
    const preset = BACKGROUND_PRESETS.find((item) => item.id === config.preset) || BACKGROUND_PRESETS[0];
    bg.style.backgroundImage = preset.css;
    bg.style.backgroundColor = '#0f1115';
  }
  // 明确设置铺满与居中，避免切换背景后 background 简写重置尺寸
  bg.style.backgroundSize = 'cover';
  bg.style.backgroundPosition = 'center center';
  bg.style.backgroundRepeat = 'no-repeat';
  bg.style.filter = config.blur > 0 ? `blur(${config.blur}px)` : 'none';
  bg.style.transform = config.blur > 0 ? 'scale(1.06)' : 'none';
  dom.bgDim.style.opacity = String(config.dim / 100);
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  dom.clockTime.textContent = `${hours}:${minutes}`;
  dom.clockDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;
  const dayIndex = Math.floor(now.getTime() / 86400000);
  const custom = state.settings.features.quotes;
  const list = Array.isArray(custom) && custom.length ? custom : QUOTES;
  dom.clockQuote.textContent = list[dayIndex % list.length];
}

function applyClock() {
  const { clock, quote } = state.settings.features;
  dom.clockBlock.hidden = !clock && !quote;
  dom.clockLine.hidden = !clock;
  dom.clockQuote.hidden = !quote;
  if (clock || quote) updateClock();
}

let dotNodes = [];
let dotCount = 0;

function renderDots(pages, current) {
  dom.gridPager.hidden = pages <= 1;
  dom.pagePrev.disabled = current <= 0;
  dom.pageNext.disabled = current >= pages - 1;

  if (dotCount !== pages) {
    dom.dots.replaceChildren();
    dotNodes = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < pages; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dot';
      dot.title = `第 ${i + 1} 页`;
      dot.addEventListener('click', () => grid.setPage(i));
      dotNodes.push(dot);
      frag.appendChild(dot);
    }
    dom.dots.appendChild(frag);
    dotCount = pages;
  }

  // 只切换 active 状态，翻页时不再整组重建圆点
  dotNodes.forEach((node, index) => node.classList.toggle('active', index === current));
}

function updateEmpty(query) {
  const hasTiles = grid.getVisibleCount() > 0;
  dom.empty.hidden = hasTiles;
  dom.gridViewport.hidden = !hasTiles;

  if (hasTiles) return;
  const trimmed = String(query || '').trim();
  if (trimmed) {
    dom.emptyTitle.textContent = '没有匹配的书签';
    dom.emptyDesc.textContent = '换个关键词试试，或直接回车搜索网页。';
    dom.emptyRefresh.hidden = true;
  } else {
    dom.emptyTitle.textContent = '还没有可展示的书签';
    dom.emptyDesc.textContent = '把常用网站加入浏览器书签栏，或收藏到书签文件夹里，这里会自动出现。';
    dom.emptyRefresh.hidden = false;
  }
}

async function refreshBookmarks() {
  const tiles = await fetchTiles({
    includeOther: state.settings.features.showOtherBookmarks,
  });
  state.tiles = tiles;
  folderPanel.close();
  grid.setData(tiles);
  updateEmpty('');
}

/** 设置按钮下的系统快捷入口，按设置逐项展示 */
function buildQuickMenu() {
  const config = state.settings.features.systemShortcuts || {};
  const list = SYSTEM_SHORTCUT_DEFS.filter((def) => config[def.key] !== false);
  dom.quickGrid.replaceChildren();

  list.forEach((def) => {
    const btn = el('button', 'quick-item');
    btn.type = 'button';
    btn.title = def.title;
    const icon = el('span', 'quick-icon');
    icon.appendChild(svgIcon(def.sym));
    btn.append(icon, el('span', 'quick-label', def.title));
    btn.addEventListener('click', () => {
      closeQuickMenu();
      openUrl(shortcutUrl(def));
    });
    dom.quickGrid.appendChild(btn);
  });

  dom.quickGrid.hidden = !list.length;
  dom.quickHint.hidden = !!list.length;
}

function openQuickMenu() {
  buildQuickMenu();
  dom.quickMenu.hidden = false;
  dom.menuBtn.setAttribute('aria-expanded', 'true');
}

function closeQuickMenu() {
  dom.quickMenu.hidden = true;
  dom.menuBtn.setAttribute('aria-expanded', 'false');
}

function toggleQuickMenu() {
  if (dom.quickMenu.hidden) openQuickMenu();
  else closeQuickMenu();
}

function applyAll() {
  applyFont();
  applySearchState();
  applyPositions();
  applyBackground();
  applyClock();
  grid.setSettings(state.settings);
}

let lastShowOther = null;

function onSettingsChange() {
  applyFont();
  applySearchState();
  applyPositions();
  applyBackground();
  applyClock();
  grid.setSettings(state.settings);
  updateEmpty('');
  saveSettings(state.settings);
  if (!dom.quickMenu.hidden) buildQuickMenu();

  const showOther = state.settings.features.showOtherBookmarks;
  if (lastShowOther !== null && lastShowOther !== showOther) {
    lastShowOther = showOther;
    refreshBookmarks();
  }
}

async function onWallpaperChange(dataUrl) {
  state.wallpaper = dataUrl;
  state.settings.background.type = 'image';
  await saveWallpaper(dataUrl);
  applyBackground();
  saveSettings(state.settings);
}

async function onRemoveWallpaper() {
  state.wallpaper = null;
  if (state.settings.background.type === 'image') state.settings.background.type = 'preset';
  await clearWallpaper();
  applyBackground();
  saveSettings(state.settings);
}

async function onReset() {
  const defaults = cloneSettings();
  Object.keys(state.settings).forEach((key) => delete state.settings[key]);
  Object.assign(state.settings, defaults);
  await onRemoveWallpaper();
  applyAll();
  updateEmpty('');
  saveSettings(state.settings);
  if (search) search.sync();
  lastShowOther = state.settings.features.showOtherBookmarks;
  refreshBookmarks();
}

function exportConfig() {
  const payload = {
    format: 'bookmark-newtab-config',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: JSON.parse(JSON.stringify(state.settings)),
    wallpaper: state.wallpaper || null,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookmark-newtab-config-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function init() {
  state.settings = await loadSettings();
  state.wallpaper = await loadWallpaper();
  lastShowOther = state.settings.features.showOtherBookmarks;

  search = createSearch({
    getTiles: () => state.tiles,
    getSettings: () => state.settings,
    onOpen: (url) => openUrl(url),
    onEngineChange: () => saveSettings(state.settings),
  });

  settingsPanel = createSettingsPanel({
    getSettings: () => state.settings,
    onChange: onSettingsChange,
    onReset,
    onWallpaperChange,
    onRemoveWallpaper,
    onExport: exportConfig,
  });

  applyAll();
  grid.onPagesChange(renderDots);

  dom.menuBtn.addEventListener('click', () => toggleQuickMenu());
  dom.openSettingsBtn.addEventListener('click', () => {
    closeQuickMenu();
    settingsPanel.open();
  });
  document.addEventListener('click', (event) => {
    if (!dom.quickMenu.hidden && !dom.menuWrap.contains(event.target)) closeQuickMenu();
  });
  dom.pagePrev.addEventListener('click', () => grid.stepPage(-1));
  dom.pageNext.addEventListener('click', () => grid.stepPage(1));
  dom.emptyRefresh.addEventListener('click', () => refreshBookmarks());

  await refreshBookmarks();
  updateEmpty('');

  if (state.settings.search.keepContent) {
    search.restoreQuery();
  }

  window.addEventListener(
    'resize',
    debounce(() => {
      grid.refresh();
      updateEmpty('');
    }, 200)
  );

  document.addEventListener('keydown', (event) => {
    const typing = search.isTyping();
    if (event.key === 'Escape' && !dom.quickMenu.hidden) closeQuickMenu();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!state.settings.search.hidden) search.focus();
      return;
    }
    if (!typing && !folderPanel.isOpen() && !event.ctrlKey && !event.metaKey) {
      if (event.key === 'ArrowRight') grid.stepPage(1);
      if (event.key === 'ArrowLeft') grid.stepPage(-1);
    }
  });

  if (isExtension()) {
    const reload = debounce(() => refreshBookmarks(), 350);
    ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered'].forEach((name) => {
      if (chrome.bookmarks[name]) chrome.bookmarks[name].addListener(reload);
    });
  }

  updateClock();
  setInterval(updateClock, 20000);

  dom.page.classList.add('ready');
}

init();
