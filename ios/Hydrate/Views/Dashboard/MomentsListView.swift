import SwiftUI

struct MomentsListView: View {
    let records: [CheckInRecord]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TODAY'S ACTIVITY")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.secondary)
                    Text("Logged Moments")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.primary)
                }

                Spacer()

                Text("\(records.count) logged")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.blue)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .clipShape(Capsule())
            }

            if records.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "drop")
                        .font(.system(size: 28))
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No check-ins yet today.\nTake a sip and tap above!")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                VStack(spacing: 8) {
                    ForEach(records.reversed()) { record in
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(Color.blue.opacity(0.12))
                                    .frame(width: 32, height: 32)
                                Image(systemName: "drop.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(.blue)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Hydration check-in")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.primary)

                                HStack(spacing: 4) {
                                    Image(systemName: record.sourceIcon)
                                        .font(.system(size: 10))
                                    Text(record.sourceLabel)
                                        .font(.system(size: 11))
                                }
                                .foregroundColor(.secondary)
                            }

                            Spacer()

                            Text(record.formattedTime)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(12)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 1)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(red: 0.98, green: 0.99, blue: 1.0))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.gray.opacity(0.12), lineWidth: 1)
        )
    }
}
