import SwiftUI

public struct SidebarView: View {
    @Binding var selection: NavigationItem?
    @ObservedObject var client = DaemonClient.shared
    @ObservedObject var langManager = LanguageManager.shared

    public var body: some View {
        List(NavigationItem.allCases, selection: $selection) { item in
            NavigationLink(value: item) {
                HStack {
                    Label(item.localizedTitle, systemImage: item.icon)
                    Spacer()
                    switch item {
                    case .servers:
                        if !client.servers.isEmpty {
                            Text("\(client.servers.count)")
                                .font(.caption2.bold())
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                        }
                    case .skillsAndTools:
                        if !client.skills.isEmpty {
                            Text("\(client.skills.count)")
                                .font(.caption2.bold())
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                        }
                    case .projectMemory:
                        if !client.projectActions.isEmpty {
                            Text("\(client.projectActions.count)")
                                .font(.caption2.bold())
                                .foregroundColor(.purple)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1)
                                .background(Color.purple.opacity(0.12))
                                .cornerRadius(10)
                        }
                    default:
                        EmptyView()
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle(L10n.tr(.appTitle))
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 10) {
                Divider()

                // Language Setting Menu
                HStack(spacing: 6) {
                    Image(systemName: "globe")
                        .foregroundColor(.secondary)
                        .font(.caption)
                    Text(L10n.tr(.languageSetting))
                        .font(.caption2.bold())
                        .foregroundColor(.secondary)
                    Spacer()
                    Picker("", selection: $langManager.currentLanguage) {
                        ForEach(AppLanguage.allCases) { lang in
                            Text("\(lang.flag) \(lang.displayName)").tag(lang)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                    .frame(width: 120)
                }
                .padding(.horizontal, 14)

                HStack(spacing: 8) {
                    Circle()
                        .fill(client.isConnected ? Color.green : Color.blue)
                        .frame(width: 8, height: 8)
                    Text(client.isConnected ? "Daemon Online" : "Direct Native Bridge")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 8)
            }
        }
    }
}
