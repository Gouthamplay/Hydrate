import UIKit
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()

        // Set Notification Center Delegate
        UNUserNotificationCenter.current().delegate = self

        return true
    }

    // MARK: - Handle Actionable Notification Responses (Lock-screen / Banner)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let actionId = response.actionIdentifier

        if actionId == NotificationManager.actionYesIdentifier {
            // User tapped "Yes, I drank 💧" from the lock screen!
            logNotificationCheckIn()
        }

        completionHandler()
    }

    // Present notification while app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    private func logNotificationCheckIn() {
        guard let user = Auth.auth().currentUser else { return }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayKey = formatter.string(from: Date())

        let recordDict: [String: Any] = [
            "id": "rec_notif_\(Int(Date().timeIntervalSince1970 * 1000))",
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "source": "ios_notification",
            "status": "yes"
        ]

        let ref = Firestore.firestore().collection("users").document(user.uid).collection("checkins").document(todayKey)
        ref.setData([
            "completedCount": FieldValue.increment(Int64(1)),
            "records": FieldValue.arrayUnion([recordDict])
        ], merge: true) { error in
            if let error = error {
                print("Failed to log notification check-in: \(error)")
            } else {
                print("Successfully logged check-in from lock-screen notification!")
            }
        }
    }
}
