/**
 * AgentHub — Apple-Style Interactive Web Application
 * Handles i18n, Theme Toggling, Interactive Window Tabs, and Copy-to-Clipboard.
 */

// --- Translations Dictionary ---
const translations = {
  en: {
    navFeatures: "Features",
    navAgentHub: "AgentHub",
    navCLI: "CLI & Sync",
    navDownload: "Download",
    heroAnnounce: "AgentHub v1.0.0 is live for macOS",
    heroTitlePart1: "One Hub.",
    heroTitlePart2: "Every AI Agent.",
    heroSubtitle: "The unified native control center for OpenCode, Antigravity (Gemini), Claude Desktop, Cursor, and Windsurf. Centralize Skills, MCP Servers, and OpenMemory with 1-click sync.",
    btnDownloadDMG: "Download AgentHub.dmg",
    btnViewGitHub: "View on GitHub",
    heroRequirement: "Requires macOS 13.0 Ventura or later • Apple Silicon & Intel Universal",
    
    // Window Mockup Tabs
    tabOverview: "Overview",
    tabServers: "Servers & MCPs",
    tabSkills: "Skills & Tools",
    tabMemory: "Project Memory (.md)",
    tabHub: "~/AgentHub",

    // Bento Grid Section
    sectionTag: "Next-Gen AI Workspace",
    sectionTitle: "Engineered for Multi-Agent Mastery",
    sectionDesc: "Stop copying MCP JSONs and duplicating skills across 5 different apps. AgentHub bridges every agent into a single, cohesive intelligence hub.",

    bentoCard1Badge: "Dedicated Directory",
    bentoCard1Title: "Centralized ~/AgentHub",
    bentoCard1Text: "A clean, visible home folder for all your AI assets. Drag and drop any Skill folder from GitHub, or manage all MCP server definitions in one single place.",

    bentoCard2Badge: "Instant 1-Click Sync",
    bentoCard2Title: "Zero-Mock Synchronization",
    bentoCard2Text: "Sync OpenCode, Antigravity (Gemini), Claude Desktop, Cursor, and Windsurf in under 50 milliseconds using native file bridges.",

    bentoCard3Badge: "No More JSON Headaches",
    bentoCard3Title: "Curated MCP Presets",
    bentoCard3Text: "Add Fetch, Filesystem, Brave Search, SQLite, Memory, Puppeteer, and GitHub MCPs with a single click — no manual JSON configuration needed.",

    bentoCard4Badge: "Cross-Agent Intelligence",
    bentoCard4Title: "OpenMemory Cognitive Engine",
    bentoCard4Text: "Episodic timelines, semantic constraints, and reflective notes stored in AGENT_MEMORY.md. What one agent discovers, all agents remember.",

    bentoCard5Badge: "Concurrency & Integrity",
    bentoCard5Title: "Deterministic Conflict Guard",
    bentoCard5Text: "Built-in non-blocking atomic file locks, optimistic version checks, and last-write-wins resolution ensure shared configs and memory are never corrupted.",

    // Terminal Showcase
    cliTag: "Developer Ergonomics",
    cliTitle: "Native CLI Included",
    cliDesc: "Prefer the terminal? Run `skillmcpsync sync` from any directory or CI/CD workflow.",

    // Download Section
    downloadTitle: "Supercharge your AI Agents today.",
    downloadDesc: "Experience the fastest, most reliable multi-agent synchronizer and hub on macOS. Free and open source.",
    downloadDMG: "Download AgentHub (DMG)",
    downloadCLI: "Install CLI: npx skillmcpsync sync",
    versionMeta: "v1.0.0 • macOS 13.0+ • Universal Binary (1.6 MB)"
  },

  "zh-Hant": {
    navFeatures: "功能特色",
    navAgentHub: "AgentHub 資料夾",
    navCLI: "終端機 CLI",
    navDownload: "立即下載",
    heroAnnounce: "AgentHub v1.0.0 原生 macOS 正式發布",
    heroTitlePart1: "一個中樞。",
    heroTitlePart2: "所有 AI Agent。",
    heroSubtitle: "專為 Mac 開發者打造的 AI Coding Agent 集中控制中心。OpenCode、Antigravity (Gemini)、Claude、Cursor 與 Windsurf，一個按鈕無縫同步所有 Skills、MCP 與長效記憶。",
    btnDownloadDMG: "下載 AgentHub.dmg",
    btnViewGitHub: "GitHub 代碼庫",
    heroRequirement: "支援 macOS 13.0 Ventura 及更高版本 • Apple Silicon 與 Intel 通用",

    tabOverview: "總覽首頁",
    tabServers: "MCP 伺服器",
    tabSkills: "Skills 技能模組",
    tabMemory: "專案記憶 (.md)",
    tabHub: "~/AgentHub",

    sectionTag: "新世代 AI 開發工作流",
    sectionTitle: "專為駕馭多 Agent 打造的原生架構",
    sectionDesc: "告別在 5 個不同的 AI 編輯器手動複製貼上 MCP 設定與重複下載 Skill。AgentHub 將所有 Agent 凝聚為協同一致的超級大腦。",

    bentoCard1Badge: "專屬本機目錄",
    bentoCard1Title: "集中化 ~/AgentHub",
    bentoCard1Text: "在個人目錄建立完全可見、非隱藏的專屬中心。直接在 Finder 拖放 GitHub 下載的 Skill 資料夾，或集中編輯 mcp-servers.json。",

    bentoCard2Badge: "一鍵瞬間同步",
    bentoCard2Title: "全真系統零 Mock 分發",
    bentoCard2Text: "50 毫秒內將 AgentHub 資源無縫分發至本機 OpenCode、Antigravity、Claude Desktop、Cursor 與 Windsurf。",

    bentoCard3Badge: "告別手打 JSON",
    bentoCard3Title: "精選熱門 MCP 預設庫",
    bentoCard3Text: "一鍵新增 Fetch、Filesystem、Brave Search、SQLite、Memory、Puppeteer 與 GitHub MCP，全自動寫入標準配置。",

    bentoCard4Badge: "跨 Agent 共享長效記憶",
    bentoCard4Title: "OpenMemory 認知架構",
    bentoCard4Text: "自動維護 AGENT_MEMORY.md：記錄事件時序、架構決策與踩坑教訓。一個 Agent 解決的 Bug，所有 Agent 立即共享。",

    bentoCard5Badge: "版本感知與並發保護",
    bentoCard5Title: "無衝突智慧協同保護",
    bentoCard5Text: "內建非阻塞原子檔案鎖、樂觀鎖版本校驗與 LWW 仲裁機制，確保多個 Agent 同時運作時設定檔與記憶庫永不損毀。",

    cliTag: "終端機生產力",
    cliTitle: "內建強大 CLI 工具",
    cliDesc: "偏好指令列？在任何專案目錄直接執行 `skillmcpsync sync`，極致輕量快速。",

    downloadTitle: "立即讓你的所有 AI Agent 連成一體。",
    downloadDesc: "體驗 macOS 上最優雅、最直覺的多 Agent 技能與 MCP 同步中樞。開源且完全免費。",
    downloadDMG: "下載 AgentHub (DMG)",
    downloadCLI: "終端機快速指令：npx skillmcpsync sync",
    versionMeta: "v1.0.0 • macOS 13.0+ • 通用二進制映像檔 (1.6 MB)"
  },

  "zh-Hans": {
    navFeatures: "功能特色",
    navAgentHub: "AgentHub 目录",
    navCLI: "终端 CLI",
    navDownload: "立即下载",
    heroAnnounce: "AgentHub v1.0.0 原生 macOS 正式发布",
    heroTitlePart1: "一个中枢。",
    heroTitlePart2: "所有 AI Agent。",
    heroSubtitle: "专为 Mac 开发者打造的 AI Coding Agent 集中控制中心。OpenCode、Antigravity (Gemini)、Claude、Cursor 与 Windsurf，一个按钮无缝同步所有 Skills、MCP 与长效记忆。",
    btnDownloadDMG: "下载 AgentHub.dmg",
    btnViewGitHub: "GitHub 代码库",
    heroRequirement: "支持 macOS 13.0 Ventura 及更高版本 • Apple Silicon 与 Intel 通用",

    tabOverview: "总览首页",
    tabServers: "MCP 服务器",
    tabSkills: "Skills 技能模块",
    tabMemory: "项目记忆 (.md)",
    tabHub: "~/AgentHub",

    sectionTag: "新世代 AI 开发工作流",
    sectionTitle: "专为驾驭多 Agent 打造的原生架构",
    sectionDesc: "告别在 5 个不同的 AI 编辑器手动复制粘贴 MCP 配置与重复下载 Skill。AgentHub 将所有 Agent 凝聚为协同一致的超级大脑。",

    bentoCard1Badge: "专属本地目录",
    bentoCard1Title: "集中化 ~/AgentHub",
    bentoCard1Text: "在个人目录建立完全可见、非隐藏的专属中心。直接在 Finder 拖放 GitHub 下载的 Skill 文件夹，或集中编辑 mcp-servers.json。",

    bentoCard2Badge: "一键瞬间同步",
    bentoCard2Title: "全真系统零 Mock 分发",
    bentoCard2Text: "50 毫秒内将 AgentHub 资源无缝分发至本机 OpenCode、Antigravity、Claude Desktop、Cursor 与 Windsurf。",

    bentoCard3Badge: "告别手打 JSON",
    bentoCard3Title: "精选热门 MCP 预设库",
    bentoCard3Text: "一键新增 Fetch、Filesystem、Brave Search、SQLite、Memory、Puppeteer 与 GitHub MCP，全自动写入标准配置。",

    bentoCard4Badge: "跨 Agent 共享长效记忆",
    bentoCard4Title: "OpenMemory 认知架构",
    bentoCard4Text: "自动维护 AGENT_MEMORY.md：记录事件时序、架构决策与踩坑教训。一个 Agent 解决的 Bug，所有 Agent 立即共享。",

    bentoCard5Badge: "版本感知与并发保护",
    bentoCard5Title: "无冲突智能协同保护",
    bentoCard5Text: "内置非阻塞原子文件锁、乐观锁版本校验与 LWW 仲裁机制，确保多个 Agent 同时运作时配置文件与记忆库永不损坏。",

    cliTag: "终端生产力",
    cliTitle: "内置强大 CLI 工具",
    cliDesc: "偏好命令行？在任何项目目录直接执行 `skillmcpsync sync`，极致轻量快速。",

    downloadTitle: "立即让你的所有 AI Agent 连成一体。",
    downloadDesc: "体验 macOS 上最优雅、最直观的多 Agent 技能与 MCP 同步中枢。开源且完全免费。",
    downloadDMG: "下载 AgentHub (DMG)",
    downloadCLI: "终端快速指令：npx skillmcpsync sync",
    versionMeta: "v1.0.0 • macOS 13.0+ • 通用二进制安装包 (1.6 MB)"
  }
};

