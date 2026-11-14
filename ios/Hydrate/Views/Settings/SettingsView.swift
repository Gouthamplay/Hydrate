import SwiftUI

struct SettingsView: View {
    @ObservedObject var authVM: AuthViewModel
    @Environment(\.dismiss) var dismiss

    @State private var nickname: String = ""
    @State private var dailyGoal: Int = 8
    @State private var startDate: Date = Date()
    @State private var endDate: Date = Date()

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Profile & Reminders")) {
                    HStack {
                        Text("Nickname")
                        Spacer()
                        TextField("Your name", text: $nickname)
                            .multilineTextAlignment(.trailing)
                    }

                    Stepper("Daily Goal: \(dailyGoal) check-ins", value: $dailyGoal, in: 2...24)
                }

                Section(header: Text("Active Hours Window")) {
                    DatePicker("Wake up", selection: $startDate, displayedComponents: .hourAndMinute)
                    DatePicker("Wind down", selection: $endDate, displayedComponents: .hourAndMinute)
                }

                Section(footer: Text("Changes sync immediately across your iPhone and desktop web dashboard.")) {
                    Button(action: saveSettings) {
                        Text("Save Changes")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.blue)
                    }
                }

                Section {
                    Button(role: .destructive, action: {
                        authVM.signOut()
                        dismiss()
                    }) {
                        HStack {
                            Spacer()
                            Text("Sign Out")
                                .font(.system(size: 16, weight: .semibold))
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                nickname = authVM.userProfile.nickname
                dailyGoal = authVM.userProfile.dailyGoal
                startDate = authVM.userProfile.reminderStartDate
                endDate = authVM.userProfile.reminderEndDate
            }
        }
    }

    private func saveSettings() {
        let startStr = UserProfile.timeStringFromDate(startDate)
        let endStr = UserProfile.timeStringFromDate(endDate)
        authVM.updateSettings(
            nickname: nickname.trimmingCharacters(in: .whitespacesAndNewlines),
            dailyGoal: dailyGoal,
            start: startStr,
            end: endStr
        )
        dismiss()
    }
}
