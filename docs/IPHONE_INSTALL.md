# iPhone 安装与离线使用

1. 在 iPhone 的 Safari 中打开 GitHub Pages 生产地址。
2. 等待首页完整打开一次，让 Service Worker 完成静态资源缓存。
3. 点击 Safari 的“分享”按钮，选择“添加到主屏幕”。
4. 从主屏幕启动 MYM；此时以 `standalone` 模式运行，不依赖 Safari 地址栏。
5. 首次缓存完成后，可关闭 Windows 电脑，并在飞行模式下继续使用所有核心功能。

## 数据边界

GitHub 仓库和 GitHub Pages 仅保存程序源码与构建后的 HTML、CSS、JavaScript、图标、Manifest、Service Worker 和静态演示资源。

笔记、主线、目标、标签、模板、指标、情绪和知识关系保存在 iPhone 的 IndexedDB；图片、视频、音频及缩略图保存在 iPhone 的 OPFS。应用没有任何上传这些数据的网络请求。

删除 Safari 网站数据、卸载并清理相关网站存储或更换 iPhone 会导致本地数据丢失。请定期通过“我的 → 备份与恢复”导出 JSON 备份；媒体文件的完整打包备份仍需后续扩展。
