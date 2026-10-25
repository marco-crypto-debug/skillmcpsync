import SwiftUI

@main
struct AgentHubApp: App {
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
            .overlay(alignment: .bottomTrailing) {
                if let toast = DaemonClient.shared.toastMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text(toast)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.primary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial)
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.18), radius: 8, x: 0, y: 4)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )
                    .padding(24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
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
