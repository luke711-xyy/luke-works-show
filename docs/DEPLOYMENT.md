# 线上部署

## 生产资源

- 平台：Cloudflare Pages，Direct Upload。
- 独立项目：`luke-works-show`，生产分支：`main`。
- 生产入口：https://works.luke-xu.asia/。
- 平台地址：https://luke-works-show.pages.dev/，同时可用。
- 自定义域名：`works.luke-xu.asia`，Cloudflare 显示“活动、SSL 已启用”。
- DNS：仅新增已代理的 CNAME `works` → `luke-works-show.pages.dev`，TTL 自动。
- `luke-xu.asia` 与 `www.luke-xu.asia` 已用于现有站点，本次不修改其绑定。

## 2026-10-23 LanBridge 乌篷船与撑篙老人发布

- 运行代码提交：`7367f9253cbfa6ca5eb2860a3aa3f214a295ce41`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://66ec6ef4.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台地址仍可用。
- 新入口 `index-Cc7kRRFQ.js`、场景包 `PondScene-B5d8tzab.js`；样式仍为 `index-C8d1tEbw.css`。
- 将 LanBridge 的木帆船替换为两端微翘、前后开口的中式乌篷船，船头加入斗笠、蓑衣、白须老人及六秒一轮的连续撑篙动作。双臂保持定长、双手握住同一竹篙，全周期检查船壳、甲板、斗笠与篙身净空；保留封闭内底板、船身轻摇、水纹和共享 Bayer 抖色，减少动态时定格。模型只更新已有对象变换，蓑衣与帽肋实例化，没有新增素材请求、依赖或计时器；其他七个项目未改。
- 本发布轮重新执行完整 206 项测试（25 文件，单 worker、`VIPS_CONCURRENCY=1`）、TypeScript、生产构建、格式及差异检查，全部通过。读取实施阶段的最终浏览器报告，确认 390／1280px 项目入口 10/10 检查通过且 errors 为空；本轮未重新启动动态浏览器预览，未干预用户训练任务，不将尺寸模拟称为真机认证。
- 正式域名、默认平台域名、不变部署域名的首页、LanBridge 查询链接和详情深链接共 9 条 HTTP 200，均引用新入口；三个域名各 7 个 JS/CSS 内容哈希与本地构建一致。初次并行读取遇到本机连接超时，改为串行读取后完整核验通过，没有修改站点或 DNS 来绕过检查。
- 本地实际渲染截图及几何／交互证据见 `docs/BROWSER_CHECKS.md`，不将此前本地截图称为本次线上浏览器截图。验收夹具、截图和报告未部署；未修改图片、字体、DNS、域名绑定、认证或安全策略。

## 2026-10-22 三级标题字母下沿完整显示发布

- 运行代码提交：`34bf11f75b488eb47f399cb72520f4ca3ce01557`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://4d7dd248.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台地址仍可用。
- 新入口 `index-Co1L_WdH.js`、场景包 `PondScene-CYjTfzT2.js`、样式 `index-C8d1tEbw.css`。
- 为所有三级项目主标题预留 0.2em 的蒙版下沿空间，修复 p／g／y 等字母下伸部被文字颗粒蒙版截断；以等量负外边距保持原副标题位置。字体、字号、行高、字距、正文和场景代码不变。
- 本发布轮 TypeScript、生产构建、格式及差异检查重新通过；读取实施阶段的六尺寸／本地与回退字体报告，确认 108/108 检查通过。完整 201 项测试（25 文件）已在紧接本次发布的实施轮以单 worker、`VIPS_CONCURRENCY=1` 通过，本发布轮未重复完整测试或启动动态浏览器预览；没有干预用户训练任务。
- 正式域名、默认平台域名和不变部署域名的首页、Worldmaker 查询链接、Teleprompter 深链接共 9 条 HTTP 200，均引用新入口；每个域名的 7 个 JS/CSS 与本地构建逐字节一致，包含修复后的标题样式。
- 本地实际详情截图及字形检查报告见 `docs/BROWSER_CHECKS.md`，不将此前本地截图称为本次线上浏览器截图；验收夹具、截图和报告未部署。未修改媒体、字体、DNS、域名绑定、认证或安全策略。

