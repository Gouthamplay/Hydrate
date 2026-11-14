import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Configuration from User Project
const firebaseConfig = {
  apiKey: "AIzaSyDFLFV11hX5XfT8pvR5iCYx2qx0KucOUus",
  authDomain: "studio-5007150230-180ab.firebaseapp.com",
  projectId: "studio-5007150230-180ab",
  storageBucket: "studio-5007150230-180ab.firebasestorage.app",
  messagingSenderId: "578822047072",
  appId: "1:578822047072:web:bdde3b90a22cedf02c0a05"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

// App State
let currentUser = null;
let currentProfile = {
  nickname: "Friend",
  dailyGoal: 8,
  reminderStart: "07:00",
  reminderEnd: "21:00",
  onboardingCompleted: false
};
let todayData = {
  completedCount: 0,
  goalMet: false,
  records: []
};

let unsubProfile = null;
let unsubToday = null;

// UI Elements
const landingView = document.getElementById("landingView");
const dashboardView = document.getElementById("dashboardView");
const authPill = document.getElementById("authPill");
const authPillAvatar = document.getElementById("authPillAvatar");
const authPillText = document.getElementById("authPillText");
const authSyncDot = document.getElementById("authSyncDot");
const quickThemeBtn = document.getElementById("quickThemeBtn");
const quickThemeIcon = document.getElementById("quickThemeIcon");

// Modals
const authModal = document.getElementById("authModal");
const closeAuthModal = document.getElementById("closeAuthModal");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const appleSignInBtn = document.getElementById("appleSignInBtn");
const authErrorMsg = document.getElementById("authErrorMsg");

const downloadModal = document.getElementById("downloadModal");
const navDownloadBtn = document.getElementById("navDownloadBtn");
const landingDownloadBtn = document.getElementById("landingDownloadBtn");
const footerDownloadBtn = document.getElementById("footerDownloadBtn");
const closeDownloadModal = document.getElementById("closeDownloadModal");
const doneDownloadModal = document.getElementById("doneDownloadModal");

const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const signOutBtn = document.getElementById("signOutBtn");

// Onboarding Elements
const onboardingModal = document.getElementById("onboardingModal");
const onboardStep1 = document.getElementById("onboardStep1");
const onboardStep2 = document.getElementById("onboardStep2");
const onboardStep3 = document.getElementById("onboardStep3");
const dotStep1 = document.getElementById("dotStep1");
const dotStep2 = document.getElementById("dotStep2");
const dotStep3 = document.getElementById("dotStep3");
const onboardNickname = document.getElementById("onboardNickname");
const toStep2Btn = document.getElementById("toStep2Btn");
const toStep3Btn = document.getElementById("toStep3Btn");
const backToStep1Btn = document.getElementById("backToStep1Btn");
const backToStep2Btn = document.getElementById("backToStep2Btn");
const finishOnboardingBtn = document.getElementById("finishOnboardingBtn");
const customGoalValue = document.getElementById("customGoalValue");
const decGoalBtn = document.getElementById("decGoalBtn");
const incGoalBtn = document.getElementById("incGoalBtn");
const routineStart = document.getElementById("routineStart");
const routineEnd = document.getElementById("routineEnd");

// Dashboard Elements
const userNicknameEl = document.getElementById("userNickname");
const todayDateEl = document.getElementById("todayDate");
const proximityBanner = document.getElementById("proximityBanner");
const mainRingProgress = document.getElementById("mainRingProgress");
const mainScoreText = document.getElementById("mainScoreText");
const mainGoalText = document.getElementById("mainGoalText");
const mainPercentText = document.getElementById("mainPercentText");
const logWaterBtn = document.getElementById("logWaterBtn");
const undoBtn = document.getElementById("undoBtn");
const windowCaption = document.getElementById("windowCaption");
const loggedMomentsCount = document.getElementById("loggedMomentsCount");
const momentsList = document.getElementById("momentsList");
const streakCount = document.getElementById("streakCount");
const calendarGrid = document.getElementById("calendarGrid");
const toast = document.getElementById("toast");

// Landing Demo Elements
const demoRingProgress = document.getElementById("demoRingProgress");
const demoRingCount = document.getElementById("demoRingCount");
const demoRingLabel = document.getElementById("demoRingLabel");
const demoRingNote = document.getElementById("demoRingNote");
const demoCheckInBtn = document.getElementById("demoCheckInBtn");
const landingSignInBtn = document.getElementById("landingSignInBtn");

let demoScore = 5;
const demoGoal = 8;

// Utilities
function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

// -------------------------------------------------------------
// Interactive Landing Page Demo
// -------------------------------------------------------------
function updateDemoRing() {
  const pct = Math.min(100, Math.round((demoScore / demoGoal) * 100));
  demoRingCount.innerHTML = `${demoScore} <small>/ ${demoGoal}</small>`;
  demoRingLabel.textContent = `${pct}% of daily goal`;
  const circumference = 440; // 2 * PI * 70
  const offset = circumference - (circumference * pct) / 100;
  demoRingProgress.style.strokeDashoffset = offset;

  if (demoScore >= demoGoal) {
    demoRingNote.textContent = "🎉 Daily target reached! Proximity met.";
  } else {
    demoRingNote.textContent = `${demoGoal - demoScore} more check-ins to reach today's target!`;
  }
}

if (demoCheckInBtn) {
  demoCheckInBtn.addEventListener("click", () => {
    if (demoScore >= demoGoal) {
      demoScore = 1;
    } else {
      demoScore += 1;
    }
    updateDemoRing();
  });
}

// -------------------------------------------------------------
// Navigation & Modals
// -------------------------------------------------------------
function openModal(modal) {
  if (modal && typeof modal.showModal === "function") {
    modal.showModal();
  }
}

function closeModal(modal) {
  if (modal && typeof modal.close === "function") {
    modal.close();
  }
}

// Download Modal Triggers
[navDownloadBtn, landingDownloadBtn, footerDownloadBtn].forEach(btn => {
  if (btn) btn.addEventListener("click", () => openModal(downloadModal));
});
if (closeDownloadModal) closeDownloadModal.addEventListener("click", () => closeModal(downloadModal));
if (doneDownloadModal) doneDownloadModal.addEventListener("click", () => closeModal(downloadModal));

// Auth Modal Triggers
if (landingSignInBtn) landingSignInBtn.addEventListener("click", () => openModal(authModal));
if (authPill) {
  authPill.addEventListener("click", () => {
    if (currentUser) {
      // Open settings / profile
      populateSettingsModal();
      openModal(settingsModal);
    } else {
      openModal(authModal);
    }
  });
}
if (closeAuthModal) closeAuthModal.addEventListener("click", () => closeModal(authModal));
if (closeSettingsModal) closeSettingsModal.addEventListener("click", () => closeModal(settingsModal));

// Theme Toggle
if (quickThemeBtn) {
  quickThemeBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("hydrate-theme", next);
    quickThemeIcon.textContent = next === "dark" ? "🌙" : "☀️";
  });
}

