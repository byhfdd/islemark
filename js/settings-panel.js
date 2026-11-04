import { BACKGROUND_PRESETS, FONT_COLORS, LAYOUT_PRESETS, SYSTEM_SHORTCUT_DEFS } from './constants.js';
import { el, svgIcon, debounce } from './util.js';

export function createSettingsPanel({ getSettings, onChange, onReset, onWallpaperChange, onRemoveWallpaper, onExport }) {
  const drawer = document.getElementById('settingsDrawer');
  const scrim = document.getElementById('drawerScrim');
  const body = document.getElementById('drawerBody');
  const closeBtn = document.getElementById('drawerClose');
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');

  let settings = getSettings();
  let presetCards = [];
  let customCard = null;
  let customLabel = null;

  function commit() {
    onChange();
  }

  function createSection(title) {
    const section = el('section', 'section');
    const head = el('button', 'section-head');
    head.type = 'button';
    head.append(el('span', 'section-title', title), el('span', 'section-minus', '—'));
    const inner = el('div', 'section-body');
    head.addEventListener('click', () => {
      const collapsed = section.classList.toggle('collapsed');
      head.querySelector('.section-minus').textContent = collapsed ? '+' : '—';
    });
    section.append(head, inner);
    body.appendChild(section);
    return inner;
  }

  function createToggle(label, hint, get, set) {
    const row = el('div', 'row');
    const left = el('div', 'row-label');
    left.appendChild(el('span', '', label));
    if (hint) left.appendChild(el('span', 'row-hint', hint));
    const sw = el('button', 'switch');
    sw.type = 'button';

    const sync = () => {
      const on = !!get();
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    sync();
    sw.addEventListener('click', () => {
      set(!get());
      sync();
      commit();
    });
    row.append(left, sw);
    return row;
  }

  function createSlider({ label, min, max, step, unit = '', get, set, after }) {
    const field = el('div', 'field');
    const head = el('div', 'field-head');
    const name = el('span', '', label);
    const value = el('span', 'field-val');
    head.append(name, value);

    const input = el('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);

    const paint = () => {
      const val = Number(input.value);
      value.textContent = `${val}${unit}`;
      const percent = ((val - min) / (max - min)) * 100;
      input.style.background = `linear-gradient(to right, #1d1d1f ${percent}%, #e8e8ec ${percent}%)`;
    };

    input.value = String(get());
    paint();
    input.addEventListener('input', () => {
      set(Number(input.value));
      paint();
      if (after) after();
      commit();
    });

    field.append(head, input);
    return field;
  }

  function createTextarea({ label, hint, placeholder, get, set }) {
    const field = el('div', 'field');
    const head = el('div', 'field-head');
    head.appendChild(el('span', '', label));
    const area = el('textarea', 'text-area');
    area.rows = 4;
    area.placeholder = placeholder || '';
    area.value = get() || '';
    const commitSoon = debounce(commit, 300);
    area.addEventListener('input', () => {
      set(area.value);
      commitSoon();
    });
    field.append(head, area);
    if (hint) field.appendChild(el('p', 'field-hint', hint));
    return field;
  }

  function refreshPresetState() {
    presetCards.forEach(({ id, node }) => {
      node.classList.toggle('active', settings.layoutPreset === id);
    });
    if (customCard) customCard.classList.toggle('active', settings.layoutPreset === 'custom');
    if (customLabel) {
      customLabel.textContent = `自定义(${settings.layout.customRows}×${settings.layout.customCols})`;
    }
  }

  function markCustom() {
    settings.layoutPreset = 'custom';
    refreshPresetState();
  }

  function buildLayoutSection() {
    const inner = createSection('布局');

    const grid = el('div', 'layout-grid');
    LAYOUT_PRESETS.forEach((preset) => {
      const card = el('button', 'preset');
      card.type = 'button';
      const thumb = el('div', 'preset-thumb');
      thumb.style.gridTemplateColumns = `repeat(${preset.cols}, 1fr)`;
      thumb.style.gridTemplateRows = `repeat(${preset.rows}, 1fr)`;
      for (let i = 0; i < preset.rows * preset.cols; i += 1) thumb.appendChild(el('div', 'cell'));
      card.append(thumb, el('span', 'preset-label', `${preset.rows}×${preset.cols}`));
      card.addEventListener('click', () => {
        settings.layout.rows = preset.rows;
        settings.layout.cols = preset.cols;
        settings.layoutPreset = preset.id;
        refreshPresetState();
        const scroll = body.scrollTop;
        commit();
        build();
        body.scrollTop = scroll;
      });
      presetCards.push({ id: preset.id, node: card });
      grid.appendChild(card);
    });

    customCard = el('button', 'preset custom');
    customCard.type = 'button';
    const customThumb = el('div', 'preset-thumb');
    customThumb.appendChild(svgIcon('i-pencil'));
    customLabel = el('span', 'preset-label', `自定义(${settings.layout.customRows}×${settings.layout.customCols})`);
    customCard.append(customThumb, customLabel);
    customCard.addEventListener('click', () => {
      settings.layout.rows = settings.layout.customRows;
      settings.layout.cols = settings.layout.customCols;
      settings.layoutPreset = 'custom';
      const scroll = body.scrollTop;
      commit();
      build();
      body.scrollTop = scroll;
    });
    grid.appendChild(customCard);
    inner.appendChild(grid);
    refreshPresetState();

    inner.appendChild(el('div', 'section-title', '自定义布局')).style.fontSize = '14px';
    inner.lastChild.style.margin = '22px 0 2px';

    inner.appendChild(
      createSlider({
        label: '行数', min: 1, max: 4, step: 1, unit: '',
        get: () => settings.layout.rows,
        set: (v) => { settings.layout.rows = v; settings.layout.customRows = v; markCustom(); },
      })
    );
    inner.appendChild(
      createSlider({
        label: '列数', min: 4, max: 12, step: 1, unit: '',
        get: () => settings.layout.cols,
        set: (v) => { settings.layout.cols = v; settings.layout.customCols = v; markCustom(); },
      })
    );
    inner.appendChild(
      createSlider({
        label: '列间距', min: 0, max: 100, step: 1, unit: '%',
        get: () => settings.layout.gapX,
        set: (v) => { settings.layout.gapX = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '行间距', min: 0, max: 100, step: 1, unit: '%',
        get: () => settings.layout.gapY,
        set: (v) => { settings.layout.gapY = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '图标大小', min: 50, max: 150, step: 1, unit: '%',
        get: () => settings.layout.iconSize,
        set: (v) => { settings.layout.iconSize = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '图标圆角', min: 0, max: 50, step: 1, unit: '%',
        get: () => settings.layout.radius,
        set: (v) => { settings.layout.radius = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '图标不透明度', min: 50, max: 100, step: 1, unit: '%',
        get: () => settings.layout.opacity,
        set: (v) => { settings.layout.opacity = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '文件夹垂直位置', min: -20, max: 20, step: 1, unit: 'vh',
        get: () => settings.layout.folderY,
        set: (v) => { settings.layout.folderY = v; },
      })
    );
  }

  function buildSearchSection() {
    const inner = createSection('搜索框');
    inner.appendChild(createToggle('隐藏搜索框', null, () => settings.search.hidden, (v) => { settings.search.hidden = v; }));
    inner.appendChild(createToggle('显示搜索建议', null, () => settings.search.suggestions, (v) => { settings.search.suggestions = v; }));
    inner.appendChild(createToggle('保留搜索框内容', null, () => settings.search.keepContent, (v) => { settings.search.keepContent = v; }));
    inner.appendChild(createToggle('隐藏搜索类别', null, () => settings.search.hideCategory, (v) => { settings.search.hideCategory = v; }));
    inner.appendChild(createToggle('隐藏搜索按钮', null, () => settings.search.hideButton, (v) => { settings.search.hideButton = v; }));
    inner.appendChild(
      createSlider({
        label: '搜索框大小', min: 80, max: 200, step: 5, unit: '%',
        get: () => settings.search.size,
        set: (v) => { settings.search.size = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '搜索框距顶部', min: 0, max: 30, step: 1, unit: 'vh',
        get: () => settings.search.offsetY,
        set: (v) => { settings.search.offsetY = v; },
      })
    );
  }

  function buildEngineSection() {
    const inner = createSection('搜索引擎');
    const list = el('div', 'engine-list');
    const formHost = el('div', 'engine-form-host');
    inner.append(list, formHost);

    const closeForm = () => formHost.replaceChildren();

    const renderList = () => {
      list.replaceChildren();
      (settings.engines || []).forEach((engine) => {
        const row = el('div', engine.id === settings.engine ? 'engine-row active' : 'engine-row');
        const dot = el('span', `engine-badge ${engine.cls || 'custom'}`, engine.badge || engine.name.charAt(0));
        const name = el('span', 'engine-name', engine.name);
        const actions = el('div', 'engine-actions');
        if (engine.id === settings.engine) actions.appendChild(el('span', 'engine-current', '使用中'));

        const useBtn = el('button', 'mini-btn small', '使用');
        useBtn.type = 'button';
        useBtn.addEventListener('click', () => {
          settings.engine = engine.id;
          renderList();
          commit();
        });

        const editBtn = el('button', 'icon-btn');
        editBtn.type = 'button';
        editBtn.title = '编辑';
        editBtn.appendChild(svgIcon('i-pencil'));
        editBtn.addEventListener('click', () => openForm(engine));

        actions.append(useBtn, editBtn);

        const delBtn = el('button', 'icon-btn danger');
        delBtn.type = 'button';
        const isLast = (settings.engines || []).length <= 1;
        delBtn.disabled = isLast;
        delBtn.title = isLast ? '至少保留一个搜索引擎' : '删除';
        delBtn.appendChild(svgIcon('i-close'));
        delBtn.addEventListener('click', () => {
          if (isLast) return;
          settings.engines = settings.engines.filter((item) => item.id !== engine.id);
          if (settings.engine === engine.id) settings.engine = settings.engines[0] ? settings.engines[0].id : '';
          closeForm();
          renderList();
          commit();
        });
        actions.appendChild(delBtn);

        row.append(dot, name, actions);
        list.appendChild(row);
      });
    };

    function openForm(engine) {
      formHost.replaceChildren();
      const form = el('div', 'engine-form');
      const title = el('div', 'engine-form-title', engine ? '编辑搜索引擎' : '添加搜索引擎');

      const nameInput = el('input', 'text-input');
      nameInput.type = 'text';
      nameInput.placeholder = '名称，例如 知乎搜索';
      nameInput.value = engine ? engine.name : '';

      const urlInput = el('input', 'text-input');
      urlInput.type = 'text';
      urlInput.placeholder = 'https://www.example.com/search?q={q}';
      urlInput.value = engine ? engine.urlTemplate : '';

      const hint = el('p', 'engine-form-hint', '地址中的 {q} 会被替换为搜索关键词。');
      const error = el('p', 'engine-form-error');

      const actions = el('div', 'engine-form-actions');
      const saveBtn = el('button', 'mini-btn small primary', '保存');
      saveBtn.type = 'button';
      const cancelBtn = el('button', 'mini-btn small', '取消');
      cancelBtn.type = 'button';
      actions.append(saveBtn, cancelBtn);

      saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const template = urlInput.value.trim();
        error.textContent = '';
        if (!name) {
          error.textContent = '请填写名称';
          return;
        }
        if (!/^https?:\/\//i.test(template)) {
          error.textContent = '地址需要以 http:// 或 https:// 开头';
          return;
        }
        if (!template.includes('{q}')) {
          error.textContent = '地址中需要包含 {q} 占位符';
          return;
        }

        if (engine) {
          engine.name = name;
          engine.badge = name.charAt(0);
          engine.urlTemplate = template;
        } else {
          const item = {
            id: `custom-${Date.now()}`,
            name,
            badge: name.charAt(0),
            cls: 'custom',
            urlTemplate: template,
            builtin: false,
          };
          settings.engines.push(item);
          if (!settings.engine) settings.engine = item.id;
        }
        closeForm();
        renderList();
        commit();
      });
      cancelBtn.addEventListener('click', closeForm);

      form.append(title, nameInput, urlInput, hint, error, actions);
      formHost.appendChild(form);
      nameInput.focus();
    }

    const addBtn = el('button', 'mini-btn small add-engine', '+ 添加搜索引擎');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => openForm(null));
    const hint = el('p', 'engine-form-hint', '内置引擎也可以删除，但至少保留一个。');
    inner.insertBefore(hint, formHost);
    inner.insertBefore(addBtn, formHost);
    renderList();
  }

  function buildFontSection() {
    const inner = createSection('字体');
    inner.appendChild(createToggle('字体阴影', null, () => settings.font.shadow, (v) => { settings.font.shadow = v; }));
    inner.appendChild(
      createSlider({
        label: '字体大小', min: 12, max: 24, step: 1, unit: '',
        get: () => settings.font.size,
        set: (v) => { settings.font.size = v; },
      })
    );

    inner.appendChild(el('div', 'field-head', '字体颜色')).style.marginTop = '18px';
    const colors = el('div', 'color-grid');
    const swatches = [];

    const syncSwatches = () => {
      swatches.forEach(({ color, node }) => {
        node.classList.toggle('active', settings.font.color.toLowerCase() === color.toLowerCase());
      });
    };

    FONT_COLORS.forEach((color) => {
      const sw = el('button', 'swatch');
      sw.type = 'button';
      sw.style.background = color;
      sw.title = color;
      sw.addEventListener('click', () => {
        settings.font.color = color;
        syncSwatches();
        commit();
      });
      swatches.push({ color, node: sw });
      colors.appendChild(sw);
    });

    const picker = el('label', 'swatch-picker');
    const pickerInput = el('input');
    pickerInput.type = 'color';
    pickerInput.value = settings.font.color;
    pickerInput.addEventListener('input', () => {
      settings.font.color = pickerInput.value;
      syncSwatches();
      commit();
    });
    picker.appendChild(pickerInput);
    colors.appendChild(picker);
    inner.appendChild(colors);
    syncSwatches();
  }

  function buildBackgroundSection() {
    const inner = createSection('背景');
    const grid = el('div', 'bg-grid');
    const swatches = [];

    const syncSwatches = () => {
      swatches.forEach(({ id, node }) => {
        node.classList.toggle('active', settings.background.type === 'preset' && settings.background.preset === id);
      });
    };

    BACKGROUND_PRESETS.forEach((preset) => {
      const sw = el('button', 'bg-swatch');
      sw.type = 'button';
      sw.style.background = preset.css;
      sw.title = preset.name;
      sw.addEventListener('click', () => {
        settings.background.type = 'preset';
        settings.background.preset = preset.id;
        syncSwatches();
        commit();
      });
      swatches.push({ id: preset.id, node: sw });
      const wrap = el('div', 'bg-item');
      wrap.append(sw, el('span', 'bg-name', preset.name));
      grid.appendChild(wrap);
    });
    inner.appendChild(grid);
    syncSwatches();

    const colorRow = el('div', 'color-input-row');
    colorRow.appendChild(el('span', '', '自定义背景色'));
    const colorInput = el('input');
    colorInput.type = 'color';
    colorInput.value = settings.background.color;
    colorInput.addEventListener('input', () => {
      settings.background.type = 'color';
      settings.background.color = colorInput.value;
      syncSwatches();
      commit();
    });
    colorRow.appendChild(colorInput);
    inner.appendChild(colorRow);

    const actions = el('div', 'bg-actions');
    const uploadBtn = el('button', 'mini-btn');
    uploadBtn.type = 'button';
    uploadBtn.append(svgIcon('i-upload'), el('span', '', '上传本地图片'));

    const removeBtn = el('button', 'mini-btn danger');
    removeBtn.type = 'button';
    removeBtn.append(svgIcon('i-image'), el('span', '', '移除壁纸'));
    actions.append(uploadBtn, removeBtn);
    inner.appendChild(actions);

    const status = el('p', 'bg-status');
    inner.appendChild(status);
    if (settings.background.type === 'image') status.textContent = '当前使用自定义壁纸';

    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    inner.appendChild(fileInput);

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        status.textContent = '图片超过 8MB，请换一张小一点的图片';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        status.textContent = '已应用自定义壁纸';
        onWallpaperChange(String(reader.result));
      };
      reader.onerror = () => {
        status.textContent = '读取图片失败，请重试';
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });

    removeBtn.addEventListener('click', () => {
      onRemoveWallpaper();
      status.textContent = '已移除自定义壁纸';
      syncSwatches();
    });

    inner.appendChild(
      createSlider({
        label: '背景模糊', min: 0, max: 30, step: 1, unit: 'px',
        get: () => settings.background.blur,
        set: (v) => { settings.background.blur = v; },
      })
    );
    inner.appendChild(
      createSlider({
        label: '背景调暗', min: 0, max: 80, step: 1, unit: '%',
        get: () => settings.background.dim,
        set: (v) => { settings.background.dim = v; },
      })
    );
  }

  function buildOtherSection() {
    const inner = createSection('其他');
    inner.appendChild(createToggle('显示时钟与日期', null, () => settings.features.clock, (v) => { settings.features.clock = v; }));
    inner.appendChild(createToggle('显示每日一言', null, () => settings.features.quote, (v) => { settings.features.quote = v; }));

    inner.appendChild(el('div', 'field-head', '快捷入口')).style.marginTop = '20px';
    inner.appendChild(el('p', 'field-hint', '展示在右上角设置按钮下方，按需开启。'));
    SYSTEM_SHORTCUT_DEFS.forEach((def) => {
      inner.appendChild(
        createToggle(
          def.title,
          null,
          () => settings.features.systemShortcuts[def.key] !== false,
          (v) => {
            settings.features.systemShortcuts[def.key] = v;
          }
        )
      );
    });
    inner.appendChild(
      createTextarea({
        label: '每日一言内容',
        hint: '每行一条，留空则使用内置文案。',
        placeholder: '每天换一句，例如：\n慢慢来，比较快。',
        get: () => (settings.features.quotes || []).join('\n'),
        set: (value) => {
          settings.features.quotes = String(value)
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        },
      })
    );
    inner.appendChild(
      createToggle('在新标签页打开书签', '关闭时在当前标签页跳转', () => settings.features.openInNewTab, (v) => {
        settings.features.openInNewTab = v;
      })
    );
    inner.appendChild(
      createToggle('合并“其他书签”文件夹', '显示为一个独立分组', () => settings.features.showOtherBookmarks, (v) => {
        settings.features.showOtherBookmarks = v;
      })
    );
    inner.appendChild(
      createToggle('显示网站图标', '关闭后显示网站名首字，不加载图标资源，打开更快', () => settings.features.iconMode !== 'letter', (v) => {
        settings.features.iconMode = v ? 'favicon' : 'letter';
      })
    );

    const about = el('div', 'about', '设置保存在当前浏览器中，书签每次打开新标签页时自动同步。');
    inner.appendChild(about);
  }

  function build() {
    body.replaceChildren();
    presetCards = [];
    customCard = null;
    customLabel = null;
    settings = getSettings();

    buildLayoutSection();
    buildSearchSection();
    buildEngineSection();
    buildFontSection();
    buildBackgroundSection();
    buildOtherSection();
  }

  function open() {
    build();
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    scrim.hidden = false;
  }

  function close() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    scrim.hidden = true;
  }

  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);
  exportBtn.addEventListener('click', () => {
    if (onExport) onExport();
  });
  resetBtn.addEventListener('click', () => {
    onReset();
    build();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('open')) close();
  });

  return { open, close, refresh: build };
}
