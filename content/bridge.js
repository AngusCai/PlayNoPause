// PlayNoPause - Bridge Script
// 在 document_start 时运行于 ISOLATED world
// 负责检查 chrome.storage 并通知 MAIN world 脚本是否激活

(function() {
  'use strict';
  
  // 从 URL 中提取 hostname
  function extractHostname(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }
  
  // 检查 hostname 是否匹配站点列表
  function matchesSite(hostname, sites) {
    if (!hostname || !sites || sites.length === 0) return false;
    return sites.some(site => {
      // 支持子域名匹配
      return hostname === site || hostname.endsWith('.' + site);
    });
  }
  
  // 向 MAIN world 发送激活/停用消息
  function toggleMainWorld(active) {
    window.postMessage({ type: 'PLAY_NO_PAUSE_TOGGLE', active: active }, '*');
  }
  
  // 检查当前站点是否需要激活拦截
  async function checkAndActivate() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'checkSite', 
        url: window.location.href 
      });
      
      if (response && response.active) {
        toggleMainWorld(true);
      }
    } catch (e) {
      // 扩展可能未准备好，忽略错误
      console.log('[PlayNoPause Bridge] 初始化检查失败:', e.message);
    }
  }
  
  // 初始检查
  checkAndActivate();
  
  // 监听来自 background 的状态变化消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleSite') {
      toggleMainWorld(message.active);
      sendResponse({ success: true });
    }
    return true;
  });
})();
