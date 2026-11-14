import SwiftUI

@main
struct HydrateApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @StateObject private var authVM = AuthViewModel()
    @StateObject private var hydrationVM = HydrationViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if !authVM.isAuthenticated {
                    SignInView(authVM: authVM)
                } else if !authVM.userProfile.onboardingCompleted {
                    OnboardingView(authVM: authVM)
                } else {
                    DashboardView(authVM: authVM, hydrationVM: hydrationVM)
                }
            }
            .animation(.easeInOut, value: authVM.isAuthenticated)
            .animation(.easeInOut, value: authVM.userProfile.onboardingCompleted)
        }
    }
}
