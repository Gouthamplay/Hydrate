import Foundation
import SwiftUI
import Combine
import FirebaseAuth
import FirebaseFirestore
import AuthenticationServices
import CryptoKit

class AuthViewModel: NSObject, ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentUserId: String? = nil
    @Published var userEmail: String? = nil
    @Published var userProfile: UserProfile = .defaultProfile
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    private var currentNonce: String?
    private var authListenerHandle: AuthStateDidChangeListenerHandle?
    private var profileListener: ListenerRegistration?
    private let db = Firestore.firestore()

    override init() {
        super.init()
        setupAuthListener()
    }

    deinit {
        if let handle = authListenerHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
        profileListener?.remove()
    }

    private func setupAuthListener() {
        authListenerHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                guard let self = self else { return }
                if let user = user {
                    self.isAuthenticated = true
                    self.currentUserId = user.uid
                    self.userEmail = user.email
                    self.listenToUserProfile(uid: user.uid)
                } else {
                    self.isAuthenticated = false
                    self.currentUserId = nil
                    self.userEmail = nil
                    self.userProfile = .defaultProfile
                    self.profileListener?.remove()
                }
            }
        }
    }

    // MARK: - Firestore Profile Real-time Listener
    private func listenToUserProfile(uid: String) {
        profileListener?.remove()
        let ref = db.collection("users").document(uid).collection("profile").document("main")
        profileListener = ref.addSnapshotListener { [weak self] snapshot, error in
            guard let self = self else { return }
            if let error = error {
                print("Error listening to profile: \(error)")
                return
            }

            guard let snapshot = snapshot, snapshot.exists, let data = snapshot.data() else {
                // Document does not exist yet (first time user)
                DispatchQueue.main.async {
                    self.userProfile.onboardingCompleted = false
                }
                return
            }

            DispatchQueue.main.async {
                let nickname = data["nickname"] as? String ?? "Friend"
                let dailyGoal = data["dailyGoal"] as? Int ?? 8
                let reminderStart = data["reminderStart"] as? String ?? "07:00"
                let reminderEnd = data["reminderEnd"] as? String ?? "21:00"
                let onboardingCompleted = data["onboardingCompleted"] as? Bool ?? true
                let email = data["email"] as? String ?? self.userEmail ?? ""
                let updatedAt = data["updatedAt"] as? String ?? ""

                self.userProfile = UserProfile(
                    nickname: nickname,
                    dailyGoal: dailyGoal,
                    reminderStart: reminderStart,
                    reminderEnd: reminderEnd,
                    onboardingCompleted: onboardingCompleted,
                    email: email,
                    updatedAt: updatedAt
                )

                // Schedule local notifications for active profile
                NotificationManager.shared.scheduleDailyReminders(profile: self.userProfile)
            }
        }
    }

    // MARK: - Save Onboarding Data
    func completeOnboarding(nickname: String, dailyGoal: Int, start: String, end: String) {
        guard let uid = currentUserId else { return }
        isLoading = true

        let cleanNick = nickname.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Friend" : nickname
        let profile = UserProfile(
            nickname: cleanNick,
            dailyGoal: dailyGoal,
            reminderStart: start,
            reminderEnd: end,
            onboardingCompleted: true,
            email: userEmail ?? "",
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        let data: [String: Any] = [
            "nickname": profile.nickname,
            "dailyGoal": profile.dailyGoal,
            "reminderStart": profile.reminderStart,
            "reminderEnd": profile.reminderEnd,
            "onboardingCompleted": true,
            "email": profile.email,
            "updatedAt": profile.updatedAt
        ]

        db.collection("users").document(uid).collection("profile").document("main").setData(data, merge: true) { [weak self] error in
            DispatchQueue.main.async {
                self?.isLoading = false
                if let error = error {
                    self?.errorMessage = error.localizedDescription
                } else {
                    self?.userProfile = profile
                    NotificationManager.shared.requestAuthorization()
                    NotificationManager.shared.scheduleDailyReminders(profile: profile)
                }
            }
        }
    }

    func updateSettings(nickname: String, dailyGoal: Int, start: String, end: String) {
        completeOnboarding(nickname: nickname, dailyGoal: dailyGoal, start: start, end: end)
    }

    // MARK: - Sign in with Apple
    func prepareAppleSignInNonce() -> String {
        let nonce = randomNonceString()
        currentNonce = nonce
        return sha256(nonce)
    }

    func handleAppleSignInCompletion(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let error):
            self.errorMessage = error.localizedDescription
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let nonce = currentNonce,
                  let appleIDToken = appleIDCredential.identityToken,
                  let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
                self.errorMessage = "Unable to fetch Apple Identity Token."
                return
            }

            self.isLoading = true
            let credential = OAuthProvider.appleCredential(
                withIDToken: idTokenString,
                rawNonce: nonce,
                fullName: appleIDCredential.fullName
            )

            Auth.auth().signIn(with: credential) { [weak self] authResult, error in
                DispatchQueue.main.async {
                    self?.isLoading = false
                    if let error = error {
                        self?.errorMessage = error.localizedDescription
                        return
                    }

                    // Extract given name if available
                    if let givenName = appleIDCredential.fullName?.givenName, !givenName.isEmpty {
                        self?.userProfile.nickname = givenName
                    }
                }
            }
        }
    }

    // MARK: - Google Sign-In / OAuth
    func signInWithGoogle() {
        self.isLoading = true
        let provider = OAuthProvider(providerID: "google.com")
        provider.getCredentialWith(nil) { [weak self] credential, error in
            guard let self = self else { return }
            if let error = error {
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.errorMessage = error.localizedDescription
                }
                return
            }

            if let credential = credential {
                Auth.auth().signIn(with: credential) { authResult, signInError in
                    DispatchQueue.main.async {
                        self.isLoading = false
                        if let signInError = signInError {
                            self.errorMessage = signInError.localizedDescription
                        }
                    }
                }
            }
        }
    }

    func signOut() {
        do {
            try Auth.auth().signOut()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }

    // MARK: - Nonce Crypto Helpers
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }

        let charset: [Character] =
            Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }
        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            String(format: "%02x", $0)
        }.joined()
        return hashString
    }
}
