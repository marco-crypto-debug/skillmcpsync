import SwiftUI

public struct SidebarView: View {
    @Binding var selection: NavigationItem?
    @ObservedObject var client = DaemonClient.shared

    public var body: some View {
        List(NavigationItem.allCases, selection: $selection) { item in
            NavigationLink(value: item) {
                Label(item.rawValue, systemImage: item.icon)
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Agent Controller")
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 8) {
                Divider()
                HStack {
                    Circle()
                        .fill(client.isConnected ? Color.green : Color.orange)
                        .frame(width: 8, height: 8)
                    Text(client.isConnected ? "Daemon Online" : "CLI Standalone")
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