## 2026-10-21 手机首页错落荷叶布局发布

- 运行代码提交：`6fdae54cd84615e5d91140b964ed1c994451bd99`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://d04e8748.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台地址仍可用。
- 新入口 `index-BiSUZf7O.js`、场景包 `PondScene-Do1BQ1zm.js`；样式仍为 `index-Krt4pjWN.css`。
- 仅调整宽度小于 640px 的首页 24 片荷叶位置与相对尺寸，打散原有三列排列，改为大小交错的斜向叶群与不规则水面留白；不增加模型或依赖。桌面位置、尺寸和旋转逐项对照不变，题字叶片、花苞、荷花、锦鲤及拨叶交互保留。
- 本发布轮重新执行 TypeScript、生产构建、格式及差异检查，全部通过。实施阶段三项新增布局回归及实际应用浏览器夹具 37/37 检查已通过，覆盖 320／360／390／430px、触摸拨叶、详情往返及桌面比较；这些是尺寸与合成触摸验证，不是真机认证。本轮读取既有报告确认结果，未重新启动动态浏览器预览。
- 此前完整测试曾为 200/201，通过项之外的一项既有媒体完整性检查发生 5 秒超时，随后以 `VIPS_CONCURRENCY=1` 独立运行通过。用户说明电脑正在训练并要求忽略负载相关超时，本发布轮未重跑完整测试或昂贵媒体检查，未修改测试超时或干预训练进程。
- 正式域名、默认平台域名及不变部署域名的首页、Worldmaker 查询链接和 Huazhi 深链接共 9 条 HTTP 200，均引用新入口；每个域名的 7 个 JS/CSS 与本地构建逐字节一致。图片、字体及样式未改，未修改 DNS、域名绑定或安全策略。
- 实施阶段证据 `.impeccable/review/mobile-pond-after.png`、`mobile-pond-layout-checks.json`、`mobile-pond-desktop-baseline.json` 与 `mobile-pond-desktop-after.json` 保留在本地；桌面前后快照完全一致。测试夹具与验收证据不进入静态部署产物。

## 2026-10-21 长卷蓝框修复与全站内容交互保护发布

- 运行代码提交：`cf69ba0996ac056d8632564acef1d07c55b05841`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://0ae35c18.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台地址仍可用。
- 新入口 `index-DRkq6xbx.js`、场景包 `PondScene-C8ptDlav.js`、样式 `index-Krt4pjWN.css`。
- 仅取消横向长卷滚动容器恢复焦点后的默认 outline，避免上下蓝线；保留焦点与既有键盘提示。全站统一禁选、禁复制／剪切、禁上下文长按菜单和原生内容拖拽，并清除残留选区；普通点击、滚动、图片缩放和语义内容不变。这是浏览器内交互策略，不是防截图或源码提取机制。
- 发布前完整重跑 198 项测试（25 文件）、TypeScript、生产构建、格式及差异检查通过。实际应用 390／1280px 的 82 项内容／详情往返回归重新运行全部通过；前一实施轮的既有 53 项全控件焦点回归也全部通过。尺寸与合成事件检查不等同于真机微信／iOS Safari 认证。
- 正式域名、默认平台域名及不变部署域名的首页、Worldmaker 查询链接和 Huazhi 深链接共 9 条 HTTP 200，均引用新入口；每个域名 7 个 JS/CSS 与本地构建逐字节一致，开屏字体也通过哈希检查。24 个源素材哈希、23 张清晰图像素一致性及 48 个正式域名媒体 URL 检查通过。
- 正式网站读回新入口，主动聚焦 `.gallery-scroll` 后 outline 为 `none`，长卷标题和案例正文 `user-select` 为 `none`，点按高亮透明。Huazhi 详情可正常打开，主动点图进入 01/03／100%，放大至 125%，关闭图片与详情返回同一长卷；再次聚焦滚动容器仍无蓝框，控制台无 warn/error。截图 `.impeccable/review/content-guard-release-live.png` 为实际正式网站，未公开发布验收夹具或截图；未改 DNS、域名绑定、认证或安全策略。