// -------------------------------------------------------------
// Authentication Flow (Google & Apple)
// -------------------------------------------------------------
async function handleSocialSignIn(provider) {
  try {
    authErrorMsg.hidden = true;
    const result = await signInWithPopup(auth, provider);
    closeModal(authModal);
    showToast(`Signed in as ${result.user.displayName || result.user.email}`);
  } catch (err) {
    console.error("Auth error:", err);
    authErrorMsg.textContent = err.message || "Failed to sign in. Please try again.";
    authErrorMsg.hidden = false;
  }
}

if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", () => handleSocialSignIn(googleProvider));
}

if (appleSignInBtn) {
  appleSignInBtn.addEventListener("click", () => handleSocialSignIn(appleProvider));
}

if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await signOut(auth);
    closeModal(settingsModal);
    showToast("Signed out");
  });
}

// -------------------------------------------------------------
// Onboarding 3-Step Flow
// -------------------------------------------------------------
let selectedGoal = 8;

document.querySelectorAll(".goal-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".goal-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    selectedGoal = parseInt(chip.dataset.goal, 10);
    customGoalValue.textContent = selectedGoal;
  });
});

if (decGoalBtn) {
  decGoalBtn.addEventListener("click", () => {
    if (selectedGoal > 2) {
      selectedGoal -= 1;
      customGoalValue.textContent = selectedGoal;
      highlightGoalChip(selectedGoal);
    }
  });
}

