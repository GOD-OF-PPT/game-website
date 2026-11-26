# 2026 年 11 月 26 日首发

首页采用方案 A「精选展厅」，首发 13 款。游戏静态包由各自的固定版本构建或提取，源仓库的现有工作分支保留。

| 游戏 | 路径 | 源仓库与版本 | 发布构建 |
| --- | --- | --- | --- |
| 星际拆解站 | `starline` | `starline` `c0ae1a1` | Vite `dist/` |
| 剑阵万象 | `chenyaun-v2` | `chenyaun-v2` `7249f41` | 运行模块构建，发行入口改用净化后的 DOM 片段 |
| 棱镜蜂群 | `fire-zombie` | `fire-zombie` `949b800` | Vite `dist/`，保留默认美术 |
| 劫火重燃 | `kong-rpg` | `kong-rpg` `a37ef9a` | Vite Web `dist/` |
| 月海信标 | `tdk` | `tdk` `9d0831f` | 单文件发行入口和图标 |
| 三国：都市战纪 模块化版 | `sanguo` | `sanguo` `4019e89` | 静态源码和素材随包，Three.js 本地化 |
| 三国：都市战纪 3D 单文件版 | `shie` | `shie` `729dcf9` | 静态原版，净化动态渲染并将 Three.js 本地化 |
| 大圣：舍利魔塔 | `mota-xiyou` | `mota-xiyou` `9f4cc6d` | 正式静态包，22 张启动图集转为逐像素验证的无损 WebP，慢网可先入塔 |
| 锤下求生 · 薪火剑心录 | `sword-led` | `sword-led` `cf3a857` | 仓库随附的 V8 单文件发行版本 |
| 尘缘问道 Web 版 | `chenyuan-wendao` | `chenyuan-wendao` `cb73fd7` | Vue Web `dist/` |
| 重生 2020 | `reborn-2020` | `reborn-2020-ai-era` `6073c716` | Vite 相对路径构建，保留 v4 剧场及其可达交互 |
| 奇术茶馆 | `wizzard` | `Wizzard` `codex/railway-release-20261024` `c54b3a4` | 发布分支包含实际单人练习和好友房 Web 客户端 |
| 4 个人的宝石 | `splendor` | `four-player-gems` `codex/web-migration-implementation` `171c978` | Web 构建启用生产 API 的访客 bearer 会话 |

全部 13 份最终目录通过 `web-zip-security-scanner` 范围的检查，ZIP 解包条目逐项通过 SHA-256 校验。最终 ZIP 和报告位于 `release-output/packages/<路径>/`。Worker 资产索引覆盖 `release-output/stage/play/` 的 1,364 个文件，最大文件约 8.4 MiB。目录站代码及封面在本仓库。

## 生产验收

- [正式目录](https://xsjgames.com/) 返回 200，展示 13 个独立详情与试玩入口。桌面和 390 像素窄屏均已检查。
- `release-output/runtime/final-games.json` 收录 [正式试玩域](https://play.xsjgames.com/) 的 13 款游戏操作证据。两版三国各自开战，Splendor 用生产 PostgreSQL 服务建房并进入 AI 对局，《大圣》在优化后进入第一层。
- 奇术茶馆单人练习通过首轮报数。好友房的线上 WebSocket 握手返回 404，本次线上验收覆盖单人练习。
- 目录 Worker 版本为 `0032b8a1-5eae-4200-bdb5-37edb5cb0b23`，试玩 Worker 版本为 `31164b33-de84-43a6-a4a9-fc29683201e6`。

## 发布步骤

1. 从上表提交获取静态目录。用 `pack:static` 校验最终目录，再将其挂到 `games/<路径>/`，所有入口使用本目录的 `index.html`。
2. 由 `scripts/cloudflare-assets.mjs` 计算 Workers 静态资产索引并上传 Cloudflare 返回的待传文件组。仅在部署过程中使用临时上传授权。
3. `xsjgames-play` 使用 `deployment/play-worker.mjs` 和 `ASSETS` 绑定。静态目录站 `xsjgames-catalog` 加载 `site/` 和 `_headers`。两端使用 `workers.dev` 预览，之后绑定 `play.xsjgames.com`，最后添加 `xsjgames.com/*` 根域路由。
4. 使用 `scripts/verify-games.mjs` 在正式 HTTPS 上复跑 13 个游戏。根域访问验证包含目录、详情、试玩跳转和 `/sw.js` 的 `Cache-Control: no-store`。

Splendor API 只代理已知接口方法，先检查浏览器来源，再将同源请求转接到 Railway。奇术茶馆普通练习在客户端运行，好友房通过 `/ws` 转接至房间服务。

回滚根域时删除 `xsjgames.com/*` 路由即可重新使用 Cloud Mail 的原 Worker 自定义域名，同时保留邮件 DNS 与路由记录。 [旧 Service Worker 迁移验证](release-preflight.md#域名切换核对)
