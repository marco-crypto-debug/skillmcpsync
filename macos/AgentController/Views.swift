import SwiftUI
import AppKit

// MARK: - Navigation Items
public enum NavigationItem: String, CaseIterable, Identifiable {
    case overview = "Overview"
    case servers = "Servers & MCPs"
    case skillsAndTools = "Skills & Tools"
    case projectMemory = "Project Memory (.md)"
    case memory = "Shared Memory"

    public var id: String { rawValue }

    public var icon: String {
        switch self {
        case .overview: return "square.grid.2x2.fill"
        case .servers: return "server.rack"
        case .skillsAndTools: return "wrench.and.screwdriver.fill"
        case .projectMemory: return "doc.text.fill"
        case .memory: return "brain.head.profile"
        }
    }
}

// MARK: - Overview View
public struct OverviewView: View {
    @ObservedObject var client = DaemonClient.shared

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Hero Banner
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            Text("Agent Controller")
                                .font(.system(size: 24, weight: .bold))
                            Text("跨 Agent 雙向全同步")
                                .font(.caption.bold())
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.blue.opacity(0.15))
                                .foregroundColor(.blue)
                                .cornerRadius(6)
                        }
                        Text("按一個按鈕，在任一 Agent 下載的 MCP、Skills 與記憶直接自動同步至所有 Agent")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button(action: {
                        Task { await client.triggerSync() }
                    }) {
                        HStack(spacing: 8) {
                            if client.isSyncing {
                                ProgressView()
                                    .scaleEffect(0.7)
                            } else {
                                Image(systemName: "bolt.fill")
                            }
                            Text(client.isSyncing ? "正在雙向同步中..." : "⚡️ 一鍵同步所有 Agent")
                                .font(.headline)
                        }
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                    .disabled(client.isSyncing)
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                // Installed Agents Cards Grid
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("已偵測本機 Agents")
                            .font(.headline)
                        Spacer()
                        Text("\(client.agents.filter { $0.isInstalled }.count) / \(client.agents.count) 已安裝")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(client.agents) { agent in
                            AgentCardView(agent: agent)
                        }
                    }
                }

                // Metrics Grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    MetricCard(title: "MCP Servers", count: "\(client.servers.count)", icon: "server.rack", color: .purple)
                    MetricCard(title: "Active Skills", count: "\(client.skills.count)", icon: "sparkles", color: .green)
                    MetricCard(title: "Synced Tools", count: "\(client.tools.count)", icon: "hammer.fill", color: .orange)
                    MetricCard(title: "Shared Memory", count: "\(client.memoryEntries.count)", icon: "brain", color: .blue)
                }

                // Quick Action Bar
                HStack(spacing: 12) {
                    Button(action: {
                        _ = client.exportMemoryMarkdownToDesktop()
                    }) {
                        Label("匯出 MEMORY.md 至桌面", systemImage: "arrow.down.doc.fill")
                    }
                    .buttonStyle(.bordered)

                    Button(action: {
                        client.injectFocusinPrompt()
                    }) {
                        Label("注入 FocusIn 開工準則", systemImage: "target")
                    }
                    .buttonStyle(.bordered)

                    Spacer()

                    Button(action: {
                        client.refreshRealSystemState()
                    }) {
                        Label("重新整理本機狀態", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.borderless)
                }
                .padding(.vertical, 4)

                // Live Sync Console / Log Stream
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "terminal.fill")
                            .foregroundColor(.secondary)
                        Text("即時同步日誌 (Sync Activity Console)")
                            .font(.headline)
                        Spacer()
                        if let lastSync = client.overview.lastSyncTime {
                            Text("最後同步: \(lastSync, style: .time)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        if client.syncLogs.isEmpty {
                            Text("點擊「⚡️ 一鍵同步所有 Agent」開始執行全機 MCP、Skills 與記憶同步...")
                                .font(.system(.caption, design: .monospaced))
                                .foregroundColor(.secondary)
                                .padding(.vertical, 8)
                        } else {
                            ForEach(client.syncLogs.prefix(12)) { log in
                                HStack(alignment: .top, spacing: 6) {
                                    Text("[\(log.timestamp, style: .time)]")
                                        .foregroundColor(.secondary)
                                    Text(log.message)
                                        .foregroundColor(log.isError ? .red : (log.isSuccess ? .green : .primary))
                                }
                                .font(.system(size: 11, design: .monospaced))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(NSColor.textBackgroundColor))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )
                }
            }
            .padding(20)
        }
    }
}

