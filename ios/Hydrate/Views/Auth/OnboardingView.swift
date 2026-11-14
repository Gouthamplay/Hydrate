import SwiftUI

struct OnboardingView: View {
    @ObservedObject var authVM: AuthViewModel

    @State private var currentStep: Int = 1
    @State private var nickname: String = ""
    @State private var selectedGoal: Int = 8
    @State private var startDate: Date = Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var endDate: Date = Calendar.current.date(bySettingHour: 21, minute: 0, second: 0, of: Date()) ?? Date()

    let goalOptions = [6, 8, 10, 12]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.95, green: 0.98, blue: 1.0), Color(red: 0.89, green: 0.95, blue: 0.99)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 24) {
                // Step Indicator Dots
                HStack(spacing: 8) {
                    ForEach(1...3, id: \.self) { step in
                        Circle()
                            .fill(step <= currentStep ? Color.blue : Color.gray.opacity(0.3))
                            .frame(width: step == currentStep ? 12 : 8, height: step == currentStep ? 12 : 8)
                            .animation(.spring(), value: currentStep)

                        if step < 3 {
                            Rectangle()
                                .fill(step < currentStep ? Color.blue : Color.gray.opacity(0.2))
                                .frame(width: 24, height: 2)
                        }
                    }
                }
                .padding(.top, 24)

                Spacer()

                // Step Content
                if currentStep == 1 {
                    stepOneView
                } else if currentStep == 2 {
                    stepTwoView
                } else {
                    stepThreeView
                }

                Spacer()

                // Navigation Controls
                HStack(spacing: 16) {
                    if currentStep > 1 {
                        Button(action: {
                            withAnimation(.spring()) {
                                currentStep -= 1
                            }
                        }) {
                            Text("Back")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.white.opacity(0.7))
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }

                    Button(action: {
                        if currentStep < 3 {
                            withAnimation(.spring()) {
                                currentStep += 1
                            }
                        } else {
                            completeSetup()
                        }
                    }) {
                        Text(currentStep == 3 ? "Launch Hydrate 💧" : "Continue")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(LinearGradient(colors: [Color.cyan, Color.blue], startPoint: .leading, endPoint: .trailing))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .shadow(color: Color.blue.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .onAppear {
            if nickname.isEmpty {
                nickname = authVM.userProfile.nickname.isEmpty ? "Friend" : authVM.userProfile.nickname
            }
        }
    }

    // MARK: - Step 1: What to Call Them (Nickname)
    private var stepOneView: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.12))
                    .frame(width: 80, height: 80)
                Image(systemName: "hand.wave.fill")
                    .font(.system(size: 38))
                    .foregroundColor(.blue)
            }

            VStack(spacing: 8) {
                Text("What should we call you?")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))

                Text("We'll use your nickname for personalized reminders throughout your day.")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("YOUR NICKNAME")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.secondary)

                TextField("e.g. Alex", text: $nickname)
                    .font(.system(size: 18, weight: .medium))
                    .padding(16)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .shadow(color: Color.black.opacity(0.03), radius: 8, x: 0, y: 2)
            }
            .padding(.horizontal, 28)
            .padding(.top, 12)
        }
        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)))
    }

    // MARK: - Step 2: Daily Target Goal (No volume questions!)
    private var stepTwoView: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.cyan.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "target")
                    .font(.system(size: 38))
                    .foregroundColor(.blue)
            }

            VStack(spacing: 8) {
                Text("What's your daily goal?")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))

                Text("Choose how many times you'd like to check in and hydrate. No volume tracking required.")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }

            // Quick Chips
            VStack(spacing: 12) {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(goalOptions, id: \.self) { goal in
                        Button(action: {
                            selectedGoal = goal
                        }) {
                            Text("\(goal) check-ins\(goal == 8 ? " ⭐" : "")")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(selectedGoal == goal ? .white : Color(red: 0.1, green: 0.2, blue: 0.3))
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(selectedGoal == goal ? Color.blue : Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(selectedGoal == goal ? Color.blue : Color.gray.opacity(0.2), lineWidth: 1)
                                )
                        }
                    }
                }

                // Custom Stepper
                HStack {
                    Text("Custom goal:")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)

                    Spacer()

                    HStack(spacing: 14) {
                        Button(action: {
                            if selectedGoal > 2 { selectedGoal -= 1 }
                        }) {
                            Image(systemName: "minus.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.blue)
                        }

                        Text("\(selectedGoal)")
                            .font(.system(size: 18, weight: .bold))
                            .frame(minWidth: 28)

                        Button(action: {
                            if selectedGoal < 24 { selectedGoal += 1 }
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white)
                    .clipShape(Capsule())
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 28)
        }
        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)))
    }

    // MARK: - Step 3: Daily Routine (Hours)
    private var stepThreeView: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "clock.badge.checkmark.fill")
                    .font(.system(size: 38))
                    .foregroundColor(.orange)
            }

            VStack(spacing: 8) {
                Text("Your daily routine")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))

                Text("When does your active day start and end? We'll schedule reminders during these hours.")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }

            VStack(spacing: 14) {
                HStack {
                    Label("Wake up", systemImage: "sunrise.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.orange)
                    Spacer()
                    DatePicker("", selection: $startDate, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                }
                .padding(14)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                HStack {
                    Label("Wind down", systemImage: "moon.stars.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.indigo)
                    Spacer()
                    DatePicker("", selection: $endDate, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                }
                .padding(14)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .padding(.horizontal, 28)
        }
        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)))
    }

    private func completeSetup() {
        let startStr = UserProfile.timeStringFromDate(startDate)
        let endStr = UserProfile.timeStringFromDate(endDate)
        authVM.completeOnboarding(
            nickname: nickname.trimmingCharacters(in: .whitespacesAndNewlines),
            dailyGoal: selectedGoal,
            start: startStr,
            end: endStr
        )
    }
}
