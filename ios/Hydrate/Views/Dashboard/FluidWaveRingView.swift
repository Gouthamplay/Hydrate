import SwiftUI

struct FluidWaveRingView: View {
    let completedCount: Int
    let dailyGoal: Int
    let progress: Double // 0.0 to 1.0

    @State private var waveOffset: Angle = .zero

    var body: some View {
        ZStack {
            // Background Track Circle
            Circle()
                .stroke(Color.blue.opacity(0.12), lineWidth: 16)
                .frame(width: 210, height: 210)

            // Inner Fluid Wave Fill
            Circle()
                .frame(width: 178, height: 178)
                .foregroundColor(Color.clear)
                .background(
                    WaveShape(progress: CGFloat(progress), waveHeight: 0.04, offset: waveOffset.degrees)
                        .fill(LinearGradient(
                            colors: [Color.cyan.opacity(0.25), Color.blue.opacity(0.35)],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                )
                .clipShape(Circle())

            // Animated Gradient Progress Ring
            Circle()
                .trim(from: 0.0, to: CGFloat(min(1.0, progress)))
                .stroke(
                    AngularGradient(
                        gradient: Gradient(colors: [Color.cyan, Color.blue, Color(red: 0.05, green: 0.5, blue: 0.9), Color.cyan]),
                        center: .center,
                        startAngle: .degrees(-90),
                        endAngle: .degrees(270)
                    ),
                    style: StrokeStyle(lineWidth: 16, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .frame(width: 210, height: 210)
                .animation(.spring(response: 0.6, dampingFraction: 0.75), value: progress)

            // Centered Count & Status
            VStack(spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(completedCount)")
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.05, green: 0.14, blue: 0.24))

                    Text("/ \(dailyGoal)")
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                }

                Text("\(Int(progress * 100))%")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.blue)

                Text(progress >= 1.0 ? "GOAL MET 💧" : "DAILY TARGET")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.8)
                    .foregroundColor(progress >= 1.0 ? .green : .secondary)
                    .padding(.top, 2)
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 3.0).repeatForever(autoreverses: false)) {
                waveOffset = .degrees(360)
            }
        }
    }
}

// Sine wave shape for fluid effect
struct WaveShape: Shape {
    var progress: CGFloat
    var waveHeight: CGFloat
    var offset: Double

    var animatableData: Double {
        get { offset }
        set { offset = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let width = rect.width
        let height = rect.height
        let currentHeight = height * (1 - progress)

        path.move(to: CGPoint(x: 0, y: height))
        path.addLine(to: CGPoint(x: 0, y: currentHeight))

        for x in stride(from: 0, through: width, by: 1) {
            let relativeX = x / 50.0
            let sine = sin(relativeX + CGFloat(offset * .pi / 180.0))
            let y = currentHeight + sine * (waveHeight * height)
            path.addLine(to: CGPoint(x: x, y: y))
        }

        path.addLine(to: CGPoint(x: width, y: height))
        path.closeSubpath()
        return path
    }
}
