# 线上部署

## 生产资源

- 平台：Cloudflare Pages，Direct Upload。
- 独立项目：`luke-works-show`，生产分支：`main`。
- 生产入口：https://works.luke-xu.asia/。
- 平台地址：https://luke-works-show.pages.dev/，同时可用。
- 自定义域名：`works.luke-xu.asia`，Cloudflare 显示“活动、SSL 已启用”。
- DNS：仅新增已代理的 CNAME `works` → `luke-works-show.pages.dev`，TTL 自动。
- `luke-xu.asia` 与 `www.luke-xu.asia` 已用于现有站点，本次不修改其绑定。

## 更新

```sh
npm test
npm run deploy
BASE_URL=https://works.luke-xu.asia node scripts/verify-media.mjs
```

发布脚本固定账户与项目，使用 Wrangler 已有登录；不要在源码、文档或命令输出中保存认证令牌。`wrangler.jsonc` 配置输出目录 `dist/`，账户由部署脚本指定。

只上传构建产物，不发布原始素材目录、Word 文档、源代码或 `.impeccable/review/` 验收截图。`public/media/` 中的清晰截图是站内图片查看器需要的公开资源。

Pages 的默认 SPA 回退用于 `/works`、`/works/:id`；不要加入顶层 `404.html` 而破坏深链接。

## 2026-10-20 首次发布验收

- 部署 ID：`09a3d4c7-204f-462c-af50-fcd77b3341a7`。
- 不变部署地址：https://09a3d4c7.luke-works-show.pages.dev/。
- 应用脚本：`index-BcK-2mE3.js`。
- `index.html` SHA-256：`dca54f2039363680fee18120e7bc99cd22951277bfafcd2c2dc3f16aa9f4b9ad`。
- 单元测试 60 项通过，TypeScript 与生产构建通过。
- `pages.dev` 生产首页、`/works/mosic`、`/works?focus=meet-countdown` 均返回 HTTP 200，响应与本地构建入口逐字相同；不变部署地址也相同。
- 24 个源素材哈希通过；23 张清晰图与源图像素一致；48 个线上媒体 URL 的 HTTP 状态和类型通过检查。
- 实际线上浏览器验证：锦鲤入口进入作品长卷、展开 MOSIC、详情页刷新、图片放大、切换清晰原图、退出查看器。运行期间无浏览器 error 级日志。

自定义域名需在 Pages 中关联后配置 DNS，不能只添加 CNAME。绑定结果和 HTTPS 可访问性另行验证，不将“已填写域名”视为已上线。

### 自定义域名验收

- 控制台确认域名“活动、SSL 已启用”；DNS 表中 `works` 指向独立作品集项目，主域名与 `www` 仍指向原来的 `huazhiai-displayboard.pages.dev`。
- 实际浏览器通过 HTTPS 打开首页，并从锦鲤进入 Meet Countdown 对应作品位置。
- 首页、MOSIC 深链接、Meet Countdown 查询链接均返回 200 并引用当前 bundle；6 个 JS/CSS 文件与本地构建逐字节一致，字体、宣纸和图标正常返回。
- 自定义域名的 48 个媒体 URL 再次通过状态与类型检查。HTTP 入口返回 301 跳转 HTTPS。
- 自定义域名的 HTML 由 Cloudflare 注入既有安全检测脚本，因此入口 HTML 不强求与本地逐字相同；不改动域名现有安全配置。

参考：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)、[SPA 路由](https://developers.cloudflare.com/pages/configuration/serving-pages/)。
