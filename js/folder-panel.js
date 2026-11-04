import { el, faviconImg, svgIcon } from './util.js';

const ITEM_WIDTH = 92;
const ROW_HEIGHT = 116;
const PANEL_CHROME = 150;

export function createFolderPanel({ onOpen, getIconMode }) {
  const panel = document.getElementById('folderPanel');
  const scrim = document.getElementById('folderScrim');
  const titleEl = document.getElementById('folderTitle');
  const bodyEl = document.getElementById('folderBody');
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

  function iconMode() {
    return (getIconMode && getIconMode()) || 'favicon';
  }

  /** 弹层固定在屏幕中央，只限制最大高度 */
  function place() {
    const maxHeight = Math.max(260, Math.min(window.innerHeight * 0.78, window.innerHeight - 56));
    panel.style.maxHeight = `${maxHeight}px`;
  }

  /** 每页容量按面板宽度与可用高度计算，超出即翻页而不是滚动 */
  function computeCapacity() {
    const width = panel.clientWidth || 720;
    const cols = Math.max(3, Math.floor((width - 44) / ITEM_WIDTH));
    const maxHeight = parseFloat(panel.style.maxHeight) || window.innerHeight * 0.72;
    const available = Math.max(150, maxHeight - PANEL_CHROME);
    const rows = Math.max(1, Math.min(5, Math.floor(available / ROW_HEIGHT)));
    bodyEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    capacity = cols * rows;
  }

  function renderPager() {
    pager.hidden = pages <= 1;
    pageInfo.textContent = `${page + 1} / ${pages}`;
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= pages - 1;
  }

  function render() {
    const folder = stack[stack.length - 1];
    if (!folder) return;
    titleEl.textContent = folder.title;
    backBtn.hidden = stack.length <= 1;
    bodyEl.replaceChildren();
    bodyEl.scrollTop = 0;

    computeCapacity();
    const children = folder.children || [];
    pages = Math.max(1, Math.ceil(children.length / capacity));
    page = Math.min(page, pages - 1);

    if (!children.length) {
      bodyEl.appendChild(el('div', 'folder-empty', '这个文件夹还没有书签'));
      pages = 1;
      renderPager();
      return;
    }

    children.slice(page * capacity, page * capacity + capacity).forEach((child) => {
      const btn = el('button', 'fp-item');
      btn.type = 'button';
      btn.title = child.title;

      const icon = el('div', child.type === 'folder' ? 'fp-icon is-folder' : 'fp-icon');
      icon.appendChild(
        child.type === 'folder' ? svgIcon('i-folder') : faviconImg(child.url, child.title, iconMode())
      );

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
      bodyEl.appendChild(btn);
    });

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
  prevBtn.addEventListener('click', () => {
    if (page <= 0) return;
    page -= 1;
    render();
  });
  nextBtn.addEventListener('click', () => {
    if (page >= pages - 1) return;
    page += 1;
    render();
  });
  backBtn.addEventListener('click', () => {
    if (stack.length <= 1) return;
    stack.pop();
    page = 0;
    render();
  });

  // ---------- 鼠标 / 触摸拖拽翻页 ----------
  const DRAG_LIMIT = 10;
  const SWIPE_THRESHOLD = 50;
  let swipe = null;

  function resetTransform() {
    bodyEl.style.transition = 'transform 0.22s ease';
    bodyEl.style.transform = 'translateX(0)';
  }

  function endSwipe(cancelled) {
    if (!swipe) return;
    const { dx, moved, pointerId } = swipe;
    swipe = null;
    if (bodyEl.hasPointerCapture && bodyEl.hasPointerCapture(pointerId)) {
      bodyEl.releasePointerCapture(pointerId);
    }
    resetTransform();
    if (cancelled || !moved) return;

    skipClick = true;
    setTimeout(() => { skipClick = false; }, 0);

    if (dx <= -SWIPE_THRESHOLD && page < pages - 1) {
      page += 1;
      render();
    } else if (dx >= SWIPE_THRESHOLD && page > 0) {
      page -= 1;
      render();
    }
  }

  bodyEl.addEventListener('pointerdown', (event) => {
    if (pages <= 1 || event.button !== 0) return;
    swipe = { x: event.clientX, y: event.clientY, dx: 0, moved: false, pointerId: event.pointerId };
    bodyEl.style.transition = 'none';
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
    bodyEl.style.transform = `translateX(${offset}px)`;
  });

  bodyEl.addEventListener('pointerup', () => endSwipe(false));
  bodyEl.addEventListener('pointercancel', () => endSwipe(true));

  document.addEventListener('keydown', (event) => {
    if (!opened) return;
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowRight' && page < pages - 1) {
      page += 1;
      render();
    } else if (event.key === 'ArrowLeft' && page > 0) {
      page -= 1;
      render();
    }
  });

  window.addEventListener('resize', () => {
    if (!opened) return;
    place();
    render();
  });

  return { open, close, isOpen: () => opened };
}
