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

                // Dedicated AgentHub Card
                HStack(alignment: .center, spacing: 14) {
                    Image(systemName: "folder.badge.gearshape.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.blue)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 8) {
                            Text(L10n.tr(.centralHubTitle))
                                .font(.headline)
                            Text("~/AgentHub")
                                .font(.system(.caption, design: .monospaced))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue.opacity(0.12))
                                .foregroundColor(.blue)
                                .cornerRadius(4)
                        }
                        Text(L10n.tr(.centralHubSubtitle))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    HStack(spacing: 8) {
                        Button(action: {
                            client.openSkillsInFinder()
                        }) {
                            Label(L10n.tr(.btnOpenSkillsInFinder), systemImage: "sparkles")
                        }
                        .buttonStyle(.bordered)

                        Button(action: {
                            client.openMcpsInFinder()
                        }) {
                            Label(L10n.tr(.btnOpenMcpsInFinder), systemImage: "server.rack")
                        }
                        .buttonStyle(.bordered)

                        Button(action: {
                            client.openAgentHubInFinder()
                        }) {
                            Label(L10n.tr(.btnOpenHubInFinder), systemImage: "folder.fill")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding(14)
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.blue.opacity(0.25), lineWidth: 1)
                )

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

            HStack {
                Text(agent.configPath)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Spacer()
                if agent.isInstalled {
                    Button(action: {
                        DaemonClient.shared.openAgentConfigInFinder(agentId: agent.id)
                    }) {
                        Image(systemName: "folder")
                            .font(.system(size: 11))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(.plain)
                    .help(L10n.tr(.btnOpenAgentConfig))
                }
            }
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

// MARK: - Add MCP Modal View
struct AddMcpModalView: View {
    @ObservedObject var client = DaemonClient.shared
    @Binding var isPresented: Bool
    @State private var selectedTab: Int = 0 // 0: Presets, 1: Custom

    // Custom form state
    @State private var customName: String = ""
    @State private var customType: String = "stdio"
    @State private var customCommand: String = "npx"
    @State private var customArgs: String = ""
    @State private var customEnv: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(L10n.tr(.addMcpModalTitle))
                    .font(.title3.bold())
                Spacer()
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }

            Picker("", selection: $selectedTab) {
                Text(L10n.tr(.tabMcpPresets)).tag(0)
                Text(L10n.tr(.tabMcpCustom)).tag(1)
            }
            .pickerStyle(.segmented)

            if selectedTab == 0 {
                // Curated Presets List
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(client.mcpPresets) { preset in
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: preset.icon)
                                    .font(.title2)
                                    .foregroundColor(.blue)
                                    .frame(width: 32, height: 32)
                                    .background(Color.blue.opacity(0.12))
                                    .cornerRadius(8)

                                VStack(alignment: .leading, spacing: 3) {
                                    HStack {
                                        Text(preset.title)
                                            .font(.headline)
                                        Text(preset.category)
                                            .font(.caption2.bold())
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.purple.opacity(0.12))
                                            .foregroundColor(.purple)
                                            .cornerRadius(4)
                                    }
                                    Text(preset.description)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text("`\(preset.command) \(preset.args.joined(separator: " "))`")
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                Button(action: {
                                    if client.addMcpServer(name: preset.name, type: "stdio", command: preset.command, args: preset.args, env: preset.env) {
                                        isPresented = false
                                    }
                                }) {
                                    Label(L10n.tr(.btnAddThisPreset), systemImage: "plus")
                                        .font(.caption.bold())
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.blue)
                            }
                            .padding(12)
                            .background(Color(NSColor.controlBackgroundColor))
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
                            )
                        }
                    }
                    .padding(.vertical, 2)
                }
                .frame(maxHeight: 380)
            } else {
                // Custom Config Form
                VStack(alignment: .leading, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.tr(.lblServerName))
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("my-custom-mcp", text: $customName)
                            .textFieldStyle(.roundedBorder)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.tr(.lblCommand))
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("npx", text: $customCommand)
                            .textFieldStyle(.roundedBorder)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.tr(.lblArgs))
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("-y my-mcp-package --flag", text: $customArgs)
                            .textFieldStyle(.roundedBorder)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.tr(.lblEnvVars))
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("API_KEY=xyz,DEBUG=true", text: $customEnv)
                            .textFieldStyle(.roundedBorder)
                    }

                    Spacer()

                    HStack {
                        Spacer()
                        Button(L10n.tr(.btnCancel)) {
                            isPresented = false
                        }
                        .buttonStyle(.bordered)

                        Button(L10n.tr(.btnCreate)) {
                            let cleanArgs = customArgs.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
                            var envDict: [String: String] = [:]
                            if !customEnv.isEmpty {
                                for item in customEnv.components(separatedBy: ",") {
                                    let parts = item.components(separatedBy: "=")
                                    if parts.count >= 2 {
                                        envDict[parts[0].trimmingCharacters(in: .whitespaces)] = parts.dropFirst().joined(separator: "=").trimmingCharacters(in: .whitespaces)
                                    }
                                }
                            }
                            if client.addMcpServer(name: customName, type: customType, command: customCommand, args: cleanArgs, env: envDict) {
                                isPresented = false
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(customName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                .padding(.top, 4)
                .frame(minHeight: 320)
            }
        }
        .padding(20)
        .frame(width: 580, height: 480)
    }
}

