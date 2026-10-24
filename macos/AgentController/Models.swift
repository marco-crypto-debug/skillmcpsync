import Foundation

public enum ServerHealthStatus: String, Codable {
    case healthy = "healthy"
    case degraded = "degraded"
    case unreachable = "unreachable"
    case checking = "checking"
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
        env: [String: String]? = nil
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

    public init(
        name: String,
        originServer: String = "local",
        description: String? = nil,
        content: String = "",
        enabled: Bool = true,
        version: Int = 1
    ) {
        self.name = name
        self.originServer = originServer
        self.description = description
        self.content = content
        self.enabled = enabled
        self.version = version
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
