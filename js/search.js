import { findBookmarks } from './bookmarks.js';
import { el, hostOf, faviconImg, svgIcon, debounce } from './util.js';
import { loadLastQuery, saveLastQuery } from './store.js';

export function createSearch({ getTiles, getSettings, onOpen, onEngineChange }) {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const area = document.getElementById('searchArea');
  const engineBtn = document.getElementById('engineBtn');
  const badge = document.getElementById('engineBadge');
  const suggestBox = document.getElementById('suggestBox');

  let settings = getSettings();
  let items = [];
  let activeIndex = -1;
  let engineMenu = null;

  const persistQuery = debounce((value) => {
    if (settings.search.keepContent) saveLastQuery(value);
    else saveLastQuery('');
  }, 250);

  function currentEngine() {
    const list = settings.engines || [];
    return list.find((engine) => engine.id === settings.engine) || list[0] || {
      id: 'bing',
      name: 'Bing',
      badge: 'b',
      cls: 'bing',
      urlTemplate: 'https://www.bing.com/search?q={q}',
    };
  }

  function engineUrl(engine, query) {
    const template = engine.urlTemplate || 'https://www.bing.com/search?q={q}';
    if (template.includes('{q}')) return template.replace('{q}', encodeURIComponent(query));
    return `${template}${encodeURIComponent(query)}`;
  }

  function sync() {
    settings = getSettings();
    const engine = currentEngine();
    badge.textContent = engine.badge || engine.name.charAt(0);
    badge.className = `engine-badge ${engine.cls || 'custom'}`;
    input.placeholder = '输入并搜索';
    suggestBox.hidden = true;
    document.body.classList.toggle('hide-submit', settings.search.hideButton);
    document.body.classList.toggle('hide-engine', settings.search.hideCategory);
    document.documentElement.style.setProperty('--search-scale', settings.search.size / 100);
  }

  function closeSuggest() {
    suggestBox.hidden = true;
    suggestBox.replaceChildren();
    items = [];
    activeIndex = -1;
  }

  function closeEngineMenu() {
    if (engineMenu) {
      engineMenu.remove();
      engineMenu = null;
    }
  }

  function closeMenus() {
    closeSuggest();
    closeEngineMenu();
  }

  function setActive(index) {
    const nodes = Array.from(suggestBox.querySelectorAll('.suggest-item'));
    activeIndex = index;
    nodes.forEach((node, i) => node.classList.toggle('active', i === index));
    if (index >= 0 && nodes[index]) nodes[index].scrollIntoView({ block: 'nearest' });
  }

  function renderSuggestions() {
    suggestBox.replaceChildren();
    if (!items.length) {
      closeSuggest();
      return;
    }

    items.forEach((item, index) => {
      const row = el('div', item.kind === 'search' ? 'suggest-item is-search' : 'suggest-item');

      const fav = el('div', 'suggest-fav');
      if (item.kind === 'search') {
        fav.appendChild(svgIcon('i-search'));
      } else {
        fav.appendChild(faviconImg(item.data.url, item.data.title, settings.features.iconMode));
      }

      const main = el('div', 'suggest-main');
      const title = el(
        'div',
        'suggest-title',
        item.kind === 'search' ? `在 ${currentEngine().name} 中搜索 “${item.query}”` : item.data.title
      );
      main.appendChild(title);
      if (item.kind !== 'search') {
        const sub = item.data.path ? `${item.data.path} · ${hostOf(item.data.url)}` : hostOf(item.data.url);
        main.appendChild(el('div', 'suggest-host', sub));
      }

      row.append(fav, main);
      row.addEventListener('mouseenter', () => setActive(index));
      row.addEventListener('click', () => choose(index));
      suggestBox.appendChild(row);
    });

    suggestBox.hidden = false;
    setActive(activeIndex);
  }

  function buildSuggestions(rawQuery) {
    const query = rawQuery.trim();
    activeIndex = -1;
    if (!query) {
      closeSuggest();
      return;
    }
    const matches = findBookmarks(getTiles(), query, 8);
    items = matches.map((bookmark) => ({ kind: 'bookmark', data: bookmark }));
    items.push({ kind: 'search', query });
    renderSuggestions();
  }

  function goSearch() {
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }
    window.location.href = engineUrl(currentEngine(), query);
  }

  function choose(index) {
    const item = items[index];
    if (!item) return;
    if (item.kind === 'bookmark') {
      const url = item.data.url;
      closeMenus();
      onOpen(url);
    } else {
      goSearch();
    }
  }

  function buildEngineMenu() {
    closeEngineMenu();
    const menu = el('div', 'engine-menu');
    (settings.engines || []).forEach((engine) => {
      const btn = el('button', engine.id === settings.engine ? 'engine-item active' : 'engine-item');
      btn.type = 'button';
      const dot = el('span', `engine-badge ${engine.cls || 'custom'}`, engine.badge || engine.name.charAt(0));
      btn.append(dot, el('span', '', engine.name));
      btn.addEventListener('click', () => {
        settings.engine = engine.id;
        if (onEngineChange) onEngineChange(engine.id);
        sync();
        closeEngineMenu();
        closeSuggest();
        input.focus();
      });
      menu.appendChild(btn);
    });
    area.appendChild(menu);
    engineMenu = menu;
  }

  input.addEventListener('input', () => {
    if (settings.search.suggestions) buildSuggestions(input.value);
    else closeSuggest();
    persistQuery(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestBox.hidden) buildSuggestions(input.value);
      setActive(activeIndex + 1 >= items.length ? 0 : activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1 < 0 ? items.length - 1 : activeIndex - 1);
    } else if (event.key === 'Escape') {
      closeSuggest();
      closeEngineMenu();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!suggestBox.hidden && activeIndex >= 0) {
      choose(activeIndex);
      return;
    }
    const query = input.value.trim();
    if (query) goSearch();
  });

  engineBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (engineMenu) closeEngineMenu();
    else buildEngineMenu();
  });

  document.addEventListener('click', (event) => {
    if (engineMenu && !engineMenu.contains(event.target) && !engineBtn.contains(event.target)) {
      closeEngineMenu();
    }
    if (!suggestBox.hidden && !area.contains(event.target)) {
      closeSuggest();
    }
  });

  async function restoreQuery() {
    if (!settings.search.keepContent) return;
    const saved = await loadLastQuery();
    if (!saved) return;
    input.value = saved;
  }

  sync();

  return {
    sync,
    closeMenus,
    restoreQuery,
    clear() {
      input.value = '';
      closeMenus();
      if (settings.search.keepContent) saveLastQuery('');
    },
    focus() {
      input.focus();
      input.select();
    },
    isTyping() {
      return document.activeElement === input;
    },
  };
}