// --- Mockup Window Views Content per language ---
function getWindowScreens(lang) {
  const isEn = lang === 'en';
  const isHans = lang === 'zh-Hans';

  return {
    overview: `
      <div class="mock-hub-banner">
        <div class="mock-hub-info">
          <h4>🚀 ${isEn ? "Dedicated Central Hub (AgentHub)" : (isHans ? "专用集中文件夹 (AgentHub)" : "專用集中資料夾 (AgentHub)")}</h4>
          <p>${isEn ? "Central repository for all Agent Skills and MCPs • Located at" : (isHans ? "所有 Agent 的 Skills 与 MCP 集中存储中心 • 位于" : "所有 Agent 的 Skills 與 MCP 集中儲存中心 • 位於")} <code>~/AgentHub</code></p>
        </div>
        <button class="mock-btn-sync" onclick="triggerMockSync()">${isEn ? "⚡️ 1-Click Sync All Agents" : (isHans ? "⚡️ 一键同步所有 Agent" : "⚡️ 一鍵同步所有 Agent")}</button>
      </div>
      <div class="mock-agent-grid">
        <div class="mock-agent-card installed">
          <span class="icon">💻</span>
          <div class="info">
            <div class="name">OpenCode</div>
            <div class="status">● ${isEn ? "Synced (2 MCPs, 3 Skills)" : (isHans ? "已同步 (2 MCPs, 3 Skills)" : "已同步 (2 MCPs, 3 Skills)")}</div>
          </div>
        </div>
        <div class="mock-agent-card installed">
          <span class="icon">✨</span>
          <div class="info">
            <div class="name">Antigravity (Gemini)</div>
            <div class="status">● ${isEn ? "Synced (2 MCPs, 3 Skills)" : (isHans ? "已同步 (2 MCPs, 3 Skills)" : "已同步 (2 MCPs, 3 Skills)")}</div>
          </div>
        </div>
        <div class="mock-agent-card installed">
          <span class="icon">🧠</span>
          <div class="info">
            <div class="name">Claude Desktop</div>
            <div class="status">● ${isEn ? "Connected (2 MCPs)" : (isHans ? "已连接 (2 MCPs)" : "已連結 (2 MCPs)")}</div>
          </div>
        </div>
        <div class="mock-agent-card installed">
          <span class="icon">⚡️</span>
          <div class="info">
            <div class="name">Cursor / Windsurf</div>
            <div class="status">● ${isEn ? "Rules Injected (.cursorrules)" : (isHans ? "规则已注入 (.cursorrules)" : "規則已注入 (.cursorrules)")}</div>
          </div>
        </div>
      </div>
      <div class="mock-metrics-row">
        <div class="mock-metric-box"><div class="num" style="color: #8B5CF6;">2</div><div class="label">${isEn ? "Active MCP Servers" : (isHans ? "已同步 MCP 服务器" : "已同步 MCP 伺服器")}</div></div>
        <div class="mock-metric-box"><div class="num" style="color: #10B981;">3</div><div class="label">${isEn ? "Synchronized Skills" : (isHans ? "已同步 Skills 技能" : "已同步 Skills 技能")}</div></div>
        <div class="mock-metric-box"><div class="num" style="color: #F97316;">82</div><div class="label">${isEn ? "Synthesized Tools" : (isHans ? "可用工具 (Tools)" : "可用工具 (Tools)")}</div></div>
        <div class="mock-metric-box"><div class="num" style="color: #0071E3;">5</div><div class="label">${isEn ? "Shared Memory Entries" : (isHans ? "跨 Agent 共享记忆" : "跨 Agent 共享記憶")}</div></div>
      </div>
    `,

    servers: `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">${isEn ? "Installed MCP Servers" : (isHans ? "已安装 MCP 服务器" : "已安裝 MCP 伺服器")}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${isEn ? "Central protocol management across agents" : (isHans ? "集中管理跨 Agent 工具协议" : "集中管理跨 Agent 工具協議")}</p>
        </div>
        <button class="mock-btn-sync" style="background: #10B981;">${isEn ? "➕ Add MCP Server" : (isHans ? "➕ 新增 MCP 服务器" : "➕ 新增 MCP 伺服器")}</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">context7 <span style="background: rgba(139,92,246,0.15); color: #8B5CF6; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">STDIO</span></div>
            <code style="font-size: 0.8rem; color: var(--text-secondary);">npx -y @context7/mcp-server</code>
          </div>
          <span style="color: #10B981; font-size: 0.8rem; font-weight: 600;">● ${isEn ? "Healthy (5ms)" : "正常運作 (5ms)"}</span>
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">rea (Reverse Engineer Anything) <span style="background: rgba(139,92,246,0.15); color: #8B5CF6; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">STDIO</span></div>
            <code style="font-size: 0.8rem; color: var(--text-secondary);">python3 /Users/marco/AgentHub/mcps/rea/server.py</code>
          </div>
          <span style="color: #10B981; font-size: 0.8rem; font-weight: 600;">● ${isEn ? "Healthy (8ms)" : "正常運作 (8ms)"}</span>
        </div>
      </div>
    `,

    skills: `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">${isEn ? "Skills Repository" : (isHans ? "Skills 技能库" : "Skills 技能庫")}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${isEn ? "Reusable agent prompt modules and guidelines" : (isHans ? "所有 Agent 共享的专家规范与 Prompt 模块" : "所有 Agent 共享的專家規範與 Prompt 模組")}</p>
        </div>
        <button class="mock-btn-sync">${isEn ? "➕ New Skill Module" : (isHans ? "➕ 新增 Skill 模块" : "➕ 新增 Skill 模組")}</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); padding: 14px; border-radius: 10px;">
          <div style="font-weight: 700; font-size: 0.95rem;">reverse-engineer-anything</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${isEn ? "Binary analysis & reverse engineering guidelines" : "專業逆向工程與二進制分析指令規範"}</div>
          <div style="font-size: 0.75rem; color: #10B981; margin-top: 8px;">${isEn ? "Origin: AgentHub (Central)" : "來源: AgentHub (Central)"}</div>
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); padding: 14px; border-radius: 10px;">
          <div style="font-weight: 700; font-size: 0.95rem;">animate-css</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${isEn ? "CSS keyframes & smooth web animation styling" : "前端動態效果與 CSS Keyframes 設計"}</div>
          <div style="font-size: 0.75rem; color: #10B981; margin-top: 8px;">${isEn ? "Origin: AgentHub (Central)" : "來源: AgentHub (Central)"}</div>
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); padding: 14px; border-radius: 10px;">
          <div style="font-weight: 700; font-size: 0.95rem;">oh-my-opencode</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${isEn ? "OpenCode terminal workflow extension" : "OpenCode 終端深度集成與任務管理"}</div>
          <div style="font-size: 0.75rem; color: #10B981; margin-top: 8px;">${isEn ? "Origin: AgentHub (Central)" : "來源: AgentHub (Central)"}</div>
        </div>
      </div>
    `,

    memory: `
      <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: #8B5CF6; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
          <span>🧠</span> ${isEn ? "Multi-Agent Shared Memory Pool (AGENT_MEMORY.md)" : "跨 Agent 共享長效記憶庫 (AGENT_MEMORY.md)"}
        </div>
        <div style="font-size: 0.85rem; margin-top: 6px; color: var(--text-primary); line-height: 1.5;">
          ${isEn ? 
            "1. Before starting tasks: Always search shared memory for active architectural choices and known gotchas.<br>2. After key decisions or bug root-cause: Automatically record with agent provenance.<br>3. Keep only long-term high-value knowledge." :
            "1. 每次開工前，優先搜尋 shared memory 中關於架構約束、規範與過往踩坑經驗。<br>2. 每完成一輪重要決策或找到 bug 根因，自動寫入 shared memory 並標記來源 Agent。<br>3. 不存瑣碎對話，只存長期高價值知識。"}
        </div>
      </div>
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 10px; padding: 14px; font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.6;">
        <span style="color: #3B82F6;">[2026-10-25 14:30]</span> <b>@OpenCode</b>: ${isEn ? "Optimized memory graph query performance with indexing." : "優化了 SQLite 記憶圖譜查詢索引效能。"}<br>
        <span style="color: #8B5CF6;">[2026-10-25 11:15]</span> <b>@Antigravity</b>: ${isEn ? "Configured context7 tool protocol with verified latency." : "確立 context7 工具協議並通過延遲測試。"}
      </div>
    `,

    hub: `
      <div style="font-family: var(--font-mono); background: var(--bg-secondary); border: 1px solid var(--border-light); padding: 18px; border-radius: 10px; font-size: 0.85rem; line-height: 1.7;">
        <b style="color: #0071E3;">~/AgentHub/</b><br>
        ├── <b>skills/</b> <span style="color: var(--text-secondary);">${isEn ? "(Stores all downloaded skills, supports Finder drag-and-drop)" : "(存放所有已下載 Skills，支援 Finder 直接拖放)"}</span><br>
        │   ├── reverse-engineer-anything/<br>
        │   ├── animate-css/<br>
        │   └── oh-my-opencode/<br>
        ├── <b>mcps/</b> <span style="color: var(--text-secondary);">${isEn ? "(Centrally stores mcp-servers.json)" : "(集中存放 mcp-servers.json)"}</span><br>
        │   └── mcp-servers.json<br>
        ├── <b>memory/</b> <span style="color: var(--text-secondary);">${isEn ? "(Cross-agent shared memory MEMORY.md)" : "(跨 Agent 共享記憶 MEMORY.md)"}</span><br>
        └── README.md <span style="color: var(--text-secondary);">${isEn ? "(Documentation for humans & agents)" : "(使用說明檔案)"}</span>
      </div>
    `
  };
}

