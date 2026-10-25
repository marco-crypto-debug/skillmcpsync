import fs from 'node:fs';
import path from 'node:path';

export interface PromptTemplateOptions {
  projectName?: string;
  language?: 'zh-Hant' | 'zh-Hans' | 'en';
  includeGitRule?: boolean;
  includeTestRule?: boolean;
  includeMemoryRule?: boolean;
}

export interface ExportTemplateOptions extends PromptTemplateOptions {
  filename?: string;
}

/**
 * Generates the master initial prompt template for any new project.
 * Enforces:
 * 1. Test-first and 100% test pass verification before delivery.
 * 2. Git commit on every change.
 * 3. Inspecting AGENT_MEMORY.md before starting and logging actions after completion.
 */
export function generateNewProjectPromptTemplate(options: PromptTemplateOptions = {}): string {
  const projectName = options.projectName || 'NewProject';
  const lang = options.language || 'zh-Hant';
  const gitRule = options.includeGitRule !== false;
  const testRule = options.includeTestRule !== false;
  const memoryRule = options.includeMemoryRule !== false;

  if (lang === 'en') {
    return `# 🚀 Master Agent Prompt & Workflow Template: ${projectName}
> **Target Project**: \`${projectName}\`
> **Applicable Coding Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf, Copilot
> **Role & Standard**: Senior Staff Systems Architect & Pair Programmer. High precision, zero regressions.

---

## ⚡️ Non-Negotiable Core Workflow Rules

${testRule ? `### 1. 🧪 Test-First & 100% Verification Before Delivery (測試優先與驗證保證)
- **Mandatory Pre-requisite**: Before making any code changes, always write or update corresponding unit/integration tests covering the intended behavior and edge cases.
- **Verification Guarantee**: Before delivering your work to the user, you MUST run all test suites (e.g., \`npm test\`, \`cargo test\`, \`pytest\`, \`swift test\`) and ensure 100% tests pass with zero failures and zero regressions.` : ''}

${gitRule ? `### 2. 📦 Atomic Git Commit on Every Change (每次改動必須 Git Commit)
- **Immediate Version Control**: For every distinct feature modification, bug fix, or refactor, you must execute a clean \`git commit\`.
- **Commit Standards**: Write clear, imperative, and structured commit messages (e.g. \`feat: ...\`, \`fix: ...\`, \`test: ...\`). Never leave modified files unstaged without committing.` : ''}

${memoryRule ? `### 3. 🧠 Pre-Task Inspection of AGENT_MEMORY.md (開工前必讀專案記憶)
- **Read Memory First**: Before executing instructions or generating new code, ALWAYS inspect \`AGENT_MEMORY.md\` in the project root and search shared memory.
- **Prevent Regressions**: Review architectural boundaries, established tech-stack conventions, and past failed attempts or known gotchas.

### 4. 🕒 Post-Task Logging to Episodic Timeline (完成後回寫時間軸)
- **Episodic Action Timeline**: Upon completing any significant task, architectural decision, or root-cause bug fix, immediately append a record to the \`Episodic Action Timeline\` in \`AGENT_MEMORY.md\` (specifying timestamp, agent name, files touched, and key decisions).` : ''}

### 5. 🛡 Codebase Preservation & Integrity
- Maintain documentation and existing comments unless specifically instructed otherwise.
- Avoid introducing unnecessary heavy dependencies when native or standard libraries suffice.
- Format all responses clearly with structured markdown and clickable file references.

---

## 📋 Task Kickoff Briefing (Copy into Agent Chat to start work)
\`\`\`markdown
You are working on the project "${projectName}".
Before starting any code changes:
1. Read \`AGENT_MEMORY.md\` and review recent decisions and constraints.
2. Write or update tests covering the task scope.
3. Implement changes with precision, preserving existing code style.
4. Run the full test suite and confirm 100% pass before presenting the solution.
5. Execute a descriptive git commit for every change made.
6. Log your completed actions and decisions into \`AGENT_MEMORY.md\`.
\`\`\`
`.trim();
  }

  if (lang === 'zh-Hans') {
    return `# 🚀 新项目 Agent 开工核心规范提示词范本: ${projectName}
> **目标项目**: \`${projectName}\`
> **适用 Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf, Copilot
> **执行准则**: 资深系统架构师标准，高可靠性、防御性编程、零破坏性变更。

---

## ⚡️ 不可逾越的核心开工与交付约束

${testRule ? `### 1. 🧪 每次改动前必须编写/更新测试，交付前确保 100% 验证通过
- **改动前编写测试**：在进行任何业务逻辑或程式码改动前，必须先编写或同步更新相对应的单元测试与整合测试用例。
- **交付前全体验证**：在将成果交付给用户前，必须于本地实际运行测试命令（例如 \`npm test\`、\`cargo test\`、\`pytest\`），确保所有测试与验证 100% 全部通过，严禁提交未经测试的代码。` : ''}

${gitRule ? `### 2. 📦 每次改动后必须执行 Git Commit (Atomic Versioning)
- **即时提交**：每完成一个独立模块改动、Bug 修复或功能实现，必须立即执行 \`git commit\`。
- **清晰语义规范**：Commit 讯息必须明确传达修改目的（例如 \`feat: ...\`、\`fix: ...\`、\`test: ...\`），切勿将多个无关改动混为一谈。` : ''}

${memoryRule ? `### 3. 🧠 开工前强制查阅 AGENT_MEMORY.md 与 Shared Memory
- **先读记忆再写代码**：在开始执行任务前，务必先完整阅读项目根目录的 \`AGENT_MEMORY.md\` 与跨 Agent 共享记忆库。
- **避免重复踩坑**：确认既有系统边界、架构约定与过往失败经验，确保方案延续性。

### 4. 🕒 任务完成后即时回写操作历程时间轴
- **Episodic Action Timeline**：每完成一轮关键决策、找到 Bug 根因或确认架构选择，立即将时间戳记、Agent 标籤、更动档案与核心决策记录写入 \`AGENT_MEMORY.md\`。` : ''}

### 5. 🛡 尊重现有架构与保护注释完整性
- 保留既有文件与注释，严禁任意删除未修改区块的代码或文档。
- 采用原生标准库优先设计，不引入未经评估的冗余外部依赖。

---

## 📋 开工提示词直接复制块 (可直接贴入 Agent 对话框)
\`\`\`markdown
你正在负责「${projectName}」专案的开发工作。
在开始任何程式码修改前，必须严格遵守以下规范：
1. 优先查阅 \`AGENT_MEMORY.md\` 掌握专案上下文与过往决策。
2. 每次改动前必须编写或更新相关测试用例。
3. 执行程式码实作，严守防御性原则与架构约定。
4. 交付给使用者前，必须在本地完整运行测试，确保所有测试与验证 100% 全部通过。
5. 每次改动完成必须立即进行描述清晰的 git commit。
6. 完成后将本次工作摘要与核心决策写入 \`AGENT_MEMORY.md\` 的历程时间轴。
\`\`\`
`.trim();
  }

  // Default: zh-Hant
  return `# 🚀 新專案 Agent 開工核心規範提示詞範本: ${projectName}
> **目標專案**: \`${projectName}\`
> **適用 Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf, Copilot
> **執行準則**: 資深系統架構師標準，高可靠性、防禦性編程、零破壞性變更。

---

## ⚡️ 不可逾越的核心開工與交付約束

${testRule ? `### 1. 🧪 每次改動前必須編寫/更新測試，交付前確保 100% 驗證通過
- **改動前編寫測試**：在進行任何業務邏輯或程式碼改動前，必須先編寫或同步更新相對應的單元測試與整合測試用例。
- **交付前全體驗證**：在將成果交付給用戶前，必須於本機實際執行測試指令（例如 \`npm test\`、\`cargo test\`、\`pytest\`），確保所有測試與驗證 100% 全部通過，嚴禁交付未經驗證的程式碼。` : ''}

