# 小游戏站首发候选

用户已选定方案 A「精选展厅」。确认首发为下表的 11 款，再加入 `shie` 单文件版和 `four-player-gems` 的 Splendor Web 版，共 13 款。两个《三国：都市战纪》保留各自的入口。 [交付与版本记录](release.md)

2026 年 11 月 26 日核查。范围为 GitHub `GOD-OF-PPT` 的公开仓库和当前连接可见的私有仓库。以最近 45 天的仓库推送为主要口径，另核对公开活动与已知游戏分支。表格日期按北京时间显示。

- [GitHub 仓库搜索](https://github.com/search?q=user%3AGOD-OF-PPT+pushed%3A%3E%3D2026-10-12&type=repositories)
- [公开仓库按最近推送排序](https://api.github.com/users/GOD-OF-PPT/repos?per_page=100&sort=pushed&direction=desc)

## 建议首发的 11 款

| 游戏 | 仓库 | 最近推送 | 网页入口和核验重点 |
| --- | --- | --- | --- |
| 星际拆解站 · 再捡一件 | [starline](https://github.com/GOD-OF-PPT/starline) | 11-25 | Vite 静态构建。验证起航和首个遭遇。 |
| 尘缘问道 · 剑阵万象 | [chenyaun-v2](https://github.com/GOD-OF-PPT/chenyaun-v2) | 11-25 | 独立 Web 作品。仓库提供静态打包脚本，验证新卷进入实际战斗。 |
| 棱镜蜂群 · 霓虹协议 | [fire-zombie](https://github.com/GOD-OF-PPT/fire-zombie) | 11-23 | Vite，核验触控和实际跑酷。试玩包采用默认美术，去掉可选的非商用 Tripo 试验模型。 |
| 奇术茶馆 | [Wizzard](https://github.com/GOD-OF-PPT/Wizzard) | 11-22 | 有独立 Web 目标。核验单人练习完成一局。好友房需要 WebSocket 房间服务，验证后才展示联机入口。 |
| 三国：都市战纪 | [sanguo](https://github.com/GOD-OF-PPT/sanguo) | 11-20 | 模块化 Three.js 网页版。核验模型、贴图、选角和开战。 |
| 劫火重燃 | [kong-rpg](https://github.com/GOD-OF-PPT/kong-rpg) | 11-18 | 有 Web 和离线构建。核验首关、生产构建体积检查以及音频和大资源加载。 |
| 锤下求生 · 薪火剑心录 | [sword-led](https://github.com/GOD-OF-PPT/sword-led) | 11-18 | README 指定当前默认版本为 `v8.html`。核验一次锻造和旅程操作，打包时保留当前版本依赖。 |
| 大圣：舍利魔塔 | [mota-xiyou](https://github.com/GOD-OF-PPT/mota-xiyou) | 11-18 | 原生 HTML、CSS、JavaScript。核验移动、战斗及资源能从部署路径加载。 |
| 月海信标 · 星区中继战役 | [tdk](https://github.com/GOD-OF-PPT/tdk) | 11-18 | Vite 构建另产出单文件入口。核验放置塔台和首波开战。 |
| 尘缘问道 | [chenyuan-wendao](https://github.com/GOD-OF-PPT/chenyuan-wendao) | 11-18 | Vue Web 工程。按可玩分支的交付记录锁定版本，核验开局、首段操作和存档。 |
| 重生 2020 · AI 时代 | [reborn-2020-ai-era](https://github.com/GOD-OF-PPT/reborn-2020-ai-era) | 11-17 | Vite 网页策略游戏。按当前可玩版本标示内容，核验完成首季。 |

## 需要单独决定的项目

| 项目 | 最近活动 | 建议 |
| --- | --- | --- |
| [shie](https://github.com/GOD-OF-PPT/shie) | 11-17 推送 | 仓库只有《三国：都市战纪 3D》单文件入口。默认首发选模块化的 `sanguo`，可改选单文件版或将它作为同一游戏的另一个版本。 |
| [four-player-gems / Splendor](https://github.com/GOD-OF-PPT/four-player-gems/tree/codex/web-migration-implementation) | 10-23 Web 分支最新提交 | 私有仓库的 Web 分支有可构建的 PC 版，Web API 有单独部署。加入公开站前由用户确认公开试玩授权。 |
| [chenyuan-xianxia](https://github.com/GOD-OF-PPT/chenyuan-xianxia) | 11-26 推送 | 新立项的 Godot 版。仓库计划分发 Web 试玩切片，当前未找到已导出的可玩 Web 包。 |
| [shoot-zombie](https://github.com/GOD-OF-PPT/shoot-zombie) | 11-17 创建 | 仓库只有 AI Studio 模板 README，当前没有游戏入口。 |

`common-game-ranking-list` 是游戏配套服务。`game-website` 是本次目录站。`presentation-tuilan`、`google-one-tools`、`tuilan-code-recall-poc` 和 `tuilan-demo` 从这批试玩候选中排除。

## 上线前验证

用户确认首发游戏与首页方案后，为每款游戏锁定分支和提交，从构建产物或最小静态入口目录制作发布包，按 `web-zip-security-scanner` 扫描并复扫。记录每款游戏的目录入口、资源加载、实际开局和首个核心操作，并在 Cloudflare 预览地址跑通后再切换根域名。在生产地址复测同样的试玩路径。

`xsjgames.com` 目前由 Cloudflare 的 `cloud-mail` Worker 提供网页。其现有 `/sw.js` 注册在根作用域，切换时需要用旧浏览器上下文验证缓存迁移，并保留 MX 等邮件 DNS 与可回滚的原 Worker 绑定。Cloudflare Workers 静态资产的单文件上限是 25 MiB，打包时检查每个文件以及发布总文件数。 [Workers 静态资产限制](https://developers.cloudflare.com/workers/platform/limits/#static-assets) · [Worker 路由优先级](https://developers.cloudflare.com/workers/configuration/routing/routes/)