if (incGoalBtn) {
  incGoalBtn.addEventListener("click", () => {
    if (selectedGoal < 24) {
      selectedGoal += 1;
      customGoalValue.textContent = selectedGoal;
      highlightGoalChip(selectedGoal);
    }
  });
}

function highlightGoalChip(goal) {
  document.querySelectorAll(".goal-chip").forEach(chip => {
    if (parseInt(chip.dataset.goal, 10) === goal) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

function showOnboardingStep(step) {
  onboardStep1.hidden = step !== 1;
  onboardStep2.hidden = step !== 2;
  onboardStep3.hidden = step !== 3;

  dotStep1.classList.toggle("active", step >= 1);
  dotStep2.classList.toggle("active", step >= 2);
  dotStep3.classList.toggle("active", step >= 3);
}

if (toStep2Btn) {
  toStep2Btn.addEventListener("click", () => {
    if (!onboardNickname.value.trim()) {
      onboardNickname.value = currentUser?.displayName?.split(" ")[0] || "Friend";
    }
    showOnboardingStep(2);
  });
}

if (backToStep1Btn) backToStep1Btn.addEventListener("click", () => showOnboardingStep(1));
if (toStep3Btn) toStep3Btn.addEventListener("click", () => showOnboardingStep(3));
if (backToStep2Btn) backToStep2Btn.addEventListener("click", () => showOnboardingStep(2));

if (finishOnboardingBtn) {
  finishOnboardingBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const nickname = onboardNickname.value.trim() || "Friend";
    const start = routineStart.value || "07:00";
    const end = routineEnd.value || "21:00";

    const profileData = {
      nickname: nickname,
      dailyGoal: selectedGoal,
      reminderStart: start,
      reminderEnd: end,
      onboardingCompleted: true,
      email: currentUser.email || "",
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), profileData, { merge: true });
      closeModal(onboardingModal);
      showToast(`Welcome, ${nickname}! Ready to track.`);
    } catch (err) {
      console.error("Save profile error:", err);
      showToast("Error saving setup. Please check connection.");
    }
  });
}

// -------------------------------------------------------------
// Real-time Firestore Listeners
// -------------------------------------------------------------
onAuthStateChanged(auth, user => {
  currentUser = user;

  // Cleanup old listeners
  if (unsubProfile) unsubProfile();
  if (unsubToday) unsubToday();

  if (user) {
    // Logged in UI state
    landingView.hidden = true;
    dashboardView.hidden = false;
    authSyncDot.hidden = false;

    authPillAvatar.textContent = user.photoURL ? "" : "👤";
    if (user.photoURL) {
      authPillAvatar.innerHTML = `<img src="${user.photoURL}" style="width:16px;height:16px;border-radius:50%;display:block">`;
    }
    authPillText.textContent = user.displayName?.split(" ")[0] || "Account";

    // Attach Profile Listener
    const profileRef = doc(db, "users", user.uid, "profile", "main");
    unsubProfile = onSnapshot(profileRef, snap => {
      if (snap.exists()) {
        currentProfile = snap.data();
        if (!currentProfile.onboardingCompleted) {
          // Trigger onboarding
          onboardNickname.value = user.displayName?.split(" ")[0] || "";
          showOnboardingStep(1);
          openModal(onboardingModal);
        } else {
          renderUserProfile();
        }
      } else {
        // First time user: show onboarding
        onboardNickname.value = user.displayName?.split(" ")[0] || "";
        showOnboardingStep(1);
        openModal(onboardingModal);
      }
    });

    // Attach Today Check-in Listener
    const todayKey = getTodayKey();
    const todayRef = doc(db, "users", user.uid, "checkins", todayKey);
    unsubToday = onSnapshot(todayRef, snap => {
      if (snap.exists()) {
        todayData = snap.data();
      } else {
        todayData = { completedCount: 0, goalMet: false, records: [] };
      }
      renderDashboard();
    });

    // Render Calendar History
    loadCalendarHistory();

    // Schedule subtle notifications
    initPersonalizedNotifications();

  } else {
    // Logged out UI state
    landingView.hidden = false;
    dashboardView.hidden = true;
    authSyncDot.hidden = true;
    authPillAvatar.textContent = "👤";
    authPillText.textContent = "Sign in";
  }
});

