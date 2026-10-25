import SwiftUI

@main
struct AgentControllerApp: App {
    @State private var selectedItem: NavigationItem? = .overview
    @ObservedObject var langManager = LanguageManager.shared

    var body: some Scene {
        WindowGroup {
            NavigationSplitView {
                SidebarView(selection: $selectedItem)
                    .frame(minWidth: 210, idealWidth: 240)
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
            .frame(minWidth: 860, minHeight: 580)
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button(L10n.tr(.btnSyncAll)) {
                    Task {
                        await DaemonClient.shared.triggerSync()
                    }
                }
                .keyboardShortcut("s", modifiers: [.command])

                Button(L10n.tr(.btnRefreshState)) {
                    Task {
                        await DaemonClient.shared.refreshAll()
                    }
                }
                .keyboardShortcut("r", modifiers: [.command])

                Button(L10n.tr(.btnExportDesktop)) {
                    _ = DaemonClient.shared.exportMemoryMarkdownToDesktop()
                }
                .keyboardShortcut("e", modifiers: [.command])
            }

            CommandMenu("Language / 語言") {
                ForEach(AppLanguage.allCases) { lang in
                    Button(action: {
                        langManager.setLanguage(lang)
                    }) {
                        HStack {
                            Text("\(lang.flag) \(lang.displayName)")
                            if langManager.currentLanguage == lang {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            }
        }
    }
}
