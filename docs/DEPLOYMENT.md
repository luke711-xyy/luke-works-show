# 线上部署

## 生产资源

- 平台：Cloudflare Pages，Direct Upload。
- 独立项目：`luke-works-show`，生产分支：`main`。
- 生产入口：https://works.luke-xu.asia/。
- 平台地址：https://luke-works-show.pages.dev/，同时可用。
- 自定义域名：`works.luke-xu.asia`，Cloudflare 显示“活动、SSL 已启用”。
- DNS：仅新增已代理的 CNAME `works` → `luke-works-show.pages.dev`，TTL 自动。
- `luke-xu.asia` 与 `www.luke-xu.asia` 已用于现有站点，本次不修改其绑定。

## 2026-10-21 手机轻点误开图片查看器修复

- 运行代码提交：`04ab1c01894f80cfad1358fcd30135702ea07b21`，已推送 GitHub `main`；发布记录另作纯文档提交。
- 不变部署地址：https://ba3b5faf.luke-works-show.pages.dev/。
- 入口 `index-CKai7Ual.js`、场景 `PondScene-CMZ5jF0Y.js`；没有调整视觉、图片、滚动或现有性能预算。
- 项目展开从提前的 `pointerup` 移到统一最终 `click`：松手后命中界面保持不变，避免兼容点击重新命中刚出现的图片按钮。图标、叶内空白、标题、键盘、拖动取消与后续主动点图保留。
- 先以实际应用合成触摸事件复现旧实现误开，再通过 48 条完整项目点击链、4 条拖动/键盘检查与 42 次主动点图检查；117 项单元测试、TypeScript、生产构建、格式与只读代码复核通过。触摸回归是桌面 Chromium 合成事件，不是实际手机 Safari 认证。
- 正式域名、平台域名、不变部署域名均通过首页及两条深链接检查（每个域名 3 条 HTTP 200/新入口），7 个 JS/CSS 与本地构建逐字节相同。24 个源素材哈希、23 张清晰图像素一致性、48 个线上媒体 URL 校验通过。
- 实际正式域名浏览器确认点击 MOSIC 只打开带标题、摘要、正文的详情，`.image-viewer[open]` 数量为 0；无 warn/error。证据 `.impeccable/review/gesture-fixed-live.png`，不随站点公开发布。

## 2026-10-21 纸纹题字、头部游姿与统一项目点击发布

- 运行代码提交：`e6aae4810a5cd36e1b9575934c296acec19648ca`，已推送 `luke711-xyy/luke-works-show` 的 `main`；随后单独提交本次发布记录，不改变构建产物。
- 不变部署地址：https://9623619a.luke-works-show.pages.dev/。
- 入口脚本 `index-CQZlQv17.js`；场景脚本 `PondScene-BRroi7od.js`；样式 `index-v31x8Ntk.css`。
- 内容：可见纸纤维、`Luke’s Collection`、随叶移动的“徐弋洋·作品集”；同时发布此前本地的自然头部摆动及电脑/手机统一图标点击、同帧标题绑定和 History 写入失败降级。此前已发布但尚未推 GitHub 的原彩图片、鱼鳍、花叶及性能更新也同步源码。
- 117 项测试（17 文件）、TypeScript、生产构建和只读代码复核通过。390/768/1280px 布局检查通过；48 条全项目合成交互通过，最大标题投影误差约 0.111 CSS px。未把尺寸模拟宣称为真机性能认证。
- 正式域名、平台域名和不变部署域名的首页、MOSIC 深链接及 Meet Countdown 查询链接均为 HTTP 200 并引用新入口；三个域名的 7 个 JS/CSS、带 `v=2` 的纸纹与字体均与本地构建逐字节一致。
- 正式域名 48 个媒体 URL、24 个源素材哈希、23 张清晰原图像素一致性复核通过；23 张手机原彩 WebP 的响应内容哈希、类型和 immutable 缓存头通过。
- 实际正式域名浏览器确认首页题字、增强纸纹、英文长卷标题，从锦鲤进入 Moce Designer，点击皮影图标立即打开详情。检查期间应用无 warn/error；未修改主域名、`www`、DNS 或安全策略。

## 2026-10-21 鱼鳍细化与累计本地更新发布

- 不变部署地址：https://cbb1f613.luke-works-show.pages.dev/。
- 入口脚本 `index-DYaTlrxH.js`；场景脚本 `PondScene-C_x4jwhW.js`。
- 发布淡灰褐鳍缘、低对比鳍条，以及此前本地完成的移动端优化、荷花扰动、清晰图片、台板与荷叶边缘修复。
- 107 项测试、TypeScript、生产构建通过。三个地址（正式域名、平台域名、不变部署域名）的首页、MOSIC 深链接、Meet Countdown 查询链接均返回 200 并引用新入口；每个地址的 7 个 JS/CSS 文件均与本地构建逐字节一致。
- 正式域名上 48 个既有媒体 URL、源素材 24 个哈希及 23 张清晰图像素复核通过；新手机原彩图片返回 immutable 缓存策略。
- 实际正式域名浏览器检查锦鲤入口、作品长卷、Water Reminder 案例、原彩图片与查看器，检查窗口无 warn/error。仅部署静态构建，没有推送或改动 GitHub 仓库。

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
