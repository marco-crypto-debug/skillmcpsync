import SwiftUI

// MARK: - Navigation Items
public enum NavigationItem: String, CaseIterable, Identifiable {
    case overview = "Overview"
    case servers = "Servers & MCPs"
    case skillsAndTools = "Skills & Tools"
    case memory = "Agent Memory"
    case blackboard = "Blackboard"

    public var id: String { rawValue }

    public var icon: String {
        switch self {
        case .overview: return "square.grid.2x2.fill"
        case .servers: return "server.rack"
        case .skillsAndTools: return "wrench.and.screwdriver.fill"
        case .memory: return "brain.head.profile"
        case .blackboard: return "character.book.closed.fill"
        }
    }
}

// MARK: - Overview View
public struct OverviewView: View {
    @ObservedObject var client = DaemonClient.shared

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Banner
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Unified Cross-Server Agent Controller")
                            .font(.system(size: 22, weight: .bold))
                        Text("Real-time coordination for MCP servers, tools, skills & shared memory")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button(action: {
                        Task { await client.triggerSync() }
                    }) {
                        HStack(spacing: 6) {
                            if client.isSyncing {
                                ProgressView()
                                    .scaleEffect(0.7)
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                            }
                            Text(client.isSyncing ? "Syncing..." : "Sync All Now")
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                    .disabled(client.isSyncing)
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                // Metrics Grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    MetricCard(title: "MCP Servers", count: "\(client.servers.count)", icon: "server.rack", color: .purple)
                    MetricCard(title: "Active Skills", count: "\(client.skills.count)", icon: "sparkles", color: .green)
                    MetricCard(title: "Synced Tools", count: "\(client.tools.count)", icon: "hammer.fill", color: .orange)
                    MetricCard(title: "Memory Entries", count: "\(client.memoryEntries.count)", icon: "brain", color: .blue)
                }

                // Recent Status & Health
                VStack(alignment: .leading, spacing: 12) {
                    Text("System Status")
                        .font(.headline)

                    HStack(spacing: 24) {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(client.isConnected ? Color.green : Color.orange)
                                .frame(width: 10, height: 10)
                            Text(client.isConnected ? "Daemon Online (port 4949)" : "Standalone Bridge Mode")
                                .font(.callout)
                        }

                        HStack(spacing: 8) {
                            Image(systemName: "folder.fill")
                                .foregroundColor(.secondary)
                            Text(client.overview.vaultPath)
                                .font(.callout)
                                .foregroundColor(.secondary)
                        }

                        HStack(spacing: 8) {
                            Image(systemName: "git.branch")
                                .foregroundColor(.secondary)
                            Text("Branch: \(client.overview.gitBranch)")
                                .font(.callout)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(NSColor.controlBackgroundColor).opacity(0.6))
                    .cornerRadius(8)
                }

                // Quick Activity Feed
                VStack(alignment: .leading, spacing: 10) {
                    Text("Recent Synchronized Resources")
                        .font(.headline)

                    ForEach(client.servers) { s in
                        HStack {
                            Circle()
                                .fill(s.enabled ? Color.green : Color.gray)
                                .frame(width: 8, height: 8)
                            Text(s.name)
                                .fontWeight(.semibold)
                            Text("[\(s.type ?? "stdio")]")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(s.description ?? "")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Toggle("", isOn: Binding(
                                get: { s.enabled },
                                set: { _ in client.toggleServer(id: s.id) }
                            ))
                            .toggleStyle(.switch)
                        }
                        .padding(.vertical, 4)
                        Divider()
                    }
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)
            }
            .padding(24)
        }
    }
}

// MARK: - Metric Card Component
struct MetricCard: View {
    let title: String
    let count: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title2)
                Spacer()
            }
            Text(count)
                .font(.system(size: 28, weight: .bold))
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(16)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(10)
    }
}

