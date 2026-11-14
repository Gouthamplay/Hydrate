import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @ObservedObject var authVM: AuthViewModel

    var body: some View {
        ZStack {
            // Background Gradient
            LinearGradient(
                colors: [Color(red: 0.94, green: 0.97, blue: 1.0), Color(red: 0.88, green: 0.95, blue: 0.99)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // App Hero Icon & Typography
                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .fill(LinearGradient(colors: [Color.blue.opacity(0.15), Color.cyan.opacity(0.25)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 96, height: 96)
                            .overlay(
                                RoundedRectangle(cornerRadius: 28, style: .continuous)
                                    .stroke(Color.blue.opacity(0.2), lineWidth: 1)
                            )

                        Image(systemName: "drop.fill")
                            .font(.system(size: 46))
                            .foregroundStyle(LinearGradient(colors: [Color.cyan, Color.blue], startPoint: .top, endPoint: .bottom))
                    }

                    VStack(spacing: 6) {
                        Text("hydrate.")
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))

                        Text("Mindful drinking. Zero friction.")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }

                // Value Highlights Card
                VStack(alignment: .leading, spacing: 14) {
                    FeatureRow(icon: "bolt.fill", title: "Live Real-Time Sync", subtitle: "Instant sync between iPhone and web dashboard")
                    FeatureRow(icon: "target", title: "Accountability Focus", subtitle: "Target daily check-ins without volume typing")
                    FeatureRow(icon: "bell.badge.fill", title: "Lock-Screen Logging", subtitle: "1-tap interactive [Yes] & [No] notification actions")
                }
                .padding(20)
                .background(Color.white.opacity(0.85))
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .shadow(color: Color.black.opacity(0.04), radius: 16, x: 0, y: 6)
                .padding(.horizontal, 24)

                Spacer()

                // Authentication Action Buttons (Zero email verification!)
                VStack(spacing: 12) {
                    // Sign in with Apple Button
                    SignInWithAppleButton(
                        .continue,
                        onRequest: { request in
                            request.requestedScopes = [.fullName, .email]
                            request.nonce = authVM.prepareAppleSignInNonce()
                        },
                        onCompletion: { result in
                            authVM.handleAppleSignInCompletion(result)
                        }
                    )
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 52)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    // Sign in with Google Button
                    Button(action: {
                        authVM.signInWithGoogle()
                    }) {
                        HStack(spacing: 10) {
                            Image(systemName: "g.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.red)

                            Text("Continue with Google")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color.gray.opacity(0.25), lineWidth: 1)
                        )
                        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
                    }

                    if let error = authVM.errorMessage {
                        Text(error)
                            .font(.system(size: 12))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.top, 4)
                    }

                    Text("By continuing, your data syncs securely with Firebase.")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
            }

            if authVM.isLoading {
                Color.black.opacity(0.2)
                    .ignoresSafeArea()
                ProgressView()
                    .scaleEffect(1.3)
                    .padding(24)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.blue)
                .frame(width: 28, height: 28)
                .background(Color.blue.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
    }
}
