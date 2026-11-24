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

const DEMO_ROOT = 'demo-bar';

/** 演示数据补全 parentId，让本地预览也能验证拖拽排序 */
function normalizeDemo(items, parentId) {
  items.forEach((item) => {
    item.parentId = parentId;
    if (item.children) normalizeDemo(item.children, item.id);
  });
}

normalizeDemo(DEMO_TILES, DEMO_ROOT);

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
    fixed: !!node.fixed,
  };
}

/** 演示模式下的内存排序，方便本地预览验证拖拽效果 */
function demoMove(id, { parentId, index, anchorId, after }) {
  let source = null;
  let node = null;
  const walk = (items) => {
    for (const item of items) {
      if (item.id === id) {
        source = items;
        node = item;
        return true;
      }
      if (item.children && walk(item.children)) return true;
    }
    return false;
  };
  walk(DEMO_TILES);
  if (!node) return false;

  let target = null;
  const findFolder = (items) => {
    for (const item of items) {
      if (item.id === (parentId || node.parentId) && item.children) {
        target = item;
        return true;
      }
      if (item.children && findFolder(item.children)) return true;
    }
    return false;
  };
  if (parentId === DEMO_ROOT || parentId === '1' || !parentId) target = { children: DEMO_TILES };
  else findFolder(DEMO_TILES);
  if (!target || !target.children) return false;

  // 不能把文件夹放进自己或自己的子级
  if (node.children && target.id) {
    const isDescendant = (folder, id) =>
      (folder.children || []).some(
        (child) => child.id === id || isDescendant(child, id)
      );
    if (target.id === node.id || isDescendant(node, target.id)) return false;
  }

  const from = source ? source.indexOf(node) : -1;
  if (from >= 0) source.splice(from, 1);

  const siblings = target.children;
  let insert;
  if (anchorId && anchorId !== id) {
    const pos = siblings.findIndex((child) => child.id === anchorId);
    insert = pos >= 0 ? pos + (after ? 1 : 0) : siblings.length;
  } else {
    insert = typeof index === 'number' ? Math.max(0, Math.min(index, siblings.length)) : siblings.length;
  }
  siblings.splice(insert, 0, node);
  node.parentId = target.id || DEMO_ROOT;
  return true;
}

/** 演示模式下直接修改内存中的书签，方便本地预览编辑效果 */
function demoUpdate(id, title, url) {
  let found = false;
  const walk = (items) => {
    for (const item of items) {
      if (item.id === id) {
        if (typeof title === 'string') item.title = title;
        if (typeof url === 'string') item.url = url;
        found = true;
        return true;
      }
      if (item.children && walk(item.children)) return true;
    }
    return false;
  };
  walk(DEMO_TILES);
  return found;
}

/** 修改书签的名称与网址 */
export async function updateBookmarkNode(id, { title, url } = {}) {
  if (!id) return false;
  if (!isExtension()) return demoUpdate(id, title, url);

  const changes = {};
  if (typeof title === 'string') changes.title = title;
  if (typeof url === 'string') changes.url = url;
  if (!Object.keys(changes).length) return false;

  try {
    await chrome.bookmarks.update(id, changes);
    return true;
  } catch {
    return false;
  }
}

/** 真实的书签移动；anchorId/after 表示插入到某个同级书签的前/后，index 为兜底 */
export async function moveBookmarkNode(id, { parentId, index, anchorId, after } = {}) {
  if (!id) return false;
  if (!isExtension()) return demoMove(id, { parentId, index, anchorId, after });
  try {
    let targetIndex;
    if (parentId && (anchorId || typeof index === 'number')) {
      // 以移动前的当前子项为准重新计算位置，避免使用可能已经过期的 index
      const children = await chrome.bookmarks.getChildren(parentId);
      const siblings = children.filter((child) => child.id !== id);
      if (anchorId) {
        const pos = siblings.findIndex((child) => child.id === anchorId);
        targetIndex = pos >= 0 ? pos + (after ? 1 : 0) : siblings.length;
      } else {
        targetIndex = Math.max(0, Math.min(index, siblings.length));
      }
    }
    const props = {};
    if (parentId) props.parentId = parentId;
    if (typeof targetIndex === 'number') props.index = targetIndex;
    await chrome.bookmarks.move(id, props);
    return true;
  } catch {
    return false;
  }
}

/** 读取书签树，书签栏与“其他书签”顶层条目各自成为磁贴 */
export async function fetchTiles({ includeOther = true } = {}) {
  if (!isExtension()) return DEMO_TILES;

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
    // 显式传入父级 id，保证拖拽排序在真实书签里能写回正确位置
    if (node.url) tiles.push(toTile(node, bar.id));
    else if (node.children && node.children.length) tiles.push(toTile(node, bar.id));
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
