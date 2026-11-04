export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

export function svgIcon(symbolId) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${symbolId}`);
  svg.appendChild(use);
  return svg;
}

export function debounce(fn, wait = 300) {
  let timer = 0;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.flush = (...args) => {
    clearTimeout(timer);
    fn(...args);
  };
  return wrapped;
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '').replace(/^[a-z]+:\/\//i, '').split('/')[0];
  }
}

export function faviconUrl(url, size = 64) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`
      );
    }
  } catch {
    /* 非扩展环境下忽略 */
  }
  return null;
}

function hashHue(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export function letterNode(label) {
  const text = String(label || '?').trim();
  const node = el('div', 'letter', text.charAt(0) || '?');
  node.style.background = `linear-gradient(140deg, hsl(${hashHue(text)}, 52%, 48%), hsl(${(hashHue(text) + 32) % 360}, 56%, 38%))`;
  return node;
}

/**
 * 生成站点图标。
 * mode 为 'letter' 时直接返回网站名首字块，不发起 favicon 请求，加载更快。
 * 取不到图标时也回退为彩色首字母块。
 */
export function faviconImg(url, title, mode = 'favicon') {
  if (mode === 'letter') return letterNode(title || hostOf(url));
  const src = url ? faviconUrl(url, 64) : null;
  if (!src) return letterNode(title || hostOf(url));

  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  img.loading = 'lazy';
  img.src = src;
  img.addEventListener('error', () => {
    const parent = img.parentElement;
    if (!parent) return;
    parent.replaceChildren(letterNode(title || hostOf(url)));
  });
  return img;
}

export function isExtension() {
  return typeof chrome !== 'undefined' && !!chrome.bookmarks;
}