// MARK: - Servers View
public struct ServersView: View {
    @ObservedObject var client = DaemonClient.shared
    @ObservedObject var langManager = LanguageManager.shared
    @State private var searchText: String = ""
    @State private var showingAddMcpSheet: Bool = false

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
                    .frame(width: 180)

                Button(action: {
                    showingAddMcpSheet = true
                }) {
                    Label(L10n.tr(.btnAddMcpServer), systemImage: "plus")
                }
                .buttonStyle(.borderedProminent)

                Button(action: {
                    client.openMcpsInFinder()
                }) {
                    Label(L10n.tr(.btnOpenMcpsInFinder), systemImage: "folder")
                }
                .buttonStyle(.bordered)

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

                        Button(action: {
                            client.copyMcpJson(name: srv.name)
                        }) {
                            Image(systemName: "doc.on.doc")
                                .font(.caption)
                        }
                        .buttonStyle(.plain)
                        .help(L10n.tr(.btnCopyConfigJson))

                        if srv.sourceAgents.contains("AgentHub") || srv.sourceAgents.contains("Vault") {
                            Button(action: {
                                _ = client.removeMcpServer(name: srv.name)
                            }) {
                                Image(systemName: "trash")
                                    .font(.caption)
                                    .foregroundColor(.red.opacity(0.8))
                            }
                            .buttonStyle(.plain)
                            .help(L10n.tr(.btnDeleteMcp))
                        }
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
        .sheet(isPresented: $showingAddMcpSheet) {
            AddMcpModalView(isPresented: $showingAddMcpSheet)
        }
    }
}

// MARK: - Skills & Tools View
public struct SkillsToolsView: View {
    @ObservedObject var client = DaemonClient.shared
    @ObservedObject var langManager = LanguageManager.shared
    @State private var selectedTab: Int = 0
    @State private var selectedSkill: SkillItem?
    @State private var showingNewSkillSheet: Bool = false
    @State private var newSkillName: String = ""
    @State private var newSkillDesc: String = ""
    @State private var searchSkillText: String = ""
    @State private var selectedOriginFilter: String = "ALL"

    var filteredSkills: [SkillItem] {
        client.skills.filter { sk in
            let matchOrigin = (selectedOriginFilter == "ALL") || sk.originServer.lowercased().contains(selectedOriginFilter.lowercased())
            if !matchOrigin { return false }
            if searchSkillText.isEmpty { return true }
            let q = searchSkillText.lowercased()
            return sk.name.lowercased().contains(q) || (sk.description?.lowercased().contains(q) ?? false)
        }
    }

    var filteredTools: [ToolItem] {
        if searchSkillText.isEmpty { return client.tools }
        let q = searchSkillText.lowercased()
        return client.tools.filter { $0.namespacedName.lowercased().contains(q) || ($0.description?.lowercased().contains(q) ?? false) }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.tr(.skillsTitle))
                        .font(.title2.bold())
                    Text(L10n.tr(.skillsSubtitle))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()

