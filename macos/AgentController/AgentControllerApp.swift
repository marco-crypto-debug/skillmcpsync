import SwiftUI

@main
struct AgentControllerApp: App {
    @State private var selectedItem: NavigationItem? = .overview

    var body: some Scene {
        WindowGroup {
            NavigationSplitView {
                SidebarView(selection: $selectedItem)
                    .frame(minWidth: 200, idealWidth: 230)
            } detail: {
                switch selectedItem {
                case .overview, .none:
                    OverviewView()
                case .servers:
                    ServersView()
                case .skillsAndTools:
                    SkillsToolsView()
                case .projectMemory:
                    ProjectMemoryView()
                case .memory:
                    MemoryView()
                }
            }
            .frame(minWidth: 840, minHeight: 560)
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("⚡️ 一鍵同步所有 Agent") {
                    Task {
                        await DaemonClient.shared.triggerSync()
                    }
                }
                .keyboardShortcut("s", modifiers: [.command])

                Button("重新整理狀態") {
                    Task {
                        await DaemonClient.shared.refreshAll()
                    }
                }
                .keyboardShortcut("r", modifiers: [.command])

                Button("匯出 MEMORY.md 至桌面") {
                    _ = DaemonClient.shared.exportMemoryMarkdownToDesktop()
                }
                .keyboardShortcut("e", modifiers: [.command])
            }
        }
    }
}
