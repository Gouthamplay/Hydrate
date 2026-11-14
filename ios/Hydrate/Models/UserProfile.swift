import Foundation

struct UserProfile: Codable, Equatable {
    var nickname: String
    var dailyGoal: Int
    var reminderStart: String // "07:00"
    var reminderEnd: String   // "21:00"
    var onboardingCompleted: Bool
    var email: String
    var updatedAt: String

    static var defaultProfile: UserProfile {
        UserProfile(
            nickname: "Friend",
            dailyGoal: 8,
            reminderStart: "07:00",
            reminderEnd: "21:00",
            onboardingCompleted: false,
            email: "",
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
    }

    var reminderStartDate: Date {
        UserProfile.dateFromTimeString(reminderStart) ?? Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date())!
    }

    var reminderEndDate: Date {
        UserProfile.dateFromTimeString(reminderEnd) ?? Calendar.current.date(bySettingHour: 21, minute: 0, second: 0, of: Date())!
    }

    static func dateFromTimeString(_ timeString: String) -> Date? {
        let parts = timeString.split(separator: ":")
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]) else { return nil }
        return Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: Date())
    }

    static func timeStringFromDate(_ date: Date) -> String {
        let comp = Calendar.current.dateComponents([.hour, .minute], from: date)
        let hour = comp.hour ?? 7
        let minute = comp.minute ?? 0
        return String(format: "%02d:%02d", hour, minute)
    }
}