## 2026-10-21 开屏诗句字体与居中修复发布

- 运行代码提交：`be0aba44c27a508fd41e51a1ba62e5f196d80e3b`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://0a5a182f.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台地址仍可用。
- 新入口 `index-BI1zuk0G.js`、场景包 `PondScene-BhwfTWPD.js`、样式 `index-CwffKJ14.css`。
- 开屏改用包含全部诗句字形的独立 Noto Serif SC 400 子集并在 HTML 预加载，避免旧正文子集缺字时逐字混入系统字体；原正文主字体不变。新文件 `pond-poem-30afa856ce.woff2` 为 13,244 字节，SHA-256：`30afa856cee929609cffe6d558e87f6a47effff18d508ec3a718e1a0ebb26cee`。按行末标点可见墨迹修正光学居中，保留原文字、字号、加载时序和渐隐过渡。
- 发布前完整重跑 198 项测试（25 文件）、TypeScript、生产构建、格式及差异检查通过。此前实际加载组件在 320／360／390／430／768／1280px、字体不可用回退下的 46 项检查通过，覆盖逐字字形、可见墨迹中心及溢出；这是 Chromium 尺寸／故障模拟，不是真机 iOS 或微信认证。
- 正式域名、默认平台域名、不变部署域名的首页、Worldmaker 查询链接及 LanBridge 深链接共 9 条 HTTP 200，均引用新入口及诗句字体预加载；三个域名各 7 个 JS/CSS、新字体内容哈希均与本地构建一致。字体返回 `font/woff2`，缓存为 `public, max-age=604800, stale-while-revalidate=86400`。24 个源素材哈希、23 张清晰图像素一致性及 48 个正式域名媒体 URL 检查通过。
- 正式网站实际打开可见三行诗句，加载层正常退出；读回新入口和字体预加载。8 个锦鲤项目入口正常显示，MOSIC 可进入长卷及详情、关闭后返回长卷和首页；检查期间无 warn/error。线上首页截图 `.impeccable/review/loading-typography-release-live.png` 为加载完成后的正式页面，不作为开屏字体特写；实际加载组件的手机尺寸特写见 `loading-typography-phone.png`。验收截图和测试夹具不进入部署产物。未改 DNS、域名绑定、认证或安全策略。

## 2026-10-21 默认声音与稀疏连续划水波发布

