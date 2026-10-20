import manifest from "./media.generated.json";
import { mediaCaptions } from "./media-captions";

export type ProjectId =
  | "mosic"
  | "meet-countdown"
  | "water-reminder"
  | "worldmaker"
  | "moce-film"
  | "teleprompter"
  | "huazhi"
  | "lanbridge";
export type Media = {
  id: string;
  kind: "image" | "video";
  source: string;
  clear?: string;
  dither: string;
  poster?: string;
  width: number;
  height: number;
  caption: string;
};
export type Project = {
  id: ProjectId;
  title: string;
  chinese: string;
  summary: string;
  introduction: string[];
  decisions: { title: string; text: string }[];
  repo: string;
  demo?: string;
  cover: string;
  medium: string;
  accent: string;
};

export const projects: Project[] = [
  {
    id: "mosic",
    title: "MOSIC",
    chinese: "音乐星球",
    medium: "音乐 · 生成视觉 · 交互产品",
    accent: "#927289",
    summary: "顺着一首喜欢的歌，遇见另一个人的宇宙。",
    introduction: [
      "音乐产品很擅长回答“下一首听什么”。MOSIC 关注另一个问题：谁也喜欢这首歌，他们还在听什么？",
      "选入的歌曲塑造自己的音乐星球。点击“撞歌”，沿着同一首歌访问别人的星球、歌曲与公开 Moments，再从下一首歌继续漫游。连接发生在音乐之中，探索可以保持轻缓。",
    ],
    decisions: [
      {
        title: "让歌曲承担连接",
        text: "同歌通道把选择了同一首歌的人联系起来。浏览、留下足迹与继续漫游组成连续体验，音乐始终是探索的起点。",
      },
      {
        title: "把音乐映射为可辨识的外观",
        text: "曲风、情绪、节奏等特征进入确定性的视觉参数映射，驱动星球形态、纹理与运动。像素网格、阈值和色阶共同形成 dithering 语言。",
      },
      {
        title: "让复杂画面保持连续",
        text: "共享 WebGL 绘制通道，复用纹理与材质单元；指针扰动与漫游转场在同一视觉体系中衔接。",
      },
    ],
    repo: "https://github.com/luke711-xyy/moodverse-care/tree/codex/music-cockpit-ui",
    demo: "https://moodverse-care.pages.dev/",
    cover: "0cc3c8893559d97a4c8d83567c51d903.png",
  },
  {
    id: "meet-countdown",
    title: "Meet Countdown",
    chinese: "见面倒计时",
    medium: "双人陪伴 · 实时交互",
    accent: "#8e9a7b",
    summary: "知道还有多久见面，也能轻轻感知彼此。",
    introduction: [
      "为异地情侣或朋友设计的低打扰陪伴工具。打开网页，一张共同选择的照片和见面倒计时成为安静的日常背景。",
      "划过画面产生水波，留下涂鸦、录音或一条共享清单。在各自的生活主线之外，为对方保留一个可以随时回来、无需持续对话的位置。",
    ],
    decisions: [
      {
        title: "陪伴也可以很轻",
        text: "把倒计时与共同背景留在画面中心，录音与清单收在边缘。功能围绕彼此的存在感展开。",
      },
      {
        title: "让一次触碰抵达另一端",
        text: "水波与涂鸦形成即时反馈。房间通过 Durable Object 与 WebSocket 同步交互，持久内容由 D1 与 R2 承接。",
      },
      {
        title: "把房间做成共同空间",
        text: "通过账号进入共同房间，共享背景、留言和清单。",
      },
    ],
    repo: "https://github.com/luke711-xyy/meet-countdown",
    demo: "https://meet.luke-xu.asia/",
    cover: "416b597ddcfe2c72312dc55258cf58d1.png",
  },
  {
    id: "water-reminder",
    title: "Water Reminder",
    chinese: "喝水提醒设备与 App",
    medium: "软硬件产品 · 动作感知",
    accent: "#bc8c45",
    summary: "从一次拿起水杯，到逐渐熟悉这个杯子的饮水记录。",
    introduction: [
      "一个围绕真实杯具动作展开的软硬件系统：设备采集动作，App 组织饮水事件、杯具、校准与统计。",
      "ESP32 系列微控制器与 MPU6050 组成动作感知端，通过 BLE 与 Flutter App 协作。记录之外，杯具模型也可以利用校准与用户修正持续更新。",
    ],
    decisions: [
      {
        title: "串起设备与日常使用",
        text: "从传感器轨迹、动作检测到手机事件与统计，让一条真实饮水记录有完整的来路。",
      },
      {
        title: "围绕杯具学习",
        text: "每个杯具有独立记录与校准。特征提取和本地 MLP 训练区分弱监督约束与用户修正标签，模型启用也设置了样本门槛。",
      },
      {
        title: "处理连接中断",
        text: "设备缓存离线饮水事件，重连后与 App 同步；App 提供杯具管理、记录修正及周月统计。",
      },
    ],
    repo: "https://github.com/luke711-xyy/Water-Reminder",
    cover: "b195d1b3b2c5d7c544e03377ecdf0663.png",
  },
  {
    id: "worldmaker",
    title: "Moce Worldmaker",
    chinese: "莫测造境",
    medium: "浏览器创作工具 · 体素",
    accent: "#a57155",
    summary: "把一个模型，变成可以重新搭建的体素世界。",
    introduction: [
      "面向立体拼豆与 3D 打印创作的浏览器体素编辑器。导入已有模型后，仍然可以拆分、装配、改色和继续编辑。",
      "文件树与装配关系帮助组织复杂对象；切片把空间结构转为可执行的二维图纸，模型导出则连接后续创作工具。",
    ],
    decisions: [
      {
        title: "导入之后仍然可编辑",
        text: "支持 GLB／GLTF、OBJ 与 STL 模型体素化，并提供实体、部件与装配组织。体素化工作由 Worker 承接，避免把重计算堆在界面线程。",
      },
      {
        title: "让作品能够走出浏览器",
        text: "支持 STL、GLB、VOX 模型导出，以及 PNG／JPG／PDF 切片图纸和模型切片打包。",
      },
      {
        title: "把 Agent 接进编辑现场",
        text: "通过 MCP 将 Agent 接入编辑器，以本地配对桥接和原子体素程序操作场景，并接入撤销栈；图生模型可作为独立创作流程。",
      },
    ],
    repo: "https://github.com/luke711-xyy/moce-worldmaker",
    cover: "SCR-20261019-pdbk.png",
  },
  {
    id: "moce-film",
    title: "Moce Designer",
    chinese: "产品宣传片",
    medium: "动态设计 · 代码动画",
    accent: "#a07888",
    summary: "让一个硬件 Agent 的工作流程，在 73 秒里被看见。",
    introduction: [
      "一段以真实产品 UI 为材料的动态演示。用 Codex 与 Hyperframes 制作，通过代码编排场景、镜头、虚拟光标和声音节奏。",
      "叙述沿着需求、功能分析、硬件工作流、模型配置和项目记忆展开，让观众通过操作理解产品。",
    ],
    decisions: [
      {
        title: "让操作带出信息",
        text: "使用真实界面、点击响应和局部推进组织叙述，重要流程按操作逐步出现。",
      },
      {
        title: "用代码组织时间",
        text: "HTML 组合与 GSAP 时间轴控制镜头和元素，Hyperframes 承接组合与渲染；场景和音效都能逐帧调整。",
      },
      {
        title: "让节奏服务理解",
        text: "局部放大、光标和声音落在同一时间轴上，帮助观众抓住每一段的核心动作。",
      },
    ],
    repo: "https://github.com/luke711-xyy/moce-designer-intro-vedio",
    cover: "",
  },
  {
    id: "teleprompter",
    title: "Luke Teleprompter",
    chinese: "语音跟读提词器",
    medium: "语音交互 · 创作工具",
    accent: "#9e704f",
    summary: "文稿跟着人走，允许停顿、漏读与跳句。",
    introduction: [
      "一个支持中英文的语音跟读提词器。原稿保持稳定，识别结果只用来判断阅读位置；讲述者可以按自己的节奏继续。",
      "网页端优先使用连续浏览器语音流，提供云端 Whisper 备用路径；macOS Tauri 版本保留本机识别方式。",
    ],
    decisions: [
      {
        title: "原稿是位置的约束",
        text: "将识别文本与原稿向前窗口匹配，支持漏读、跳句后追赶。阅读进度不会因识别抖动自动倒退。",
      },
      {
        title: "在响应与稳定之间设门槛",
        text: "高置信临时结果可即时推进；较弱假设需要连续结果确认，恢复匹配也有单独的确认机制。",
      },
      {
        title: "照顾真实录制场景",
        text: "镜像、阅读位置、字号、重点词与不参与跟读的动作提示共同服务录制；文稿与设置在本机保存。",
      },
    ],
    repo: "https://github.com/luke711-xyy/luke-teleprompter",
    demo: "https://luke-teleprompter.pages.dev/",
    cover: "SCR-20261019-pblv.png",
  },
  {
    id: "huazhi",
    title: "Huazhi Displayboard",
    chinese: "具身智能全景图",
    medium: "信息可视化 · 工业场景",
    accent: "#737f92",
    summary: "把企业、技能与应用场景，放进一张可以探索的关系图。",
    introduction: [
      "面向工业智能展示的交互全景大屏。企业、合作状态、技能平台与业务场景在同一个空间中建立联系。",
      "通过悬停、筛选和详情展开逐层获取信息；业务数据由配置驱动，内容维护可以回到熟悉的 Excel 工作流。",
    ],
    decisions: [
      {
        title: "用关联组织复杂信息",
        text: "企业选择与技能节点通过连线、状态与详情联动，让观众从一个对象顺着关系继续探索。",
      },
      {
        title: "让内容更新成为常规操作",
        text: "JSON 配置驱动内容，Excel 导入导出连接维护流程，中英文本集中管理。",
      },
      {
        title: "兼顾展示与主动探索",
        text: "大屏自适应缩放、触控交互和待机演示服务不同的现场使用状态。",
      },
    ],
    repo: "https://github.com/luke711-xyy/HuazhiAI_DisplayBoard",
    cover: "SCR-20261019-uhld.jpeg",
  },
  {
    id: "lanbridge",
    title: "LanBridge",
    chinese: "跨系统文件快传",
    medium: "桌面工具 · 局域网协作",
    accent: "#80917a",
    summary: "同一张网络里的两台电脑，直接交换文字和文件。",
    introduction: [
      "为 Windows 与 macOS 之间的日常互传制作的桌面工具。发现附近设备、确认配对，之后即可选择目标发送文字或拖入文件。",
      "接收内容落到设定目录；一次发送可以选择多台设备，让工作中反复出现的小动作更直接。",
    ],
    decisions: [
      {
        title: "尽快找到另一台设备",
        text: "Bonjour／mDNS 与 UDP 广播配合完成局域网发现，六位配对码确认连接。",
      },
      {
        title: "让传输经过文件流",
        text: "WebSocket 负责控制消息，HTTP 流传输文件；接收端使用临时文件并在完成后更名，同名内容自动避让。",
      },
      {
        title: "两种系统，一套日常流程",
        text: "Electron 与 React 组织桌面界面，发送目标、接收目录与文字文件互传保持一致。",
      },
    ],
    repo: "https://github.com/luke711-xyy/lan-bridge",
    cover: "SCR-20261019-ugtg.png",
  },
];

export const projectIds = projects.map((p) => p.id);
export const getProject = (id: ProjectId) => projects.find((p) => p.id === id)!;
export const mediaFor = (id: ProjectId): Media[] => {
  const items = (
    (manifest as unknown as Record<string, Omit<Media, "caption">[]>)[id] ?? []
  ).slice();
  const cover = getProject(id).cover;
  return items
    .sort((a, b) => (a.source === cover ? -1 : b.source === cover ? 1 : 0))
    .map((item) => ({ ...item, caption: mediaCaptions[item.id] }));
};