// MARK: - Agent Card View
struct AgentCardView: View {
    let agent: AgentStatusItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: agent.icon)
                    .font(.title3)
                    .foregroundColor(agent.isInstalled ? .blue : .secondary)
                Text(agent.name)
                    .font(.headline)
                Spacer()
                if agent.isInstalled {
                    Text("已安裝")
                        .font(.caption2.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.15))
                        .foregroundColor(.green)
                        .cornerRadius(4)
                } else {
                    Text("未偵測")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.15))
                        .foregroundColor(.secondary)
                        .cornerRadius(4)
                }
            }

            Text(agent.configPath)
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(.secondary)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .padding(12)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(agent.isInstalled ? Color.blue.opacity(0.2) : Color.clear, lineWidth: 1)
        )
    }
}

// MARK: - Metric Card
struct MetricCard: View {
    let title: String
    let count: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title2)
                Spacer()
                Text(count)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
            }
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(14)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(10)
    }
}

// MARK: - Servers View
public struct ServersView: View {
    @ObservedObject var client = DaemonClient.shared
    @State private var searchText: String = ""

    var filteredServers: [MCPServerItem] {
        if searchText.isEmpty { return client.servers }
        return client.servers.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("MCP Servers")
                        .font(.title2.bold())
                    Text("全機已偵測並同步的 MCP 伺服器端點")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                TextField("搜尋 MCP 伺服器...", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 220)
                Button("重新整理") {
                    client.refreshRealSystemState()
                }
            }
            .padding([.top, .horizontal])

            List(filteredServers) { srv in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text(srv.name)
                            .font(.headline)

                        Text(srv.type?.uppercased() ?? "STDIO")
                            .font(.caption2.bold())
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.purple.opacity(0.15))
                            .foregroundColor(.purple)
                            .cornerRadius(4)

                        ForEach(srv.sourceAgents, id: \.self) { ag in
                            Text(ag)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue.opacity(0.12))
                                .foregroundColor(.blue)
                                .cornerRadius(4)
                        }

                        Spacer()
                    }

                    if let cmd = srv.command {
                        let fullCmd = "\(cmd) \((srv.args ?? []).joined(separator: " "))"
                        HStack {
                            Text("指令:")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                            Text(fullCmd)
                                .font(.system(size: 11, design: .monospaced))
                                .padding(4)
                                .background(Color(NSColor.textBackgroundColor))
                                .cornerRadius(4)
                        }
                    }

                    if let desc = srv.description {
                        Text(desc)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 6)
            }
            .listStyle(.inset)
        }
    }
}

// MARK: - Skills & Tools View
public struct SkillsToolsView: View {
    @ObservedObject var client = DaemonClient.shared
    @State private var selectedTab: Int = 0
    @State private var selectedSkill: SkillItem?

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Skills & Tools")
                        .font(.title2.bold())
                    Text("本機聚合之技能模組與跨 Agent 工具")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Picker("", selection: $selectedTab) {
                    Text("Skills (\(client.skills.count))").tag(0)
                    Text("Tools (\(client.tools.count))").tag(1)
                }
                .pickerStyle(.segmented)
                .frame(width: 220)
            }
            .padding([.top, .horizontal])

            if selectedTab == 0 {
                List(client.skills) { skill in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(skill.name)
                                    .font(.headline)
                                Text(skill.originServer)
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.green.opacity(0.15))
                                    .foregroundColor(.green)
                                    .cornerRadius(4)
                            }
                            if let desc = skill.description {
                                Text(desc)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        if !skill.content.isEmpty {
                            Button("檢視 SKILL.md") {
                                selectedSkill = skill
                            }
                            .buttonStyle(.bordered)
                            .font(.caption)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.inset)
            } else {
                List(client.tools) { tool in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(tool.namespacedName)
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                            Spacer()
                            Text(tool.transport.uppercased())
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        if let desc = tool.description {
                            Text(desc)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.inset)
            }
        }
        .sheet(item: $selectedSkill) { skill in
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("SKILL.md: \(skill.name)")
                        .font(.headline)
                    Spacer()
                    Button("關閉") { selectedSkill = nil }
                }
                ScrollView {
                    Text(skill.content)
                        .font(.system(.caption, design: .monospaced))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color(NSColor.textBackgroundColor))
                        .cornerRadius(8)
                }
            }
            .padding()
            .frame(minWidth: 550, minHeight: 400)
        }
    }
}

