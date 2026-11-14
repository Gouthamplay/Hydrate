import Foundation
import SwiftUI
import Combine
import FirebaseFirestore
import UIKit

class HydrationViewModel: ObservableObject {
    @Published var todayCheckIns: DayCheckIns = .empty
    @Published var streakCount: Int = 0
    @Published var monthCheckinMap: [String: DayCheckIns] = [:]
    @Published var isSyncing: Bool = false

    private var checkInListener: ListenerRegistration?
    private let db = Firestore.firestore()
    private var currentUserId: String?

    func startListening(userId: String) {
        self.currentUserId = userId
        listenToToday(userId: userId)
        fetchMonthHistory(userId: userId)
    }

    func stopListening() {
        checkInListener?.remove()
        checkInListener = nil
    }

    deinit {
        stopListening()
    }

    private func todayKey() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    // MARK: - Real-time Firestore Listener
    private func listenToToday(userId: String) {
        checkInListener?.remove()
        let key = todayKey()
        let ref = db.collection("users").document(userId).collection("checkins").document(key)

        isSyncing = true
        checkInListener = ref.addSnapshotListener { [weak self] snapshot, error in
            guard let self = self else { return }
            self.isSyncing = false

            if let error = error {
                print("Error listening to today checkins: \(error)")
                return
            }

            guard let snapshot = snapshot, snapshot.exists, let data = snapshot.data() else {
                DispatchQueue.main.async {
                    self.todayCheckIns = .empty
                }
                return
            }

            let completedCount = data["completedCount"] as? Int ?? 0
            let goalMet = data["goalMet"] as? Bool ?? false
            let rawRecords = data["records"] as? [[String: Any]] ?? []

            var parsedRecords: [CheckInRecord] = []
            for r in rawRecords {
                let id = r["id"] as? String ?? UUID().uuidString
                let ts = r["timestamp"] as? String ?? ""
                let src = r["source"] as? String ?? "ios_app"
                let status = r["status"] as? String ?? "yes"
                parsedRecords.append(CheckInRecord(id: id, timestamp: ts, source: src, status: status))
            }

            DispatchQueue.main.async {
                self.todayCheckIns = DayCheckIns(
                    completedCount: completedCount,
                    goalMet: goalMet,
                    records: parsedRecords
                )
            }
        }
    }

    // MARK: - Log Drink Action (1-Tap Accountability)
    func logDrink(source: String = "ios_app", goal: Int) {
        guard let uid = currentUserId else { return }

        // Native Haptic Feedback
        let feedback = UIImpactFeedbackGenerator(style: .medium)
        feedback.impactOccurred()

        let key = todayKey()
        let newCount = todayCheckIns.completedCount + 1
        let isGoalMet = newCount >= goal

        let newRecord = CheckInRecord(
            id: "rec_\(Int(Date().timeIntervalSince1970 * 1000))",
            timestamp: ISO8601DateFormatter().string(from: Date()),
            source: source,
            status: "yes"
        )

        var updatedRecords = todayCheckIns.records
        updatedRecords.append(newRecord)

        // Optimistic UI update
        self.todayCheckIns = DayCheckIns(
            completedCount: newCount,
            goalMet: isGoalMet,
            records: updatedRecords
        )

        let recordDict: [String: Any] = [
            "id": newRecord.id,
            "timestamp": newRecord.timestamp,
            "source": newRecord.source,
            "status": newRecord.status
        ]

        let ref = db.collection("users").document(uid).collection("checkins").document(key)
        ref.setData([
            "completedCount": newCount,
            "goalMet": isGoalMet,
            "records": FieldValue.arrayUnion([recordDict])
        ], merge: true) { [weak self] error in
            if let error = error {
                print("Error saving checkin: \(error)")
            } else {
                self?.fetchMonthHistory(userId: uid)
            }
        }
    }

    // MARK: - Undo Last Drink
    func undoLastDrink(goal: Int) {
        guard let uid = currentUserId, !todayCheckIns.records.isEmpty else { return }

        var records = todayCheckIns.records
        records.removeLast()
        let newCount = max(0, records.count)
        let isGoalMet = newCount >= goal
        let key = todayKey()

        self.todayCheckIns = DayCheckIns(
            completedCount: newCount,
            goalMet: isGoalMet,
            records: records
        )

        let rawList: [[String: Any]] = records.map {
            ["id": $0.id, "timestamp": $0.timestamp, "source": $0.source, "status": $0.status]
        }

        let ref = db.collection("users").document(uid).collection("checkins").document(key)
        ref.setData([
            "completedCount": newCount,
            "goalMet": isGoalMet,
            "records": rawList
        ], merge: true)
    }

    // MARK: - Goal Proximity Calculation
    func progressPercent(goal: Int) -> Double {
        guard goal > 0 else { return 0 }
        return min(1.0, Double(todayCheckIns.completedCount) / Double(goal))
    }

    func dynamicEncouragement(nickname: String, goal: Int) -> String {
        let count = todayCheckIns.completedCount
        let nick = nickname.isEmpty ? "Friend" : nickname

        if count == 0 {
            return "0 of \(goal) check-ins — Let's start hydrating, \(nick)! 💧"
        } else if count < max(1, goal / 2) {
            return "\(count) of \(goal) check-ins — Off to a great start, \(nick)!"
        } else if count < goal - 1 {
            return "\(count) of \(goal) check-ins — Halfway there, keep going!"
        } else if count == goal - 1 {
            return "Just 1 more check-in to reach today's goal, \(nick)! 🎯"
        } else if count == goal {
            return "Goal reached! 💧 Awesome consistency today, \(nick)!"
        } else {
            return "Goal exceeded! \(count) check-ins completed today, superstar! 🌟"
        }
    }

    // MARK: - Monthly Calendar & Streak History
    func fetchMonthHistory(userId: String) {
        let ref = db.collection("users").document(userId).collection("checkins")
        ref.getDocuments { [weak self] snapshot, error in
            guard let self = self, let snapshot = snapshot else { return }

            var map: [String: DayCheckIns] = [:]
            for doc in snapshot.documents {
                let data = doc.data()
                let count = data["completedCount"] as? Int ?? 0
                let goalMet = data["goalMet"] as? Bool ?? false
                map[doc.documentID] = DayCheckIns(completedCount: count, goalMet: goalMet, records: [])
            }

            DispatchQueue.main.async {
                self.monthCheckinMap = map
                self.calculateStreak(map: map)
            }
        }
    }

    private func calculateStreak(map: [String: DayCheckIns]) {
        var streak = 0
        var checkDate = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        while true {
            let key = formatter.string(from: checkDate)
            if let entry = map[key], entry.goalMet {
                streak += 1
                if let prevDay = Calendar.current.date(byAdding: .day, value: -1, to: checkDate) {
                    checkDate = prevDay
                } else {
                    break
                }
            } else {
                break
            }
        }
        self.streakCount = streak
    }
}
