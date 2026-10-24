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
                case .memory:
                    MemoryView()
                case .blackboard:
                    BlackboardView()
                }
            }
            .frame(minWidth: 800, minHeight: 520)
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Sync All Resources Now") {
                    Task {
                        await DaemonClient.shared.triggerSync()
                    }
                }
                .keyboardShortcut("s", modifiers: [.command])

                Button("Refresh State") {
                    Task {
                        await DaemonClient.shared.refreshAll()
                    }
                }
                .keyboardShortcut("r", modifiers: [.command])
            }
        }
    }
}