                Button(action: {
                    client.openSkillsInFinder()
                }) {
                    Label(L10n.tr(.btnOpenSkillsInFinder), systemImage: "folder")
                }
                .buttonStyle(.bordered)

                Button(action: {
                    newSkillName = ""
                    newSkillDesc = ""
                    showingNewSkillSheet = true
                }) {
                    Label(L10n.tr(.btnCreateNewSkill), systemImage: "plus")
                }
                .buttonStyle(.borderedProminent)

                Picker("", selection: $selectedTab) {
                    Text(L10n.tr(.tabSkills(client.skills.count))).tag(0)
                    Text(L10n.tr(.tabTools(client.tools.count))).tag(1)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }
            .padding([.top, .horizontal])

            // Search & Filter Bar
            HStack(spacing: 10) {
                TextField(L10n.tr(.searchSkillsPlaceholder), text: $searchSkillText)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 280)

                if selectedTab == 0 {
                    HStack(spacing: 6) {
                        FilterPill(label: L10n.tr(.filterAllSources), isSelected: selectedOriginFilter == "ALL") {
                            selectedOriginFilter = "ALL"
                        }
                        FilterPill(label: "AgentHub", isSelected: selectedOriginFilter == "AgentHub") {
                            selectedOriginFilter = "AgentHub"
                        }
                        FilterPill(label: "OpenCode", isSelected: selectedOriginFilter == "OpenCode") {
                            selectedOriginFilter = "OpenCode"
                        }
                        FilterPill(label: "Antigravity", isSelected: selectedOriginFilter == "Antigravity") {
                            selectedOriginFilter = "Antigravity"
                        }
                    }
                }
                Spacer()
            }
            .padding(.horizontal)

            if selectedTab == 0 {
                List(filteredSkills) { skill in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 6) {
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

                        HStack(spacing: 8) {
                            Button(action: {
                                client.openSkillInFinder(name: skill.name)
                            }) {
                                Image(systemName: "folder")
                                    .font(.caption)
                            }
                            .buttonStyle(.plain)
                            .help("在 Finder 中打開此 Skill")

                            Button(action: {
                                client.copyToClipboard("@skill \(skill.name)", toast: "✔ 已複製 @skill \(skill.name)")
                            }) {
                                Image(systemName: "doc.on.doc")
                                    .font(.caption)
                            }
                            .buttonStyle(.plain)
                            .help(L10n.tr(.btnCopySkillTag))

                            if skill.originServer.contains("AgentHub") {
                                Button(action: {
                                    _ = client.deleteSkill(name: skill.name)
                                }) {
                                    Image(systemName: "trash")
                                        .font(.caption)
                                        .foregroundColor(.red.opacity(0.8))
                                }
                                .buttonStyle(.plain)
                                .help(L10n.tr(.btnDeleteSkill))
                            }

                            if !skill.content.isEmpty {
                                Button(L10n.tr(.btnViewSkillMd)) {
                                    selectedSkill = skill
                                }
                                .buttonStyle(.bordered)
                                .font(.caption)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.inset)
            } else {
                List(filteredTools) { tool in
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
        .sheet(isPresented: $showingNewSkillSheet) {
            VStack(alignment: .leading, spacing: 16) {
                Text(L10n.tr(.newSkillModalTitle))
                    .font(.headline)

                VStack(alignment: .leading, spacing: 6) {
                    Text(L10n.tr(.skillNamePlaceholder))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("my-custom-skill", text: $newSkillName)
                        .textFieldStyle(.roundedBorder)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(L10n.tr(.skillDescPlaceholder))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextEditor(text: $newSkillDesc)
                        .font(.system(.body, design: .monospaced))
                        .frame(height: 120)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                        )
                }

                HStack {
                    Spacer()
                    Button(L10n.tr(.btnCancel)) {
                        showingNewSkillSheet = false
                    }
                    .buttonStyle(.bordered)

                    Button(L10n.tr(.btnCreate)) {
                        if client.createNewSkill(name: newSkillName, description: newSkillDesc) {
                            showingNewSkillSheet = false
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(newSkillName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .padding(20)
            .frame(width: 480)
        }
    }
}

// MARK: - Agent Badge & Color Helper
struct AgentBadgeHelper {
    static func color(for agent: String) -> Color {
        let name = agent.lowercased()
        if name.contains("antigravity") || name.contains("gemini") {
            return Color.blue
        } else if name.contains("omo") || name.contains("oh-my") {
            return Color.purple
        } else if name.contains("opencode") {
            return Color.green
        } else if name.contains("claude") {
            return Color.orange
        } else if name.contains("cursor") {
            return Color.cyan
        } else if name.contains("windsurf") {
            return Color.teal
        } else {
            return Color.gray
        }
    }

    static func icon(for agent: String) -> String {
        let name = agent.lowercased()
        if name.contains("antigravity") || name.contains("gemini") {
            return "sparkles"
        } else if name.contains("omo") || name.contains("oh-my") {
            return "bolt.horizontal.fill"
        } else if name.contains("opencode") {
            return "terminal.fill"
        } else if name.contains("claude") {
            return "brain"
        } else if name.contains("cursor") {
            return "macwindow"
        } else if name.contains("windsurf") {
            return "wind"
        } else {
            return "gearshape.2.fill"
        }
    }
}

// MARK: - Recent Projects Bar
struct RecentProjectsBar: View {
    @ObservedObject var client = DaemonClient.shared
    @ObservedObject var langManager = LanguageManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundColor(.blue)
                    .font(.caption)
                Text(L10n.tr(.recentProjectsTitle))
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                Spacer()
                Button(action: {
                    client.scanLocalProjects()
                }) {
                    Label(L10n.tr(.btnAutoScanProjects), systemImage: "sparkle.magnifyingglass")
                        .font(.caption2)
                }
                .buttonStyle(.borderless)

                Button(action: {
                    client.openProjectInFinder()
                }) {
                    Label(L10n.tr(.btnOpenProjectFinder), systemImage: "folder")
                        .font(.caption2)
                }
                .buttonStyle(.bordered)

                Button(action: {
                    client.openProjectInTerminal()
                }) {
                    Label(L10n.tr(.btnOpenProjectTerminal), systemImage: "terminal")
                        .font(.caption2)
                }
                .buttonStyle(.bordered)

                Button(action: {
                    selectProjectFolder()
                }) {
                    Label(L10n.tr(.btnChooseProjectFolder), systemImage: "folder.badge.plus")
                        .font(.caption2)
                }
                .buttonStyle(.bordered)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(client.recentProjects) { proj in
                        let isSelected = client.currentProjectPath == proj.path
                        Button(action: {
                            client.switchProject(to: proj.path)
                        }) {
                            HStack(spacing: 6) {
                                if proj.isPinned {
                                    Image(systemName: "pin.fill")
                                        .font(.system(size: 9))
                                        .foregroundColor(.orange)
                                } else {
                                    Image(systemName: "folder.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(isSelected ? .blue : .secondary)
                                }

                                Text(proj.name)
                                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                    .foregroundColor(isSelected ? .blue : .primary)

                                if proj.hasMemoryFile {
                                    Text("\(proj.actionCount)")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(isSelected ? Color.blue.opacity(0.2) : Color.secondary.opacity(0.12))
                                        .foregroundColor(isSelected ? .blue : .secondary)
                                        .cornerRadius(8)
                                }
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(isSelected ? Color.blue.opacity(0.12) : Color(NSColor.controlBackgroundColor))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(isSelected ? Color.blue : Color.secondary.opacity(0.15), lineWidth: isSelected ? 1.5 : 1)
                            )
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button(action: { client.togglePinProject(path: proj.path) }) {
                                Label(proj.isPinned ? L10n.tr(.btnUnpin) : L10n.tr(.btnPin), systemImage: proj.isPinned ? "pin.slash" : "pin")
                            }
                            Button(action: { NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: proj.path) }) {
                                Label("在 Finder 中顯示", systemImage: "macwindow")
                            }
                            Divider()
                            Button(action: { client.removeRecentProject(path: proj.path) }) {
                                Label(L10n.tr(.btnRemoveRecent), systemImage: "trash")
                            }
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .padding(10)
        .background(Color(NSColor.controlBackgroundColor).opacity(0.6))
        .cornerRadius(10)
    }

    private func selectProjectFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        if panel.runModal() == .OK, let url = panel.url {
            client.switchProject(to: url.path)
        }
    }
}

// MARK: - Project Rule Audit Bar
struct ProjectRuleAuditBar: View {
    @ObservedObject var client = DaemonClient.shared
    @ObservedObject var langManager = LanguageManager.shared

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Circle()
                    .fill(client.currentProjectAudit.allCompliant ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)
                Text(client.currentProjectAudit.allCompliant ? L10n.tr(.auditAllCompliant) : L10n.tr(.auditMissingRules(client.currentProjectAudit.missingCount)))
                    .font(.caption.bold())
                    .foregroundColor(client.currentProjectAudit.allCompliant ? .green : .orange)
            }

            Spacer()

            // Status badges
            HStack(spacing: 6) {
                AuditBadge(title: "AGENT_MEMORY.md", ok: client.currentProjectAudit.hasAgentMemory)
                AuditBadge(title: "Claude", ok: client.currentProjectAudit.hasClaudeRules)
                AuditBadge(title: "Cursor", ok: client.currentProjectAudit.hasCursorRules)
                AuditBadge(title: "Windsurf", ok: client.currentProjectAudit.hasWindsurfRules)
                AuditBadge(title: "OpenCode", ok: client.currentProjectAudit.hasOpenCodeRules)
            }

            if !client.currentProjectAudit.allCompliant {
                Button(action: {
                    client.injectFocusinPrompt()
                }) {
                    Text(L10n.tr(.btnFixAllRules))
                        .font(.caption.bold())
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
    }
}

struct AuditBadge: View {
    let title: String
    let ok: Bool

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle")
                .foregroundColor(ok ? .green : .secondary)
                .font(.system(size: 9))
            Text(title)
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(ok ? .primary : .secondary)
        }
        .padding(.horizontal, 5)
        .padding(.vertical, 2)
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(4)
    }
}

// MARK: - Action Card View
struct ActionCardView: View {
    let action: ProjectActionItem
    @State private var isExpanded: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header: Agent + Timestamp + Tags
            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: AgentBadgeHelper.icon(for: action.agent))
                        .font(.caption2)
                    Text("@\(action.agent)")
                        .font(.caption.bold())
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(AgentBadgeHelper.color(for: action.agent).opacity(0.18))
                .foregroundColor(AgentBadgeHelper.color(for: action.agent))
                .cornerRadius(6)

                if !action.timestampStr.isEmpty {
                    Text(cleanTimestamp(action.timestampStr))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                ForEach(action.tags.prefix(3), id: \.self) { tag in
                    Text(tag)
                        .font(.system(size: 9, weight: .bold))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.12))
                        .foregroundColor(.secondary)
                        .cornerRadius(4)
                }
            }

            // Summary
            Text(action.summary)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)

            // Files Touched
            if !action.filesTouched.isEmpty {
                HStack(alignment: .top, spacing: 4) {
                    Text(L10n.tr(.labelFilesTouched))
                        .font(.caption2.bold())
                        .foregroundColor(.secondary)
                        .padding(.top, 2)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(action.filesTouched, id: \.self) { file in
                                HStack(spacing: 3) {
                                    Image(systemName: fileIcon(for: file))
                                        .font(.system(size: 9))
                                    Text(file)
                                        .font(.system(size: 10, design: .monospaced))
                                }
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color(NSColor.textBackgroundColor))
                                .cornerRadius(4)
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.secondary.opacity(0.15), lineWidth: 1))
                            }
                        }
                    }
                }
            }

            // Key Decisions (Bulleted List)
            if !action.keyDecisions.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(L10n.tr(.labelKeyDecisions))
                            .font(.caption2.bold())
                            .foregroundColor(.secondary)
                        Spacer()
                        if action.keyDecisions.count > 1 {
                            Button(action: { isExpanded.toggle() }) {
                                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(.borderless)
                        }
                    }

                    if isExpanded {
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(action.keyDecisions, id: \.self) { dec in
                                HStack(alignment: .top, spacing: 5) {
                                    Text("•")
                                        .font(.caption.bold())
                                        .foregroundColor(AgentBadgeHelper.color(for: action.agent))
                                    Text(dec)
                                        .font(.caption)
                                        .foregroundColor(.primary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                        .padding(8)
                        .background(Color(NSColor.textBackgroundColor).opacity(0.6))
                        .cornerRadius(6)
                    }
                }
            }
        }
        .padding(12)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
        )
    }

    private func cleanTimestamp(_ raw: String) -> String {
        let cleaned = raw.replacingOccurrences(of: ".000Z", with: "").replacingOccurrences(of: "Z", with: "")
        if cleaned.contains("T") {
            let parts = cleaned.components(separatedBy: "T")
            if parts.count == 2 {
                let dateParts = parts[0].components(separatedBy: "-")
                let time = parts[1].prefix(5)
                if dateParts.count >= 3 {
                    return "\(dateParts[1])/\(dateParts[2]) \(time)"
                }
            }
        }
        return raw
    }

    private func fileIcon(for filename: String) -> String {
        if filename.hasSuffix(".swift") { return "swift" }
        if filename.hasSuffix(".md") { return "doc.text" }
        if filename.hasSuffix(".json") { return "curlybraces" }
        if filename.hasSuffix(".sh") { return "terminal" }
        return "doc"
    }
}

