# 项目材料与公开实现核对

材料：本目录 Word 亮点总结、23 张实际截图及约 73 秒宣传片。公开仓库以本次调研实际读取的代码为依据，README 与实现冲突时以当前代码为准。网站不推断业务指标、作者职责比例或未经测量的性能承诺。

| 作品 | 重点 | 公开实现与展示边界 |
| --- | --- | --- |
| [MOSIC](https://github.com/luke711-xyy/moodverse-care/tree/codex/music-cockpit-ui) | 音乐星球、撞歌漫游、个人宇宙 | 现代视觉位于 `codex/music-cockpit-ui`，调研基点 `e39ed1405b88205c9a152a30126505bf895d5133`；main 是旧产品，不能作为当前效果依据。音乐特征映射视觉参数，不能简化为 AI 自动生成全部内容。 |
| [Meet Countdown](https://github.com/luke711-xyy/meet-countdown) | 低打扰双人陪伴、实时水波、涂鸦、录音与清单 | Worker、D1、R2、Durable Object / WebSocket。当前代码已有登录与房间流程，不复用旧 README 的免登录说法。 |
| [Water Reminder](https://github.com/luke711-xyy/Water-Reminder) | 动作感知硬件与 Flutter App、杯具校准和本地学习 | 配置中可确认 ESP32-S3，使用 ESP32 系列概括；MPU6050 与 BLE。设备有限事件缓存，不能描述为永不丢数据；不使用未测的精度、时延或成本数字。 |
| [Moce Worldmaker](https://github.com/luke711-xyy/moce-worldmaker) | 浏览器体素化、编辑、装配、切片与导出 | main 支持 GLB/GLTF、OBJ、STL 导入。扩展导出与切片在 `agent/mard-221-palette-patterns`，基点 `f9d573197745ea2600d9b978e33b083583d29a04`。MCP 在 `agent/mcp-local-3d-generation`，基点 `e5e76fac9301b463dbfc60aa506f7fdfd8528646`，明确标为实验分支。 |
| [Moce Designer 宣传片](https://github.com/luke711-xyy/moce-designer-intro-vedio) | 真实 UI 材料、代码时间轴与产品叙述 | HTML、GSAP、Hyperframes。当前视频与 composition 时长约 73 秒，旧 SCRIPT 文档的 54 秒不用于交付；案例展示宣传片制作，不暗示整个产品由本项目开发。 |
| [Luke Teleprompter](https://github.com/luke711-xyy/luke-teleprompter) | 文稿约束的语音跟读、跳读追赶、稳定门槛 | React / Tauri；连续浏览器语音，云端 Whisper 备用，macOS 本地识别路径。向前匹配与确认门槛避免进度因识别抖动倒退。 |
| [Huazhi Displayboard](https://github.com/luke711-xyy/HuazhiAI_DisplayBoard) | 企业、技能与工业应用场景的关联探索 | Vue 3 / TypeScript；配置驱动、Excel 导入导出、筛选联动、双语、触控与待机演示。 |
| [LanBridge](https://github.com/luke711-xyy/lan-bridge) | Windows 与 macOS 之间的文字文件互传 | Electron / React；mDNS + UDP 发现、六位配对、WebSocket 控制、HTTP 文件流、临时文件更名和同名避让。面向可信局域网，不宣称端到端加密。 |

## Dithering 参考的落实

参考 MOSIC 的 `src/music/dither/shaders.ts`、`renderer.ts`、`appearance.ts` 与 `render-budget.ts`。本网站采用同一类 Bayer 8×8 有序阈值：先绘制真实几何与深度遮挡，再在固定 CSS 像素格上做有限色阶量化。指针改变几何而不是移动抖色网格。纸纹独立于此通道。

截图生成抖色与清晰两份派生图；视频预处理为 Bayer 调色板版本，减少播放时逐帧处理负担。语义文字保留可访问性，并应用低强度有序字形纹理；不把文字烘焙成图片。

## 内容编辑策略

每个案例用一句话说明为何存在、两段概况、三项关键选择和实际截图／视频展开。技术事实服务产品决策，而不是堆砌技术名词。实验能力、持续迭代原型与可直接体验的作品保持区分。
