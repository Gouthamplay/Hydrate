import SwiftUI

struct DashboardView: View {
    @ObservedObject var authVM: AuthViewModel
    @ObservedObject var hydrationVM: HydrationViewModel

    @State private var showCalendar: Bool = false
    @State private var showSettings: Bool = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Greeting & Live Sync Status
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(currentDateString())
                                .font(.system(size: 12, weight: .bold))
                                .tracking(0.6)
                                .foregroundColor(.secondary)
                                .textCase(.uppercase)

                            Spacer()

                            // Live Sync Badge
                            HStack(spacing: 5) {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 7, height: 7)
                                Text("Live Sync")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.8))
                            .clipShape(Capsule())
                        }

                        Text("Hey \(authVM.userProfile.nickname) 👋")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))

                        // Goal Proximity Banner (No volume questions!)
                        Text(hydrationVM.dynamicEncouragement(
                            nickname: authVM.userProfile.nickname,
                            goal: authVM.userProfile.dailyGoal
                        ))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.blue)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 14)
                        .background(Color.blue.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .padding(.horizontal, 20)

                    // Fluid Wave Progress Ring
                    FluidWaveRingView(
                        completedCount: hydrationVM.todayCheckIns.completedCount,
                        dailyGoal: authVM.userProfile.dailyGoal,
                        progress: hydrationVM.progressPercent(goal: authVM.userProfile.dailyGoal)
                    )
                    .padding(.vertical, 10)

                    // 1-Tap Quick Log Button
                    VStack(spacing: 12) {
                        Button(action: {
                            hydrationVM.logDrink(source: "ios_app", goal: authVM.userProfile.dailyGoal)
                        }) {
                            HStack(spacing: 10) {
                                Image(systemName: "drop.fill")
                                    .font(.system(size: 20, weight: .bold))
                                Text("I Drank Water")
                                    .font(.system(size: 18, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(
                                LinearGradient(colors: [Color.cyan, Color.blue], startPoint: .leading, endPoint: .trailing)
                            )
                            .clipShape(Capsule())
                            .shadow(color: Color.blue.opacity(0.35), radius: 10, x: 0, y: 5)
                        }
                        .padding(.horizontal, 36)

                        // Undo last log & Routine Window info
                        HStack {
                            if !hydrationVM.todayCheckIns.records.isEmpty {
                                Button(action: {
                                    hydrationVM.undoLastDrink(goal: authVM.userProfile.dailyGoal)
                                }) {
                                    Text("Undo last log")
                                        .font(.system(size: 12))
                                        .foregroundColor(.secondary)
                                        .underline()
                                }
                            }

                            Spacer()

                            Text("Routine: \(formatTime(authVM.userProfile.reminderStart)) – \(formatTime(authVM.userProfile.reminderEnd))")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 40)
                    }

                    // Today's Activity Log
                    MomentsListView(records: hydrationVM.todayCheckIns.records)
                        .padding(.horizontal, 20)
                }
                .padding(.top, 10)
                .padding(.bottom, 30)
            }
            .background(
                LinearGradient(
                    colors: [Color(red: 0.95, green: 0.98, blue: 1.0), Color(red: 0.90, green: 0.96, blue: 1.0)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showCalendar = true }) {
                        Image(systemName: "calendar")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gearshape")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))
                    }
                }
            }
            .sheet(isPresented: $showCalendar) {
                CalendarHistoryView(hydrationVM: hydrationVM)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(authVM: authVM)
            }
        }
        .onAppear {
            if let uid = authVM.currentUserId {
                hydrationVM.startListening(userId: uid)
            }
        }
    }

    private func currentDateString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: Date())
    }

    private func formatTime(_ timeStr: String) -> String {
        guard let date = UserProfile.dateFromTimeString(timeStr) else { return timeStr }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