// MARK: - Servers & MCPs View
public struct ServersView: View {
    @ObservedObject var client = DaemonClient.shared
    @State private var showingAddSheet = false
    @State private var newServerName = ""
    @State private var newServerCommand = "npx"
    @State private var newServerArgs = ""
    @State private var newServerUrl = ""

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text("MCP Servers & Endpoints")
                        .font(.title2.bold())
                    Text("Manage stdio, SSE, and HTTP Model Context Protocol servers")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button(action: { showingAddSheet = true }) {
                    Label("Add Server", systemImage: "plus")
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()

            Divider()

            // Servers List
            List {
                ForEach(client.servers) { server in
                    HStack(spacing: 16) {
                        // Health status dot
                        Circle()
                            .fill(server.healthStatus == .healthy ? Color.green : Color.red)
                            .frame(width: 10, height: 10)

                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(server.name)
                                    .font(.headline)
                                Text(server.type?.uppercased() ?? "STDIO")
                                    .font(.system(size: 10, weight: .bold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.blue.opacity(0.15))
                                    .foregroundColor(.blue)
                                    .cornerRadius(4)
                                if let lat = server.latencyMs {
                                    Text("\(lat)ms")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                            if let cmd = server.command {
                                Text("\(cmd) \((server.args ?? []).joined(separator: " "))")
                                    .font(.caption.monospaced())
                                    .foregroundColor(.secondary)
                            }
                            if let url = server.url {
                                Text(url)
                                    .font(.caption.monospaced())
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        Toggle("", isOn: Binding(
                            get: { server.enabled },
                            set: { _ in client.toggleServer(id: server.id) }
                        ))
                        .toggleStyle(.switch)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .sheet(isPresented: $showingAddSheet) {
            VStack(spacing: 16) {
                Text("Add MCP Server").font(.headline)
                TextField("Server Name", text: $newServerName)
                    .textFieldStyle(.roundedBorder)
                TextField("Command (e.g. npx)", text: $newServerCommand)
                    .textFieldStyle(.roundedBorder)
                TextField("Arguments (e.g. -y @modelcontextprotocol/server-github)", text: $newServerArgs)
                    .textFieldStyle(.roundedBorder)
                TextField("Optional Remote SSE/HTTP URL", text: $newServerUrl)
                    .textFieldStyle(.roundedBorder)

                HStack {
                    Button("Cancel") { showingAddSheet = false }
                    Spacer()
                    Button("Add to Vault") {
                        let newServer = MCPServerItem(
                            name: newServerName,
                            type: newServerUrl.isEmpty ? "stdio" : "sse",
                            command: newServerCommand.isEmpty ? nil : newServerCommand,
                            args: newServerArgs.components(separatedBy: " ").filter { !$0.isEmpty },
                            url: newServerUrl.isEmpty ? nil : newServerUrl,
                            enabled: true
                        )
                        client.servers.append(newServer)
                        showingAddSheet = false
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(24)
            .frame(width: 440)
        }
    }
}

// MARK: - Skills & Tools Registry View
public struct SkillsToolsView: View {
    @ObservedObject var client = DaemonClient.shared
    @State private var selectedTab = 0
    @State private var searchQuery = ""

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                Picker("", selection: $selectedTab) {
                    Text("Active Skills (\(client.skills.count))").tag(0)
                    Text("Introspected Tools (\(client.tools.count))").tag(1)
                }
                .pickerStyle(.segmented)
                .frame(width: 320)

                Spacer()

                HStack {
                    Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                    TextField("Filter by name or origin...", text: $searchQuery)
                        .textFieldStyle(.plain)
                }
                .padding(6)
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(8)
                .frame(width: 240)
            }
            .padding()

            Divider()

            if selectedTab == 0 {
                // Skills List
                List {
                    ForEach(client.skills.filter {
                        searchQuery.isEmpty || $0.name.localizedCaseInsensitiveContains(searchQuery)
                    }) { skill in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "sparkles")
                                .foregroundColor(.purple)
                                .font(.title3)

                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(skill.name).font(.headline)
                                    Text("[\(skill.originServer)]")
                                        .font(.caption2.bold())
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.purple.opacity(0.12))
                                        .foregroundColor(.purple)
                                        .cornerRadius(4)
                                    Text("v\(skill.version)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                Text(skill.description ?? "No description")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Toggle("", isOn: Binding(
                                get: { skill.enabled },
                                set: { _ in client.toggleSkill(id: skill.id) }
                            ))
                            .toggleStyle(.switch)
                        }
                        .padding(.vertical, 6)
                    }
                }
            } else {
                // Tools List
                List {
                    ForEach(client.tools.filter {
                        searchQuery.isEmpty || $0.namespacedName.localizedCaseInsensitiveContains(searchQuery)
                    }) { tool in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "hammer.fill")
                                .foregroundColor(.orange)
                                .font(.title3)

                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(tool.name).font(.headline)
                                    Text(tool.namespacedName)
                                        .font(.caption.monospaced())
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.orange.opacity(0.12))
                                        .foregroundColor(.orange)
                                        .cornerRadius(4)
                                }
                                Text(tool.description ?? "Discovered MCP tool")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Toggle("", isOn: Binding(
                                get: { tool.enabled },
                                set: { _ in client.toggleTool(id: tool.id) }
                            ))
                            .toggleStyle(.switch)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
        }
    }
}

// MARK: - Agent Memory View
public struct MemoryView: View {
    @ObservedObject var client = DaemonClient.shared
    @State private var selectedNamespace = "all"
    @State private var showingAddEntry = false
    @State private var newKey = ""
    @State private var newValue = ""
    @State private var newNs = "research"
    @State private var newAuthor = "coder"

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Multi-Agent Shared Memory Pool")
                        .font(.title2.bold())
                    Text("Namespaced memory partitions, conflict audit log, and private scratchpads")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button(action: { showingAddEntry = true }) {
                    Label("Post Entry", systemImage: "square.and.pencil")
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()

            Divider()

            // Namespaces bar
            HStack {
                Text("Namespace:")
                    .font(.subheadline.bold())
                Picker("", selection: $selectedNamespace) {
                    Text("All").tag("all")
                    Text("research/").tag("research")
                    Text("code/").tag("code")
                    Text("review/").tag("review")
                    Text("shared/").tag("shared")
                }
                .pickerStyle(.segmented)
                .frame(width: 380)
                Spacer()
            }
            .padding(.horizontal)
            .padding(.vertical, 10)

            Divider()

            List {
                ForEach(client.memoryEntries.filter {
                    selectedNamespace == "all" || $0.namespace == selectedNamespace
                }) { entry in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("[\(entry.namespace)/\(entry.key)]")
                                .font(.headline.monospaced())
                            Text("v\(entry.version)")
                                .font(.caption.bold())
                                .foregroundColor(.yellow)
                            Text("@\(entry.author)")
                                .font(.caption.bold())
                                .foregroundColor(.purple)
                            Spacer()
                            Text(entry.timestamp, style: .time)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        Text(entry.value)
                            .font(.body)
                            .foregroundColor(.primary)
                            .padding(.top, 2)
                    }
                    .padding(.vertical, 8)
                }
            }
        }
        .sheet(isPresented: $showingAddEntry) {
            VStack(spacing: 16) {
                Text("Write to Shared Memory").font(.headline)
                Picker("Namespace", selection: $newNs) {
                    Text("research").tag("research")
                    Text("code").tag("code")
                    Text("review").tag("review")
                    Text("shared").tag("shared")
                }
                Picker("Author Agent", selection: $newAuthor) {
                    Text("researcher").tag("researcher")
                    Text("coder").tag("coder")
                    Text("reviewer").tag("reviewer")
                }
                TextField("Key", text: $newKey)
                    .textFieldStyle(.roundedBorder)
                TextEditor(text: $newValue)
                    .frame(height: 120)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.secondary.opacity(0.3)))

                HStack {
                    Button("Cancel") { showingAddEntry = false }
                    Spacer()
                    Button("Save") {
                        client.addMemoryEntry(namespace: newNs, key: newKey, value: newValue, author: newAuthor)
                        showingAddEntry = false
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(24)
            .frame(width: 440)
        }
    }
}

// MARK: - Blackboard View
public struct BlackboardView: View {
    @ObservedObject var client = DaemonClient.shared

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Unified Multi-Agent Blackboard")
                            .font(.title2.bold())
                        Text("Collective partial solutions assembled into a single coherent plan")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button(action: {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(client.blackboardSolution, forType: .string)
                    }) {
                        Label("Copy Markdown", systemImage: "doc.on.doc")
                    }
                }

                Divider()

                Text(client.blackboardSolution)
                    .font(.system(.body, design: .monospaced))
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(NSColor.textBackgroundColor))
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.secondary.opacity(0.2)))
            }
            .padding(24)
        }
    }
}
