export const ENGINE_DEFS = [
  {
    id: 'bing',
    name: 'Bing',
    badge: 'b',
    cls: 'bing',
    urlTemplate: 'https://www.bing.com/search?q={q}',
    builtin: true,
  },
  {
    id: 'google',
    name: 'Google',
    badge: 'G',
    cls: 'google',
    urlTemplate: 'https://www.google.com/search?q={q}',
    builtin: true,
  },
  {
    id: 'baidu',
    name: '百度',
    badge: '百',
    cls: 'baidu',
    urlTemplate: 'https://www.baidu.com/s?wd={q}',
    builtin: true,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    badge: 'D',
    cls: 'duckduckgo',
    urlTemplate: 'https://duckduckgo.com/?q={q}',
    builtin: true,
  },
];

export function cloneEngineDefs() {
  return ENGINE_DEFS.map((engine) => ({ ...engine }));
}

export const DEFAULT_SETTINGS = {
  layoutPreset: 'custom',
  layout: {
    rows: 2,
    cols: 8,
    customRows: 2,
    customCols: 8,
    gapX: 0,
    gapY: 0,
    iconSize: 100,
    radius: 25,
    opacity: 100,
  },
  search: {
    hidden: false,
    suggestions: true,
    keepContent: false,
    hideCategory: false,
    hideButton: false,
    size: 150,
  },
  font: {
    shadow: false,
    size: 16,
    color: '#ffffff',
  },
  background: {
    type: 'preset',
    preset: 'noir',
    color: '#14161b',
    dim: 18,
    blur: 0,
  },
  features: {
    clock: true,
    quote: true,
    openInNewTab: false,
    showOtherBookmarks: true,
    iconMode: 'favicon',
    quotes: [],
  },
  engine: 'bing',
  engines: cloneEngineDefs(),
};

export const LAYOUT_PRESETS = [
  { id: '2x4', rows: 2, cols: 4 },
  { id: '2x5', rows: 2, cols: 5 },
  { id: '2x6', rows: 2, cols: 6 },
  { id: '2x7', rows: 2, cols: 7 },
  { id: '3x3', rows: 3, cols: 3 },
];

export const BACKGROUND_PRESETS = [
  {
    id: 'noir',
    name: '午夜',
    css:
      'radial-gradient(1100px 760px at 76% 16%, rgba(108,140,214,.20), transparent 64%),' +
      'radial-gradient(900px 700px at 18% 88%, rgba(120,86,200,.14), transparent 60%),' +
      'linear-gradient(140deg,#0d0f13 0%,#191c23 52%,#0a0b0f 100%)',
  },
  {
    id: 'aurora',
    name: '极光',
    css:
      'radial-gradient(900px 620px at 18% 18%, rgba(66,214,182,.28), transparent 62%),' +
      'radial-gradient(820px 640px at 82% 72%, rgba(124,92,232,.34), transparent 64%),' +
      'linear-gradient(160deg,#080f14,#12202b 55%,#0a1118)',
  },
  {
    id: 'dusk',
    name: '暮色',
    css:
      'radial-gradient(900px 600px at 80% 10%, rgba(240,140,90,.28), transparent 60%),' +
      'linear-gradient(150deg,#241a30 0%,#3a2534 48%,#5a3339 100%)',
  },
  {
    id: 'ocean',
    name: '深海',
    css:
      'radial-gradient(900px 640px at 72% 24%, rgba(48,132,236,.26), transparent 62%),' +
      'linear-gradient(160deg,#061018,#0b1a26 60%,#050a10)',
  },
  {
    id: 'forest',
    name: '森林',
    css:
      'radial-gradient(760px 560px at 24% 22%, rgba(80,170,120,.22), transparent 60%),' +
      'linear-gradient(155deg,#0a1310,#13211a 55%,#070d0a)',
  },
  {
    id: 'ember',
    name: '余烬',
    css:
      'radial-gradient(820px 600px at 78% 78%, rgba(214,92,58,.26), transparent 62%),' +
      'linear-gradient(150deg,#150f0e,#241614 55%,#100a09)',
  },
  {
    id: 'mist',
    name: '晨雾',
    css:
      'radial-gradient(760px 560px at 30% 20%, rgba(160,190,220,.55), transparent 62%),' +
      'linear-gradient(150deg,#e7ebf1,#ccd5e1 60%,#e3e7ed)',
  },
];

export const FONT_COLORS = [
  '#ffffff',
  '#c9c9c9',
  '#e05c4b',
  '#e0902f',
  '#f0cf4a',
  '#5ba45f',
  '#4fc1d8',
  '#3b8ee8',
  '#7b53d6',
];

export const QUOTES = [
  '慢慢来，比较快。',
  '日拱一卒，功不唐捐。',
  '把时间花在重要而不紧急的事上。',
  '专注不是做更多，而是少做一点。',
  '工欲善其事，必先利其器。',
  '千里之行，始于足下。',
  '不要等待机会，而要创造机会。',
  '保持好奇，保持笨拙。',
  '今天的事，今天就做完。',
  '读一本好书，就是和许多高尚的人谈话。',
  '行动是治愈恐惧的良药。',
  '所有的坚持，终将美好。',
];
