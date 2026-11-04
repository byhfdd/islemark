import { el, faviconImg, svgIcon, showDragTip, hideDragTip } from './util.js';
import { previewBookmarks, moveBookmarkNode } from './bookmarks.js';

const BASE_ICON = 76;
const LABEL_GAP = 8;

const DROP_CLASSES = ['drop-before', 'drop-after', 'drop-inside'];

export function createGrid({ viewport, track, onOpen, onReorder }) {
  let visibleTiles = [];
  let settings = null;
  let page = 0;
  let pageCount = 1;
  let pagesListener = null;
  let layoutSignature = null;
  let suppressClick = false;
  let dragPayload = null;

  function iconMode() {
    return (settings && settings.features && settings.features.iconMode) || 'favicon';
  }

  function clearDropTargets() {
    track.querySelectorAll('.tile').forEach((node) => node.classList.remove(...DROP_CLASSES));
  }

  function setDropMode(btn, mode) {
    btn.classList.remove(...DROP_CLASSES);
    btn.classList.add(`drop-${mode}`);
  }

  function clearTile(btn) {
    btn.classList.remove(...DROP_CLASSES);
  }

  /**
   * 计算落点：文件夹中部→放入文件夹；普通磁贴左右半边→插到它前面/后面。
   * 使用 anchorId + after 交给 bookmarks 内部重新计算索引，避免依赖可能缺失的 index。
   */
  function dropTargetFor(tile, ratio) {
    const payload = dragPayload;
    if (!payload || tile.system || payload.id === tile.id) return null;
    if (tile.type === 'folder' && ratio > 0.22 && ratio < 0.78) {
      return { mode: 'inside', target: { parentId: tile.id } };
    }
    if (tile.fixed) return null;
    const after = ratio >= 0.5;
    return {
      mode: after ? 'after' : 'before',
      target: { parentId: tile.parentId, anchorId: tile.id, after },
    };
  }

  async function commitDrop(id, target) {
    if (!id || !target || !target.parentId) return;
    const ok = await moveBookmarkNode(id, target);
    clearDropTargets();
    hideDragTip();
    if (ok && onReorder) await onReorder();
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
    if (tile.sym) {
      icon.classList.add('system');
      icon.appendChild(svgIcon(tile.sym));
    } else if (tile.type === 'folder') {
      const preview = el('div', 'folder-preview');
      const items = previewBookmarks(tile.children, 4);
      for (let i = 0; i < 4; i += 1) {
        const cell = el('div', items[i] ? 'mini' : 'mini empty');
        if (items[i]) {
          cell.appendChild(
            items[i].sym ? svgIcon(items[i].sym) : faviconImg(items[i].url, items[i].title, iconMode())
          );
        }
        preview.appendChild(cell);
      }
      icon.appendChild(preview);
    } else {
      icon.appendChild(faviconImg(tile.url, tile.title, iconMode()));
    }

    const label = el('span', 'tile-label', tile.title);
    btn.append(icon, label);

    if (!tile.fixed && !tile.system) {
      btn.draggable = true;
      btn.addEventListener('dragstart', (event) => {
        dragPayload = {
          id: tile.id,
          type: tile.type,
          parentId: tile.parentId || '',
        };
        btn.classList.add('dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          try {
            event.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
          } catch {
            /* 忽略剪贴板限制 */
          }
        }
      });
      btn.addEventListener('dragend', () => {
        btn.classList.remove('dragging');
        clearDropTargets();
        hideDragTip();
        dragPayload = null;
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      });
      btn.addEventListener('dragover', (event) => {
        if (!dragPayload) return;
        const rect = btn.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / (rect.width || 1);
        const hit = dropTargetFor(tile, ratio);
        if (!hit) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        setDropMode(btn, hit.mode);
        const tip =
          hit.mode === 'inside'
            ? `移入「${tile.title}」`
            : `移到「${tile.title}」${hit.mode === 'after' ? '后' : '前'}`;
        showDragTip(tip, event.clientX, event.clientY);
      });
      btn.addEventListener('dragleave', (event) => {
        if (btn.contains(event.relatedTarget)) return;
        clearTile(btn);
        hideDragTip();
      });
      btn.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = btn.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / (rect.width || 1);
        const payload = dragPayload;
        clearTile(btn);
        hideDragTip();
        if (!payload) return;
        const hit = dropTargetFor(tile, ratio);
        if (!hit) return;
        commitDrop(payload.id, hit.target);
      });
    }

    return btn;
  }

  function emitPages() {
    if (pagesListener) pagesListener(pageCount, page);
  }

  /** 统一用 translate3d 走 GPU 合成，避免翻页时整页重排 */
  function applyTransform(offsetPercent = page * 100) {
    track.style.transform = `translate3d(-${offsetPercent}%, 0, 0)`;
  }

  let pagingTimer = 0;

  function setPage(index) {
    if (!pageCount) return;
    page = Math.max(0, Math.min(index, pageCount - 1));
    track.classList.add('paging');
    applyTransform();
    clearTimeout(pagingTimer);
    pagingTimer = setTimeout(() => track.classList.remove('paging'), 400);
    emitPages();
  }

  function render() {
    applyLayout();
    const capacity = Math.max(1, settings.layout.rows * settings.layout.cols);
    pageCount = visibleTiles.length ? Math.ceil(visibleTiles.length / capacity) : 0;
    page = pageCount ? Math.min(page, pageCount - 1) : 0;

    track.replaceChildren();
    if (!pageCount) {
      applyTransform(0);
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
    applyTransform();
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
      applyTransform();
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
    if (event.target.closest('.tile')) return;
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
    track.style.transform = `translate3d(${base + dx}px, 0, 0)`;
  });

  viewport.addEventListener('pointerup', () => endDrag(false));
  viewport.addEventListener('pointercancel', () => endDrag(true));

  // 拖到空白区域：移到书签栏末尾
  viewport.addEventListener('dragover', (event) => {
    if (!dragPayload || event.target.closest('.tile')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    showDragTip('移到书签栏末尾', event.clientX, event.clientY);
  });
  viewport.addEventListener('dragleave', (event) => {
    if (event.relatedTarget && viewport.contains(event.relatedTarget)) return;
    hideDragTip();
  });
  viewport.addEventListener('drop', (event) => {
    if (!dragPayload || event.target.closest('.tile')) return;
    event.preventDefault();
    const id = dragPayload.id;
    hideDragTip();
    commitDrop(id, { parentId: '1' });
  });

  return {
    setSettings(next) {
      settings = next;
      // 设置对象是原地修改的，用签名比较判断是否需要重建页面
      const signature = `${next.layout.rows}|${next.layout.cols}|${next.features.iconMode}`;
      if (signature !== layoutSignature) {
        layoutSignature = signature;
        render();
      } else {
        applyLayout();
      }
    },
    setData(tiles) {
      visibleTiles = tiles || [];
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
