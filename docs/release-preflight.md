# 静态交付预查

这份记录对应 2026 年 11 月 26 日的本地预查。首发范围和首页设计见[候选清单](launch-candidates.md)。

## 扫描命令

```powershell
npm ci
npm run scan:static -- ./design-preview ./release-output/preflight/design-preview
npm run pack:static -- ./design-preview ./release-output/preflight/design-zip
```

扫描器依据 `web-zip-security-scanner` 检查发布目录的路径、HTML 原文与适用的 Vite 配置，输出 Markdown 和 JSON。CLI 在规则有命中时返回 1。HTML 文件中的脚本仅在本地解析，扫描不联网校验第三方脚本，也不执行游戏。将 `dist` 直接作为扫描根目录时会纳入其内容，报告记录实际边界。

`pack:static` 需要 Python 3.12 或更新版本。第一个参数是已构建的静态目录，第二个参数是本次输出的新目录。默认检查 `index.html`，其他入口通过 `--entry` 指定，例如 `--entry playable-v2.html`。工具对同一份文件快照扫描和归档，检查文件大小与 Worker 文件预算，再读取 ZIP 验证每个文件的 SHA-256。产出 `static.zip`、`manifest.json`、`scan.md` 和 `scan.json`。将多份包合入同一个 Worker 时，再按整个 Worker 的文件总数核对配额。

本地设计预览已用这条命令产出 15 个文件的 ZIP，并通过逐项校验。另验证了绝对路径命中、超过 25 MiB、输出目录已存在时的失败结果，以及重复打包得到相同的 ZIP 字节。

## 本地历史产物

| 候选 | 当时扫描目录 | HTML 文件数 | 结果 |
| --- | --- | ---: | --- |
| 星际拆解站 | `starline/dist` | 1 | 0 项 |
| 剑阵万象 | `chenyaun-v2/output/static-security-20261123/static` | 1 | 0 项 |
| 棱镜蜂群 | `fire-zombie/dist` | 1 | 0 项 |
| 奇术茶馆 | `Wizzard/dist-static` | 1 | 0 项 |
| 劫火重燃 | `kong-rpg/dist` | 1 | 0 项 |
| 月海信标 | `tdk/dist` | 2 | 0 项 |
| 重生 2020 | `reborn-2020-ai-era/dist` | 1 | 22 项高风险，均为固定资源路径 |

这些产物用于了解规则命中和体积。正式验收以选定提交重新生成的发布目录和实际游戏运行报告为准。

重生 2020 已在独立目录从远端 `main` 提交 `6073c716` 构建。直接运行 `node node_modules/vite/bin/vite.js build --base ./` 后，入口的 9 处固定资源路径已消失。复扫发现 1 处本地诊断脚本固定路径，另有 `public/playable-v2.html`、`playable-v3.html` 和 `playable-v4.html` 各 23 处动态 HTML 写入。当前 React 入口会打开 `playable-v4.html`，发布时须修复这条路径和可达页面的命中项，并验证从主游戏打开和退出该版本。v2、v3 由 Vite 从 `public/` 原样复制，确认无正式入口后可从发布目录剔除。 [主游戏的 v4 入口](https://github.com/GOD-OF-PPT/reborn-2020-ai-era/blob/6073c716b8faf73442b91da3da0d81a6ca5f12b1/src/ui/App.tsx#L590)

旧版《劫火重燃》的 `release/legacy-v11.html` 约 69 MB。本地现有 `dist/` 的最大文件约 4.7 MB，说明应从正式 Web 构建目录取产物。 [Workers 静态资产限制](https://developers.cloudflare.com/workers/platform/limits/#static-assets)

奇术茶馆已有 Railway 生产房间服务和 Redis，控制台状态均为在线。公开 HTTPS `/healthz` 返回 `status: ok`。联机验收仍需从最终试玩来源经过 WebSocket，实际走通建房、加入和开始对局。 [房间服务健康端点](https://wizzard-room-server-production.up.railway.app/healthz)

## 远端主分支快照

下表是此次 `git ls-remote` 观测到的提交，供正式发布时选择和复核。

| 仓库 | `main` 提交 |
| --- | --- |
| `starline` | `c0ae1a11eb8e41a8c484d4dc225bd3741ac2fdc2` |
| `chenyaun-v2` | `7249f41c7266656cefe71c8dfe59c6659d992038` |
| `fire-zombie` | `949b8001aab4d6713b2a7673ee65fba3f5dfb760` |
| `Wizzard` | `c09f101f31f4fe9dd2621660e877c575cc6c52e8` |
| `sanguo` | `4019e8944f4b5ebd3f33709e5119a69c4e234e71` |
| `kong-rpg` | `a37ef9a45021294c86b9cfa3bfc7cf5e20981a55` |
| `sword-led` | `cf3a857dd8f7405ade61622d42e509f1f22eafbb` |
| `mota-xiyou` | `9f4cc6d31e0864c4d3f3f34f005ffae427e46356` |
| `tdk` | `9d0831fbf6c57a7d4effb9330f5f218715526383` |
| `chenyuan-wendao` | `cb73fd7c27e4045b57637e9ee8a4a130e5adf648` |
| `reborn-2020-ai-era` | `6073c716b8faf73442b91da3da0d81a6ca5f12b1` |

## 域名切换核对

当前 `cloud-mail` Worker 在根路径注册 Workbox。线上 `/sw.js` 预缓存 `mail-pwa.png` 和 `manifest.webmanifest`，检查时没有观察到 HTML 导航回退规则。切换后在已注册旧 Worker 的浏览器中验证新首页、图标和安装清单，再验证全新的浏览器上下文。可让小游戏 Worker 的 HTTPS 路由覆盖当前自定义域名绑定，保留原绑定用于回滚。切换前再读一次实际路由和 DNS。 [Cloudflare 路由和自定义域名的优先级](https://developers.cloudflare.com/workers/configuration/routing/routes/)

目录站从 `site/sw.js` 提供退役脚本，首页加载 `site/refresh-cloud-mail-worker.js`。更新逻辑匹配根作用域中的 `/sw.js` 注册。替换 Worker 删除该作用域的 Workbox 预缓存，再注销自身；其他缓存和浏览器存储保持原样。预览环境测试应确认 `/sw.js` 返回当前脚本，即使浏览器发送旧版本的条件请求头，并使用 `Cache-Control: no-store`。回滚时移除目录站路由即可重新提供旧 Worker 和原注册脚本。

本地 Chromium 使用与旧站一致的缓存命名和根作用域进行了迁移模拟。浏览器观察到旧注册与旧缓存移除，样例中的独立缓存保留，新 manifest 成功加载。生产实际迁移在 Cloudflare 预览和切换后分别复测。

现行 Cloud Mail 的公开前端脚本会从 `localStorage` 读取 `token`。计划在根域展示游戏目录，把游戏代码放在独立的 `play.xsjgames.com` 来源，避免与旧邮件登录状态共用浏览器存储。Cloudflare 已核对该名称没有现存 DNS 或 Worker 自定义域名绑定。 [当前生产前端脚本](https://xsjgames.com/assets/index-BBqlezd0.js)
