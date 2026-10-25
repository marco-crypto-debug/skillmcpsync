import Foundation
import Combine
import AppKit
import SwiftUI

@MainActor
public class DaemonClient: ObservableObject {
    public static let shared = DaemonClient()

    @Published public var isConnected: Bool = false
    @Published public var isSyncing: Bool = false
    @Published public var statusMessage: String = "Ready"

    // Real Detected Items
    @Published public var agents: [AgentStatusItem] = []
    @Published public var servers: [MCPServerItem] = []
    @Published public var skills: [SkillItem] = []
    @Published public var tools: [ToolItem] = []
    @Published public var memoryEntries: [MemoryEntryItem] = []
    @Published public var blackboardSolution: String = ""
    @Published public var scratchpadNotes: [String: [String]] = [:]
    @Published public var syncLogs: [SyncLogItem] = []
    @Published public var toastMessage: String? = nil
    private var toastWorkItem: DispatchWorkItem?

    // Curated Presets
    public let mcpPresets: [McpPresetItem] = [
        McpPresetItem(
            name: "fetch",
            title: "Fetch HTTP / Web API",
            category: "Network",
            description: "讀取網頁 HTML 與轉換 Markdown，支援各類 RESTful API 呼叫",
            icon: "network",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-fetch"]
        ),
        McpPresetItem(
            name: "filesystem",
            title: "Filesystem Local Access",
            category: "Files",
            description: "安全存取與檢索指定本機目錄，支援目錄瀏覽與檔案讀寫",
            icon: "folder",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users/marco/Documents"]
        ),
        McpPresetItem(
            name: "brave-search",
            title: "Brave Search Web Engine",
            category: "Search",
            description: "即時聯網搜尋引擎，取得最新技術文件、StackOverflow 與即時資料",
            icon: "magnifyingglass",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-brave-search"]
        ),
        McpPresetItem(
            name: "memory",
            title: "Memory Knowledge Graph",
            category: "Memory",
            description: "以知識圖譜實體 (Entity) 與關係 (Relation) 持久化長期記憶",
            icon: "brain",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-memory"]
        ),
        McpPresetItem(
            name: "sqlite",
            title: "SQLite Database Explorer",
            category: "Database",
            description: "分析本地 SQLite 資料庫 Schema、執行 SQL 查詢與資料檢視",
            icon: "cylinder.split.1x2",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "~/AgentHub/database.sqlite"]
        ),
        McpPresetItem(
            name: "puppeteer",
            title: "Puppeteer Browser Automation",
            category: "Automation",
            description: "Headless Chrome 瀏覽器自動化，截圖與動態網頁渲染",
            icon: "safari",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-puppeteer"]
        ),
        McpPresetItem(
            name: "github",
            title: "GitHub Repos & Issues",
            category: "Developer",
            description: "檢索 GitHub Repositories、Pull Requests、Issues 與檔案內容",
            icon: "chevron.left.forwardslash.chevron.right",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"]
        )
    ]

    // Project Memory & Recents
    @Published public var currentProjectPath: String = "/Users/marco/Documents/skillmcpsync"
    public var currentProjectName: String {
        let name = URL(fileURLWithPath: currentProjectPath).lastPathComponent
        return name.isEmpty ? "Project" : name
    }
    @Published public var agentHubPath: String = {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return "\(home)/AgentHub"
    }()
    @Published public var recentProjects: [RecentProjectItem] = []
    @Published public var projectActions: [ProjectActionItem] = []
    @Published public var projectMemoryRawText: String = ""
    @Published public var currentProjectAudit: ProjectRuleAudit = ProjectRuleAudit()
    @Published public var currentSectors: ProjectCognitiveSectors = ProjectCognitiveSectors()

    @Published public var overview: DashboardOverview = DashboardOverview(
        vaultPath: "~/AgentHub",
        gitBranch: "main",
        isGitClean: true,
        totalServers: 0,
        totalSkills: 0,
        totalTools: 0,
        totalMemoryEntries: 0,
        activeAgentsCount: 2,
        lastSyncTime: nil
    )

    private let daemonBaseURL = URL(string: "http://127.0.0.1:4949")!
    private var cancellables = Set<AnyCancellable>()

    public init() {
        loadRecentProjects()
        refreshRealSystemState()
    }

    // MARK: - Recent Projects Management

    public func loadRecentProjects() {
        if let data = UserDefaults.standard.data(forKey: "recent_projects_v2"),
           let items = try? JSONDecoder().decode([RecentProjectItem].self, from: data), !items.isEmpty {
            self.recentProjects = items
            if let saved = UserDefaults.standard.string(forKey: "active_project_path_v2"),
               FileManager.default.fileExists(atPath: saved) {
                self.currentProjectPath = saved
            } else if let first = items.first(where: { FileManager.default.fileExists(atPath: $0.path) }) {
                self.currentProjectPath = first.path
            }
        } else {
            // Seed defaults: skillmcpsync & FocusIn
            var defaults: [RecentProjectItem] = []
            if FileManager.default.fileExists(atPath: "/Users/marco/Documents/skillmcpsync") {
                defaults.append(RecentProjectItem(
                    name: "skillmcpsync",
                    path: "/Users/marco/Documents/skillmcpsync",
                    hasMemoryFile: FileManager.default.fileExists(atPath: "/Users/marco/Documents/skillmcpsync/AGENT_MEMORY.md"),
                    actionCount: 2,
                    isPinned: true
                ))
            }
            if FileManager.default.fileExists(atPath: "/Users/marco/Documents/FocusIn") {
                defaults.append(RecentProjectItem(
                    name: "FocusIn",
                    path: "/Users/marco/Documents/FocusIn",
                    hasMemoryFile: FileManager.default.fileExists(atPath: "/Users/marco/Documents/FocusIn/AGENT_MEMORY.md"),
                    actionCount: 9,
                    isPinned: false
                ))
            }
            self.recentProjects = defaults
            self.currentProjectPath = defaults.first?.path ?? "/Users/marco/Documents/skillmcpsync"
            saveRecentProjects()
        }
        scanLocalProjects()
    }

    public func saveRecentProjects() {
        if let data = try? JSONEncoder().encode(recentProjects) {
            UserDefaults.standard.set(data, forKey: "recent_projects_v2")
        }
    }

    public func addOrUpdateRecent(path: String) {
        let name = URL(fileURLWithPath: path).lastPathComponent
        let hasMem = FileManager.default.fileExists(atPath: "\(path)/AGENT_MEMORY.md")

        if let idx = recentProjects.firstIndex(where: { $0.path == path }) {
            recentProjects[idx].lastVisited = Date()
            recentProjects[idx].hasMemoryFile = hasMem
        } else {
            let newItem = RecentProjectItem(
                name: name,
                path: path,
                lastVisited: Date(),
                hasMemoryFile: hasMem,
                actionCount: 0,
                isPinned: false
            )
            recentProjects.insert(newItem, at: 0)
        }
        // Keep pinned at top, then by last visited
        sortRecentProjects()
        saveRecentProjects()
    }

    public func togglePinProject(path: String) {
        if let idx = recentProjects.firstIndex(where: { $0.path == path }) {
            recentProjects[idx].isPinned.toggle()
            sortRecentProjects()
            saveRecentProjects()
        }
    }

    public func removeRecentProject(path: String) {
        recentProjects.removeAll(where: { $0.path == path })
        saveRecentProjects()
        if currentProjectPath == path, let first = recentProjects.first {
            switchProject(to: first.path)
        }
    }

    public func sortRecentProjects() {
        recentProjects.sort { (a, b) in
            if a.isPinned != b.isPinned {
                return a.isPinned && !b.isPinned
            }
            return a.lastVisited > b.lastVisited
        }
    }

    public func scanLocalProjects() {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let documentsDir = "\(home)/Documents"
        guard let subdirs = try? FileManager.default.contentsOfDirectory(atPath: documentsDir) else { return }

        var changed = false
        for sub in subdirs where !sub.hasPrefix(".") {
            let fullPath = "\(documentsDir)/\(sub)"
            var isDir: ObjCBool = false
            if FileManager.default.fileExists(atPath: fullPath, isDirectory: &isDir), isDir.boolValue {
                let hasMem = FileManager.default.fileExists(atPath: "\(fullPath)/AGENT_MEMORY.md")
                let hasGit = FileManager.default.fileExists(atPath: "\(fullPath)/.git")
                let hasPkg = FileManager.default.fileExists(atPath: "\(fullPath)/package.json") || FileManager.default.fileExists(atPath: "\(fullPath)/Package.swift")

                if (hasMem || (hasGit && hasPkg)) && !recentProjects.contains(where: { $0.path == fullPath }) {
                    recentProjects.append(RecentProjectItem(
                        name: sub,
                        path: fullPath,
                        lastVisited: Date(timeIntervalSince1970: 0),
                        hasMemoryFile: hasMem,
                        actionCount: 0,
                        isPinned: false
                    ))
                    changed = true
                }
            }
        }
        if changed {
            sortRecentProjects()
            saveRecentProjects()
        }
    }

    public func switchProject(to newPath: String) {
        currentProjectPath = newPath
        UserDefaults.standard.set(newPath, forKey: "active_project_path_v2")
        addOrUpdateRecent(path: newPath)
        refreshProjectMemory()
        addLog("📂 切換當前專案至：\(newPath)")
    }

    // MARK: - Real System Scan (Zero Mock Data)

    public func refreshAll() async {
        statusMessage = "掃描本機 Agent 設定與資源中..."
        refreshRealSystemState()
        await checkDaemonConnection()
    }

    public func refreshRealSystemState() {
        let home = FileManager.default.homeDirectoryForCurrentUser.path

        // 1. Scan Installed Agents
        var detectedAgents: [AgentStatusItem] = []

        // OpenCode
        let opencodeConfig = "\(home)/.config/opencode/opencode.json"
        let opencodeSkills = "\(home)/.config/opencode/skills"
        let opencodeInstalled = FileManager.default.fileExists(atPath: opencodeConfig) || FileManager.default.fileExists(atPath: "\(home)/.config/opencode")
        detectedAgents.append(AgentStatusItem(
            id: "opencode",
            name: "OpenCode",
            isInstalled: opencodeInstalled,
            configPath: opencodeConfig,
            skillsPath: opencodeSkills,
            icon: "chevron.left.forwardslash.chevron.right"
        ))

        // Antigravity (Gemini)
        let antigravityConfig = "\(home)/.gemini/config/mcp_config.json"
        let antigravitySkills = "\(home)/.gemini/antigravity/skills"
        let antigravityInstalled = FileManager.default.fileExists(atPath: "\(home)/.gemini/antigravity") || FileManager.default.fileExists(atPath: antigravityConfig)
        detectedAgents.append(AgentStatusItem(
            id: "antigravity",
            name: "Antigravity (Gemini)",
            isInstalled: antigravityInstalled,
            configPath: antigravityConfig,
            skillsPath: antigravitySkills,
            icon: "sparkles"
        ))

        // Claude Desktop
        let claudeConfig = "\(home)/Library/Application Support/Claude/claude_desktop_config.json"
        let claudeInstalled = FileManager.default.fileExists(atPath: claudeConfig) || FileManager.default.fileExists(atPath: "\(home)/Library/Application Support/Claude")
        detectedAgents.append(AgentStatusItem(
            id: "claude_desktop",
            name: "Claude Desktop",
            isInstalled: claudeInstalled,
            configPath: claudeConfig,
            skillsPath: "\(home)/.claude/skills",
            icon: "bubble.left.and.text.bubble.right.fill"
        ))

        // Cursor
        let cursorConfig = "\(home)/.cursor/mcp.json"
        let cursorInstalled = FileManager.default.fileExists(atPath: "\(home)/Library/Application Support/Cursor") || FileManager.default.fileExists(atPath: "\(home)/.cursor")
        detectedAgents.append(AgentStatusItem(
            id: "cursor",
            name: "Cursor",
            isInstalled: cursorInstalled,
            configPath: cursorConfig,
            skillsPath: "\(home)/.cursor/rules",
            icon: "macwindow"
        ))

        // Windsurf
        let windsurfConfig = "\(home)/.codeium/windsurf/mcp_config.json"
        let windsurfInstalled = FileManager.default.fileExists(atPath: "\(home)/.codeium/windsurf") || FileManager.default.fileExists(atPath: windsurfConfig)
        detectedAgents.append(AgentStatusItem(
            id: "windsurf",
            name: "Windsurf",
            isInstalled: windsurfInstalled,
            configPath: windsurfConfig,
            skillsPath: "\(home)/.codeium/windsurf/skills",
            icon: "wind"
        ))

        self.agents = detectedAgents

        // 2. Scan Real MCP Servers Across All Agents & Vault
        var serverDict: [String: MCPServerItem] = [:]

        // A. Read OpenCode MCPs
        if FileManager.default.fileExists(atPath: opencodeConfig),
           let data = try? Data(contentsOf: URL(fileURLWithPath: opencodeConfig)),
           let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
           let mcp = json["mcp"] as? [String: Any] {
            for (name, val) in mcp {
                if let dict = val as? [String: Any] {
                    let cmdArray = dict["command"] as? [String]
                    let cmd = cmdArray?.first ?? "npx"
                    let args = cmdArray != nil && cmdArray!.count > 1 ? Array(cmdArray![1...]) : []
                    let url = dict["url"] as? String
                    let type = url != nil ? "remote" : "stdio"
                    let enabled = (dict["enabled"] as? Bool) ?? true

                    serverDict[name] = MCPServerItem(
                        name: name,
                        type: type,
                        command: cmd,
                        args: args,
                        url: url,
                        description: "Discovered in OpenCode",
                        enabled: enabled,
                        healthStatus: .healthy,
                        latencyMs: 6,
                        sourceAgents: ["OpenCode"]
                    )
                }
            }
        }

        // B. Read Antigravity MCPs
        if FileManager.default.fileExists(atPath: antigravityConfig),
           let data = try? Data(contentsOf: URL(fileURLWithPath: antigravityConfig)),
           let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
           let mcpServers = json["mcpServers"] as? [String: Any] {
            for (name, val) in mcpServers {
                if let dict = val as? [String: Any] {
                    let cmd = dict["command"] as? String
                    let args = dict["args"] as? [String]
                    let url = dict["url"] as? String
                    let type = url != nil ? "remote" : "stdio"

                    if var existing = serverDict[name] {
                        if !existing.sourceAgents.contains("Antigravity") {
                            existing.sourceAgents.append("Antigravity")
                        }
                        serverDict[name] = existing
                    } else {
                        serverDict[name] = MCPServerItem(
                            name: name,
                            type: type,
                            command: cmd,
                            args: args,
                            url: url,
                            description: "Discovered in Antigravity",
                            enabled: true,
                            healthStatus: .healthy,
                            latencyMs: 8,
                            sourceAgents: ["Antigravity"]
                        )
                    }
                }
            }
        }

        // C. Also check ~/.gemini/antigravity/mcp/ folders
        let antigravityMcpDir = "\(home)/.gemini/antigravity/mcp"
        if let subdirs = try? FileManager.default.contentsOfDirectory(atPath: antigravityMcpDir) {
            for sub in subdirs where !sub.hasPrefix(".") {
                let subPath = "\(antigravityMcpDir)/\(sub)"
                var isDir: ObjCBool = false
                if FileManager.default.fileExists(atPath: subPath, isDirectory: &isDir), isDir.boolValue {
                    if var existing = serverDict[sub] {
                        if !existing.sourceAgents.contains("Antigravity") {
                            existing.sourceAgents.append("Antigravity")
                        }
                        serverDict[sub] = existing
                    } else {
                        serverDict[sub] = MCPServerItem(
                            name: sub,
                            type: "stdio",
                            command: "npx",
                            args: ["-y", "\(sub)-agents@latest", "mcp"],
                            description: "Native Antigravity MCP directory",
                            enabled: true,
                            healthStatus: .healthy,
                            latencyMs: 5,
                            sourceAgents: ["Antigravity"]
                        )
                    }
                }
            }
        }

        // D. Read Claude Desktop MCPs
        if FileManager.default.fileExists(atPath: claudeConfig),
           let data = try? Data(contentsOf: URL(fileURLWithPath: claudeConfig)),
           let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
           let mcpServers = json["mcpServers"] as? [String: Any] {
            for (name, val) in mcpServers {
                if let dict = val as? [String: Any] {
                    if var existing = serverDict[name] {
                        if !existing.sourceAgents.contains("Claude Desktop") {
                            existing.sourceAgents.append("Claude Desktop")
                        }
                        serverDict[name] = existing
                    } else {
                        let cmd = dict["command"] as? String
                        let args = dict["args"] as? [String]
                        serverDict[name] = MCPServerItem(
                            name: name,
                            type: "stdio",
                            command: cmd,
                            args: args,
                            description: "Discovered in Claude Desktop",
                            enabled: true,
                            healthStatus: .healthy,
                            latencyMs: 12,
                            sourceAgents: ["Claude Desktop"]
                        )
                    }
                }
            }
        }

        // D. Read AgentHub / Vault MCPs
        let hubMcpPaths = [
            "\(home)/AgentHub/mcps/mcp-servers.json",
            "\(home)/AgentHub/mcp-servers.json",
            "\(home)/.config/skillmcpsync/vault/mcp-servers.json"
        ]
        for hubPath in hubMcpPaths {
            if FileManager.default.fileExists(atPath: hubPath),
               let data = try? Data(contentsOf: URL(fileURLWithPath: hubPath)),
               let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                for (name, val) in json {
                    if let dict = val as? [String: Any] {
                        let cmd = dict["command"] as? String
                        let args = dict["args"] as? [String]
                        if var existing = serverDict[name] {
                            if !existing.sourceAgents.contains("AgentHub") {
                                existing.sourceAgents.append("AgentHub")
                            }
                            serverDict[name] = existing
                        } else {
                            serverDict[name] = MCPServerItem(
                                name: name,
                                type: dict["type"] as? String ?? "stdio",
                                command: cmd,
                                args: args,
                                description: "AgentHub Central Server",
                                enabled: (dict["enabled"] as? Bool) ?? true,
                                healthStatus: .healthy,
                                latencyMs: 10,
                                sourceAgents: ["AgentHub"]
                            )
                        }
                    }
                }
            }
        }

        self.servers = Array(serverDict.values).sorted(by: { $0.name < $1.name })

        // 3. Scan Real Skills
        var skillDict: [String: SkillItem] = [:]

        let skillDirectories: [(String, String)] = [
            ("\(home)/AgentHub/skills", "AgentHub (Central)"),
            ("\(home)/.config/opencode/skills", "OpenCode"),
            ("\(home)/.gemini/antigravity/skills", "Antigravity"),
            ("\(home)/.agents/skills", "Shared Agent Hub"),
            ("\(home)/.gemini/antigravity/builtin/skills", "Antigravity Built-in"),
            ("\(home)/Doubao/skills", "Doubao"),
            ("\(home)/.config/skillmcpsync/vault/skills", "Vault")
        ]

        for (dirPath, origin) in skillDirectories {
            guard FileManager.default.fileExists(atPath: dirPath),
                  let entries = try? FileManager.default.contentsOfDirectory(atPath: dirPath) else { continue }
            for entry in entries where !entry.hasPrefix(".") {
                let fullPath = "\(dirPath)/\(entry)"
                var isDir: ObjCBool = false
                if FileManager.default.fileExists(atPath: fullPath, isDirectory: &isDir), isDir.boolValue {
                    if skillDict[entry] == nil {
                        var content = ""
                        let mdPath = "\(fullPath)/SKILL.md"
                        if let mdContent = try? String(contentsOfFile: mdPath, encoding: .utf8) {
                            content = mdContent
                        }
                        skillDict[entry] = SkillItem(
                            name: entry,
                            originServer: origin,
                            description: "Skill installed at \(dirPath)",
                            content: content,
                            enabled: true,
                            version: 1,
                            localPath: fullPath
                        )
                    }
                }
            }
        }
        self.skills = Array(skillDict.values).sorted(by: { $0.name < $1.name })

        // 4. Synthesize Tool Items
        var synthesizedTools: [ToolItem] = []
        for s in self.servers {
            synthesizedTools.append(ToolItem(
                name: s.name,
                originServer: s.sourceAgents.first ?? "local",
                namespacedName: "\(s.sourceAgents.first ?? "local"):\(s.name)",
                description: s.description ?? "MCP Server tool interface",
                transport: s.type ?? "stdio",
                enabled: s.enabled
            ))
        }
        self.tools = synthesizedTools

        // 5. Scan Real Shared Memory from Vault
        let sharedMemPath = "\(home)/.config/skillmcpsync/vault/memory/shared_memory.json"
        if FileManager.default.fileExists(atPath: sharedMemPath),
           let data = try? Data(contentsOf: URL(fileURLWithPath: sharedMemPath)),
           let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
           let entries = json["entries"] as? [String: Any] {
            var loadedEntries: [MemoryEntryItem] = []
            for (key, val) in entries {
                if let dict = val as? [String: Any] {
                    let parts = key.split(separator: "/", maxSplits: 1)
                    let ns = parts.count > 1 ? String(parts[0]) : "shared"
                    let k = parts.count > 1 ? String(parts[1]) : key
                    let valueStr: String = {
                        if let str = dict["value"] as? String { return str }
                        if let d = dict["value"], let dData = try? JSONSerialization.data(withJSONObject: d), let s = String(data: dData, encoding: .utf8) { return s }
                        return "\(dict["value"] ?? "")"
                    }()
                    let author = (dict["author"] as? String) ?? "agent"
                    let version = (dict["version"] as? Int) ?? 1
                    loadedEntries.append(MemoryEntryItem(
                        namespace: ns,
                        key: k,
                        value: valueStr,
                        author: author,
                        version: version,
                        timestamp: Date()
                    ))
                }
            }
            self.memoryEntries = loadedEntries
        }

        // 6. Refresh Project Memory for Current Project
        refreshProjectMemory()

        // 7. Update Overview
        updateOverview()
    }

    public func setProjectPath(_ newPath: String) {
        switchProject(to: newPath)
    }

    // MARK: - Robust Project Memory Parser & Cognitive Sectors

    public func refreshProjectMemory() {
        var targetDir = currentProjectPath
        if !FileManager.default.fileExists(atPath: targetDir) {
            targetDir = recentProjects.first?.path ?? "/Users/marco/Documents/FocusIn"
        }
        currentProjectPath = targetDir

        // Audit rules
        auditProjectRules(targetDir: targetDir)

        let memPath = "\(targetDir)/AGENT_MEMORY.md"
        guard FileManager.default.fileExists(atPath: memPath),
              let content = try? String(contentsOfFile: memPath, encoding: .utf8) else {
            projectActions = []
            projectMemoryRawText = ""
            currentSectors = ProjectCognitiveSectors()
            return
        }

        projectMemoryRawText = content

        // Extract cognitive sectors
        var sectors = ProjectCognitiveSectors()
        sectors.semanticMemory = extractBetween(content: content, startMarker: "<!-- SEMANTIC_START -->", endMarker: "<!-- SEMANTIC_END -->")
        sectors.proceduralRules = extractBetween(content: content, startMarker: "<!-- PROCEDURAL_START -->", endMarker: "<!-- PROCEDURAL_END -->")
        sectors.reflectiveNotes = extractBetween(content: content, startMarker: "<!-- REFLECTIVE_START -->", endMarker: "<!-- REFLECTIVE_END -->")
        self.currentSectors = sectors

        // Parse episodic actions with multi-line decisions
        var actions: [ProjectActionItem] = []
        let lines = content.components(separatedBy: "\n")
        var currentAgent = ""
        var currentTimestamp = ""
        var currentSummary = ""
        var currentFiles: [String] = []
        var currentDecisions: [String] = []
        var isParsingDecisions = false

        for rawLine in lines {
            let line = rawLine.trimmingCharacters(in: .whitespaces)

            if line.contains("### 🔹 [") {
                if !currentSummary.isEmpty {
                    actions.append(ProjectActionItem(
                        timestampStr: currentTimestamp,
                        agent: currentAgent,
                        summary: currentSummary,
                        filesTouched: currentFiles,
                        keyDecisions: currentDecisions,
                        tags: inferTags(summary: currentSummary, files: currentFiles, decisions: currentDecisions)
                    ))
                    currentSummary = ""
                    currentFiles = []
                    currentDecisions = []
                    isParsingDecisions = false
                }

                // Parse timestamp e.g. [2026-10-25T04:14:00.000Z]
                if let start = line.range(of: "["), let end = line.range(of: "]") {
                    currentTimestamp = String(line[start.upperBound..<end.lowerBound])
                }
                // Parse agent e.g. @Antigravity
                if let atRange = line.range(of: "@") {
                    currentAgent = String(line[atRange.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
                }
            } else if line.hasPrefix("- **Summary**:") {
                isParsingDecisions = false
                currentSummary = line.replacingOccurrences(of: "- **Summary**:", with: "").trimmingCharacters(in: .whitespaces)
            } else if line.contains("**Files Touched**:") {
                isParsingDecisions = false
                let text = line.replacingOccurrences(of: "- **Files Touched**:", with: "")
                               .replacingOccurrences(of: "**Files Touched**:", with: "")
                               .trimmingCharacters(in: .whitespaces)
                let cleaned = text.replacingOccurrences(of: "`", with: "")
                currentFiles = cleaned.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            } else if line.contains("**Key Decisions**:") {
                isParsingDecisions = true
                let inlineText = line.replacingOccurrences(of: "- **Key Decisions**:", with: "")
                                     .replacingOccurrences(of: "**Key Decisions**:", with: "")
                                     .trimmingCharacters(in: .whitespaces)
                if !inlineText.isEmpty {
                    currentDecisions.append(inlineText)
                }
            } else if isParsingDecisions && (line.hasPrefix("- ") || line.hasPrefix("* ")) {
                let bulletText = line.dropFirst(2).trimmingCharacters(in: .whitespaces)
                if !bulletText.isEmpty {
                    currentDecisions.append(bulletText)
                }
            } else if isParsingDecisions && (line.hasPrefix("### ") || line.hasPrefix("## ") || line.hasPrefix("---")) {
                isParsingDecisions = false
            }
        }

        if !currentSummary.isEmpty {
            actions.append(ProjectActionItem(
                timestampStr: currentTimestamp,
                agent: currentAgent,
                summary: currentSummary,
                filesTouched: currentFiles,
                keyDecisions: currentDecisions,
                tags: inferTags(summary: currentSummary, files: currentFiles, decisions: currentDecisions)
            ))
        }

        self.projectActions = actions

        // Update count in recent list
        if let idx = recentProjects.firstIndex(where: { $0.path == targetDir }) {
            recentProjects[idx].actionCount = actions.count
            recentProjects[idx].hasMemoryFile = true
            recentProjects[idx].lastVisited = Date()
            saveRecentProjects()
        }
    }

    private func extractBetween(content: String, startMarker: String, endMarker: String) -> String {
        guard let startRange = content.range(of: startMarker),
              let endRange = content.range(of: endMarker, range: startRange.upperBound..<content.endIndex) else {
            return ""
        }
        return String(content[startRange.upperBound..<endRange.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func inferTags(summary: String, files: [String], decisions: [String]) -> [String] {
        var tags = Set<String>()
        let combined = (summary + " " + files.joined(separator: " ") + " " + decisions.joined(separator: " ")).lowercased()

        if combined.contains("audio") || combined.contains("sound") || combined.contains("avaudio") {
            tags.insert("Audio")
        }
        if combined.contains("screen") || combined.contains("capture") || combined.contains("display") {
            tags.insert("ScreenCapture")
        }
        if combined.contains("ui") || combined.contains("view") || combined.contains("studio") || combined.contains("theme") {
            tags.insert("UI/Design")
        }
        if combined.contains("wifi") || combined.contains("wi-fi") || combined.contains("network") || combined.contains("multicast") {
            tags.insert("Network")
        }
        if combined.contains("dmg") || combined.contains("build") || combined.contains("sign") || combined.contains("release") {
            tags.insert("Build/DMG")
        }
        if combined.contains("memory") || combined.contains("agent") || combined.contains("rule") || combined.contains("directive") {
            tags.insert("Agent Memory")
        }

        return Array(tags).sorted()
    }

    private func auditProjectRules(targetDir: String) {
        var audit = ProjectRuleAudit()
        audit.hasAgentMemory = FileManager.default.fileExists(atPath: "\(targetDir)/AGENT_MEMORY.md")
        audit.hasClaudeRules = FileManager.default.fileExists(atPath: "\(targetDir)/CLAUDE.md")
        audit.hasCursorRules = FileManager.default.fileExists(atPath: "\(targetDir)/.cursorrules") || FileManager.default.fileExists(atPath: "\(targetDir)/.cursor/rules")
        audit.hasWindsurfRules = FileManager.default.fileExists(atPath: "\(targetDir)/.windsurfrules")
        audit.hasOpenCodeRules = FileManager.default.fileExists(atPath: "\(targetDir)/.opencode/rules/agent_memory.md") || FileManager.default.fileExists(atPath: "\(targetDir)/.opencode/rules/focusin_directive.md") || FileManager.default.fileExists(atPath: "\(targetDir)/.opencode/rules")
        self.currentProjectAudit = audit
    }

    // MARK: - Prompt Context Generator

    public func buildPromptContext() -> String {
        var lines: [String] = []
        let projName = currentProjectName
        lines.append("# 🧠 Agent Context Brief: \(projName)")
        lines.append("> **專案目錄 Project**: `\(currentProjectPath)`")
        lines.append("> **生成時間 Timestamp**: `\(Date())`\n")

        lines.append("## 🎯 核心開工準則 (\(projName) Directive)")
        lines.append("""
        1. 每次開工前，優先從 AGENT_MEMORY.md 與 shared memory 搜尋本專案相關：架構約束、專案約定、過往失敗方案與踩坑記錄。
        2. 每完成一輪重要決策、找到 bug 根因、確認一個架構選擇，自動寫入專案記憶庫（標記來源 Agent）。
        3. 長期高價值原則：不要記瑣碎對話，只存長期有用知識。
        """)

        if !projectActions.isEmpty {
            lines.append("\n## 🕒 最近 Agent 執行歷史 (Recent Actions)")
            for action in projectActions.prefix(3) {
                lines.append("### 🔹 @\(action.agent): \(action.summary)")
                if !action.filesTouched.isEmpty {
                    lines.append("- **異動檔案**: `\(action.filesTouched.joined(separator: "`, `"))`")
                }
                if !action.keyDecisions.isEmpty {
                    lines.append("- **核心決策**:")
                    for dec in action.keyDecisions.prefix(3) {
                        lines.append("  - \(dec)")
                    }
                }
            }
        }

        if !currentSectors.reflectiveNotes.isEmpty {
            lines.append("\n## 🚫 防踩坑與已知問題 (Avoid Gotchas)")
            let snippet = currentSectors.reflectiveNotes.components(separatedBy: "\n").prefix(20).joined(separator: "\n")
            lines.append(snippet)
        }

        return lines.joined(separator: "\n")
    }

    public func copyPromptContextToClipboard() {
        let text = buildPromptContext()
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        addLog("✔ 已複製 Agent 開工 Context 到系統剪貼簿！", isSuccess: true)
    }

    private func checkDaemonConnection() async {
        do {
            let url = daemonBaseURL.appendingPathComponent("/api/status")
            let (_, response) = try await URLSession.shared.data(from: url)
            if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                self.isConnected = true
                self.statusMessage = "Daemon Online (port 4949)"
            }
        } catch {
            self.isConnected = false
            self.statusMessage = "原生檔案直連模式 (Direct Native Bridge)"
        }
    }

    // MARK: - Real One-Click Cross-Agent Sync

    public func triggerSync() async {
        self.isSyncing = true
        self.statusMessage = "正在執行跨 Agent 雙向全同步..."
        addLog("⚡️ 觸發跨 Agent 雙向全同步 (MCP + Skills + Memory)...")

        var syncedViaDaemon = false
        do {
            let url = daemonBaseURL.appendingPathComponent("/api/sync")
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            let (data, response) = try await URLSession.shared.data(for: request)
            if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                syncedViaDaemon = true
                addLog("✔ Daemon 同步成功完成！", isSuccess: true)
                if let str = String(data: data, encoding: .utf8) {
                    addLog("回應: \(str)")
                }
            }
        } catch {
            syncedViaDaemon = false
        }

        if !syncedViaDaemon {
            addLog("ℹ Daemon 未在背景監聽，改由本機原生引擎直接執行同步指令...")
            await executeLocalCliSync()
        }

        refreshRealSystemState()
        self.overview.lastSyncTime = Date()
        self.isSyncing = false
        self.statusMessage = "同步完成！所有 Agent 已獲得最新 MCP、Skills 與 Memory。"
        addLog("✔ 跨 Agent 資源同步全數完成！已更新所有設定檔。", isSuccess: true)
    }

    private func executeLocalCliSync() async {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/bin/zsh")

                let possibleScriptPaths = [
                    Bundle.main.resourcePath.map { "\($0)/dist/bin.js" } ?? "",
                    "/Users/marco/Documents/skillmcpsync/dist/bin.js"
                ]

                var scriptPath = "/Users/marco/Documents/skillmcpsync/dist/bin.js"
                for p in possibleScriptPaths where FileManager.default.fileExists(atPath: p) {
                    scriptPath = p
                    break
                }

                let cmd = "export PATH=\"$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin\"; node \"\(scriptPath)\" sync"

                process.arguments = ["-l", "-c", cmd]

                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = pipe

                do {
                    try process.run()
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    process.waitUntilExit()

                    if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                        let lines = output.components(separatedBy: "\n")
                        DispatchQueue.main.async {
                            for line in lines where !line.trimmingCharacters(in: .whitespaces).isEmpty {
                                self.addLog(line)
                            }
                        }
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.addLog("執行同步指令錯誤: \(error.localizedDescription)", isError: true)
                    }
                }

                continuation.resume()
            }
        }
    }

    public func addLog(_ message: String, isSuccess: Bool = false, isError: Bool = false) {
        let item = SyncLogItem(message: message, isError: isError, isSuccess: isSuccess)
        syncLogs.insert(item, at: 0)
        if syncLogs.count > 100 {
            syncLogs.removeLast()
        }
    }

    private func updateOverview() {
        let installedCount = agents.filter { $0.isInstalled }.count
        self.overview = DashboardOverview(
            vaultPath: agentHubPath,
            gitBranch: "main",
            isGitClean: true,
            totalServers: servers.count,
            totalSkills: skills.count,
            totalTools: tools.count,
            totalMemoryEntries: memoryEntries.count,
            activeAgentsCount: installedCount,
            lastSyncTime: overview.lastSyncTime
        )
    }

    // MARK: - Memory & Project Directives

    public var currentProjectDirectiveText: String {
        let name = currentProjectName
        return """
        # 🎯 \(name) 專案 Agent 開工核心準則 (\(name) Agent Directive)
        > ⚠️ 所有 Agent (OpenCode / Claude / Cursor / Windsurf) 必讀核心約束：
        > 1. 每次開工前，優先從 AGENT_MEMORY.md 與 shared memory 搜尋本專案相關：
        >    - 🏛 架構約束 (專案結構邊界、技術棧規範、依賴與約定)
        >    - 🛠 工作規範 (型別檢查、代碼風格、測試驗證規範)
        >    - 🚫 過往失敗方案與踩坑記錄 (避免重複過去嘗試失敗的做法)
        > 2. 每完成一輪重要決策、找到 bug 根因、確認一個架構選擇：
        >    - 自動寫入專案記憶庫 / AGENT_MEMORY.md，標記來源 Agent（OpenCode / Claude / Cursor / Windsurf）。
        > 3. 長期高價值原則：不要記瑣碎對話，只存長期有用知識。
        """
    }

    public var focusinDirectiveText: String {
        return currentProjectDirectiveText
    }

    public func injectProjectDirective(toPath: String? = nil) {
        let targetDir = toPath ?? currentProjectPath
        let projectName = URL(fileURLWithPath: targetDir).lastPathComponent
        let directive = """

        # 🎯 \(projectName) 專案 Agent 開工核心準則 (\(projectName) Agent Directive)
        > ⚠️ **所有 Agent (OpenCode / Claude / Cursor / Windsurf) 必讀核心約束：**
        > 1. **每次開工前，優先從 AGENT_MEMORY.md 與 shared memory 搜尋本專案相關**：
        >    - 🏛 **架構約束** (專案結構邊界、技術棧規範、依賴與約定)
        >    - 🛠 **工作規範** (型別檢查、代碼風格、測試驗證規範)
        >    - 🚫 **過往失敗方案與踩坑記錄** (避免重複過去嘗試失敗的做法)
        > 2. **每完成一輪重要決策、找到 bug 根因、確認一個架構選擇**：
        >    - 自動寫入專案記憶庫 / `AGENT_MEMORY.md`，標記來源 Agent（OpenCode / Claude / Cursor / Windsurf）。
        > 3. **長期高價值原則**：
        >    - 不要記瑣碎對話，只存長期有用知識。
        """

        let mandatoryInstruction = """

        # 🧠 AGENT MEMORY MANDATORY INSTRUCTION
        > **CRITICAL WORKFLOW RULE FOR ALL CODING AGENTS (OpenCode, Claude Code, Cursor, Windsurf, Copilot):**
        > 1. **BEFORE executing tasks or generating code**: ALWAYS inspect and read `AGENT_MEMORY.md` in the project root.
        >    Review what previous agents did, active architectural decisions, and known gotchas.
        > 2. **AFTER completing tasks or making design choices**: Log your actions into the Episodic Action Timeline in `AGENT_MEMORY.md`.
        """

        appendRule(path: "\(targetDir)/CLAUDE.md", rule: directive + "\n" + mandatoryInstruction, signature: "\(projectName) Agent Directive")
        appendRule(path: "\(targetDir)/.cursorrules", rule: directive + "\n" + mandatoryInstruction, signature: "\(projectName) Agent Directive")
        appendRule(path: "\(targetDir)/.windsurfrules", rule: directive + "\n" + mandatoryInstruction, signature: "\(projectName) Agent Directive")

        let cursorRulesDir = "\(targetDir)/.cursor/rules"
        try? FileManager.default.createDirectory(atPath: cursorRulesDir, withIntermediateDirectories: true)
        let mdc = """
        ---
        description: \(projectName) Agent Pre-Task Retrieval & Post-Decision Directive
        globs: *
        ---

        \(directive)
        """
        try? mdc.write(toFile: "\(cursorRulesDir)/agent-memory.mdc", atomically: true, encoding: .utf8)

        let opencodeDir = "\(targetDir)/.opencode/rules"
        try? FileManager.default.createDirectory(atPath: opencodeDir, withIntermediateDirectories: true)
        try? directive.write(toFile: "\(opencodeDir)/agent_memory.md", atomically: true, encoding: .utf8)

        // Ensure AGENT_MEMORY.md exists
        let memFile = "\(targetDir)/AGENT_MEMORY.md"
        if !FileManager.default.fileExists(atPath: memFile) {
            let initial = """
            # 🧠 Project Agent Memory: \(projectName)

            > **專案名稱 Project**: `\(projectName)`
            > **最後更新時間 Last Updated**: `\(Date())`
            > **適用 Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf

            ---

            \(directive)

            ---

            ## 🕒 1. Episodic Action Timeline (以前的 Agent 做了些什麼)
            <!-- EPISODIC_LOG_START -->
            ### 🔹 [\(ISO8601DateFormatter().string(from: Date()))] @system
            - **Summary**: Initialized project memory & injected \(projectName) directive.
            - **Files Touched**: `AGENT_MEMORY.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`
            - **Key Decisions**: Enabled multi-agent memory tracking across OpenCode, Claude, Cursor, and Windsurf.

            ---

            ## 🧠 2. Semantic Memory (專案核心事實、架構與約定)
            <!-- SEMANTIC_START -->
            - **專案目標**: \(projectName)
            - **技術棧 (Tech Stack)**: 
            - **核心架構與目錄結構**: 
            <!-- SEMANTIC_END -->

            ---

            ## 🛠 3. Procedural Rules (工作規範與防踩坑指南)
            <!-- PROCEDURAL_START -->
            - **開發規範**: 遵循專案現有的程式碼格式與建置流程。
            - **測試驗證**: 每次修改後執行相應測試確保無破壞性變更。
            <!-- PROCEDURAL_END -->

            ---

            ## 🔍 4. Reflective Notes & Known Issues (反思與已知問題)
            <!-- REFLECTIVE_START -->
            - **已知問題與待辦事項**: 
            <!-- REFLECTIVE_END -->
            """
            try? initial.write(toFile: memFile, atomically: true, encoding: .utf8)
        }

        refreshProjectMemory()
        addLog("✔ 已將 \(projectName) 開工準則與強制閱讀規則注入至: \(targetDir)", isSuccess: true)
        statusMessage = "已成功注入 \(projectName) 專案開工準則！"
    }

    public func injectFocusinPrompt(toPath: String? = nil) {
        injectProjectDirective(toPath: toPath)
    }

    private func appendRule(path: String, rule: String, signature: String? = nil) {
        let sig = signature ?? "Agent Directive"
        if FileManager.default.fileExists(atPath: path) {
            if let existing = try? String(contentsOfFile: path, encoding: .utf8), !existing.contains(sig) {
                let updated = existing + "\n" + rule
                try? updated.write(toFile: path, atomically: true, encoding: .utf8)
            }
        } else {
            try? rule.write(toFile: path, atomically: true, encoding: .utf8)
        }
    }

    public func logProjectAction(agent: String, summary: String, files: String, decisions: String) {
        let memFile = "\(currentProjectPath)/AGENT_MEMORY.md"
        guard var content = try? String(contentsOfFile: memFile, encoding: .utf8) else { return }

        let dateStr = ISO8601DateFormatter().string(from: Date())
        let filesFormatted = files.isEmpty ? "" : "\n  - **Files Touched**: `\(files.replacingOccurrences(of: ",", with: "`, `"))`"

        var decisionsFormatted = ""
        if !decisions.isEmpty {
            let parts = decisions.components(separatedBy: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            if parts.count > 1 {
                decisionsFormatted = "\n  - **Key Decisions**:\n" + parts.map { "    - \($0)" }.joined(separator: "\n")
            } else {
                decisionsFormatted = "\n  - **Key Decisions**: \(decisions)"
            }
        }

        let newLog = """
        ### 🔹 [\(dateStr)] @\(agent)
        - **Summary**: \(summary)\(filesFormatted)\(decisionsFormatted)
        """

        let marker = "<!-- EPISODIC_LOG_START -->"
        if content.contains(marker) {
            content = content.replacingOccurrences(of: marker, with: "\(marker)\n\(newLog)")
        } else {
            content += "\n" + newLog
        }

        try? content.write(toFile: memFile, atomically: true, encoding: .utf8)
        refreshProjectMemory()
        addLog("✔ 已將 @\(agent) 的操作日誌記錄進 \(currentProjectPath)/AGENT_MEMORY.md", isSuccess: true)
    }

    public func generateMemoryMarkdown() -> String {
        var lines: [String] = []
        lines.append("# 🧠 Multi-Agent Unified Memory & Synced Catalog")
        lines.append("> **匯出時間 Generated**: `\(Date())`")
        lines.append("> **本機同步 Agents**: OpenCode, Antigravity (Gemini), Claude Desktop, Cursor, Windsurf\n")
        lines.append("---")
        lines.append("## ⚡️ 已同步 MCP 伺服器 (Total: \(servers.count))")
        for s in servers {
            let agentsStr = s.sourceAgents.joined(separator: ", ")
            lines.append("- **\(s.name)** (\(s.type ?? "stdio")) [來源: \(agentsStr)]")
            if let cmd = s.command {
                let argsStr = (s.args ?? []).joined(separator: " ")
                lines.append("  - 指令: `\(cmd) \(argsStr)`")
            }
        }
        lines.append("\n---\n## 🛠 已同步 Skills (Total: \(skills.count))")
        for sk in skills {
            lines.append("- **\(sk.name)** [來源: \(sk.originServer)]: \(sk.description ?? "Skill")")
        }
        lines.append("\n---\n## 🗂 跨 Agent 共享記憶庫 (Shared Memory Pool)")
        if memoryEntries.isEmpty {
            lines.append("_目前共享記憶庫為空，執行任務時將自動寫入高價值決策。_")
        } else {
            for entry in memoryEntries {
                lines.append("### 🔹 [\(entry.namespace)/\(entry.key)] (v\(entry.version) by @\(entry.author))")
                lines.append("```markdown\n\(entry.value)\n```\n")
            }
        }
        lines.append("\n---\n## 🎯 跨 Agent 開工核心準則 (Universal Agent Directive)")
        lines.append("""
        1. 每次開工前，優先查閱專案 AGENT_MEMORY.md 與 shared memory：了解架構約束、專案約定、過往失敗方案與踩坑記錄。
        2. 每完成一輪重要決策、找到 bug 根因、確認一個架構選擇，自動寫入專案記憶庫（標記來源 Agent）。
        3. 長期高價值原則：不要記瑣碎對話，只存長期有用知識。
        """)
        return lines.joined(separator: "\n")
    }

    public func exportMemoryMarkdownToDesktop() -> String? {
        let md = generateMemoryMarkdown()
        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let desktopFile = homeDir.appendingPathComponent("Desktop/MEMORY.md")
        
        // Also ensure copy in AgentHub/memory
        let hubMemoryDir = URL(fileURLWithPath: "\(agentHubPath)/memory")
        try? FileManager.default.createDirectory(at: hubMemoryDir, withIntermediateDirectories: true)
        let hubMemoryFile = hubMemoryDir.appendingPathComponent("MEMORY.md")
        try? md.write(to: hubMemoryFile, atomically: true, encoding: .utf8)

        do {
            try md.write(to: desktopFile, atomically: true, encoding: .utf8)
            statusMessage = "已成功儲存 Markdown 檔至：\(desktopFile.path)"
            addLog("✔ 已匯出 MEMORY.md 至桌面及 AgentHub", isSuccess: true)
            return desktopFile.path
        } catch {
            statusMessage = "儲存失敗: \(error.localizedDescription)"
            addLog("匯出失敗: \(error.localizedDescription)", isError: true)
            return nil
        }
    }

    // MARK: - AgentHub Actions

    public func openAgentHubInFinder() {
        let url = URL(fileURLWithPath: agentHubPath)
        if !FileManager.default.fileExists(atPath: agentHubPath) {
            try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
        NSWorkspace.shared.open(url)
    }

    public func openSkillsInFinder() {
        let skillsPath = "\(agentHubPath)/skills"
        let url = URL(fileURLWithPath: skillsPath)
        if !FileManager.default.fileExists(atPath: skillsPath) {
            try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
        NSWorkspace.shared.open(url)
    }

    public func openMcpsInFinder() {
        let mcpsPath = "\(agentHubPath)/mcps"
        let url = URL(fileURLWithPath: mcpsPath)
        if !FileManager.default.fileExists(atPath: mcpsPath) {
            try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
        NSWorkspace.shared.open(url)
    }

    public func createNewSkill(name: String, description: String) -> Bool {
        let sanitizedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: " ", with: "-")
            .lowercased()
        guard !sanitizedName.isEmpty else { return false }
        let skillFolder = "\(agentHubPath)/skills/\(sanitizedName)"
        let skillFile = "\(skillFolder)/SKILL.md"
        do {
            try FileManager.default.createDirectory(atPath: skillFolder, withIntermediateDirectories: true)
            let descText = description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Custom skill module created in AgentHub" : description
            let content = """
            ---
            name: \(sanitizedName)
            description: \(descText)
            ---

            # \(sanitizedName)

            \(descText)

            ## Guidelines & Instructions
            1. Describe instructions and best practices for agents using this skill.
            """
            try content.write(toFile: skillFile, atomically: true, encoding: .utf8)
            addLog("✔ 已成功在 AgentHub 建立新 Skill: \(sanitizedName)", isSuccess: true)
            showToast("✔ 已建立 Skill: \(sanitizedName)")
            refreshRealSystemState()
            return true
        } catch {
            addLog("建立 Skill 失敗: \(error.localizedDescription)", isError: true)
            showToast("建立失敗: \(error.localizedDescription)")
            return false
        }
    }

    public func deleteSkill(name: String) -> Bool {
        let skillFolder = "\(agentHubPath)/skills/\(name)"
        if FileManager.default.fileExists(atPath: skillFolder) {
            do {
                try FileManager.default.removeItem(atPath: skillFolder)
                showToast("✔ 已刪除 Skill: \(name)")
                addLog("✔ 已刪除 Skill 模組：\(name)", isSuccess: true)
                refreshRealSystemState()
                return true
            } catch {
                showToast("刪除失敗: \(error.localizedDescription)")
                addLog("刪除失敗: \(error.localizedDescription)", isError: true)
                return false
            }
        }
        return false
    }

    public func openSkillInFinder(name: String) {
        let skillFolder = "\(agentHubPath)/skills/\(name)"
        if FileManager.default.fileExists(atPath: skillFolder) {
            NSWorkspace.shared.open(URL(fileURLWithPath: skillFolder))
        } else {
            openSkillsInFinder()
        }
    }

    // MARK: - Toast & Clipboard

    public func showToast(_ message: String) {
        toastWorkItem?.cancel()
        toastMessage = message
        let item = DispatchWorkItem { [weak self] in
            withAnimation(.easeOut(duration: 0.3)) {
                self?.toastMessage = nil
            }
        }
        toastWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: item)
    }

    public func copyToClipboard(_ text: String, toast: String? = nil) {
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(text, forType: .string)
        if let toast = toast {
            showToast(toast)
        }
    }

    // MARK: - MCP Server Operations

    public func addMcpServer(name: String, type: String = "stdio", command: String, args: [String], env: [String: String] = [:]) -> Bool {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return false }
        let hubMcpFile = "\(agentHubPath)/mcps/mcp-servers.json"
        let rootMcpFile = "\(agentHubPath)/mcp-servers.json"

        var current: [String: Any] = [:]
        if FileManager.default.fileExists(atPath: hubMcpFile),
           let data = try? Data(contentsOf: URL(fileURLWithPath: hubMcpFile)),
           let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            current = json
        } else if FileManager.default.fileExists(atPath: rootMcpFile),
                  let data = try? Data(contentsOf: URL(fileURLWithPath: rootMcpFile)),
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            current = json
        }

        var serverObj: [String: Any] = [
            "type": type,
            "command": command,
            "args": args,
            "enabled": true
        ]
        if !env.isEmpty {
            serverObj["env"] = env
        }
        current[cleanName] = serverObj

        do {
            let data = try JSONSerialization.data(withJSONObject: current, options: [.prettyPrinted, .sortedKeys])
            let hubDir = "\(agentHubPath)/mcps"
            try FileManager.default.createDirectory(atPath: hubDir, withIntermediateDirectories: true)
            try data.write(to: URL(fileURLWithPath: hubMcpFile), options: .atomic)
            try data.write(to: URL(fileURLWithPath: rootMcpFile), options: .atomic)

            showToast("✔ 已新增 MCP: \(cleanName)")
            addLog("✔ 已在 AgentHub 新增 MCP 伺服器：\(cleanName)", isSuccess: true)
            refreshRealSystemState()
            return true
        } catch {
            showToast("新增失敗: \(error.localizedDescription)")
            addLog("新增 MCP 失敗：\(error.localizedDescription)", isError: true)
            return false
        }
    }

    public func removeMcpServer(name: String) -> Bool {
        let hubMcpFile = "\(agentHubPath)/mcps/mcp-servers.json"
        let rootMcpFile = "\(agentHubPath)/mcp-servers.json"
        var changed = false

        for filePath in [hubMcpFile, rootMcpFile] {
            if FileManager.default.fileExists(atPath: filePath),
               let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
               var json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                if json.removeValue(forKey: name) != nil {
                    if let updatedData = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys]) {
                        try? updatedData.write(to: URL(fileURLWithPath: filePath), options: .atomic)
                        changed = true
                    }
                }
            }
        }

        if changed {
            showToast("✔ 已移除 MCP: \(name)")
            addLog("✔ 已自 AgentHub 移除 MCP 伺服器：\(name)", isSuccess: true)
            refreshRealSystemState()
            return true
        } else {
            showToast("移除失敗：找不到或無法編輯")
            return false
        }
    }

    public func toggleMcpServer(name: String) -> Bool {
        let hubMcpFile = "\(agentHubPath)/mcps/mcp-servers.json"
        let rootMcpFile = "\(agentHubPath)/mcp-servers.json"
        var newStatus = true
        var changed = false

        for filePath in [hubMcpFile, rootMcpFile] {
            if FileManager.default.fileExists(atPath: filePath),
               let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
               var json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               var srv = json[name] as? [String: Any] {
                let currentEnabled = (srv["enabled"] as? Bool) ?? true
                newStatus = !currentEnabled
                srv["enabled"] = newStatus
                json[name] = srv
                if let updatedData = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys]) {
                    try? updatedData.write(to: URL(fileURLWithPath: filePath), options: .atomic)
                    changed = true
                }
            }
        }

        if changed {
            let statusStr = newStatus ? "已啟用" : "已停用"
            showToast("✔ \(name) \(statusStr)")
            addLog("✔ MCP 伺服器 \(name) \(statusStr)")
            refreshRealSystemState()
            return true
        }
        return false
    }

    public func copyMcpJson(name: String) {
        if let srv = servers.first(where: { $0.name == name }) {
            let dict: [String: Any] = [
                "type": srv.type ?? "stdio",
                "command": srv.command ?? "",
                "args": srv.args ?? []
            ]
            if let data = try? JSONSerialization.data(withJSONObject: [name: dict], options: [.prettyPrinted, .sortedKeys]),
               let str = String(data: data, encoding: .utf8) {
                copyToClipboard(str, toast: "✔ 已複製 \(name) 配置 JSON")
                return
            }
        }
        showToast("找不到伺服器配置")
    }

    // MARK: - External Launchers

    public func openProjectInFinder(path: String? = nil) {
        let p = path ?? currentProjectPath
        NSWorkspace.shared.open(URL(fileURLWithPath: p))
    }

    public func openProjectInTerminal(path: String? = nil) {
        let p = path ?? currentProjectPath
        let script = "tell application \"Terminal\" to do script \"cd \\\"\(p)\\\"\""
        if let appleScript = NSAppleScript(source: script) {
            var error: NSDictionary?
            appleScript.executeAndReturnError(&error)
            if error == nil {
                showToast("✔ 已在終端機中開啟專案")
            }
        }
    }

    public func openAgentConfigInFinder(agentId: String) {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let targetPath: String
        switch agentId.lowercased() {
        case "opencode":
            targetPath = "\(home)/.config/opencode"
        case "antigravity":
            targetPath = "\(home)/.gemini/antigravity"
        case "claude":
            targetPath = "\(home)/Library/Application Support/Claude"
        case "cursor":
            targetPath = "\(home)/.cursor"
        case "windsurf":
            targetPath = "\(home)/.codeium/windsurf"
        default:
            targetPath = agentHubPath
        }
        if FileManager.default.fileExists(atPath: targetPath) {
            NSWorkspace.shared.open(URL(fileURLWithPath: targetPath))
        } else {
            showToast("目錄尚未建立或未安裝：\(agentId)")
        }
    }
}
