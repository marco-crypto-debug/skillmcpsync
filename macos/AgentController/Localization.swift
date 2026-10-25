import SwiftUI
import Combine

public enum AppLanguage: String, CaseIterable, Identifiable {
    case traditionalChinese = "zh-Hant"
    case simplifiedChinese = "zh-Hans"
    case english = "en"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .traditionalChinese: return "繁體中文"
        case .simplifiedChinese: return "简体中文"
        case .english: return "English"
        }
    }

    public var flag: String {
        switch self {
        case .traditionalChinese: return "🇹🇼"
        case .simplifiedChinese: return "🇨🇳"
        case .english: return "🇺🇸"
        }
    }
}

public class LanguageManager: ObservableObject {
    public static let shared = LanguageManager()

    @Published public var currentLanguage: AppLanguage {
        didSet {
            UserDefaults.standard.set(currentLanguage.rawValue, forKey: "agent_controller_language")
        }
    }

    private init() {
        if let saved = UserDefaults.standard.string(forKey: "agent_controller_language"),
           let lang = AppLanguage(rawValue: saved) {
            self.currentLanguage = lang
        } else {
            // Default to Traditional Chinese
            self.currentLanguage = .traditionalChinese
        }
    }

    public func setLanguage(_ lang: AppLanguage) {
        self.currentLanguage = lang
    }
}

// MARK: - Localized String Lookup
public struct L10n {
    public static func tr(_ key: Key) -> String {
        let lang = LanguageManager.shared.currentLanguage
        return key.text(for: lang)
    }

    public enum Key {
        // App & Navigation
        case appTitle
        case navOverview
        case navServers
        case navSkillsAndTools
        case navProjectMemory
        case navSharedMemory
        case languageSetting

        // Overview
        case syncHeroBadge
        case syncHeroSubtitle
        case btnSyncAll
        case btnSyncing
        case sectionDetectedAgents
        case agentInstalledCount(Int, Int)
        case badgeInstalled
        case badgeNotDetected
        case metricServers
        case metricSkills
        case metricTools
        case metricSharedMemory
        case btnExportDesktop
        case btnInjectFocusin
        case btnRefreshState
        case consoleTitle
        case consolePlaceholder
        case lastSync(String)

        // Servers View
        case serversTitle
        case serversSubtitle
        case searchServersPlaceholder
        case btnRefresh
        case labelCommand

        // Skills & Tools View
        case skillsTitle
        case skillsSubtitle
        case tabSkills(Int)
        case tabTools(Int)
        case btnViewSkillMd
        case btnClose

        // Project Memory View
        case projectMemoryTitle
        case projectMemorySubtitle
        case btnChooseProjectFolder
        case labelCurrentProject
        case btnReload
        case focusinDirectiveTitle
        case btnInjectFocusinToProject
        case focusinDirectiveBody
        case episodicTimelineTitle
        case episodicRecordsCount(Int)
        case emptyTimelinePrompt
        case btnInitProjectMemory
        case labelFilesTouched
        case labelKeyDecisions
        case quickLogTitle
        case labelSourceAgent
        case placeholderSummary
        case placeholderFiles
        case placeholderDecisions
        case btnLogAction
        case rawEditorTitle
        case btnSaveChanges

        // Shared Memory View
        case sharedMemoryTitle
        case sharedMemorySubtitle
        case emptySharedMemoryTitle
        case emptySharedMemorySubtitle