- 运行代码提交：`7bf4dda14fcb3828616e7cbc4035a56f67de67cd`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://cb109127.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台地址 https://luke-works-show.pages.dev/ 仍可用。
- 新入口 `index-B2D_tMiZ.js`、场景包 `PondScene-CjJcmGwe.js`、样式 `index-n2G6-TdV.css`。
- 发布三段用户录音的轻量派生音频：默认异步准备并尝试播放背景声，若浏览器限制则首次指针／按键交互唤醒同一上下文；首页拨动花叶时播放有尾音渐弱的水声，选鱼／选项目叶时播放短水滴。按最新要求没有声音按钮或布局占位，也不读取旧静音偏好。音频约 735KB，使用内容哈希 URL 与 immutable 缓存。
- 轻点、拖动和松手共用同一波前模型及固定网格：椭圆扩散连续形成方向性尖锋与波翼，停止后自然传播、衰减，保留 Bayer 抖色和花叶遮挡。按发布前反馈，将连续移动生成间隔由 80ms 增至 240ms，持续生成频率降为初版三分之一；首个轻点即时反馈、波峰造型和约 20Hz 几何更新不变。
- 发布前完整 198 项测试（25 文件）、TypeScript、生产构建、格式及 diff 检查通过。密度回归先在旧实现观察到一秒输入留下 12 个波包，再验证调整后为 5 个（首个接触加 4 个后续波包）。390／1280px 实际应用触摸／鼠标水波检查 14 项全部通过；音频默认启动与首次 resume 被拒的真实原生音频边界检查见 `docs/BROWSER_CHECKS.md`。这些检查不等同于真机 iOS／Android 认证。
- 正式域名、默认平台域名、不变部署域名的首页、Worldmaker 查询链接及 LanBridge 深链接共 9 条 HTTP 200，均引用新入口；三个域名各 7 个 JS/CSS 均与本地构建逐字节相同，三段 MP3 也分别通过内容哈希、音频类型和 immutable 缓存检查。24 个源素材哈希、23 张清晰图像素及 48 个正式域名媒体 URL 再次通过。
- 正式域名原生鼠标划水、选鱼进入长卷、点击 MOSIC 荷叶、主动打开 01/04／100% 图片查看器、关闭各层并返回首页均正常；声音按钮数量为 0，读回新入口，无 warn/error。线上证据 `.impeccable/review/sparse-contact-audio-release-live.png` 不随站点发布。未改 DNS、主域名、www、认证或安全策略。

## 2026-10-21 详情与加载叠化、锦鲤光标尺寸发布

- 运行代码提交：`147ac14000b1662d99b51f19b6307fc2ceaef8e1`，已推送 GitHub `main`；本发布记录另作纯文档提交。
- 不变部署地址：https://745c2232.luke-works-show.pages.dev/。正式入口仍为 https://works.luke-xu.asia/，默认平台域名仍可用。
- 新入口 `index-BUgxhFOm.js`、场景包 `PondScene-CmGCSQ1P.js`、样式 `index-n2G6-TdV.css`。两份原生锦鲤 SVG 以 `?v=2` 更新，避免旧版日缓存。
- 二／三级进入 220ms、退出 180ms 透明度叠化；古诗加载层在首帧／回退就绪后 320ms 淡出。保留同一场景，不再使用叶形全屏扩展；退出中保留模态与指针隔离，避免点击冒泡重新打开背后荷叶。重复关闭、历史后退与前进中断均已检查。基础光标可见轮廓约 20px，可点击态约 28px，鱼头热区不变；减少动态时叠化缩至 1ms。
- 发布前完整 185 项自动测试（23 文件）、TypeScript、生产构建、格式与 diff 检查通过。真实应用浏览器回归：28 项过渡／中断／降低动态检查、52 项手机尺寸与桌面项目入口检查、53 项焦点／查看器／回退检查全部通过。真机 iOS／Android 未单独认证。
- 三个域名的首页、Worldmaker 查询链接和 LanBridge 深链接共 9 条 HTTP 200，均引用新入口；各域名 7 个 JS/CSS 及两份光标与本地文件逐字节相同。24 个素材源哈希、23 张清晰图像素及 48 个正式域名媒体 URL 检查通过。
- 正式域名实际完成首页进入长卷、点击 MOSIC、打开图片、原生 Escape 仅关闭图片、关闭详情及返回首页。最终无残留 dialog／加载层，无 warn/error，读回新入口脚本。验收截图 `.impeccable/review/transition-release-live.png` 为真实线上首页，不是叠化中间帧。未改 DNS、主域名或 www。

## 2026-10-21 加载花叶剪影重绘发布

