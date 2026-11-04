import { el, faviconImg, svgIcon } from './util.js';
import { moveBookmarkNode } from './bookmarks.js';

const ITEM_WIDTH = 92;
const ITEM_GAP_X = 8;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 780;
const PANEL_PADDING = 44;
const ROW_HEIGHT = 116;
const PANEL_CHROME = 150;

export function createFolderPanel({ onOpen, getIconMode, onReorder }) {
  const panel = document.getElementById('folderPanel');
  const scrim = document.getElementById('folderScrim');
  const titleEl = document.getElementById('folderTitle');
  const bodyEl = document.getElementById('folderBody');
  const trackEl = document.getElementById('folderTrack');
  const backBtn = document.getElementById('folderBack');
  const pager = document.getElementById('folderPager');
  const pageInfo = document.getElementById('folderPageInfo');
  const prevBtn = document.getElementById('folderPrev');
  const nextBtn = document.getElementById('folderNext');

  let stack = [];
  let opened = false;
  let page = 0;
  let pages = 1;
  let capacity = 12;
  let skipClick = false;
  let dragPayload = null;

  function iconMode() {
    return (getIconMode && getIconMode()) || 'favicon';
  }

  function clearItemDrops() {
    bodyEl.querySelectorAll('.fp-item.drop-target').forEach((node) => node.classList.remove('drop-target'));
  }

  function targetFor(child, ratio) {
    const payload = dragPayload;
    if (!payload || child.system || child.fixed || payload.id === child.id) return null;
    if (child.type === 'folder' && ratio > 0.22 && ratio < 0.78) {
      return { parentId: child.id };
    }
    const after = ratio >= 0.5;
    const base = (typeof child.index === 'number' ? child.index : 0) + (after ? 1 : 0);
    const adjust = payload.parentId === child.parentId && payload.index < base ? 1 : 0;
    return { parentId: child.parentId, index: base - adjust };
  }

  async function commitFolderDrop(id, target) {
    if (!id || !target || !target.parentId) return;
    const ok = await moveBookmarkNode(id, target);
    clearItemDrops();
    dragPayload = null;
    if (!ok) return;
    close();
    if (onReorder) await onReorder();
  }

  /** 弹层固定在屏幕中央，只限制最大高度；偏移越大，可用高度越小 */
  function place() {
    const offsetVh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--folder-y')) || 0;
    const shift = (Math.abs(offsetVh) * window.innerHeight) / 100;
    const maxHeight = Math.max(200, Math.min(window.innerHeight * 0.78, window.innerHeight - 56 - shift * 2));
    panel.style.maxHeight = `${maxHeight}px`;
  }

  /** 每页容量按面板宽度与可用高度计算，超出即翻页而不是滚动 */
  function computeCapacity() {
    const folder = stack[stack.length - 1];
    const total = folder && folder.children ? folder.children.length : 0;
    const availWidth = Math.min(MAX_PANEL_WIDTH, window.innerWidth - 32);
    const maxCols = Math.max(3, Math.floor((availWidth - PANEL_PADDING) / (ITEM_WIDTH + ITEM_GAP_X)));
    // 按内容数量选择列数，避免少书签时只铺成很长的一排
    const idealCols = Math.max(3, Math.ceil(Math.sqrt(Math.max(1, total))));
    const cols = Math.min(maxCols, idealCols);
    const desiredWidth = cols * ITEM_WIDTH + (cols - 1) * ITEM_GAP_X + PANEL_PADDING;
    const width = Math.min(availWidth, Math.max(MIN_PANEL_WIDTH, desiredWidth));
    panel.style.width = `${width}px`;

    const maxHeight = parseFloat(panel.style.maxHeight) || window.innerHeight * 0.72;
    const available = Math.max(150, maxHeight - PANEL_CHROME);
    const rows = Math.max(1, Math.min(5, Math.floor(available / ROW_HEIGHT)));
    capacity = cols * rows;
  }

  function renderPager() {
    pager.hidden = pages <= 1;
    pageInfo.textContent = `${page + 1} / ${pages}`;
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= pages - 1;
  }

  /** animate=false 时直接落到目标页，避免打开文件夹时出现滑动 */
  function applyPage(animate) {
    const offset = `translate3d(-${page * 100}%, 0, 0)`;
    if (animate) {
      trackEl.style.transition = '';
      trackEl.style.transform = offset;
      return;
    }
    trackEl.style.transition = 'none';
    trackEl.style.transform = offset;
    void trackEl.offsetWidth;
    trackEl.style.transition = '';
  }

  function setPage(index, animate = true) {
    const next = Math.max(0, Math.min(index, pages - 1));
    page = next;
    applyPage(animate);
    renderPager();
  }

  function render() {
    const folder = stack[stack.length - 1];
    if (!folder) return;
    titleEl.textContent = folder.title;
    backBtn.hidden = stack.length <= 1;
    trackEl.replaceChildren();

    computeCapacity();
    const children = folder.children || [];
    pages = Math.max(1, Math.ceil(children.length / capacity));
    page = Math.min(page, pages - 1);

    if (!children.length) {
      const emptyPage = el('div', 'folder-page');
      emptyPage.appendChild(el('div', 'folder-empty', '这个文件夹还没有书签'));
      trackEl.appendChild(emptyPage);
      pages = 1;
      page = 0;
      applyPage(false);
      renderPager();
      return;
    }

    for (let i = 0; i < pages; i += 1) {
      const pageEl = el('div', 'folder-page');
      children.slice(i * capacity, i * capacity + capacity).forEach((child) => {
      const btn = el('button', 'fp-item');
      btn.type = 'button';
      btn.title = child.title;

      const icon = el('div', child.type === 'folder' ? 'fp-icon is-folder' : 'fp-icon');
      if (child.sym) {
        icon.classList.add('is-system');
        icon.appendChild(svgIcon(child.sym));
      } else {
        icon.appendChild(
          child.type === 'folder' ? svgIcon('i-folder') : faviconImg(child.url, child.title, iconMode())
        );
      }

      const label = el('span', 'fp-label', child.title);
      btn.append(icon, label);
      btn.addEventListener('click', () => {
        if (skipClick) return;
        if (child.type === 'folder') {
          stack.push(child);
          page = 0;
          render();
        } else {
          close();
          onOpen(child);
        }
      });

      if (!child.system && !child.fixed) {
        btn.draggable = true;
        btn.addEventListener('dragstart', (event) => {
          dragPayload = {
            id: child.id,
            type: child.type,
            parentId: child.parentId || '',
            index: typeof child.index === 'number' ? child.index : 0,
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
          clearItemDrops();
          dragPayload = null;
          skipClick = true;
          setTimeout(() => { skipClick = false; }, 0);
        });
        btn.addEventListener('dragover', (event) => {
          if (!dragPayload) return;
          const rect = btn.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / (rect.width || 1);
          if (!targetFor(child, ratio)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          btn.classList.add('drop-target');
        });
        btn.addEventListener('dragleave', (event) => {
          if (btn.contains(event.relatedTarget)) return;
          btn.classList.remove('drop-target');
        });
        btn.addEventListener('drop', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const rect = btn.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / (rect.width || 1);
          const payload = dragPayload;
          btn.classList.remove('drop-target');
          if (!payload) return;
          const target = targetFor(child, ratio);
          if (!target) return;
          commitFolderDrop(payload.id, target);
        });
      }

        pageEl.appendChild(btn);
      });
      trackEl.appendChild(pageEl);
    }

    applyPage(false);
    renderPager();
  }

  function open(folder) {
    if (!folder || !folder.children) return;
    stack = [folder];
    opened = true;
    page = 0;
    panel.hidden = false;
    scrim.hidden = false;
    place();
    render();
  }

  function close() {
    if (!opened) return;
    opened = false;
    stack = [];
    page = 0;
    panel.hidden = true;
    scrim.hidden = true;
    pager.hidden = true;
  }

  scrim.addEventListener('click', close);
  prevBtn.addEventListener('click', () => setPage(page - 1));
  nextBtn.addEventListener('click', () => setPage(page + 1));
  backBtn.addEventListener('click', () => {
    if (stack.length <= 1) return;
    stack.pop();
    page = 0;
    render();
  });

  // 拖到弹层外部：移出当前文件夹，放到书签栏末尾
  scrim.addEventListener('dragover', (event) => {
    if (!dragPayload) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });
  scrim.addEventListener('drop', (event) => {
    if (!dragPayload) return;
    event.preventDefault();
    const id = dragPayload.id;
    commitFolderDrop(id, { parentId: '1' });
  });

  // ---------- 鼠标 / 触摸拖拽翻页 ----------
  const DRAG_LIMIT = 10;
  const SWIPE_THRESHOLD = 50;
  let swipe = null;

  function endSwipe(cancelled) {
    if (!swipe) return;
    const { dx, moved, pointerId } = swipe;
    swipe = null;
    if (bodyEl.hasPointerCapture && bodyEl.hasPointerCapture(pointerId)) {
      bodyEl.releasePointerCapture(pointerId);
    }
    applyPage(true);
    if (cancelled || !moved) return;

    skipClick = true;
    setTimeout(() => { skipClick = false; }, 0);

    if (dx <= -SWIPE_THRESHOLD && page < pages - 1) setPage(page + 1);
    else if (dx >= SWIPE_THRESHOLD && page > 0) setPage(page - 1);
  }

  bodyEl.addEventListener('pointerdown', (event) => {
    if (pages <= 1 || event.button !== 0) return;
    if (event.target.closest('.fp-item')) return;
    swipe = { x: event.clientX, y: event.clientY, dx: 0, moved: false, pointerId: event.pointerId };
    trackEl.style.transition = 'none';
  });

  bodyEl.addEventListener('pointermove', (event) => {
    if (!swipe || event.pointerId !== swipe.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.moved) {
      if (Math.abs(dx) < DRAG_LIMIT || Math.abs(dx) <= Math.abs(dy)) return;
      swipe.moved = true;
      try {
        bodyEl.setPointerCapture(event.pointerId);
      } catch {
        /* 忽略指针捕获失败 */
      }
    }
    if (event.cancelable) event.preventDefault();
    swipe.dx = dx;
    const limit = bodyEl.clientWidth || 400;
    const offset = Math.max(-limit, Math.min(limit, dx)) * 0.35;
    const base = -page * (bodyEl.clientWidth || 0);
    trackEl.style.transform = `translate3d(${base + offset}px, 0, 0)`;
  });

  bodyEl.addEventListener('pointerup', () => endSwipe(false));
  bodyEl.addEventListener('pointercancel', () => endSwipe(true));

  // ---------- 鼠标滚轮翻页 ----------
  let wheelLock = 0;
  panel.addEventListener(
    'wheel',
    (event) => {
      if (!opened || pages <= 1) return;
      event.preventDefault();
      const now = Date.now();
      if (now < wheelLock) return;
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(raw) < 10) return;
      wheelLock = now + 320;
      if (raw > 0) setPage(page + 1);
      else if (raw < 0) setPage(page - 1);
    },
    { passive: false }
  );

  document.addEventListener('keydown', (event) => {
    if (!opened) return;
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowRight') {
      setPage(page + 1);
    } else if (event.key === 'ArrowLeft') {
      setPage(page - 1);
    }
  });

  window.addEventListener('resize', () => {
    if (!opened) return;
    place();
    render();
  });

  return { open, close, place, reflow() { if (opened) { place(); render(); } }, isOpen: () => opened };
}