        public func text(for lang: AppLanguage) -> String {
            switch self {
            // Navigation & App
            case .appTitle:
                return "Agent Controller"
            case .navOverview:
                switch lang {
                case .traditionalChinese: return "總覽與同步"
                case .simplifiedChinese: return "总览与同步"
                case .english: return "Overview"
                }
            case .navServers:
                switch lang {
                case .traditionalChinese: return "MCP 伺服器"
                case .simplifiedChinese: return "MCP 服务器"
                case .english: return "Servers & MCPs"
                }
            case .navSkillsAndTools:
                switch lang {
                case .traditionalChinese: return "技能與工具"
                case .simplifiedChinese: return "技能与工具"
                case .english: return "Skills & Tools"
                }
            case .navProjectMemory:
                switch lang {
                case .traditionalChinese: return "專案記憶 (.md)"
                case .simplifiedChinese: return "项目记忆 (.md)"
                case .english: return "Project Memory (.md)"
                }
            case .navSharedMemory:
                switch lang {
                case .traditionalChinese: return "共享記憶庫"
                case .simplifiedChinese: return "共享记忆库"
                case .english: return "Shared Memory"
                }
            case .languageSetting:
                switch lang {
                case .traditionalChinese: return "語言設定"
                case .simplifiedChinese: return "语言设置"
                case .english: return "Language"
                }

            // Overview
            case .syncHeroBadge:
                switch lang {
                case .traditionalChinese: return "跨 Agent 雙向全同步"
                case .simplifiedChinese: return "跨 Agent 双向全同步"
                case .english: return "Cross-Agent Bi-directional Sync"
                }
            case .syncHeroSubtitle:
                switch lang {
                case .traditionalChinese: return "按一個按鈕，在任一 Agent 下載的 MCP、Skills 與記憶直接自動同步至所有 Agent"
                case .simplifiedChinese: return "按一个按钮，在任一 Agent 下载的 MCP、Skills 与记忆直接自动同步至所有 Agent"
                case .english: return "One click to sync newly downloaded MCPs, Skills, and Memories across all installed agents."
                }
            case .btnSyncAll:
                switch lang {
                case .traditionalChinese: return "⚡️ 一鍵同步所有 Agent"
                case .simplifiedChinese: return "⚡️ 一键同步所有 Agent"
                case .english: return "⚡️ Sync All Agents"
                }
            case .btnSyncing:
                switch lang {
                case .traditionalChinese: return "正在雙向同步中..."
                case .simplifiedChinese: return "正在双向同步中..."
                case .english: return "Syncing in progress..."
                }
            case .sectionDetectedAgents:
                switch lang {
                case .traditionalChinese: return "已偵測本機 Agents"
                case .simplifiedChinese: return "已检测本机 Agents"
                case .english: return "Detected Local Agents"
                }
            case .agentInstalledCount(let installed, let total):
                switch lang {
                case .traditionalChinese: return "\(installed) / \(total) 已安裝"
                case .simplifiedChinese: return "\(installed) / \(total) 已安装"
                case .english: return "\(installed) / \(total) Installed"
                }
            case .badgeInstalled:
                switch lang {
                case .traditionalChinese: return "已安裝"
                case .simplifiedChinese: return "已安装"
                case .english: return "Installed"
                }
            case .badgeNotDetected:
                switch lang {
                case .traditionalChinese: return "未偵測"
                case .simplifiedChinese: return "未检测"
                case .english: return "Not Found"
                }
            case .metricServers:
                switch lang {
                case .traditionalChinese: return "MCP 伺服器"
                case .simplifiedChinese: return "MCP 服务器"
                case .english: return "MCP Servers"
                }
            case .metricSkills:
                switch lang {
                case .traditionalChinese: return "有效技能 (Skills)"
                case .simplifiedChinese: return "有效技能 (Skills)"
                case .english: return "Active Skills"
                }
            case .metricTools:
                switch lang {
                case .traditionalChinese: return "已同步工具 (Tools)"
                case .simplifiedChinese: return "已同步工具 (Tools)"
                case .english: return "Synced Tools"
                }
            case .metricSharedMemory:
                switch lang {
                case .traditionalChinese: return "全域共享記憶"
                case .simplifiedChinese: return "全局共享记忆"
                case .english: return "Shared Memory"
                }
            case .btnExportDesktop:
                switch lang {
                case .traditionalChinese: return "匯出 MEMORY.md 至桌面"
                case .simplifiedChinese: return "导出 MEMORY.md 至桌面"
                case .english: return "Export MEMORY.md to Desktop"
                }
            case .btnInjectFocusin:
                switch lang {
                case .traditionalChinese: return "注入 FocusIn 開工準則"
                case .simplifiedChinese: return "注入 FocusIn 开工准则"
                case .english: return "Inject FocusIn Directive"
                }
            case .btnRefreshState:
                switch lang {
                case .traditionalChinese: return "重新整理本機狀態"
                case .simplifiedChinese: return "刷新本机状态"
                case .english: return "Refresh Local State"
                }
            case .consoleTitle:
                switch lang {
                case .traditionalChinese: return "即時同步日誌 (Sync Activity Console)"
                case .simplifiedChinese: return "实时同步日志 (Sync Activity Console)"
                case .english: return "Live Sync Activity Console"
                }
            case .consolePlaceholder:
                switch lang {
                case .traditionalChinese: return "點擊「⚡️ 一鍵同步所有 Agent」開始執行全機 MCP、Skills 與記憶同步..."
                case .simplifiedChinese: return "点击“⚡️ 一键同步所有 Agent”开始执行全机 MCP、Skills 与记忆同步..."
                case .english: return "Click '⚡️ Sync All Agents' to start full system synchronization..."
                }
            case .lastSync(let time):
                switch lang {
                case .traditionalChinese: return "最後同步: \(time)"
                case .simplifiedChinese: return "最后同步: \(time)"
                case .english: return "Last Sync: \(time)"
                }

            // Servers View
            case .serversTitle:
                switch lang {
                case .traditionalChinese: return "MCP 伺服器"
                case .simplifiedChinese: return "MCP 服务器"
                case .english: return "MCP Servers"
                }
            case .serversSubtitle:
                switch lang {
                case .traditionalChinese: return "全機已偵測並同步的 MCP 伺服器端點"
                case .simplifiedChinese: return "全机已检测并同步的 MCP 服务器端点"
                case .english: return "All detected and synchronized MCP server endpoints"
                }
            case .searchServersPlaceholder:
                switch lang {
                case .traditionalChinese: return "搜尋 MCP 伺服器..."
                case .simplifiedChinese: return "搜索 MCP 服务器..."
                case .english: return "Search MCP servers..."
                }
            case .btnRefresh:
                switch lang {
                case .traditionalChinese: return "重新整理"
                case .simplifiedChinese: return "刷新"
                case .english: return "Refresh"
                }
            case .labelCommand:
                switch lang {
                case .traditionalChinese: return "指令:"
                case .simplifiedChinese: return "命令:"
                case .english: return "Command:"
                }

            // Skills & Tools View
            case .skillsTitle:
                switch lang {
                case .traditionalChinese: return "技能與工具 (Skills & Tools)"
                case .simplifiedChinese: return "技能与工具 (Skills & Tools)"
                case .english: return "Skills & Tools"
                }
            case .skillsSubtitle:
                switch lang {
                case .traditionalChinese: return "本機聚合之技能模組與跨 Agent 工具"
                case .simplifiedChinese: return "本机聚合之技能模块与跨 Agent 工具"
                case .english: return "Local aggregated skill modules and cross-agent tools"
                }
            case .tabSkills(let count):
                switch lang {
                case .traditionalChinese: return "技能 (\(count))"
                case .simplifiedChinese: return "技能 (\(count))"
                case .english: return "Skills (\(count))"
                }
            case .tabTools(let count):
                switch lang {
                case .traditionalChinese: return "工具 (\(count))"
                case .simplifiedChinese: return "工具 (\(count))"
                case .english: return "Tools (\(count))"
                }
            case .btnViewSkillMd:
                switch lang {
                case .traditionalChinese: return "檢視 SKILL.md"
                case .simplifiedChinese: return "查看 SKILL.md"
                case .english: return "View SKILL.md"
                }
            case .btnClose:
                switch lang {
                case .traditionalChinese: return "關閉"
                case .simplifiedChinese: return "关闭"
                case .english: return "Close"
                }

            // Project Memory View
            case .projectMemoryTitle:
                switch lang {
                case .traditionalChinese: return "專案記憶 (Project AGENT_MEMORY.md)"
                case .simplifiedChinese: return "项目记忆 (Project AGENT_MEMORY.md)"
                case .english: return "Project Memory (AGENT_MEMORY.md)"
                }
            case .projectMemorySubtitle:
                switch lang {
                case .traditionalChinese: return "基於 OpenMemory 認知架構：所有 Agent 在執行前強制手動閱讀歷史決策與踩坑"
                case .simplifiedChinese: return "基于 OpenMemory 认知架构：所有 Agent 在执行前强制手动阅读历史决策与踩坑"
                case .english: return "Based on OpenMemory cognitive architecture: All agents must read past actions before executing"
                }
            case .btnChooseProjectFolder:
                switch lang {
                case .traditionalChinese: return "選擇專案目錄..."
                case .simplifiedChinese: return "选择项目目录..."
                case .english: return "Choose Project Folder..."
                }
            case .labelCurrentProject:
                switch lang {
                case .traditionalChinese: return "當前專案目錄:"
                case .simplifiedChinese: return "当前项目目录:"
                case .english: return "Current Project Path:"
                }
            case .btnReload:
                switch lang {
                case .traditionalChinese: return "重新讀取"
                case .simplifiedChinese: return "重新读取"
                case .english: return "Reload"
                }
            case .focusinDirectiveTitle:
                switch lang {
                case .traditionalChinese: return "🎯 FocusIn 專案 Agent 開工核心準則"
                case .simplifiedChinese: return "🎯 FocusIn 项目 Agent 开工核心准则"
                case .english: return "🎯 FocusIn Project Agent Directive"
                }
            case .btnInjectFocusinToProject:
                switch lang {
                case .traditionalChinese: return "一鍵注入開工準則至本專案"
                case .simplifiedChinese: return "一键注入开工准则至本项目"
                case .english: return "Inject Directive to Project"
                }
            case .focusinDirectiveBody:
                switch lang {
                case .traditionalChinese:
                    return "每次開工前，優先從 shared memory 搜尋本 Focusin 專案相關：架構約束、Swift 規範、AVAudioEngine 踩坑、過往失敗方案。\n每完成一輪重要決策、找到 bug 根因、確認一個架構選擇，自動寫入 shared memory，標記來源 Agent（OpenCode / OMO）。\n不要記瑣碎對話，只存長期有用知識。"
                case .simplifiedChinese:
                    return "每次开工前，优先从 shared memory 搜寻本 Focusin 项目相关：架构约束、Swift 规范、AVAudioEngine 踩坑、过往失败方案。\n每完成一轮重要决策、找到 bug 根因、确认一个架构选择，自动写入 shared memory，标记来源 Agent（OpenCode / OMO）。\n不要记琐碎对话，只存长期有用知识。"
                case .english:
                    return "Before starting work, search shared memory for FocusIn-related facts: architectural constraints, Swift rules, AVAudioEngine pitfalls, and past failed solutions.\nAfter completing key decisions, finding bug root causes, or choosing an architecture, automatically write into shared memory tagging the source agent (OpenCode / OMO).\nDo not record trivial chat, only persist high-value long-term knowledge."
                }
            case .episodicTimelineTitle:
                switch lang {
                case .traditionalChinese: return "🕒 1. Episodic Action Timeline (以前的 Agent 做了些什麼)"
                case .simplifiedChinese: return "🕒 1. Episodic Action Timeline (以往的 Agent 做了些什么)"
                case .english: return "🕒 1. Episodic Action Timeline (What Previous Agents Did)"
                }
            case .episodicRecordsCount(let count):
                switch lang {
                case .traditionalChinese: return "共 \(count) 筆歷史紀錄"
                case .simplifiedChinese: return "共 \(count) 条历史记录"
                case .english: return "\(count) record(s)"
                }
            case .emptyTimelinePrompt:
                switch lang {
                case .traditionalChinese: return "此專案尚未記錄歷史動作。"
                case .simplifiedChinese: return "此项目尚未记录历史动作。"
                case .english: return "No actions recorded in this project yet."
                }
            case .btnInitProjectMemory:
                switch lang {
                case .traditionalChinese: return "初始化專案記憶並注入 Agent 強制讀取規則"
                case .simplifiedChinese: return "初始化项目记忆并注入 Agent 强制读取规则"
                case .english: return "Initialize Project Memory & Inject Rules"
                }
            case .labelFilesTouched:
                switch lang {
                case .traditionalChinese: return "影響檔案:"
                case .simplifiedChinese: return "变动文件:"
                case .english: return "Files Touched:"
                }
            case .labelKeyDecisions:
                switch lang {
                case .traditionalChinese: return "核心決策:"
                case .simplifiedChinese: return "核心决策:"
                case .english: return "Key Decisions:"
                }
            case .quickLogTitle:
                switch lang {
                case .traditionalChinese: return "✍️ Agent 完成任務寫入記憶"
                case .simplifiedChinese: return "✍️ Agent 完成任务写入记忆"
                case .english: return "✍️ Log Completed Agent Action"
                }
            case .labelSourceAgent:
                switch lang {
                case .traditionalChinese: return "來源 Agent:"
                case .simplifiedChinese: return "来源 Agent:"
                case .english: return "Source Agent:"
                }
            case .placeholderSummary:
                switch lang {
                case .traditionalChinese: return "完成任務簡述 (Summary)"
                case .simplifiedChinese: return "完成任务简述 (Summary)"
                case .english: return "Task summary"
                }
            case .placeholderFiles:
                switch lang {
                case .traditionalChinese: return "修改檔案 (以逗號分隔，例如: Audio.swift, Network.swift)"
                case .simplifiedChinese: return "修改文件 (以逗号分隔，例如: Audio.swift, Network.swift)"
                case .english: return "Files touched (comma separated, e.g. Audio.swift, Network.swift)"
                }
            case .placeholderDecisions:
                switch lang {
                case .traditionalChinese: return "核心架構決策 / 根因分析"
                case .simplifiedChinese: return "核心架构决策 / 根因分析"
                case .english: return "Key architectural decisions / root cause"
                }
            case .btnLogAction:
                switch lang {
                case .traditionalChinese: return "寫入專案記憶 (AGENT_MEMORY.md)"
                case .simplifiedChinese: return "写入项目记忆 (AGENT_MEMORY.md)"
                case .english: return "Log to AGENT_MEMORY.md"
                }
            case .rawEditorTitle:
                switch lang {
                case .traditionalChinese: return "📄 檢視 / 編輯 AGENT_MEMORY.md 原檔"
                case .simplifiedChinese: return "📄 查看 / 编辑 AGENT_MEMORY.md 原文件"
                case .english: return "📄 View / Edit Raw AGENT_MEMORY.md"
                }
            case .btnSaveChanges:
                switch lang {
                case .traditionalChinese: return "儲存變更"
                case .simplifiedChinese: return "保存更改"
                case .english: return "Save Changes"
                }

            // Shared Memory View
            case .sharedMemoryTitle:
                switch lang {
                case .traditionalChinese: return "全域跨 Agent 共享記憶庫 (Shared Memory)"
                case .simplifiedChinese: return "全局跨 Agent 共享记忆库 (Shared Memory)"
                case .english: return "Global Cross-Agent Shared Memory"
                }
            case .sharedMemorySubtitle:
                switch lang {
                case .traditionalChinese: return "存放跨專案、長期高價值架構事實與防踩坑決策"
                case .simplifiedChinese: return "存放跨项目、长期高价值架构事实与防踩坑决策"
                case .english: return "Stores cross-project, high-value architecture facts and decisions"
                }
            case .emptySharedMemoryTitle:
                switch lang {
                case .traditionalChinese: return "共享記憶庫目前無跨專案全域條目"
                case .simplifiedChinese: return "共享记忆库目前无跨项目全局条目"
                case .english: return "No global shared memory entries yet"
                }
            case .emptySharedMemorySubtitle:
                switch lang {
                case .traditionalChinese: return "執行重要架構決定後，條目將透過 sync 自動廣播給所有 Agent。"
                case .simplifiedChinese: return "执行重要架构决定后，条目将通过 sync 自动广播给所有 Agent。"
                case .english: return "Entries are automatically broadcast to all agents during sync."
                }
            }
        }
    }
}
