# PlayNoPause - Chrome 扩展

防止网页切换标签时视频/音频自动暂停的 Chrome 扩展。

## 功能特性

- **防止暂停**：切换标签页时保持网页音视频持续播放
- **智能拦截**：自动拦截 visibilitychange 事件，欺骗 visibilityState
- **白名单/黑名单**：支持按网站域名灵活配置
- **即时生效**：无需刷新页面，配置更改立即生效
- **轻量高效**：原生 JavaScript，无任何依赖

## 安装方法

### 方法一：从 Release 下载（推荐）

1. 进入 [Releases](https://github.com/AngusCai/PlayNoPause/releases) 页面
2. 下载最新版本的 `chromePlayNoPause-v*.zip`
3. 解压到任意文件夹
4. 打开 Chrome → `更多工具` → `扩展程序`
5. 开启右上角 `开发者模式`
6. 点击 `加载已解压的扩展程序`
7. 选择解压后的文件夹

### 方法二：开发者模式安装

```bash
# 克隆仓库
git clone https://github.com/AngusCai/PlayNoPause.git

# 安装（其实就是在 Chrome 中加载这个目录）
```

## 使用方法

1. 安装扩展后，点击 Chrome 工具栏右侧的扩展图标
2. 点击开关按钮启用/禁用功能
3. 在输入框中添加域名，按 Enter 确认
   - **黑名单模式**：仅在列表中的网站生效
   - **白名单模式**：除列表中的网站外都生效
4. 切换到其他标签页，视频/音频将继续播放

## 技术原理

当用户切换浏览器标签页时，浏览器会触发 `visibilitychange` 事件，并将 `document.visibilityState` 设为 `hidden`，导致页面上的视频/音频自动暂停。

本扩展通过以下方式解决：

1. **Content Script 注入**：在页面加载时注入脚本
2. **事件拦截**：拦截并阻止 `visibilitychange` 事件
3. **属性欺骗**：将 `document.visibilityState` 始终返回 `visible`
4. **立即生效**：配置存储在 `chrome.storage` 中，实时同步

## 兼容性

- Chrome 88+
- Edge 88+（基于 Chromium）
- 其他 Chromium 内核浏览器

## 目录结构

```
chromePlayNoPause/
├── manifest.json      # 扩展配置
├── background.js      # 后台脚本
├── content/
│   ├── bridge.js      # 后台与页面通信桥梁
│   └── injector.js    # 页面注入脚本
├── popup/
│   ├── popup.html     # 弹出页面
│   ├── popup.js       # 弹出页面逻辑
│   └── popup.css      # 样式
└── icons/            # 图标
```

## License

MIT License
