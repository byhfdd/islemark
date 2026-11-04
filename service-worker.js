// 点击工具栏图标时打开一个新标签页（即本扩展的新标签页）
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({});
});