- 运行代码提交：`bd63d88fb909f93b10aea6975c713b237e210514`，已推送 GitHub `main`；本记录另作纯文档提交。
- 不变部署地址：https://3ac5df93.luke-works-show.pages.dev/。
- 入口 `index-BLhNvY-O.js`、场景 `PondScene-JNMzTqn7.js`；样式仍为 `index-ChaQ0OJp.css`。
- 此前待确认的花叶构图已获用户明确实施授权并完成：小叶左上、叶口向左上，大叶右下、叶口向右下；七瓣莲花端正对称，花叶接触处有透明留缝，真实透出纸纹。尺寸、颜色、三行诗句、动画与实际加载时序均未改变；没有新增图片请求或依赖。
- 新增四项实际组件 SVG 栅格回归先红后绿；完整 185 项测试（23 文件）、TypeScript、生产构建、格式及布局扫描通过。实际组件在 320／390／1280px 的加载页与原显隐／回退／光标流程 18 项检查全部通过。
- 正式域名、默认域名、不变部署域名的首页、Worldmaker 查询链接与 LanBridge 深链接共 9 条 HTTP 200，分别引用新入口；三个域名各 7 个 JS/CSS 与本地构建逐字节相同，入口包含新剪影及透明遮罩。24 个源素材哈希、23 张原彩图像素及 48 个正式域名媒体 URL 检查通过。
- 正式域名实际打开时可见三行诗句，随后正常进入具有 8 个项目入口的荷塘，确认新脚本且无 warn/error。`loading-mark-final.jpg` 为实际加载组件的固定预览；`loading-mark-live.png` 为加载结束后的正式荷塘截图，不将它称为线上图标近照。验收媒体位于 `.impeccable/review/`，不随网站公开发布。未修改 DNS、域名绑定或安全策略。

## 2026-10-21 图文排版、交互细化与累计本地修改发布

- 运行代码提交：`15f978cb1f635e21f0f9226bdf761d1e447831b9`，已推送 GitHub `main`；本次发布记录另作纯文档提交。
- 不变部署地址：https://7de69256.luke-works-show.pages.dev/。
- 入口 `index-CHqBC-Py.js`、场景 `PondScene-DwTpbuyT.js`、样式 `index-ChaQ0OJp.css`。
- 发布此前已完成的累计修改：案例图文嵌入、标题与正文成组绕图、LanBridge 放大左图及固定右列、去除紫色焦点框、Worldmaker 作品网址、加速往返相机切换、手机鱼名按露出比例渐显隐，以及三行诗句加载页和原生锦鲤光标。两叶／莲花的新参考构图仍是待确认方案，未实施、不包含在本次部署。
- 发布前完整重跑 181 项测试（22 文件）通过，TypeScript、生产构建、格式与差异检查通过。五尺寸全项目排版、八尺寸 LanBridge、焦点、项目入口等此前实际应用验收见 `docs/BROWSER_CHECKS.md`；未把桌面尺寸和合成触摸验证称为真机认证。
- 正式域名、默认平台域名、不变部署域名分别检查首页、Worldmaker 查询链接、LanBridge 深链接：共 9 条 HTTP 200，并引用新入口；每个域名的 7 个 JS/CSS 及 2 个锦鲤光标 SVG 均与本地构建逐字节一致。24 个原素材哈希、23 张原彩图片像素一致性及 48 个正式域名媒体 URL 检查通过。
- 正式域名实际浏览确认：LanBridge 使用新两列图文布局，自动聚焦关闭按钮无 outline；主动点图正常打开 01/01、100%，放大至 125% 出现还原，Escape 关闭图片层并返回原图入口。Worldmaker 同时有源码与 `https://moce.luke-xu.asia/` 作品链接；关闭后回到长卷，并能返回荷塘。检查窗口无 warn/error。
- 线上详情截图 `.impeccable/review/collection-release-live.png`；截图、原始素材、Word 文档和浏览器测试夹具不进入静态构建。未修改 DNS、其他站点绑定、认证或安全策略。

## 2026-10-21 连续场景与可缩放图集发布