// Current active language & screen
let currentLang = 'en';
let currentScreen = 'overview';

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initI18n();
  initWindowMockup();
});

// --- Theme Management ---
function initTheme() {
  const toggleBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("agentcontroller_theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  setTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      setTheme(next);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("agentcontroller_theme", theme);
  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  }
}

// --- i18n Management ---
function initI18n() {
  const browserLang = navigator.language.startsWith("zh") ? 
    (navigator.language.includes("Hant") || navigator.language.includes("TW") || navigator.language.includes("HK") ? "zh-Hant" : "zh-Hans") : "en";
  const savedLang = localStorage.getItem("agentcontroller_lang") || browserLang;

  // Setup buttons
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      setLanguage(lang);
    });
  });

  // Setup select if present
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }

  setLanguage(savedLang);
}

function setLanguage(lang) {
  currentLang = translations[lang] ? lang : 'en';
  const dict = translations[currentLang];
  localStorage.setItem("agentcontroller_lang", currentLang);

  // Update text
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Update button active state
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    if (btn.getAttribute("data-lang") === currentLang) {
      btn.classList.add("is-active");
    } else {
      btn.classList.remove("is-active");
    }
  });

  // Update select value
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = currentLang;
  }

  document.documentElement.lang = currentLang;

  // Re-render current window screen in the new language!
  renderWindowScreen(currentScreen);
}

