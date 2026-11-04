import { hostOf, isExtension } from './util.js';

const DEMO_TILES = [
  {
    type: 'folder',
    id: 'demo-social',
    title: '社交办公',
    children: [
      { type: 'bookmark', id: 'demo-1', title: 'Outlook', url: 'https://outlook.live.com' },
      { type: 'bookmark', id: 'demo-2', title: 'Gmail', url: 'https://mail.google.com' },
      { type: 'bookmark', id: 'demo-3', title: '飞书', url: 'https://www.feishu.cn' },
      { type: 'bookmark', id: 'demo-4', title: 'Notion', url: 'https://www.notion.so' },
      { type: 'bookmark', id: 'demo-5', title: '腾讯文档', url: 'https://docs.qq.com' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-media',
    title: '影音视听',
    children: [
      { type: 'bookmark', id: 'demo-6', title: '哔哩哔哩', url: 'https://www.bilibili.com' },
      { type: 'bookmark', id: 'demo-7', title: 'YouTube', url: 'https://www.youtube.com' },
      { type: 'bookmark', id: 'demo-8', title: '网易云音乐', url: 'https://music.163.com' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-design',
    title: '后期设计',
    children: [
      { type: 'bookmark', id: 'demo-9', title: 'Figma', url: 'https://www.figma.com' },
      { type: 'bookmark', id: 'demo-10', title: 'Canva', url: 'https://www.canva.cn' },
      { type: 'bookmark', id: 'demo-11', title: 'Dribbble', url: 'https://dribbble.com' },
      { type: 'bookmark', id: 'demo-12', title: '稿定设计', url: 'https://www.gaoding.com' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-tools',
    title: '实用工具',
    children: [
      { type: 'bookmark', id: 'demo-13', title: '草料二维码', url: 'https://cli.im' },
      { type: 'bookmark', id: 'demo-14', title: 'ProcessOn', url: 'https://www.processon.com' },
      { type: 'bookmark', id: 'demo-15', title: '石墨文档', url: 'https://shimo.im' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-ai',
    title: 'AI',
    children: [
      { type: 'bookmark', id: 'demo-16', title: 'ChatGPT', url: 'https://chat.openai.com' },
      { type: 'bookmark', id: 'demo-17', title: 'Claude', url: 'https://claude.ai' },
      { type: 'bookmark', id: 'demo-18', title: '豆包', url: 'https://www.doubao.com' },
      { type: 'bookmark', id: 'demo-19', title: '通义千问', url: 'https://tongyi.aliyun.com' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-study',
    title: '学习教育',
    children: [
      { type: 'bookmark', id: 'demo-20', title: '慕课网', url: 'https://www.imooc.com' },
      { type: 'bookmark', id: 'demo-21', title: 'Coursera', url: 'https://www.coursera.org' },
      { type: 'bookmark', id: 'demo-22', title: '维基百科', url: 'https://zh.wikipedia.org' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-shopping',
    title: '购物金融',
    children: [
      { type: 'bookmark', id: 'demo-23', title: '淘宝', url: 'https://www.taobao.com' },
      { type: 'bookmark', id: 'demo-24', title: '京东', url: 'https://www.jd.com' },
      { type: 'bookmark', id: 'demo-25', title: '支付宝', url: 'https://www.alipay.com' },
    ],
  },
  {
    type: 'folder',
    id: 'demo-blog',
    title: '博客',
    children: [
      { type: 'bookmark', id: 'demo-26', title: '少数派', url: 'https://sspai.com' },
      { type: 'bookmark', id: 'demo-27', title: '掘金', url: 'https://juejin.cn' },
      { type: 'bookmark', id: 'demo-28', title: 'V2EX', url: 'https://www.v2ex.com' },
      { type: 'folder', id: 'demo-blog-more', title: '技术周刊', children: [
        { type: 'bookmark', id: 'demo-29', title: '阮一峰周刊', url: 'https://www.ruanyifeng.com/blog/' },
        { type: 'bookmark', id: 'demo-30', title: 'InfoQ', url: 'https://www.infoq.cn' },
      ] },
    ],
  },
  { type: 'bookmark', id: 'demo-31', title: '书签', url: 'https://www.google.com' },
  { type: 'bookmark', id: 'demo-32', title: 'GitHub', url: 'https://github.com' },
];

const SYSTEM_SHORTCUTS = [
  { id: 'sys-history', title: '历史记录', url: 'chrome://history/', sym: 'i-history' },
  { id: 'sys-downloads', title: '下载', url: 'chrome://downloads/', sym: 'i-download' },
  { id: 'sys-passwords', title: '密码', url: 'chrome://password-manager/passwords', sym: 'i-key' },
  { id: 'sys-extensions', title: '扩展', url: 'chrome://extensions/', sym: 'i-puzzle' },
  { id: 'sys-bookmarks', title: '收藏夹', url: 'chrome://bookmarks/', sym: 'i-star' },
  { id: 'sys-settings', title: '设置', url: 'chrome://settings/', sym: 'i-gear' },
];

function normalizeTitle(node) {
  const title = (node.title || '').trim();
  if (title) return title;
  return node.url ? hostOf(node.url) : '未命名分组';
}

function toTile(node, parentId) {
  if (node.url) {
    return {
      type: 'bookmark',
      id: node.id,
      title: normalizeTitle(node),
      url: node.url,
      parentId: parentId || node.parentId || '',
      index: typeof node.index === 'number' ? node.index : 0,
      system: !!node.system,
    };
  }
  const children = (node.children || [])
    .filter((child) => child.url || (child.children && child.children.length))
    .map((child) => toTile(child, node.id));
  return {
    type: 'folder',
    id: node.id,
    title: normalizeTitle(node),
    children,
    parentId: parentId || node.parentId || '',
    index: typeof node.index === 'number' ? node.index : 0,
    system: !!node.system,
    fixed: !!node.fixed,
  };
}

/** 真实的 Chrome 书签移动；索引用于改变同级顺序 */
export async function moveBookmarkNode(id, { parentId, index } = {}) {
  if (!isExtension() || !id) return false;
  try {
    const props = {};
    if (parentId) props.parentId = parentId;
    if (typeof index === 'number' && index >= 0) props.index = index;
    await chrome.bookmarks.move(id, props);
    return true;
  } catch {
    return false;
  }
}

function buildSystemTile() {
  return {
    type: 'folder',
    id: 'system-shortcuts',
    title: '系统',
    system: true,
    fixed: true,
    parentId: '',
    index: 0,
    children: SYSTEM_SHORTCUTS.map((item, index) => ({
      type: 'bookmark',
      id: item.id,
      title: item.title,
      url: item.url,
      sym: item.sym,
      system: true,
      parentId: 'system-shortcuts',
      index,
    })),
  };
}

/** 读取书签树，书签栏与“其他书签”顶层条目各自成为磁贴 */
export async function fetchTiles({ includeOther = true, includeSystem = true } = {}) {
  if (!isExtension()) return includeSystem ? [...DEMO_TILES, buildSystemTile()] : DEMO_TILES;

  let tree = [];
  try {
    tree = await chrome.bookmarks.getTree();
  } catch {
    return [];
  }

  const root = tree && tree[0];
  const roots = (root && root.children) || [];
  const bar = roots.find((node) => node.id === '1') || roots[0];
  const other = roots.find((node) => node.id === '2');

  const tiles = [];
  (bar && bar.children ? bar.children : []).forEach((node) => {
    if (node.url) tiles.push(toTile(node));
    else if (node.children && node.children.length) tiles.push(toTile(node));
  });

  if (includeOther && other && other.children && other.children.length) {
    if (other.children.length === 1 && other.children[0].url) {
      tiles.push(toTile(other.children[0]));
    } else {
      tiles.push({
        type: 'folder',
        id: other.id,
        title: other.title || '其他书签',
        fixed: true,
        parentId: other.parentId || '',
        index: typeof other.index === 'number' ? other.index : 0,
        children: other.children
          .filter((child) => child.url || (child.children && child.children.length))
          .map((child) => toTile(child, other.id)),
      });
    }
  }

  if (includeSystem) {
    tiles.push(buildSystemTile());
  }

  return tiles;
}

function collectBookmarks(items, out, max) {
  for (const item of items) {
    if (out.length >= max) break;
    if (item.type === 'bookmark') out.push(item);
    else if (item.children) collectBookmarks(item.children, out, max);
  }
  return out;
}

export function previewBookmarks(tiles, max = 4) {
  return collectBookmarks(tiles || [], [], max);
}

function matches(text, query) {
  return String(text || '').toLowerCase().includes(query);
}

function folderMatches(folder, query) {
  if (matches(folder.title, query)) return true;
  return (folder.children || []).some((child) =>
    child.type === 'folder'
      ? folderMatches(child, query)
      : matches(child.title, query) || matches(child.url, query)
  );
}

/** 顶栏输入时过滤磁贴：书签命中或文件夹内有命中都会保留 */
export function filterTiles(tiles, rawQuery) {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return tiles;
  return tiles.filter((tile) =>
    tile.type === 'folder' ? folderMatches(tile, query) : matches(tile.title, query) || matches(tile.url, query)
  );
}

/** 搜索建议：展开所有层级的书签 */
export function findBookmarks(tiles, rawQuery, limit = 10) {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return [];

  const results = [];
  const walk = (items, path) => {
    for (const item of items) {
      if (results.length >= limit) return;
      if (item.type === 'folder') {
        walk(item.children || [], path.concat(item.title));
      } else if (matches(item.title, query) || matches(item.url, query)) {
        results.push({
          ...item,
          path: path.join(' / '),
        });
      }
    }
  };
  walk(tiles, []);
  return results;
}