- 运行代码提交：`729905ebfbc7068e014a0c0f2bc4d324854197f2`，已推送 GitHub `main`；部署后的本记录单独提交。
- 不变部署地址：https://055daa2b.luke-works-show.pages.dev/。
- 入口 `index-B-LnIRRU.js`、场景 `PondScene-Cnu4IcIG.js`、样式 `index-BoB397Ke.css`。
- 发布两份已确认方案：原首屏构图不变，右侧完整叶片与扰动包络持续保留于屏幕外，长卷接在缓冲区后；预热模型移至空闲任务，实际抖色通道 shader 就绪再显示，纸纹及入口走合成位移。图片查看器支持适应窗口相对 100%–800% 缩放、条件还原、同项目图片序号、100% 滑动切图、放大后拖动和按钮／键盘切图。
- 138 项测试（18 文件）、TypeScript、生产构建、格式与差异检查通过；独立复核无未解决的 Critical／Important。实际 React 查看器在 390／1280px 下 36 项交互检查通过，实际应用全项目点击链及取消／键盘 52 项通过；手机触摸证据为合成 PointerEvent，不是真机认证。性能同机样本与限制见 `docs/PERFORMANCE.md`。
- 三个域名各自的首页、Worldmaker 查询链接与案例深链接均 HTTP 200 并引用新入口；各 7 个 JS/CSS 与本地构建逐字节一致。24 个源素材哈希、23 张原彩图像素一致性与正式域名 48 个媒体 URL 校验通过。
- 正式域名原生输入确认：从凉亭进入详情后点图，按钮缩放至 800% 且上限禁用、还原至 100% 并居中，水平拖动从 01/04 切到 02/04 并保持 100%；再放大后拖动确实平移原图，原彩图已加载。Escape 只关闭最上层，第二次关闭详情，再沿原路返回荷塘。检查期间无 warn/error。
- 线上图集证据 `.impeccable/review/zoom-gallery-live.png`，中途完整叶片证据 `continuous-foliage-midway.png`；验收截图及测试夹具不在静态构建中。未改 DNS、主域名、安全策略或原始媒体内容。

## 2026-10-21 手机鱼名、标题符号与凉亭停留发布

- 运行代码提交：`0db10f2e7ad56aae06fc7368c638bd6a8e7c0883`，已推送 GitHub `main`；发布记录另作纯文档提交。
- 不变部署地址：https://bd3fec93.luke-works-show.pages.dev/。
- 入口 `index-N6WHW7Tp.js`、场景 `PondScene-dHeklT8W.js`、样式 `index-C_W6pScV.css`。
- 内容：手机布局、无 hover 或粗指针设备的首页鱼名常显，手机长名称自然换行，保持透明背景和不拦截指针；桌面细指针仍按显露／聚焦显示。长卷标题使用半角单引号 `Luke's Collection`。凉亭完全消失停留由 1.4 秒缩至 0.7 秒，生成／消散速度、完整展示及假山不变。
- 新讨论的首屏右侧缓冲区／切换性能优化、100%–800% 图片缩放与切图尚未实施，不在本次发布内。
- 118 项测试（17 文件）、TypeScript、生产构建、差异与格式检查通过。此前 390px 实际应用 iframe 鱼名验证和 1280px 桌面聚焦检查通过；未将尺寸模拟宣称为真机手机认证。
- 正式域名、平台域名及本次不变部署地址的首页、Worldmaker 查询链接、MOSIC 深链接均 HTTP 200 并引用新入口；每个域名的 7 个 JS/CSS 与本地构建逐字节相同。24 个源素材哈希、23 张原彩图像素一致、48 个正式域名媒体 URL 校验通过。
- 实际正式域名浏览器确认新标题，点击凉亭只进入项目详情（查看器数量 0），随后主动点图正常打开并加载原彩图，关闭后回到同一项目长卷位置。检查期间无 warn/error；截图 `.impeccable/review/release-20261021-mobile-labels.png` 不随站点公开发布。未改动 DNS、主域名或安全策略。

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
