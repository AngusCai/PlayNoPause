// PlayNoPause - Background Service Worker
// 用于管理站点列表并控制 content script 激活状态

// 默认数据结构
const DEFAULT_DATA = {
  sites: [],
  enabled: true
};

// 初始化存储
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['sites', 'enabled']);
  if (data.sites === undefined) {
    await chrome.storage.local.set(DEFAULT_DATA);
  }
});

// 从 URL 中提取 hostname
function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

// 检查 URL 是否匹配站点列表中的任一域名
function matchesSite(hostname, sites) {
  if (!hostname || !sites || sites.length === 0) return false;
  return sites.some(site => {
    // 支持子域名匹配
    // 例如 "bilibili.com" 匹配 "www.bilibili.com" 和 "bilibili.com"
    return hostname === site || hostname.endsWith('.' + site);
  });
}

// 向匹配的标签页发送 toggleSite 消息
async function notifyMatchingTabs(sites, active) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url) {
        const hostname = extractHostname(tab.url);
        if (hostname && matchesSite(hostname, sites)) {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'toggleSite', active });
          } catch (e) {
            // 标签页可能没有 content script，忽略
          }
        }
      }
    }
  } catch (e) {
    console.error('[PlayNoPause] notifyMatchingTabs error:', e);
  }
}

// 处理来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // 表示会异步发送响应
});

async function handleMessage(message, sender) {
  const { action, site, url } = message;

  switch (action) {
    case 'checkSite': {
      // bridge.js 调用：检查当前站点是否在列表中且功能启用
      const data = await chrome.storage.local.get(['sites', 'enabled']);
      
      if (!data.enabled) {
        return { active: false };
      }
      
      const hostname = extractHostname(url);
      const isMatch = hostname && matchesSite(hostname, data.sites || []);
      return { active: isMatch };
    }

    case 'getSites': {
      const data = await chrome.storage.local.get(['sites', 'enabled']);
      return {
        sites: data.sites || [],
        enabled: data.enabled !== false
      };
    }

    case 'addSite': {
      if (!site || typeof site !== 'string') {
        return { success: false, error: '无效的站点' };
      }
      
      const cleanSite = site.toLowerCase().trim();
      if (!cleanSite) {
        return { success: false, error: '站点不能为空' };
      }

      const data = await chrome.storage.local.get(['sites', 'enabled']);
      const sites = data.sites || [];
      
      if (sites.includes(cleanSite)) {
        return { success: false, error: '站点已存在' };
      }

      sites.push(cleanSite);
      await chrome.storage.local.set({ sites });
      
      // 如果功能启用，通知匹配的标签页激活拦截
      if (data.enabled !== false) {
        await notifyMatchingTabs([cleanSite], true);
      }
      
      return { success: true, sites };
    }

    case 'removeSite': {
      if (!site) {
        return { success: false, error: '无效的站点' };
      }

      const data = await chrome.storage.local.get(['sites']);
      const sites = data.sites || [];
      const index = sites.indexOf(site);
      
      if (index === -1) {
        return { success: false, error: '站点不存在' };
      }

      sites.splice(index, 1);
      await chrome.storage.local.set({ sites });
      
      // 通知匹配的标签页停用拦截
      await notifyMatchingTabs([site], false);
      
      return { success: true, sites };
    }

    case 'toggleEnabled': {
      const data = await chrome.storage.local.get(['enabled', 'sites']);
      const newEnabled = !data.enabled;
      await chrome.storage.local.set({ enabled: newEnabled });
      
      // 通知所有匹配站点的标签页
      if (data.sites && data.sites.length > 0) {
        await notifyMatchingTabs(data.sites, newEnabled);
      }
      
      return { success: true, enabled: newEnabled };
    }

    case 'getCurrentTab': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        return { url: tab.url, hostname: extractHostname(tab.url) };
      }
      return { url: null, hostname: null };
    }

    default:
      return { error: '未知操作' };
  }
}
