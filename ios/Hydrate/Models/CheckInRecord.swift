import Foundation

struct CheckInRecord: Codable, Identifiable, Equatable {
    var id: String
    var timestamp: String // ISO 8601
    var source: String    // "ios_app", "ios_notification", "web"
    var status: String    // "yes", "no"

    var formattedTime: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: timestamp)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: timestamp)
        }
        guard let d = date else { return "Earlier" }
        let outFormat = DateFormatter()
        outFormat.timeStyle = .short
        return outFormat.string(from: d)
    }

    var sourceIcon: String {
        switch source {
        case "ios_notification":
            return "bell.badge.fill"
        case "ios_app":
            return "iphone"
        default:
            return "laptopcomputer"
        }
    }

    var sourceLabel: String {
        switch source {
        case "ios_notification":
            return "Lock Screen"
        case "ios_app":
            return "iPhone App"
        default:
            return "Web Browser"
        }
    }
}

struct DayCheckIns: Codable, Equatable {
    var completedCount: Int
    var goalMet: Bool
    var records: [CheckInRecord]

    static var empty: DayCheckIns {
        DayCheckIns(completedCount: 0, goalMet: false, records: [])
    }
}