// MARK: - Project Memory View (OpenMemory & Enhanced UI)
public struct ProjectMemoryView: View {
    @ObservedObject var client = DaemonClient.shared
    @ObservedObject var langManager = LanguageManager.shared

    @State private var selectedSector: Int = 0 // 0: Timeline, 1: Semantic, 2: Procedural, 3: Reflective, 4: Context, 5: Raw
    @State private var searchQuery: String = ""
    @State private var selectedAgentFilter: String = "ALL"

    // Action Logging Form
    @State private var agentName: String = "OpenCode"
    @State private var actionSummary: String = ""
    @State private var filesTouched: String = ""
    @State private var keyDecisions: String = ""
    @State private var isLoggerExpanded: Bool = false
    @State private var statusToast: String?

    var filteredActions: [ProjectActionItem] {
        client.projectActions.filter { act in
            let matchAgent = (selectedAgentFilter == "ALL") || (act.agent.lowercased() == selectedAgentFilter.lowercased())
            if !matchAgent { return false }

            if searchQuery.isEmpty { return true }
            let q = searchQuery.lowercased()
            let matchSum = act.summary.lowercased().contains(q)
            let matchFiles = act.filesTouched.contains(where: { $0.lowercased().contains(q) })
            let matchDec = act.keyDecisions.contains(where: { $0.lowercased().contains(q) })
            let matchTags = act.tags.contains(where: { $0.lowercased().contains(q) })
            return matchSum || matchFiles || matchDec || matchTags
        }
    }

