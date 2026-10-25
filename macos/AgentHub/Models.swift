import Foundation

public enum ServerHealthStatus: String, Codable {
    case healthy = "healthy"
    case degraded = "degraded"
    case unreachable = "unreachable"
    case checking = "checking"
}

public struct AgentStatusItem: Identifiable, Codable, Hashable {
    public var id: String
    public var name: String
    public var isInstalled: Bool
    public var configPath: String
    public var skillsPath: String
    public var mcpCount: Int
    public var skillCount: Int
    public var icon: String

    public init(
        id: String,
        name: String,
        isInstalled: Bool,
        configPath: String,
        skillsPath: String,
        mcpCount: Int = 0,
        skillCount: Int = 0,
        icon: String = "cpu"
    ) {
        self.id = id
        self.name = name
        self.isInstalled = isInstalled
        self.configPath = configPath
        self.skillsPath = skillsPath
        self.mcpCount = mcpCount
        self.skillCount = skillCount
        self.icon = icon
    }
}

public struct MCPServerItem: Identifiable, Codable, Hashable {
    public var id: String { name }
    public var name: String
    public var type: String?
    public var command: String?
    public var args: [String]?
    public var url: String?
    public var description: String?
    public var enabled: Bool
    public var healthStatus: ServerHealthStatus?
    public var latencyMs: Int?
    public var env: [String: String]?
    public var sourceAgents: [String]

    public init(
        name: String,
        type: String? = "stdio",
        command: String? = nil,
        args: [String]? = nil,
        url: String? = nil,
        description: String? = nil,
        enabled: Bool = true,
        healthStatus: ServerHealthStatus? = .healthy,
        latencyMs: Int? = 12,
        env: [String: String]? = nil,
        sourceAgents: [String] = []
    ) {
        self.name = name
        self.type = type
        self.command = command
        self.args = args
        self.url = url
        self.description = description
        self.enabled = enabled
        self.healthStatus = healthStatus
        self.latencyMs = latencyMs
        self.env = env
        self.sourceAgents = sourceAgents
    }
}

public struct SkillItem: Identifiable, Codable, Hashable {
    public var id: String { name }
    public var name: String
    public var originServer: String
    public var description: String?
    public var content: String
    public var enabled: Bool
    public var version: Int
    public var localPath: String?

    public init(
        name: String,
        originServer: String = "local",
        description: String? = nil,
        content: String = "",
        enabled: Bool = true,
        version: Int = 1,
        localPath: String? = nil
    ) {
        self.name = name
        self.originServer = originServer
        self.description = description
        self.content = content
        self.enabled = enabled
        self.version = version
        self.localPath = localPath
    }
}

public struct ToolItem: Identifiable, Codable, Hashable {
    public var id: String { namespacedName }
    public var name: String
    public var originServer: String
    public var namespacedName: String
    public var description: String?
    public var transport: String
    public var enabled: Bool

    public init(
        name: String,
        originServer: String,
        namespacedName: String,
        description: String? = nil,
        transport: String = "stdio",
        enabled: Bool = true
    ) {
        self.name = name
        self.originServer = originServer
        self.namespacedName = namespacedName
        self.description = description
        self.transport = transport
        self.enabled = enabled
    }
}

public struct MemoryEntryItem: Identifiable, Codable, Hashable {
    public var id: String { "\(namespace)/\(key)" }
    public var namespace: String
    public var key: String
    public var value: String
    public var author: String
    public var version: Int
    public var timestamp: Date

    public init(
        namespace: String,
        key: String,
        value: String,
        author: String,
        version: Int = 1,
        timestamp: Date = Date()
    ) {
        self.namespace = namespace
        self.key = key
        self.value = value
        self.author = author
        self.version = version
        self.timestamp = timestamp
    }
}

public struct RecentProjectItem: Identifiable, Codable, Hashable {
    public var id: String { path }
    public var name: String
    public var path: String
    public var lastVisited: Date
    public var hasMemoryFile: Bool
    public var actionCount: Int
    public var isPinned: Bool

    public init(
        name: String,
        path: String,
        lastVisited: Date = Date(),
        hasMemoryFile: Bool = false,
        actionCount: Int = 0,
        isPinned: Bool = false
    ) {
        self.name = name
        self.path = path
        self.lastVisited = lastVisited
        self.hasMemoryFile = hasMemoryFile
        self.actionCount = actionCount
        self.isPinned = isPinned
    }
}

public struct ProjectRuleAudit: Hashable {
    public var hasAgentMemory: Bool = false
    public var hasClaudeRules: Bool = false
    public var hasCursorRules: Bool = false
    public var hasWindsurfRules: Bool = false
    public var hasOpenCodeRules: Bool = false

    public var allCompliant: Bool {
        hasAgentMemory && hasClaudeRules && hasCursorRules && hasWindsurfRules && hasOpenCodeRules
    }

    public var missingCount: Int {
        var count = 0
        if !hasAgentMemory { count += 1 }
        if !hasClaudeRules { count += 1 }
        if !hasCursorRules { count += 1 }
        if !hasWindsurfRules { count += 1 }
        if !hasOpenCodeRules { count += 1 }
        return count
    }
}

public struct ProjectCognitiveSectors: Hashable {
    public var semanticMemory: String = ""
    public var proceduralRules: String = ""
    public var reflectiveNotes: String = ""
}

public struct ProjectActionItem: Identifiable, Codable, Hashable {
    public var id: String { "\(timestampStr)_\(agent)_\(summary.prefix(20))" }
    public var timestampStr: String
    public var agent: String
    public var summary: String
    public var filesTouched: [String]
    public var keyDecisions: [String]
    public var tags: [String]

    public init(
        timestampStr: String = "",
        agent: String,
        summary: String,
        filesTouched: [String] = [],
        keyDecisions: [String] = [],
        tags: [String] = []
    ) {
        self.timestampStr = timestampStr
        self.agent = agent
        self.summary = summary
        self.filesTouched = filesTouched
        self.keyDecisions = keyDecisions
        self.tags = tags
    }
}

public struct SyncLogItem: Identifiable, Hashable {
    public var id = UUID()
    public var timestamp: Date = Date()
    public var message: String
    public var isError: Bool = false
    public var isSuccess: Bool = false
}

public struct DashboardOverview: Codable {
    public var vaultPath: String
    public var gitBranch: String
    public var isGitClean: Bool
    public var totalServers: Int
    public var totalSkills: Int
    public var totalTools: Int
    public var totalMemoryEntries: Int
    public var activeAgentsCount: Int
    public var lastSyncTime: Date?
}

public struct McpPresetItem: Identifiable, Hashable {
    public var id: String { name }
    public let name: String
    public let title: String
    public let category: String
    public let description: String
    public let icon: String
    public let command: String
    public let args: [String]
    public let env: [String: String]

    public init(
        name: String,
        title: String,
        category: String,
        description: String,
        icon: String,
        command: String,
        args: [String],
        env: [String: String] = [:]
    ) {
        self.name = name
        self.title = title
        self.category = category
        self.description = description
        self.icon = icon
        self.command = command
        self.args = args
        self.env = env
    }
}
