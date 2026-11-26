# 小游戏站

`site/` 是方案 A「精选展厅」的目录站。`design-preview/` 留存三版设计预览。 [首发清单与筛选口径](docs/launch-candidates.md) · [部署与验收记录](docs/release.md)

在项目根目录安装依赖并运行本地目录预览：

```powershell
npm ci
python -m http.server 4316 --bind 127.0.0.1 --directory site
```

目录默认打开生产试玩域 `https://play.xsjgames.com/`。在独立的预览副本中，可以将 `site/index.html` 的 `data-play-origin` 指向测试来源。

## 静态包与验证

```powershell
npm run scan:static -- <静态目录> <报告路径>
npm run pack:static -- <静态目录> <本次输出的新目录>
node scripts/verify-games.mjs https://play.xsjgames.com/ release-output/runtime/production
```

公开目录与试玩资源分别由 `xsjgames-catalog` 和 `xsjgames-play` Workers 提供。每款游戏的 ZIP、SHA-256 清单、扫描报告和浏览器验收截图保存在本地 `release-output/`。 [静态交付工具说明](docs/release-preflight.md)