${gitRule ? `### 2. 📦 每次改動後必須執行 Git Commit (Atomic Versioning)
- **即時提交**：每完成一個獨立模組改動、Bug 修復或功能實作，必須立即執行 \`git commit\`。
- **清晰語意規範**：Commit 訊息必須明確傳達修改目的（例如 \`feat: ...\`、\`fix: ...\`、\`test: ...\`），切勿將多個無關改動混為一談。` : ''}

${memoryRule ? `### 3. 🧠 開工前強制查閱 AGENT_MEMORY.md 與 Shared Memory
- **先讀記憶再寫程式碼**：在開始執行任務前，務必先完整閱讀專案根目錄的 \`AGENT_MEMORY.md\` 與跨 Agent 共享記憶庫。
- **避免重複踩坑**：確認既有系統邊界、架構約定與過往失敗經驗，確保方案延續性。

### 4. 🕒 任務完成後即時回寫操作歷程時間軸
- **Episodic Action Timeline**：每完成一輪關鍵決策、找到 Bug 根因或確認架構選擇，立即將時間戳記、Agent 標籤、更動檔案與核心決策記錄寫入 \`AGENT_MEMORY.md\`。` : ''}

### 5. 🛡 尊重現有架構與保護註解完整性
- 保留既有文件與註解，嚴禁任意刪除未修改區塊的程式碼或文件。
- 採用原生標準庫優先設計，不引入未經評估的冗餘外部依賴。

---

## 📋 開工提示詞直接複製塊 (可直接貼入 Agent 對話框)
\`\`\`markdown
你正在負責「${projectName}」專案的開發工作。
在開始任何程式碼修改前，必須嚴格遵守以下規範：
1. 優先查閱 \`AGENT_MEMORY.md\` 掌握專案上下文與過往決策。
2. 每次改動前必須編寫或更新相關測試用例。
3. 執行程式碼實作，嚴守防禦性原則與架構約定。
4. 交付給使用者前，必須在本機完整執行測試，確保所有測試與驗證 100% 全部通過。
5. 每次改動完成必須立即進行描述清晰的 git commit。
6. 完成後將本次工作摘要與核心決策寫入 \`AGENT_MEMORY.md\` 的歷程時間軸。
\`\`\`
`.trim();
}

/**
 * Exports the master prompt template to a file inside the target project directory.
 */
export function exportNewProjectPromptTemplate(
  projectDir: string,
  options: ExportTemplateOptions = {}
): string {
  const targetDir = path.resolve(projectDir);
  const filename = options.filename || 'MASTER_PROMPT.md';
  const filePath = path.join(targetDir, filename);

  const resolvedProjectName = options.projectName || path.basename(targetDir) || 'Project';
  const content = generateNewProjectPromptTemplate({
    ...options,
    projectName: resolvedProjectName,
  });

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
  return filePath;
}