// -------------------------------------------------------------
// Dashboard Rendering & Goal Proximity Feedback
// -------------------------------------------------------------
function renderUserProfile() {
  userNicknameEl.textContent = currentProfile.nickname || "Friend";
  mainGoalText.textContent = `/ ${currentProfile.dailyGoal || 8}`;
  windowCaption.textContent = `Routine: ${formatTime(currentProfile.reminderStart)} – ${formatTime(currentProfile.reminderEnd)}`;
  renderDashboard();
}

function formatTime(str) {
  if (!str) return "";
  const [h, m] = str.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${m} ${ampm}`;
}

function renderDashboard() {
  const goal = currentProfile.dailyGoal || 8;
  const count = todayData.completedCount || 0;
  const nickname = currentProfile.nickname || "Friend";
  const pct = Math.min(100, Math.round((count / goal) * 100));

  // Date Header
  const d = new Date();
  const options = { weekday: "long", month: "short", day: "numeric" };
  todayDateEl.textContent = d.toLocaleDateString(undefined, options);

  // Score & Ring
  mainScoreText.innerHTML = `${count} <small id="mainGoalText">/ ${goal}</small>`;
  mainPercentText.textContent = `${pct}%`;

  const circumference = 553; // 2 * PI * 88
  const offset = circumference - (circumference * pct) / 100;
  mainRingProgress.style.strokeDashoffset = offset;

  // Dynamic Goal Proximity Messages (No volume tracking!)
  if (count === 0) {
    proximityBanner.textContent = `0 of ${goal} check-ins — Let's start hydrating, ${nickname}! 💧`;
  } else if (count < Math.ceil(goal / 2)) {
    proximityBanner.textContent = `${count} of ${goal} check-ins — Great start, ${nickname}!`;
  } else if (count < goal - 1) {
    proximityBanner.textContent = `${count} of ${goal} check-ins — Halfway there, keep going!`;
  } else if (count === goal - 1) {
    proximityBanner.textContent = `Just 1 more check-in to reach today's goal, ${nickname}! 🎯`;
  } else if (count === goal) {
    proximityBanner.textContent = `Goal reached! 💧 Awesome consistency today, ${nickname}!`;
  } else {
    proximityBanner.textContent = `Goal exceeded! ${count} check-ins completed today, superstar! 🌟`;
  }

  // Moments List
  const records = todayData.records || [];
  loggedMomentsCount.textContent = `${records.length} logged`;

  if (records.length === 0) {
    momentsList.innerHTML = `<p class="empty-moments">No check-ins logged yet today. Take a sip and tap above!</p>`;
    undoBtn.hidden = true;
  } else {
    undoBtn.hidden = false;
    // Show newest first
    const sorted = [...records].reverse();
    momentsList.innerHTML = sorted.map(r => {
      const timeStr = new Date(r.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const sourceBadge = r.source === "ios_notification"
        ? "🔔 Lock Screen"
        : r.source === "ios_app"
        ? "📱 iOS App"
        : "💻 Web";
      return `
        <div class="moment-item">
          <div class="moment-left">
            <span>💧 Hydration check-in</span>
            <span class="moment-source">${sourceBadge}</span>
          </div>
          <span class="moment-time">${timeStr}</span>
        </div>
      `;
    }).join("");
  }
}

