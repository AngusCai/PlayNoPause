// PlayNoPause - Popup Script

document.addEventListener('DOMContentLoaded', init);

// DOM 元素
let globalToggle;
let addCurrentBtn;
let siteInput;
let addSiteBtn;
let siteList;
let emptyTip;
let container;

// 当前状态
let currentSites = [];
let isEnabled = true;

function init() {
  // 获取 DOM 元素
  globalToggle = document.getElementById('globalToggle');
  addCurrentBtn = document.getElementById('addCurrentBtn');
  siteInput = document.getElementById('siteInput');
  addSiteBtn = document.getElementById('addSiteBtn');
  siteList = document.getElementById('siteList');
  emptyTip = document.getElementById('emptyTip');
  container = document.querySelector('.container');

  // 绑定事件
  globalToggle.addEventListener('change', handleToggleChange);
  addCurrentBtn.addEventListener('click', handleAddCurrentSite);
  addSiteBtn.addEventListener('click', handleAddSite);
  siteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddSite();
    }
  });

  // 加载数据
  loadData();
}

// 从 background 加载数据
async function loadData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSites' });
    currentSites = response.sites || [];
    isEnabled = response.enabled !== false;
    
    // 更新 UI
    globalToggle.checked = isEnabled;
    updateDisabledState();
    renderSiteList();
  } catch (error) {
    console.error('Failed to load data:', error);
    showToast('加载数据失败', 'error');
  }
}

// 处理全局开关切换
async function handleToggleChange() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'toggleEnabled' });
    if (response.success) {
      isEnabled = response.enabled;
      updateDisabledState();
      showToast(isEnabled ? '已启用' : '已禁用', 'success');
    }
  } catch (error) {
    console.error('Failed to toggle:', error);
    showToast('操作失败', 'error');
    globalToggle.checked = isEnabled; // 恢复状态
  }
}

// 更新禁用状态
function updateDisabledState() {
  if (isEnabled) {
    container.classList.remove('disabled');
  } else {
    container.classList.add('disabled');
  }
}

// 添加当前网页
async function handleAddCurrentSite() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getCurrentTab' });
    
    if (!response.hostname) {
      showToast('无法获取当前页面域名', 'error');
      return;
    }

    // 提取主域名（去掉 www 前缀）
    let domain = response.hostname;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    // 检查是否已存在
    if (currentSites.includes(domain)) {
      showToast('该网站已在列表中', 'error');
      return;
    }

    await addSite(domain);
  } catch (error) {
    console.error('Failed to add current site:', error);
    showToast('添加失败', 'error');
  }
}

// 手动添加网站
async function handleAddSite() {
  const input = siteInput.value.trim();
  
  if (!input) {
    showToast('请输入域名', 'error');
    return;
  }

  // 清理输入，提取域名
  let domain = input.toLowerCase();
  
  // 移除协议前缀
  domain = domain.replace(/^https?:\/\//, '');
  
  // 移除路径
  domain = domain.split('/')[0];
  
  // 移除端口
  domain = domain.split(':')[0];
  
  // 移除 www 前缀
  if (domain.startsWith('www.')) {
    domain = domain.substring(4);
  }

  // 简单验证
  if (!domain || !domain.includes('.')) {
    showToast('请输入有效的域名', 'error');
    return;
  }

  // 检查是否已存在
  if (currentSites.includes(domain)) {
    showToast('该网站已在列表中', 'error');
    return;
  }

  await addSite(domain);
  siteInput.value = '';
}

// 添加站点
async function addSite(domain) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'addSite', site: domain });
    
    if (response.success) {
      currentSites = response.sites;
      renderSiteList();
      showToast(`已添加 ${domain}`, 'success');
    } else {
      showToast(response.error || '添加失败', 'error');
    }
  } catch (error) {
    console.error('Failed to add site:', error);
    showToast('添加失败', 'error');
  }
}

// 删除站点
async function removeSite(domain) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'removeSite', site: domain });
    
    if (response.success) {
      currentSites = response.sites;
      renderSiteList();
      showToast(`已移除 ${domain}`, 'success');
    } else {
      showToast(response.error || '删除失败', 'error');
    }
  } catch (error) {
    console.error('Failed to remove site:', error);
    showToast('删除失败', 'error');
  }
}

// 渲染站点列表
function renderSiteList() {
  if (currentSites.length === 0) {
    siteList.innerHTML = '';
    emptyTip.style.display = 'block';
    return;
  }

  emptyTip.style.display = 'none';
  siteList.innerHTML = currentSites.map(site => createSiteItem(site)).join('');

  // 绑定删除按钮事件
  siteList.querySelectorAll('.site-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const domain = btn.dataset.site;
      removeSite(domain);
    });
  });

  // 绑定 favicon 加载失败的兜底逻辑
  siteList.querySelectorAll('.site-favicon').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const placeholder = img.nextElementSibling;
      if (placeholder && placeholder.classList.contains('site-favicon-placeholder')) {
        placeholder.style.display = 'flex';
      }
    });
  });
}

// 创建站点列表项 HTML
function createSiteItem(site) {
  // 获取 favicon URL
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${site}&sz=32`;
  const initial = site.charAt(0).toUpperCase();

  return `
    <div class="site-item">
      <img 
        class="site-favicon" 
        src="${faviconUrl}" 
        alt="${site}"
      >
      <div class="site-favicon-placeholder" style="display:none;">${initial}</div>
      <span class="site-name">${site}</span>
      <button class="site-delete" data-site="${site}" title="删除">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `;
}

// 显示 Toast 提示
function showToast(message, type = 'info') {
  // 移除现有的 toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 创建新的 toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 显示动画
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // 自动隐藏
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
