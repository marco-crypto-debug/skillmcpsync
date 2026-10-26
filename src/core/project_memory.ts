import fs from 'node:fs';
import path from 'node:path';
import { ProjectActionRecord, ProjectMemoryConfig, MemorySector } from './types.js';

export const MANDATORY_AGENT_RULE = `
# 🧠 AGENT MEMORY MANDATORY INSTRUCTION
> **CRITICAL WORKFLOW RULE FOR ALL CODING AGENTS (OpenCode, Claude Code, Cursor, Windsurf, Copilot):**
> 1. **BEFORE executing tasks or generating code**: ALWAYS inspect and read \`AGENT_MEMORY.md\` in the project root.
>    Review what previous agents did, active architectural decisions, and known gotchas.
> 2. **AFTER completing tasks or making design choices**: Log your actions into the Episodic Action Timeline in \`AGENT_MEMORY.md\`.
`.trim();

export function getProjectAgentDirective(projectName: string): string {
  return `
# 🎯 ${projectName} 專案 Agent 開工核心準則 (${projectName} Agent Directive)
> ⚠️ **所有 Agent (OpenCode / Claude / Cursor / Windsurf) 必讀核心約束：**
> 1. **產品設計與技術方案先行**：
>    - 任何新功能必須先進行產品設計思考，評估是否需要構建 Demo 原型。
>    - 正式編碼前，產出結構清晰的技術方案檔案 (\`TECH_PROPOSAL.txt\` 或 \`<feature>_proposal.txt\`)。
> 2. **每次開工前，優先查閱專案記憶庫**：
>    - 閱讀 \`AGENT_MEMORY.md\` 與 shared memory：掌握架構約定、技術棧規範、過往失敗方案與踩坑記錄。
> 3. **改動前編寫測試與 AI 自主重複測試**：
>    - 每次修改功能前，必須先編寫或更新相關測試用例。
>    - 程式碼實作完成後，AI 必須自主重複運行測試指令，確保 100% 通過無回歸後方可交付，並準備人工驗證步驟。
> 4. **原子化 Git Commit**：
>    - 每次獨立功能完成或 Bug 修復，必須立即執行清楚語意的 \`git commit\`。
> 5. **重要決策自動記入歷程時間軸**：
>    - 每完成一輪重要決策、找到 bug 根因、確認架構選擇，自動寫入 \`AGENT_MEMORY.md\`（標記來源 Agent）。
> 6. **長期高價值原則**：
>    - 不要記瑣碎對話，只存長期有用知識。
`.trim();
}

export const FOCUSIN_AGENT_DIRECTIVE = getProjectAgentDirective('FocusIn');

/**
 * ProjectMemoryManager manages in-project Markdown memory (AGENT_MEMORY.md)
 * inspired by OpenMemory's cognitive architecture (Episodic, Semantic, Procedural, Reflective).
 * It ensures every coding agent (OpenCode, Claude, Cursor, Windsurf) checks past agent work
 * before running.
 */
export class ProjectMemoryManager {
  private projectPath: string;
  private memoryFilePath: string;
  private filename: string;

  constructor(projectPath: string = process.cwd(), filename = 'AGENT_MEMORY.md') {
    this.projectPath = path.resolve(projectPath);
    this.filename = filename;
    this.memoryFilePath = path.join(this.projectPath, filename);
  }

  getMemoryFilePath(): string {
    return this.memoryFilePath;
  }

  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Check if AGENT_MEMORY.md exists in this project.
   */
  exists(): boolean {
    return fs.existsSync(this.memoryFilePath);
  }

  /**
   * Initialize AGENT_MEMORY.md and inject mandatory reading rules into all coding agents.
   */
  initProject(projectName?: string, injectRules = true): string {
    const pName = projectName || path.basename(this.projectPath);

    if (!fs.existsSync(this.projectPath)) {
      fs.mkdirSync(this.projectPath, { recursive: true });
    }

    if (!fs.existsSync(this.memoryFilePath)) {
      const template = this.generateInitialTemplate(pName);
      fs.writeFileSync(this.memoryFilePath, template, 'utf8');
    }

    if (injectRules) {
      this.injectAgentRules();
    }

    return this.memoryFilePath;
  }

  /**
   * Read the in-project AGENT_MEMORY.md file.
   */
  readMemory(): string {
    if (!fs.existsSync(this.memoryFilePath)) {
      return `(No ${this.filename} found in ${this.projectPath}. Run 'skillmcpsync memory project init' to create one.)`;
    }
    return fs.readFileSync(this.memoryFilePath, 'utf8');
  }