// -------------------------------------------------------------
// Logging Water Drink (1-Tap Accountability)
// -------------------------------------------------------------
if (logWaterBtn) {
  logWaterBtn.addEventListener("click", async () => {
    if (!currentUser) {
      openModal(authModal);
      return;
    }

    const todayKey = getTodayKey();
    const newCount = (todayData.completedCount || 0) + 1;
    const goal = currentProfile.dailyGoal || 8;

    const newRecord = {
      id: "rec_" + Date.now(),
      timestamp: new Date().toISOString(),
      source: "web",
      status: "yes"
    };

    try {
      const docRef = doc(db, "users", currentUser.uid, "checkins", todayKey);
      await setDoc(docRef, {
        completedCount: newCount,
        goalMet: newCount >= goal,
        records: arrayUnion(newRecord)
      }, { merge: true });

      showToast(`💧 Check-in recorded! (${newCount} / ${goal})`);
    } catch (err) {
      console.error("Error logging check-in:", err);
      showToast("Could not record check-in. Check your connection.");
    }
  });
}

// Undo last drink
if (undoBtn) {
  undoBtn.addEventListener("click", async () => {
    if (!currentUser || !todayData.records?.length) return;

    const records = [...todayData.records];
    records.pop();
    const newCount = Math.max(0, records.length);
    const goal = currentProfile.dailyGoal || 8;
    const todayKey = getTodayKey();

    try {
      const docRef = doc(db, "users", currentUser.uid, "checkins", todayKey);
      await setDoc(docRef, {
        completedCount: newCount,
        goalMet: newCount >= goal,
        records: records
      }, { merge: true });

      showToast("Undone last check-in");
    } catch (err) {
      console.error("Undo error:", err);
    }
  });
}

// -------------------------------------------------------------
// Calendar History & Streak Calculation
// -------------------------------------------------------------
async function loadCalendarHistory() {
  if (!currentUser) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  try {
    const checkinsCol = collection(db, "users", currentUser.uid, "checkins");
    const snap = await getDocs(checkinsCol);

    const checkinMap = {};
    let streak = 0;

    snap.forEach(d => {
      checkinMap[d.id] = d.data();
    });

    // Render 30 days grid
    let gridHTML = "";
    const todayDate = now.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = checkinMap[dayKey];
      const isToday = day === todayDate;
      const isGoalMet = record && record.goalMet;

      gridHTML += `
        <div class="cal-day ${isToday ? "today" : ""} ${isGoalMet ? "goal-met" : ""}">
          <span>${day}</span>
        </div>
      `;
    }

    if (calendarGrid) calendarGrid.innerHTML = gridHTML;

    // Calculate Streak
    let checkDate = new Date();
    while (true) {
      const k = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if (checkinMap[k]?.goalMet) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    if (streakCount) streakCount.textContent = streak;

  } catch (err) {
    console.error("Calendar load error:", err);
  }
}

// -------------------------------------------------------------
// Settings Modal
// -------------------------------------------------------------
function populateSettingsModal() {
  document.getElementById("editNickname").value = currentProfile.nickname || "";
  document.getElementById("editGoal").value = currentProfile.dailyGoal || 8;
  document.getElementById("editStart").value = currentProfile.reminderStart || "07:00";
  document.getElementById("editEnd").value = currentProfile.reminderEnd || "21:00";
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const nickname = document.getElementById("editNickname").value.trim() || "Friend";
    const goal = parseInt(document.getElementById("editGoal").value, 10) || 8;
    const start = document.getElementById("editStart").value || "07:00";
    const end = document.getElementById("editEnd").value || "21:00";

    try {
      await updateDoc(doc(db, "users", currentUser.uid, "profile", "main"), {
        nickname: nickname,
        dailyGoal: goal,
        reminderStart: start,
        reminderEnd: end
      });
      closeModal(settingsModal);
      showToast("Settings updated");
    } catch (err) {
      console.error("Update settings error:", err);
      showToast("Error updating settings.");
    }
  });
}

// -------------------------------------------------------------
// Personalized Web Notifications
// -------------------------------------------------------------
function initPersonalizedNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    // Request permission gently after user interacts
    setTimeout(() => {
      Notification.requestPermission();
    }, 4000);
  }
}

// Trigger initial demo ring update
updateDemoRing();
