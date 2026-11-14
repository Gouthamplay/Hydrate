import Foundation
import UserNotifications
import UIKit

class NotificationManager: NSObject, ObservableObject {
    static let shared = NotificationManager()

    static let categoryIdentifier = "HYDRATE_CHECKIN_CATEGORY"
    static let actionYesIdentifier = "ACTION_YES"
    static let actionNoIdentifier = "ACTION_NO"

    @Published var isAuthorized: Bool = false

    override init() {
        super.init()
        registerCategories()
        checkAuthorization()
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                self.isAuthorized = granted
            }
        }
    }

    func checkAuthorization() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    private func registerCategories() {
        let yesAction = UNNotificationAction(
            identifier: NotificationManager.actionYesIdentifier,
            title: "Yes, I drank 💧",
            options: [] // Can run in background without launching full UI
        )

        let noAction = UNNotificationAction(
            identifier: NotificationManager.actionNoIdentifier,
            title: "Not yet",
            options: []
        )

        let category = UNNotificationCategory(
            identifier: NotificationManager.categoryIdentifier,
            actions: [yesAction, noAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    func scheduleDailyReminders(profile: UserProfile) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        guard profile.dailyGoal > 0 else { return }

        let startHour = Int(profile.reminderStart.split(separator: ":").first ?? "7") ?? 7
        let endHour = Int(profile.reminderEnd.split(separator: ":").first ?? "21") ?? 21
        let nickname = profile.nickname.isEmpty ? "Friend" : profile.nickname

        let activeHours = max(1, endHour - startHour)
        let interval = max(1, activeHours / min(profile.dailyGoal, 12))

        var reminderHours: [Int] = []
        var h = startHour
        while h <= endHour {
            reminderHours.append(h)
            h += interval
        }

        // Personalized message templates
        let personalizedPrompts = [
            "Hey \(nickname), it's time to hydrate! 💧",
            "\(nickname), did you drink your water?",
            "A quick water break for you, \(nickname).",
            "Keep that healthy streak going, \(nickname)!"
        ]

        let standardPrompts = [
            "Time for a fresh glass of water. 💧",
            "Pause, hydrate, and refresh your mind.",
            "Water break! Stay consistent today."
        ]

        for (index, hour) in reminderHours.enumerated() {
            let content = UNMutableNotificationContent()
            content.categoryIdentifier = NotificationManager.categoryIdentifier
            content.sound = .default

            // Ensure 2 or 3 personalized prompts during the day as requested
            if index % 2 == 0 {
                let msg = personalizedPrompts[index % personalizedPrompts.count]
                content.title = msg
                content.body = "Did you drink your water? Tap below to record."
            } else {
                let msg = standardPrompts[index % standardPrompts.count]
                content.title = msg
                content.body = "Stay hydrated and energized. Tap Yes if you had a drink."
            }

            var dateComponents = DateComponents()
            dateComponents.hour = hour
            dateComponents.minute = 0

            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            let request = UNNotificationRequest(
                identifier: "hydrate_reminder_\(hour)",
                content: content,
                trigger: trigger
            )

            center.add(request) { error in
                if let error = error {
                    print("Error scheduling notification for hour \(hour): \(error)")
                }
            }
        }
    }
}