    var agentFilterCounts: [String: Int] {
        var counts: [String: Int] = [:]
        for a in client.projectActions {
            counts[a.agent, default: 0] += 1
        }
        return counts
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // 1. Header & Quick Switcher
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.tr(.projectMemoryTitle))
                            .font(.title2.bold())
                        Text(L10n.tr(.projectMemorySubtitle))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button(action: {
                        client.refreshProjectMemory()
                    }) {
                        Label(L10n.tr(.btnReload), systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)
                }

                // 2. Recent Projects Quick Switcher Bar
                RecentProjectsBar()

                // 3. Project Rule Compliance Audit Bar
                ProjectRuleAuditBar()

                // 4. FocusIn Core Directive Banner
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: "target")
                            .foregroundColor(.red)
                            .font(.headline)
                        Text(L10n.tr(.focusinDirectiveTitle))
                            .font(.headline)
                        Spacer()
                        Button(action: {
                            client.copyToClipboard(client.focusinDirectiveText, toast: L10n.tr(.toastCopied))
                        }) {
                            Label(L10n.tr(.btnCopyFocusinPrompt), systemImage: "doc.on.doc")
                        }
                        .buttonStyle(.bordered)

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

                // 5. OpenMemory Cognitive Sector Picker Tabs
                Picker("", selection: $selectedSector) {
                    Text(L10n.tr(.tabTimeline(client.projectActions.count))).tag(0)
                    Text(L10n.tr(.tabSemantic)).tag(1)
                    Text(L10n.tr(.tabProcedural)).tag(2)
                    Text(L10n.tr(.tabReflective)).tag(3)
                    Text(L10n.tr(.tabPromptBrief)).tag(4)
                    Text(L10n.tr(.tabRawEditor)).tag(5)
                }
                .pickerStyle(.segmented)

                // 6. Sector Content Display
                switch selectedSector {
                case 0:
                    // Episodic Timeline View
                    VStack(alignment: .leading, spacing: 12) {
                        // Search & Agent Filter Bar
                        HStack(spacing: 10) {
                            HStack {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.secondary)
                                TextField(L10n.tr(.searchActionsPlaceholder), text: $searchQuery)
                                    .textFieldStyle(.plain)
                                if !searchQuery.isEmpty {
                                    Button(action: { searchQuery = "" }) {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundColor(.secondary)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(8)
                            .background(Color(NSColor.controlBackgroundColor))
                            .cornerRadius(8)

                            // Quick Filter Pills
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    FilterPill(label: L10n.tr(.filterAll(client.projectActions.count)), isSelected: selectedAgentFilter == "ALL") {
                                        selectedAgentFilter = "ALL"
                                    }
                                    ForEach(agentFilterCounts.sorted(by: { $0.value > $1.value }), id: \.key) { ag, count in
                                        FilterPill(label: "@\(ag) (\(count))", isSelected: selectedAgentFilter.lowercased() == ag.lowercased()) {
                                            selectedAgentFilter = ag
                                        }
                                    }
                                }
                            }
                        }

                        // Actions List
                        if filteredActions.isEmpty {
                            VStack(spacing: 8) {
                                Text(L10n.tr(.emptyTimelinePrompt))
                                    .foregroundColor(.secondary)
                                Button(L10n.tr(.btnInitProjectMemory)) {
                                    client.injectFocusinPrompt()
                                }
                                .buttonStyle(.borderedProminent)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(32)
                            .background(Color(NSColor.controlBackgroundColor))
                            .cornerRadius(10)
                        } else {
                            VStack(spacing: 10) {
                                ForEach(filteredActions) { action in
                                    ActionCardView(action: action)
                                }
                            }
                        }
                    }

                case 1:
                    // Semantic Memory View
                    SectorCardView(
                        title: L10n.tr(.tabSemantic),
                        icon: "brain.fill",
                        color: .blue,
                        content: client.currentSectors.semanticMemory.isEmpty ? "尚未記錄架構與技術棧 facts。" : client.currentSectors.semanticMemory
                    )

                case 2:
                    // Procedural Rules View
                    SectorCardView(
                        title: L10n.tr(.tabProcedural),
                        icon: "wrench.and.screwdriver.fill",
                        color: .green,
                        content: client.currentSectors.proceduralRules.isEmpty ? "尚未記錄工作流程與防踩坑規範。" : client.currentSectors.proceduralRules
                    )

                case 3:
                    // Reflective Notes View
                    SectorCardView(
                        title: L10n.tr(.tabReflective),
                        icon: "exclamationmark.triangle.fill",
                        color: .purple,
                        content: client.currentSectors.reflectiveNotes.isEmpty ? "尚未記錄過往失敗方案與已知問題。" : client.currentSectors.reflectiveNotes
                    )

                case 4:
                    // Prompt Brief View
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(L10n.tr(.tabPromptBrief))
                                    .font(.headline)
                                Text("為新對話 Agent 提供當前專案的最新高價值事實與約束")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Button(action: {
                                client.copyPromptContextToClipboard()
                                statusToast = "✔ " + L10n.tr(.btnCopyContext)
                            }) {
                                Label(L10n.tr(.btnCopyContext), systemImage: "doc.on.doc.fill")
                            }
                            .buttonStyle(.borderedProminent)
                        }

                        ScrollView {
                            Text(client.buildPromptContext())
                                .font(.system(size: 11, design: .monospaced))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding()
                                .background(Color(NSColor.textBackgroundColor))
                                .cornerRadius(8)
                        }
                        .frame(height: 280)
                    }
                    .padding()
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(12)

                case 5:
                    // Raw Markdown Editor
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(L10n.tr(.rawEditorTitle))
                                .font(.headline)
                            Spacer()
                            Button(L10n.tr(.btnSaveChanges)) {
                                let path = "\(client.currentProjectPath)/AGENT_MEMORY.md"
                                try? client.projectMemoryRawText.write(toFile: path, atomically: true, encoding: .utf8)
                                client.refreshProjectMemory()
                                statusToast = "✔ " + L10n.tr(.btnSaveChanges)
                            }
                            .buttonStyle(.borderedProminent)
                        }

                        TextEditor(text: $client.projectMemoryRawText)
                            .font(.system(.caption, design: .monospaced))
                            .frame(minHeight: 320)
                            .padding(8)
                            .background(Color(NSColor.textBackgroundColor))
                            .cornerRadius(8)
                    }
                    .padding()
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(12)

                default:
                    EmptyView()
                }

                // 7. Quick Action Logger Form (Collapsible Panel)
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "square.and.pencil")
                            .foregroundColor(.blue)
                        Text(L10n.tr(.quickLogTitle))
                            .font(.headline)
                        Spacer()
                        Button(action: { isLoggerExpanded.toggle() }) {
                            Image(systemName: isLoggerExpanded ? "chevron.up.circle.fill" : "chevron.down.circle")
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                        .buttonStyle(.borderless)
                    }

                    if isLoggerExpanded {
                        // Quick Presets
                        HStack(spacing: 6) {
                            Text("快速範本:")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                            Button("🎙 音訊防踩坑") {
                                actionSummary = "修復音訊緩衝區溢位與格式鎖死問題"
                                filesTouched = "source/app/TeacherApp/TeacherViewModel.swift, AGENT_MEMORY.md"
                                keyDecisions = "鎖定首個合法塊格式 (lockedFormat)，拒收畸形塊。維護 inFlight 佇列保活連續記憶體。"
                            }
                            .buttonStyle(.bordered)
                            .font(.caption2)

                            Button("🍎 Swift 並發") {
                                actionSummary = "升級 Swift 6 並發安全與 MainActor 標註"
                                filesTouched = "source/app/TeacherApp/Views/DeltaStudioView.swift"
                                keyDecisions = "將所有 UI 狀態變更綁定至 @MainActor，異步回調使用 [weak self] 防止循環引用。"
                            }
                            .buttonStyle(.bordered)
                            .font(.caption2)

                            Button("🖥 UI 改造") {
                                actionSummary = "重構 Studio 界面為暗黑專業導播風格"
                                filesTouched = "source/app/TeacherApp/Views/DeltaStudioView.swift"
                                keyDecisions = "整合即時桌面預覽畫面與動態 Wi-Fi SSID 偵測。"
                            }
                            .buttonStyle(.bordered)
                            .font(.caption2)
                        }

                        HStack(spacing: 12) {
                            Picker(L10n.tr(.labelSourceAgent), selection: $agentName) {
                                Text("OpenCode").tag("OpenCode")
                                Text("OMO").tag("OMO")
                                Text("Antigravity").tag("Antigravity")
                                Text("Claude").tag("Claude")
                                Text("Cursor").tag("Cursor")
                                Text("Windsurf").tag("Windsurf")
                            }
                            .frame(width: 240)

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
}

// MARK: - Sector Card View
struct SectorCardView: View {
    let title: String
    let icon: String
    let color: Color
    let content: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.headline)
            }
            ScrollView {
                Text(content)
                    .font(.system(size: 12, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(NSColor.textBackgroundColor))
                    .cornerRadius(8)
            }
            .frame(minHeight: 220)
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Filter Pill
struct FilterPill: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption2.bold())
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(isSelected ? Color.blue : Color(NSColor.controlBackgroundColor))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.blue : Color.secondary.opacity(0.2), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
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