// --- Window Mockup Tab Switching ---
function initWindowMockup() {
  const tabs = document.querySelectorAll(".window-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const screenKey = tab.getAttribute("data-screen");
      currentScreen = screenKey;
      renderWindowScreen(currentScreen);
    });
  });

  renderWindowScreen("overview");
}

function renderWindowScreen(screenKey) {
  const contentContainer = document.getElementById("windowContentArea");
  if (!contentContainer) return;
  const screens = getWindowScreens(currentLang);
  if (screens[screenKey]) {
    contentContainer.innerHTML = screens[screenKey];
  }
}

function triggerMockSync() {
  const btn = document.querySelector(".mock-btn-sync");
  if (!btn) return;
  const isEn = currentLang === 'en';
  const originalText = btn.textContent;
  btn.textContent = isEn ? "⚡️ Syncing..." : "⚡️ 同步進行中...";
  btn.style.opacity = "0.7";
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = isEn ? "✔ Sync Complete!" : "✔ 同步完成！";
    btn.style.background = "#10B981";
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = "";
      btn.style.opacity = "1";
      btn.disabled = false;
    }, 1800);
  }, 800);
}

// --- Copy helper ---
function copyCommand(cmd, btnId) {
  navigator.clipboard.writeText(cmd).then(() => {
    const btn = document.getElementById(btnId);
    if (btn) {
      const orig = btn.innerText;
      btn.innerText = "✔ Copied!";
      setTimeout(() => {
        btn.innerText = orig;
      }, 1500);
    }
  });
}
