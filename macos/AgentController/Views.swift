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

    public var localizedTitle: String {
        switch self {
        case .overview: return L10n.tr(.navOverview)
        case .servers: return L10n.tr(.navServers)
        case .skillsAndTools: return L10n.tr(.navSkillsAndTools)
        case .projectMemory: return L10n.tr(.navProjectMemory)
        case .memory: return L10n.tr(.navSharedMemory)
        }
    }

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
    @ObservedObject var langManager = LanguageManager.shared

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .medium
        return formatter.string(from: date)
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Top Language Switcher Bar
                HStack {
                    Spacer()
                    HStack(spacing: 6) {
                        Image(systemName: "globe")
                            .foregroundColor(.secondary)
                        Text(L10n.tr(.languageSetting) + ":")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        Picker("", selection: $langManager.currentLanguage) {
                            ForEach(AppLanguage.allCases) { lang in
                                Text("\(lang.flag) \(lang.displayName)").tag(lang)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(width: 130)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(8)
                }

                // Hero Banner
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            Text(L10n.tr(.appTitle))
                                .font(.system(size: 24, weight: .bold))
                            Text(L10n.tr(.syncHeroBadge))
                                .font(.caption.bold())
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.blue.opacity(0.15))
                                .foregroundColor(.blue)
                                .cornerRadius(6)
                        }
                        Text(L10n.tr(.syncHeroSubtitle))
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
                            Text(client.isSyncing ? L10n.tr(.btnSyncing) : L10n.tr(.btnSyncAll))
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
                        Text(L10n.tr(.sectionDetectedAgents))
                            .font(.headline)
                        Spacer()
                        Text(L10n.tr(.agentInstalledCount(client.agents.filter { $0.isInstalled }.count, client.agents.count)))
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
                    MetricCard(title: L10n.tr(.metricServers), count: "\(client.servers.count)", icon: "server.rack", color: .purple)
                    MetricCard(title: L10n.tr(.metricSkills), count: "\(client.skills.count)", icon: "sparkles", color: .green)
                    MetricCard(title: L10n.tr(.metricTools), count: "\(client.tools.count)", icon: "hammer.fill", color: .orange)
                    MetricCard(title: L10n.tr(.metricSharedMemory), count: "\(client.memoryEntries.count)", icon: "brain", color: .blue)
                }

                // Quick Action Bar
                HStack(spacing: 12) {
                    Button(action: {
                        _ = client.exportMemoryMarkdownToDesktop()
                    }) {
                        Label(L10n.tr(.btnExportDesktop), systemImage: "arrow.down.doc.fill")
                    }
                    .buttonStyle(.bordered)

                    Button(action: {
                        client.injectFocusinPrompt()
                    }) {
                        Label(L10n.tr(.btnInjectFocusin), systemImage: "target")
                    }
                    .buttonStyle(.bordered)

                    Spacer()

                    Button(action: {
                        client.refreshRealSystemState()
                    }) {
                        Label(L10n.tr(.btnRefreshState), systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.borderless)
                }
                .padding(.vertical, 4)

                // Live Sync Console / Log Stream
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "terminal.fill")
                            .foregroundColor(.secondary)
                        Text(L10n.tr(.consoleTitle))
                            .font(.headline)
                        Spacer()
                        if let lastSync = client.overview.lastSyncTime {
                            Text(L10n.tr(.lastSync(formatTime(lastSync))))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        if client.syncLogs.isEmpty {
                            Text(L10n.tr(.consolePlaceholder))
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
    @ObservedObject var langManager = LanguageManager.shared

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
                    Text(L10n.tr(.badgeInstalled))
                        .font(.caption2.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.15))
                        .foregroundColor(.green)
                        .cornerRadius(4)
                } else {
                    Text(L10n.tr(.badgeNotDetected))
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
    @ObservedObject var langManager = LanguageManager.shared
    @State private var searchText: String = ""

    var filteredServers: [MCPServerItem] {
        if searchText.isEmpty { return client.servers }
        return client.servers.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.tr(.serversTitle))
                        .font(.title2.bold())
                    Text(L10n.tr(.serversSubtitle))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                TextField(L10n.tr(.searchServersPlaceholder), text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 220)
                Button(L10n.tr(.btnRefresh)) {
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
                            Text(L10n.tr(.labelCommand))
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
    @ObservedObject var langManager = LanguageManager.shared
    @State private var selectedTab: Int = 0
    @State private var selectedSkill: SkillItem?

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.tr(.skillsTitle))
                        .font(.title2.bold())
                    Text(L10n.tr(.skillsSubtitle))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Picker("", selection: $selectedTab) {
                    Text(L10n.tr(.tabSkills(client.skills.count))).tag(0)
                    Text(L10n.tr(.tabTools(client.tools.count))).tag(1)
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
                            Button(L10n.tr(.btnViewSkillMd)) {
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
                    Button(L10n.tr(.btnClose)) { selectedSkill = nil }
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
    @ObservedObject var langManager = LanguageManager.shared

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
                        Text(L10n.tr(.projectMemoryTitle))
                            .font(.title2.bold())
                        Text(L10n.tr(.projectMemorySubtitle))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button(L10n.tr(.btnChooseProjectFolder)) {
                        selectProjectFolder()
                    }
                    .buttonStyle(.bordered)
                }

                // Current Path Banner
                HStack {
                    Image(systemName: "folder.badge.gearshape")
                        .foregroundColor(.blue)
                    Text(L10n.tr(.labelCurrentProject))
                        .font(.caption.bold())
                    Text(client.currentProjectPath)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(.blue)
                    Spacer()
                    Button(L10n.tr(.btnReload)) {
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
                        Text(L10n.tr(.focusinDirectiveTitle))
                            .font(.headline)
                        Spacer()
                        Button(L10n.tr(.btnInjectFocusinToProject)) {
                            client.injectFocusinPrompt()
                            statusToast = "✔ " + L10n.tr(.btnInjectFocusinToProject)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                    }

                    Text(L10n.tr(.focusinDirectiveBody))
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
                        Text(L10n.tr(.episodicTimelineTitle))
                            .font(.headline)
                        Spacer()
                        Text(L10n.tr(.episodicRecordsCount(client.projectActions.count)))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if client.projectActions.isEmpty {
                        VStack(spacing: 8) {
                            Text(L10n.tr(.emptyTimelinePrompt))
                                .foregroundColor(.secondary)
                            Button(L10n.tr(.btnInitProjectMemory)) {
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
                                            Text(L10n.tr(.labelFilesTouched))
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
                                            Text(L10n.tr(.labelKeyDecisions))
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
                    Text(L10n.tr(.quickLogTitle))
                        .font(.headline)

                    HStack(spacing: 12) {
                        Picker(L10n.tr(.labelSourceAgent), selection: $agentName) {
                            Text("OpenCode").tag("OpenCode")
                            Text("OMO (Oh-My-OpenCode)").tag("OMO")
                            Text("Claude").tag("Claude")
                            Text("Cursor").tag("Cursor")
                            Text("Windsurf").tag("Windsurf")
                        }
                        .frame(width: 260)

                        TextField(L10n.tr(.placeholderSummary), text: $actionSummary)
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack(spacing: 12) {
                        TextField(L10n.tr(.placeholderFiles), text: $filesTouched)
                            .textFieldStyle(.roundedBorder)

                        TextField(L10n.tr(.placeholderDecisions), text: $keyDecisions)
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack {
                        Spacer()
                        Button(L10n.tr(.btnLogAction)) {
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
                            statusToast = "✔ " + L10n.tr(.btnLogAction)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(actionSummary.isEmpty)
                    }
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                // Raw Markdown Inspector Toggle
                DisclosureGroup(L10n.tr(.rawEditorTitle), isExpanded: $showRawEditor) {
                    TextEditor(text: $client.projectMemoryRawText)
                        .font(.system(.caption, design: .monospaced))
                        .frame(minHeight: 200)
                        .padding(8)
                        .background(Color(NSColor.textBackgroundColor))
                        .cornerRadius(8)

                    HStack {
                        Spacer()
                        Button(L10n.tr(.btnSaveChanges)) {
                            let path = "\(client.currentProjectPath)/AGENT_MEMORY.md"
                            try? client.projectMemoryRawText.write(toFile: path, atomically: true, encoding: .utf8)
                            client.refreshProjectMemory()
                            statusToast = "✔ " + L10n.tr(.btnSaveChanges)
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
    @ObservedObject var langManager = LanguageManager.shared

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.tr(.sharedMemoryTitle))
                            .font(.title2.bold())
                        Text(L10n.tr(.sharedMemorySubtitle))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button(L10n.tr(.btnExportDesktop)) {
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
                        Text(L10n.tr(.emptySharedMemoryTitle))
                            .font(.headline)
                        Text(L10n.tr(.emptySharedMemorySubtitle))
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