  /**
   * Record a completed action or reasoning step to the Episodic Action Timeline.
   */
  recordAction(record: ProjectActionRecord): void {
    if (!fs.existsSync(this.memoryFilePath)) {
      this.initProject();
    }

    let content = fs.readFileSync(this.memoryFilePath, 'utf8');
    const timeStr = record.timestamp || new Date().toISOString();
    const filesStr = record.filesTouched?.length
      ? `  - **Files Touched**: \`${record.filesTouched.join('`, `')}\`\n`
      : '';
    const decisionsStr = record.keyDecisions
      ? `  - **Key Decisions**: ${record.keyDecisions}\n`
      : '';

    const entry = [
      `### 🔹 [${timeStr}] @${record.agent}`,
      `- **Summary**: ${record.summary}`,
      filesStr.trimEnd(),
      decisionsStr.trimEnd(),
      '',
    ].filter(Boolean).join('\n');

    // Insert into Episodic section
    const marker = '<!-- EPISODIC_LOG_START -->';
    if (content.includes(marker)) {
      content = content.replace(marker, `${marker}\n${entry}`);
    } else {
      content += `\n\n## 🕒 1. Episodic Action Timeline (以前的 Agent 做了些什麼)\n${entry}`;
    }

    // Update Last Modified timestamp
    content = content.replace(
      /> \*\*最後更新時間 Last Updated\*\*: `[^`]*`/,
      `> **最後更新時間 Last Updated**: \`${new Date().toISOString()}\``
    );

