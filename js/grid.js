import { el, faviconImg } from './util.js';
import { filterTiles, previewBookmarks } from './bookmarks.js';

const BASE_ICON = 76;
const LABEL_GAP = 8;

export function createGrid({ viewport, track, onOpen }) {
  let allTiles = [];
  let visibleTiles = [];
  let settings = null;
  let page = 0;
  let pageCount = 1;
  let pagesListener = null;
  let suppressClick = false;

  function iconMode() {
    return (settings && settings.features && settings.features.iconMode) || 'favicon';
  }

  function applyLayout() {
    if (!settings) return;
    const L = settings.layout;
    const cols = Math.max(1, L.cols);
    const rows = Math.max(1, L.rows);
    const font = settings.font.size;
    const gapXPct = L.gapX / 100;
    const gapYPct = L.gapY / 100;

    const available = Math.min(window.innerWidth - 96, 1280);
    let icon = BASE_ICON * (L.iconSize / 100);
    const totalWidth = icon * cols + icon * gapXPct * (cols - 1);
    if (totalWidth > available) {
      icon = available / (cols + gapXPct * (cols - 1));
    }

    // 按窗口高度收缩图标，保证一页内容完整显示，不产生纵向滚动
    const rect = viewport.getBoundingClientRect();
    const availableHeight = Math.max(120, window.innerHeight - (rect.top || 260) - 80);
    const labelHeight = LABEL_GAP + font * 1.3;
    const heightIcon = (availableHeight - rows * labelHeight) / (rows + (rows - 1) * gapYPct);
    icon = Math.min(icon, heightIcon);
    icon = Math.max(32, Math.floor(icon));

    const gapX = Math.round(icon * gapXPct);
    const gapY = Math.round(icon * gapYPct);
    const rowHeight = icon + LABEL_GAP + font * 1.3;
    const pageHeight = rows * rowHeight + (rows - 1) * gapY;

    const root = document.documentElement;
    root.style.setProperty('--icon-size', `${icon}px`);
    root.style.setProperty('--gap-x', `${gapX}px`);
    root.style.setProperty('--gap-y', `${gapY}px`);
    root.style.setProperty('--cols', String(cols));
    root.style.setProperty('--page-min-height', `${pageHeight}px`);
    viewport.style.minHeight = `${pageHeight}px`;
  }

  function buildTile(tile) {
    const btn = el('button', tile.type === 'folder' ? 'tile is-folder' : 'tile');
    btn.type = 'button';
    btn.dataset.tileId = tile.id;
    btn.title = tile.title;

    const icon = el('div', 'tile-icon');
    if (tile.type === 'folder') {
      const preview = el('div', 'folder-preview');
      const items = previewBookmarks(tile.children, 4);
      for (let i = 0; i < 4; i += 1) {
        const cell = el('div', items[i] ? 'mini' : 'mini empty');
        if (items[i]) cell.appendChild(faviconImg(items[i].url, items[i].title, iconMode()));
        preview.appendChild(cell);
      }
      icon.appendChild(preview);
    } else {
      icon.appendChild(faviconImg(tile.url, tile.title, iconMode()));
    }

    const label = el('span', 'tile-label', tile.title);
    btn.append(icon, label);
    return btn;
  }

  function emitPages() {
    if (pagesListener) pagesListener(pageCount, page);
  }

  function setPage(index) {
    if (!pageCount) return;
    page = Math.max(0, Math.min(index, pageCount - 1));
    track.style.transform = `translateX(-${page * 100}%)`;
    emitPages();
  }

  function render() {
    applyLayout();
    const capacity = Math.max(1, settings.layout.rows * settings.layout.cols);
    pageCount = visibleTiles.length ? Math.ceil(visibleTiles.length / capacity) : 0;
    page = pageCount ? Math.min(page, pageCount - 1) : 0;

    track.replaceChildren();
    if (!pageCount) {
      track.style.transform = 'translateX(0)';
      emitPages();
      return;
    }

    for (let i = 0; i < pageCount; i += 1) {
      const pageEl = el('div', 'grid-page');
      visibleTiles
        .slice(i * capacity, i * capacity + capacity)
        .forEach((tile) => pageEl.appendChild(buildTile(tile)));
      track.appendChild(pageEl);
    }
    track.style.transform = `translateX(-${page * 100}%)`;
    emitPages();
  }

  track.addEventListener('click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const tileEl = event.target.closest('.tile');
    if (!tileEl) return;
    const tile = visibleTiles.find((item) => item.id === tileEl.dataset.tileId);
    if (tile) onOpen(tile);
  });

  // ---------- 鼠标 / 触摸拖拽翻页 ----------
  const DRAG_LIMIT = 8;
  let drag = null;

  function endDrag(cancelled) {
    if (!drag) return;
    const { dx, moved, pointerId } = drag;
    drag = null;
    viewport.classList.remove('dragging');
    if (viewport.hasPointerCapture && viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    track.style.transition = '';
    if (cancelled || !moved) {
      track.style.transform = `translateX(-${page * 100}%)`;
      return;
    }
    suppressClick = true;
    const threshold = Math.min(80, (viewport.clientWidth || 1) * 0.12);
    if (dx <= -threshold) setPage(page + 1);
    else if (dx >= threshold) setPage(page - 1);
    else setPage(page);
  }

  viewport.addEventListener('pointerdown', (event) => {
    if (pageCount <= 1 || event.button !== 0) return;
    suppressClick = false;
    drag = { x: event.clientX, y: event.clientY, dx: 0, moved: false, pointerId: event.pointerId };
    track.style.transition = 'none';
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_LIMIT || Math.abs(dx) <= Math.abs(dy)) return;
      drag.moved = true;
      viewport.classList.add('dragging');
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        /* 忽略指针捕获失败 */
      }
    }
    if (event.cancelable) event.preventDefault();
    drag.dx = dx;
    const base = -page * (viewport.clientWidth || 0);
    track.style.transform = `translateX(${base + dx}px)`;
  });

  viewport.addEventListener('pointerup', () => endDrag(false));
  viewport.addEventListener('pointercancel', () => endDrag(true));

  return {
    setSettings(next) {
      settings = next;
      applyLayout();
      render();
    },
    setData(tiles) {
      allTiles = tiles || [];
      visibleTiles = allTiles;
      page = 0;
      render();
    },
    setFilter(query) {
      visibleTiles = filterTiles(allTiles, query);
      page = 0;
      render();
    },
    setPage,
    stepPage(delta) {
      setPage(page + delta);
    },
    refresh() {
      render();
    },
    getPage() {
      return page;
    },
    getPageCount() {
      return pageCount;
    },
    getVisibleCount() {
      return visibleTiles.length;
    },
    onPagesChange(callback) {
      pagesListener = callback;
      emitPages();
    },
  };
}