// MARK: - Project Memory View (OpenMemory & FocusIn)
public struct ProjectMemoryView: View {
    @ObservedObject var client = DaemonClient.shared

    @State private var agentName: String = "OpenCode"
    @State private var actionSummary: String = ""
    @State private var filesTouched: String = ""
    @State private var keyDecisions: String = ""
    @State private var showRawEditor: Bool = false
    @State private var statusToast: String?

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header & Project Picker
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("專案記憶 (Project AGENT_MEMORY.md)")
                            .font(.title2.bold())
                        Text("基於 OpenMemory 認知架構：所有 Agent 在執行前強制手動閱讀歷史決策與踩坑")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("選擇專案目錄...") {
                        selectProjectFolder()
                    }
                    .buttonStyle(.bordered)
                }

                // Current Path Banner
                HStack {
                    Image(systemName: "folder.badge.gearshape")
                        .foregroundColor(.blue)
                    Text("當前專案目錄:")
                        .font(.caption.bold())
                    Text(client.currentProjectPath)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(.blue)
                    Spacer()
                    Button("重新讀取") {
                        client.refreshProjectMemory()
                    }
                    .font(.caption)
                }
                .padding(10)
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(8)

                // 🎯 FocusIn Directive Hero Banner
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: "target")
                            .foregroundColor(.red)
                            .font(.headline)
                        Text("🎯 FocusIn 專案 Agent 開工核心準則")
                            .font(.headline)
                        Spacer()
                        Button("一鍵注入開工準則至本專案") {
                            client.injectFocusinPrompt()
                            statusToast = "✔ 已將 FocusIn 開工準則注入至 CLAUDE.md, .cursorrules, .windsurfrules, .opencode"
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                    }

                    Text("""
                    每次開工前，優先從 shared memory 搜尋本 Focusin 專案相關：架構約束、Swift 規範、AVAudioEngine 踩坑、過往失敗方案。
                    每完成一輪重要決策、找到 bug 根因、確認一個架構選擇，自動寫入 shared memory，標記來源 Agent（OpenCode / OMO）。
                    不要記瑣碎對話，只存長期有用知識。
                    """)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                    .padding(10)
                    .background(Color.red.opacity(0.08))
                    .cornerRadius(8)
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                )

                // OpenMemory Episodic Timeline
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .foregroundColor(.purple)
                        Text("🕒 1. Episodic Action Timeline (以前的 Agent 做了些什麼)")
                            .font(.headline)
                        Spacer()
                        Text("共 \(client.projectActions.count) 筆歷史紀錄")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if client.projectActions.isEmpty {
                        VStack(spacing: 8) {
                            Text("此專案尚未記錄歷史動作。")
                                .foregroundColor(.secondary)
                            Button("初始化專案記憶並注入 Agent 強制讀取規則") {
                                client.injectFocusinPrompt()
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(24)
                        .background(Color(NSColor.controlBackgroundColor))
                        .cornerRadius(10)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(client.projectActions) { action in
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Text("@\(action.agent)")
                                            .font(.caption.bold())
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 2)
                                            .background(Color.blue.opacity(0.15))
                                            .foregroundColor(.blue)
                                            .cornerRadius(6)
                                        Text(action.summary)
                                            .font(.subheadline.bold())
                                        Spacer()
                                    }

                                    if !action.filesTouched.isEmpty {
                                        HStack(spacing: 4) {
                                            Text("影響檔案:")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                            ForEach(action.filesTouched, id: \.self) { file in
                                                Text(file)
                                                    .font(.system(size: 10, design: .monospaced))
                                                    .padding(.horizontal, 4)
                                                    .padding(.vertical, 1)
                                                    .background(Color.secondary.opacity(0.12))
                                                    .cornerRadius(4)
                                            }
                                        }
                                    }

                                    if !action.keyDecisions.isEmpty {
                                        HStack(alignment: .top, spacing: 4) {
                                            Text("核心決策:")
                                                .font(.caption.bold())
                                                .foregroundColor(.secondary)
                                            Text(action.keyDecisions)
                                                .font(.caption)
                                        }
                                    }
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(NSColor.controlBackgroundColor))
                                .cornerRadius(8)
                            }
                        }
                    }
                }

                // Quick Action Logger Form
                VStack(alignment: .leading, spacing: 12) {
                    Text("✍️ Agent 完成任務寫入記憶")
                        .font(.headline)

                    HStack(spacing: 12) {
                        Picker("來源 Agent:", selection: $agentName) {
                            Text("OpenCode").tag("OpenCode")
                            Text("OMO (Oh-My-OpenCode)").tag("OMO")
                            Text("Claude").tag("Claude")
                            Text("Cursor").tag("Cursor")
                            Text("Windsurf").tag("Windsurf")
                        }
                        .frame(width: 260)

                        TextField("完成任務簡述 (Summary)", text: $actionSummary)
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack(spacing: 12) {
                        TextField("修改檔案 (以逗號分隔，例如: AudioEngine.swift, Network.swift)", text: $filesTouched)
                            .textFieldStyle(.roundedBorder)

                        TextField("核心架構決策 / 根因分析", text: $keyDecisions)
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack {
                        Spacer()
                        Button("寫入專案記憶 (AGENT_MEMORY.md)") {
                            guard !actionSummary.isEmpty else { return }
                            client.logProjectAction(
                                agent: agentName,
                                summary: actionSummary,
                                files: filesTouched,
                                decisions: keyDecisions
                            )
                            actionSummary = ""
                            filesTouched = ""
                            keyDecisions = ""
                            statusToast = "✔ 已成功將操作日誌寫入 AGENT_MEMORY.md！"
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(actionSummary.isEmpty)
                    }
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                // Raw Markdown Inspector Toggle
                DisclosureGroup("📄 檢視 / 編輯 AGENT_MEMORY.md 原檔", isExpanded: $showRawEditor) {
                    TextEditor(text: $client.projectMemoryRawText)
                        .font(.system(.caption, design: .monospaced))
                        .frame(minHeight: 200)
                        .padding(8)
                        .background(Color(NSColor.textBackgroundColor))
                        .cornerRadius(8)

                    HStack {
                        Spacer()
                        Button("儲存變更") {
                            let path = "\(client.currentProjectPath)/AGENT_MEMORY.md"
                            try? client.projectMemoryRawText.write(toFile: path, atomically: true, encoding: .utf8)
                            client.refreshProjectMemory()
                            statusToast = "已儲存 AGENT_MEMORY.md！"
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                if let toast = statusToast {
                    Text(toast)
                        .font(.subheadline.bold())
                        .foregroundColor(.green)
                        .padding(.vertical, 4)
                }
            }
            .padding(20)
        }
    }

    private func selectProjectFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        if panel.runModal() == .OK, let url = panel.url {
            client.setProjectPath(url.path)
        }
    }
}

// MARK: - Memory View
public struct MemoryView: View {
    @ObservedObject var client = DaemonClient.shared

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("全域跨 Agent 共享記憶庫 (Shared Memory)")
                            .font(.title2.bold())
                        Text("存放跨專案、長期高價值架構事實與防踩坑決策")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("匯出 MEMORY.md 至桌面") {
                        _ = client.exportMemoryMarkdownToDesktop()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding([.top, .horizontal])

                if client.memoryEntries.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("共享記憶庫目前無跨專案全域條目")
                            .font(.headline)
                        Text("執行重要架構決定後，條目將透過 sync 自動廣播給所有 Agent。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(40)
                } else {
                    List(client.memoryEntries) { entry in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("[\(entry.namespace)/\(entry.key)]")
                                    .font(.headline)
                                Spacer()
                                Text("@\(entry.author)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Text(entry.value)
                                .font(.system(.caption, design: .monospaced))
                                .padding(8)
                                .background(Color(NSColor.textBackgroundColor))
                                .cornerRadius(6)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
    }
}
