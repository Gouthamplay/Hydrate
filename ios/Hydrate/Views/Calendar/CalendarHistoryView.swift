import SwiftUI

struct CalendarHistoryView: View {
    @ObservedObject var hydrationVM: HydrationViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Streak Card
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(LinearGradient(colors: [Color.orange.opacity(0.2), Color.red.opacity(0.2)], startPoint: .top, endPoint: .bottom))
                                .frame(width: 56, height: 56)
                            Text("🔥")
                                .font(.system(size: 28))
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(alignment: .firstTextBaseline, spacing: 4) {
                                Text("\(hydrationVM.streakCount)")
                                    .font(.system(size: 28, weight: .bold, design: .rounded))
                                    .foregroundColor(Color(red: 0.8, green: 0.3, blue: 0.1))
                                Text("DAY STREAK")
                                    .font(.system(size: 12, weight: .heavy))
                                    .foregroundColor(.secondary)
                            }
                            Text("Consistency over volume. Keep showing up!")
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                        }

                        Spacer()
                    }
                    .padding(18)
                    .background(Color(red: 1.0, green: 0.98, blue: 0.95))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(Color.orange.opacity(0.2), lineWidth: 1)
                    )

                    // Month Calendar Grid
                    VStack(alignment: .leading, spacing: 14) {
                        Text(currentMonthYearString())
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.primary)

                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                            ForEach(daysInCurrentMonth(), id: \.self) { day in
                                dayCell(day: day)
                            }
                        }
                    }
                    .padding(20)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .shadow(color: Color.black.opacity(0.03), radius: 10, x: 0, y: 3)
                }
                .padding(20)
            }
            .navigationTitle("Hydration History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func currentMonthYearString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: Date())
    }

    private func daysInCurrentMonth() -> [Int] {
        let range = Calendar.current.range(of: .day, in: .month, for: Date())!
        return Array(range)
    }

    private func dayCell(day: Int) -> some View {
        let key = formattedDateKey(day: day)
        let checkin = hydrationVM.monthCheckinMap[key]
        let isGoalMet = checkin?.goalMet ?? false
        let isToday = day == Calendar.current.component(.day, from: Date())

        return VStack(spacing: 2) {
            Text("\(day)")
                .font(.system(size: 13, weight: isToday ? .bold : .medium))
                .foregroundColor(isGoalMet ? Color.blue : (isToday ? .primary : .secondary))

            Circle()
                .fill(isGoalMet ? Color.blue : (checkin != nil && checkin!.completedCount > 0 ? Color.cyan.opacity(0.4) : Color.clear))
                .frame(width: 5, height: 5)
        }
        .frame(height: 38)
        .frame(maxWidth: .infinity)
        .background(isToday ? Color.blue.opacity(0.1) : Color(red: 0.98, green: 0.98, blue: 0.99))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(isToday ? Color.blue : Color.clear, lineWidth: 1.5)
        )
    }

    private func formattedDateKey(day: Int) -> String {
        let now = Date()
        let year = Calendar.current.component(.year, from: now)
        let month = Calendar.current.component(.month, from: now)
        return String(format: "%04d-%02d-%02d", year, month, day)
    }
}
