# MYM Life System

MYM 是一个以 iPhone 为主设备的完全本地、离线优先 PWA。结构化数据存入 `MYMDatabase`（Dexie / IndexedDB），图片、视频、音频和缩略图存入 OPFS；应用没有账号、服务端、分析脚本、云数据库或外部运行时资源。

## 本地运行

```powershell
pnpm install
pnpm dev
```

生产构建与本地预览：

```powershell
pnpm build
pnpm preview
```

## 视觉验收

11 张最终施工图保存在 `design-reference/`。Playwright 固定使用 `393 × 852`、`deviceScaleFactor: 1`，把页面截图写入 `test-output/`，差异图写入 `test-output/diff/`，每页判定写入同名 JSON。

```powershell
pnpm test:visual
```

在任意页面 URL 后添加 `?debugOverlay=1` 可开启施工图叠层，控制条支持 0%、25%、50%、75%、100% 五档透明度。

## 页面

- `/` 首页
- `/fitness` 健身主线示例
- `/cpa` CPA 主线示例
- `/knowledge` 知识空间（可平移、缩放）
- `/timeline` 时间线
- `/capture` 快速记录
- `/goals` 目标
- `/note/cpa` 笔记详情
- `/profile` 我的
- `/templates` 模板管理
- `/tags` 标签管理

## 数据与备份

“我的 → 备份与恢复”可导出 JSON；在确认框中选择取消会进入导入恢复流程。删除标签只会解除记录关系，不删除记录本身；合并标签会更新所有关联记录。
