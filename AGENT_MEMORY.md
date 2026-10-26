# 🧠 Project Agent Memory: skillmcpsync

> **專案名稱 Project**: `skillmcpsync`  
> **最後更新時間 Last Updated**: `2026-10-26T10:55:30.000Z`  
> **適用 Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf, Copilot

---

> ⚠️ **MANDATORY INSTRUCTION FOR ALL AGENTS (所有 Agent 必讀指令):**
> 1. **在開始執行任何任務前**：請務必先閱讀本檔案，了解先前其他 Agent 完成了什麼、有哪些架構決定，避免重複工作或破壞現有功能。
> 2. **在完成工作或做出重要決策後**：請於下方的「🕒 1. Episodic Action Timeline」中新增記錄，註明時間、Agent 名稱、修改內容與影響檔案。

---

## 🕒 1. Episodic Action Timeline (以前的 Agent 做了些什麼)
<!-- EPISODIC_LOG_START -->
### 🔹 [2026-10-26T12:50:00.000Z] @Antigravity
- **Summary**: Embedded Git tools & version rollback protocol into Master Prompt Template and Project Directives
  - **Files Touched**: `src/core/prompt_template.ts`, `src/core/project_memory.ts`, `test/prompt_template.test.ts`, `macos/AgentHub/Localization.swift`, `macos/AgentHub/DaemonClient.swift`, `macos/AgentHub/Views.swift`
  - **Key Decisions**: Enforced immediate atomic git commit on every change with explicit purpose: maximum convenience to check back versions anytime. Added Git tools commands (`git status`, `git diff`, `git log`, `git checkout / restore`) to prompt template, kickoff briefings, and app badges.
### 🔹 [2026-10-26T12:43:00.000Z] @Antigravity
- **Summary**: Implemented 6-stage feature engineering lifecycle in Master Prompt Template and Agent Directives
  - **Files Touched**: `src/core/prompt_template.ts`, `src/core/project_memory.ts`, `macos/AgentHub/Localization.swift`, `macos/AgentHub/DaemonClient.swift`, `macos/AgentHub/Views.swift`, `test/prompt_template.test.ts`
  - **Key Decisions**: Integrated product design, demo prototype evaluation, technical proposal .txt file generation, implementation, AI automated repeated testing, human verification checklist, and continuous re-testing loop on every feature modification.
### 🔹 [2026-10-26T10:55:30.000Z] @OmO
- **Summary**: Connected website repository to GitHub and Cloudflare Pages with auto-deployment
  - **Files Touched**: `AGENT_MEMORY.md`
  - **Key Decisions**: Created Git-connected Cloudflare Pages project `skillmcpsync` linked to GitHub repo `marco-crypto-debug/skillmcpsync` (branch `main`, root `/`, output dir `site`). Triggered and verified successful build & live URL (https://skillmcpsync.pages.dev).
### 🔹 [2026-10-26T10:46:07.144Z] @OmO
- **Summary**: Installed `omo-ai` globally via `bun add -g omo-ai` (v5.1.48)
  - **Files Touched**: `AGENT_MEMORY.md`
  - **Key Decisions**: Installed and verified global binary `omo` (5.1.48)
### 🔹 [2026-10-24T17:29:45.350Z] @Antigravity
- **Summary**: Implemented OpenMemory cognitive sectors and in-project AGENT_MEMORY.md rule injection
  - **Files Touched**: `src/core/project_memory.ts`, `src/bin.ts`
  - **Key Decisions**: Enforced pre-task memory inspection across all coding agents
### 🔹 [2026-10-24T17:29:36.036Z] @system
- **Summary**: Initialized project agent memory & injected cross-agent workflow rules.
- **Files Touched**: `AGENT_MEMORY.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`
- **Key Decisions**: Enabled multi-agent memory tracking across OpenCode, Claude, Cursor, and Windsurf.

---

## 🧠 2. Semantic Memory (專案核心事實、架構與約定)
<!-- SEMANTIC_START -->
- **專案目標**: 
- **技術棧 (Tech Stack)**: 
- **核心架構與目錄結構**: 
- **環境變數與密鑰要求**: 
<!-- SEMANTIC_END -->

---

## 🛠 3. Procedural Rules (工作規範與防踩坑指南)
<!-- PROCEDURAL_START -->
- **程式碼風格與規範**: 遵循專案現有的 TypeScript / 代码格式。
- **建置與測試指令**: 每次修改後執行 `npm test` 確保無破壞性變更。
- **並行 Agent 保護**: 多個 Agent 同時作業時，修改檔案前務必重新檢查最新檔案狀態。
<!-- PROCEDURAL_END -->

---

## 🔍 4. Reflective Notes & Known Issues (反思與已知問題)
<!-- REFLECTIVE_START -->
- **已知問題與待辦事項**: 
- **已踩過的坑 (Avoid Past Mistakes)**: 
<!-- REFLECTIVE_END -->
