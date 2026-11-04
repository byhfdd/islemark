import { el, faviconImg, svgIcon } from './util.js';

export function createFolderPanel({ onOpen }) {
  const panel = document.getElementById('folderPanel');
  const scrim = document.getElementById('folderScrim');
  const titleEl = document.getElementById('folderTitle');
  const bodyEl = document.getElementById('folderBody');
  const backBtn = document.getElementById('folderBack');

  let stack = [];
  let anchor = null;
  let opened = false;

  function place() {
    if (!anchor) return;
    const width = Math.min(anchor.width, window.innerWidth - 32);
    const left = Math.max(16, Math.min(anchor.left, window.innerWidth - width - 16));
    const top = anchor.bottom + 12;
    panel.style.left = `${left}px`;
    panel.style.width = `${width}px`;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(180, window.innerHeight - top - 32)}px`;
  }

  function render() {
    const folder = stack[stack.length - 1];
    if (!folder) return;
    titleEl.textContent = folder.title;
    backBtn.hidden = stack.length <= 1;
    bodyEl.replaceChildren();

    const children = folder.children || [];
    if (!children.length) {
      bodyEl.appendChild(el('div', 'folder-empty', '这个文件夹还没有书签'));
      return;
    }

    children.forEach((child) => {
      const btn = el('button', 'fp-item');
      btn.type = 'button';
      btn.title = child.title;

      const icon = el('div', child.type === 'folder' ? 'fp-icon is-folder' : 'fp-icon');
      icon.appendChild(child.type === 'folder' ? svgIcon('i-folder') : faviconImg(child.url, child.title));

      const label = el('span', 'fp-label', child.title);
      btn.append(icon, label);
      btn.addEventListener('click', () => {
        if (child.type === 'folder') {
          stack.push(child);
          render();
          bodyEl.scrollTop = 0;
        } else {
          close();
          onOpen(child);
        }
      });
      bodyEl.appendChild(btn);
    });
  }

  function open(folder, rect) {
    if (!folder || !folder.children) return;
    stack = [folder];
    anchor = rect;
    opened = true;
    render();
    place();
    panel.hidden = false;
    scrim.hidden = false;
    bodyEl.scrollTop = 0;
  }

  function close() {
    if (!opened) return;
    opened = false;
    stack = [];
    anchor = null;
    panel.hidden = true;
    scrim.hidden = true;
  }

  scrim.addEventListener('click', close);
  backBtn.addEventListener('click', () => {
    if (stack.length <= 1) return;
    stack.pop();
    render();
    bodyEl.scrollTop = 0;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && opened) {
      event.stopPropagation();
      close();
    }
  });

  window.addEventListener('resize', close);

  return { open, close, isOpen: () => opened };
}