    fs.writeFileSync(this.memoryFilePath, content, 'utf8');
  }

  /**
   * Update a cognitive sector (semantic, procedural, or reflective).
   */
  updateSector(sector: 'semantic' | 'procedural' | 'reflective', newContent: string): void {
    if (!fs.existsSync(this.memoryFilePath)) {
      this.initProject();
    }

    let content = fs.readFileSync(this.memoryFilePath, 'utf8');
    const sectorMarkers: Record<string, [string, string]> = {
      semantic: ['<!-- SEMANTIC_START -->', '<!-- SEMANTIC_END -->'],
      procedural: ['<!-- PROCEDURAL_START -->', '<!-- PROCEDURAL_END -->'],
      reflective: ['<!-- REFLECTIVE_START -->', '<!-- REFLECTIVE_END -->'],
    };

    const [startTag, endTag] = sectorMarkers[sector];
    if (content.includes(startTag) && content.includes(endTag)) {
      const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`);
      content = content.replace(regex, `${startTag}\n${newContent}\n${endTag}`);
      fs.writeFileSync(this.memoryFilePath, content, 'utf8');
    }
  }

  /**
   * Automatically inject the mandatory instruction into:
   * 1. .cursorrules / .cursor/rules/
   * 2. CLAUDE.md
   * 3. .windsurfrules
   * 4. .opencode/rules/
   * This guarantees that whichever agent opens the project, it will read AGENT_MEMORY.md first.
   */
  injectAgentRules(): { injected: string[] } {
    const injected: string[] = [];

    // 1. CLAUDE.md (for Claude Code CLI / Claude Desktop)
    const claudeMdPath = path.join(this.projectPath, 'CLAUDE.md');
    this.appendRuleToFile(claudeMdPath, 'CLAUDE.md');
    injected.push('CLAUDE.md');

    // 2. .cursorrules & .cursor/rules/agent-memory.mdc (for Cursor)
    const cursorRulesPath = path.join(this.projectPath, '.cursorrules');
    this.appendRuleToFile(cursorRulesPath, '.cursorrules');
    injected.push('.cursorrules');

    const cursorRulesDir = path.join(this.projectPath, '.cursor', 'rules');
    if (!fs.existsSync(cursorRulesDir)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true });
    }
    const mdcPath = path.join(cursorRulesDir, 'agent-memory.mdc');
    fs.writeFileSync(
      mdcPath,
      `---\ndescription: Mandatory instruction to read AGENT_MEMORY.md before working\nglobs: *\n---\n\n${MANDATORY_AGENT_RULE}\n`,
      'utf8'
    );
    injected.push('.cursor/rules/agent-memory.mdc');

    // 3. .windsurfrules (for Windsurf / Codeium)
    const windsurfRulesPath = path.join(this.projectPath, '.windsurfrules');
    this.appendRuleToFile(windsurfRulesPath, '.windsurfrules');
    injected.push('.windsurfrules');

    // 4. .opencode/rules/agent_memory.md (for OpenCode)
    const opencodeRulesDir = path.join(this.projectPath, '.opencode', 'rules');
    if (!fs.existsSync(opencodeRulesDir)) {
      fs.mkdirSync(opencodeRulesDir, { recursive: true });
    }
    const opencodeRuleFile = path.join(opencodeRulesDir, 'agent_memory.md');
    fs.writeFileSync(opencodeRuleFile, `${MANDATORY_AGENT_RULE}\n`, 'utf8');
    injected.push('.opencode/rules/agent_memory.md');

    return { injected };
  }

  /**
   * Specifically inject the Project Directive into CLAUDE.md, .cursorrules,
   * .windsurfrules, and .opencode/rules/agent_memory.md.
   */
  injectProjectDirective(targetProjectName?: string): { injected: string[] } {
    const projectName = targetProjectName || path.basename(this.projectPath) || 'Project';
    const directive = getProjectAgentDirective(projectName);
    const injected: string[] = [];

    const appendProjectRule = (filePath: string) => {
      const sig = `${projectName} Agent Directive`;
      if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, 'utf8');
        if (!existing.includes(sig)) {
          fs.appendFileSync(filePath, `\n\n${directive}\n`, 'utf8');
        }
      } else {
        fs.writeFileSync(filePath, `${directive}\n`, 'utf8');
      }
    };

    // CLAUDE.md
    const claudePath = path.join(this.projectPath, 'CLAUDE.md');
    appendProjectRule(claudePath);
    injected.push('CLAUDE.md');

    // .cursorrules
    const cursorPath = path.join(this.projectPath, '.cursorrules');
    appendProjectRule(cursorPath);
    injected.push('.cursorrules');

    // .cursor/rules/
    const cursorRulesDir = path.join(this.projectPath, '.cursor', 'rules');
    if (!fs.existsSync(cursorRulesDir)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true });
    }
    const mdcPath = path.join(cursorRulesDir, 'agent-memory.mdc');
    fs.writeFileSync(
      mdcPath,
      `---\ndescription: ${projectName} Agent Pre-Task Retrieval & Post-Decision Directive\nglobs: *\n---\n\n${directive}\n`,
      'utf8'
    );
    injected.push('.cursor/rules/agent-memory.mdc');

    // .windsurfrules
    const windsurfPath = path.join(this.projectPath, '.windsurfrules');
    appendProjectRule(windsurfPath);
    injected.push('.windsurfrules');

    // .opencode/rules/
    const opencodeDir = path.join(this.projectPath, '.opencode', 'rules');
    if (!fs.existsSync(opencodeDir)) {
      fs.mkdirSync(opencodeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(opencodeDir, 'agent_memory.md'), `${directive}\n`, 'utf8');
    injected.push('.opencode/rules/agent_memory.md');

    // If AGENT_MEMORY.md exists, prepend/update it
    if (fs.existsSync(this.memoryFilePath)) {
      let content = fs.readFileSync(this.memoryFilePath, 'utf8');
      if (!content.includes(`${projectName} Agent Directive`)) {
        content = content.replace(
          '# 🧠 Project Agent Memory:',
          `${directive}\n\n---\n\n# 🧠 Project Agent Memory:`
        );
        fs.writeFileSync(this.memoryFilePath, content, 'utf8');
      }
    }

    return { injected };
  }

  injectFocusinDirective(): { injected: string[] } {
    return this.injectProjectDirective();
  }

  private appendRuleToFile(filePath: string, displayName: string): void {
    const ruleSignature = 'AGENT MEMORY MANDATORY INSTRUCTION';
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf8');
      if (!existing.includes(ruleSignature)) {
        fs.appendFileSync(filePath, `\n\n${MANDATORY_AGENT_RULE}\n`, 'utf8');
      }
    } else {
      fs.writeFileSync(filePath, `${MANDATORY_AGENT_RULE}\n`, 'utf8');
    }
  }

  /**
   * Generates a structured OpenMemory-inspired Markdown template for AGENT_MEMORY.md.
   */
  private generateInitialTemplate(projectName: string): string {
    return `# 🧠 Project Agent Memory: ${projectName}

> **專案名稱 Project**: \`${projectName}\`  
> **最後更新時間 Last Updated**: \`${new Date().toISOString()}\`  
> **適用 Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf, Copilot

---

> ⚠️ **MANDATORY INSTRUCTION FOR ALL AGENTS (所有 Agent 必讀指令):**
> 1. **在開始執行任何任務前**：請務必先閱讀本檔案，了解先前其他 Agent 完成了什麼、有哪些架構決定，避免重複工作或破壞現有功能。
> 2. **在完成工作或做出重要決策後**：請於下方的「🕒 1. Episodic Action Timeline」中新增記錄，註明時間、Agent 名稱、修改內容與影響檔案。

---

## 🕒 1. Episodic Action Timeline (以前的 Agent 做了些什麼)
<!-- EPISODIC_LOG_START -->
### 🔹 [${new Date().toISOString()}] @system
- **Summary**: Initialized project agent memory & injected cross-agent workflow rules.
- **Files Touched**: \`AGENT_MEMORY.md\`, \`CLAUDE.md\`, \`.cursorrules\`, \`.windsurfrules\`
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
- **建置與測試指令**: 每次修改後執行 \`npm test\` 確保無破壞性變更。
- **並行 Agent 保護**: 多個 Agent 同時作業時，修改檔案前務必重新檢查最新檔案狀態。
<!-- PROCEDURAL_END -->

---

## 🔍 4. Reflective Notes & Known Issues (反思與已知問題)
<!-- REFLECTIVE_START -->
- **已知問題與待辦事項**: 
- **已踩過的坑 (Avoid Past Mistakes)**: 
<!-- REFLECTIVE_END -->
`;
  }
}
