# 一池作品 · Luke

八个作品，一片可拨开的墨色荷塘。中文作品集，以真实 Three.js 几何和 Bayer 有序抖色渲染荷叶、荷花、锦鲤与项目图形。不是将概念图铺成网页背景。

## 运行

```sh
npm ci
npm run dev
```

浏览 `http://127.0.0.1:5187`。生产构建使用 `npm run build`，本地生产预览使用 `npm run preview`（5188）。静态部署目录是 `dist/`，单页路由需要回退到 `index.html`。

## 发布

线上地址：[works.luke-xu.asia](https://works.luke-xu.asia/)；平台地址 [luke-works-show.pages.dev](https://luke-works-show.pages.dev/) 同时可用。独立使用 Cloudflare Pages 项目 `luke-works-show`，不替换主域名上的其他网站。

```sh
npm test
npm run deploy
BASE_URL=https://works.luke-xu.asia node scripts/verify-media.mjs
```

`deploy` 先构建再上传 `dist/` 到生产分支 `main`，需要本机已有 Cloudflare Wrangler 登录。认证信息不写入项目；部署配置与验收记录见 [部署说明](docs/DEPLOYMENT.md)。

## 体验

- 移动鼠标／手指拨开荷叶，鱼持续在各自区域内巡游。露出的锦鲤可点击，键盘 Tab 也可逐条聚焦、拨叶，再按 Enter。
- 锦鲤带透明胸鳍和尾鳍、立起的背鳍及头部细节；游过的水面留下扩散、淡出的抖色涟漪。
- 随鱼进入横向作品长卷。滚轮、触控板、手机横滑、方向键与底部导航均可游览。
- 点击项目荷叶进入纵向详情。关闭或浏览器后退恢复长卷位置。
- 截图默认抖色，点击后可以切换清晰原图；宣传片按需加载，使用离线抖色版本。
- 系统减少动态设置降低场景运动；WebGL 不可用时显示静态降级入口，仍可访问全部作品。

## 修改内容

`src/data/projects.ts` 管理名称、介绍、关键选择、链接与封面顺序。`src/data/media-captions.ts` 按图片 ID 管理独立说明，图片序号跟随项目内的实际展示顺序。原始材料保留在 `screenshots for use/` 和 `各项目亮点.docx`，网站不修改它们。

更新截图后运行 `npm run assets`：需要本机 `ffmpeg`，脚本输出 `public/media/` 和媒体清单，并在运行前后校验所有源文件 SHA-256。已生成的媒体随网站交付，正常构建不需要原始材料或 ffmpeg。

`node scripts/prepare-art.mjs` 生成字形抖色蒙版、静态降级图并从 Google Fonts 官方源获取本地 Noto Serif SC 子集。只有更新展示文字或美术资源时才需要运行；网站运行时不请求远程字体。字体授权在 `public/fonts/OFL.txt`。

`node scripts/prepare-paper.mjs` 可单独重建暖黄宣纸纹理，不会处理原始截图或视频；完整素材管线复用同一生成器。

## 验证与文档

```sh
npm test
npm run typecheck
npm run build
```

- [项目调研](docs/PROJECT_RESEARCH.md)：素材与公开源码的对应、能力边界。
- [实现方案](docs/IMPLEMENTATION_PLAN.md)：渲染、运动、路由与验收拆分。
- [美术方向](docs/ART_DIRECTION.md)：色彩、构图和交互约束。
- [概念图](docs/concepts/README.md)：非绑定视觉参考；实际场景由程序化几何构成。
- [设计系统](DESIGN.md)：当前实现的实际配色、字体、形态、动效和组件规则；对应面板数据在 `.impeccable/design.json`。
- [验收记录](docs/BROWSER_CHECKS.md)：实际浏览器检查、素材校验与尚未验证的真机边界。
- [部署说明](docs/DEPLOYMENT.md)：Cloudflare Pages 发布、域名边界与线上验收。

后续部署仅更新此作品集；未经额外授权，不替换其他个人网站或修改它们的域名绑定。
