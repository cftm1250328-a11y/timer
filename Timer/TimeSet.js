// ===== obniz 設定 =====
const obniz = new Obniz("OBNIZ_ID"); // ←自分のIDに変更
let led;
let blinkTimer = null;

// ===== HTML 要素取得（DOMLoad後）=====
let hourSelect, minuteSelect, startButton, resetButton, customControls, statusElement, timersContainer;

function initializeElements() {
  hourSelect = document.getElementById("hour");
  minuteSelect = document.getElementById("minute");
  startButton = document.getElementById("start");
  resetButton = document.getElementById("reset");
  customControls = document.getElementById("custom-controls");
  statusElement = document.getElementById("obniz-status");
  timersContainer = document.getElementById("timers-container");
  
  if (!hourSelect || !minuteSelect || !startButton || !resetButton || !customControls) {
    console.error("HTML要素が見つかりません");
    return false;
  }
  
  updateConnectionStatus(false); // 初期状態：未接続
  return true;
}

// ===== プロファイル設定（相対時間：分単位）=====
const profiles = {
  "5m": { minutes: 5, name: "5分" },
  "10m": { minutes: 10, name: "10分" },
  "15m": { minutes: 15, name: "15分" },
  "30m": { minutes: 30, name: "30分" },
  "1h": { minutes: 60, name: "1時間" }
};

let currentProfile = null;
let isProfileMode = false;

// ===== プルダウン生成 =====
function generateSelects() {
  if (!hourSelect || !minuteSelect) return;
  
  for (let h = 0; h < 24; h++) {
    hourSelect.appendChild(new Option(h.toString().padStart(2, "0"), h));
  }
  for (let m = 0; m < 60; m++) {
    minuteSelect.appendChild(new Option(m.toString().padStart(2, "0"), m));
  }
}

// ===== タイマー変数 =====
let targetTime = null;
let timerId = null;

// ===== 複数タイマー管理 =====
let timers = {}; // { id: { startTime, endTime, interval, isRunning, isFinished, name } }
let timerCounter = 0;

// ===== obniz 接続 =====
obniz.onconnect = async () => {
  console.log("obniz connected");
  updateConnectionStatus(true);
  led = obniz.wired("LED", { anode: 0, cathode: 1 });
};

obniz.ondisconnect = async () => {
  console.log("obniz disconnected");
  updateConnectionStatus(false);
};

// ===== 接続状況表示更新 =====
function updateConnectionStatus(isConnected) {
  if (!statusElement) return;
  
  if (isConnected) {
    statusElement.textContent = "● 接続中";
    statusElement.className = "status-connected";
    console.log("Status updated: Connected");
  } else {
    statusElement.textContent = "● 未接続";
    statusElement.className = "status-disconnected";
    console.log("Status updated: Disconnected");
  }
}

// ===== プロファイル選択関数 =====
function selectProfile(profileKey) {
  const profile = profiles[profileKey];
  if (!profile) return;

  const now = new Date();
  console.log(`Profile selected: ${profileKey}, Current time: ${now.toLocaleTimeString()}`);
  
  currentProfile = profileKey;
  isProfileMode = true;
  if (customControls) customControls.style.display = "none";
  
  // ボタンのスタイル更新
  updateProfileButtonStyles(profileKey);
  
  // 自動的に計測を開始
  startTimer(profileKey);
}

// ===== プロファイルボタンスタイル更新 =====
function updateProfileButtonStyles(activeKey) {
  Object.keys(profiles).forEach(key => {
    const button = document.getElementById(`profile-${key}`);
    if (button) {
      button.style.backgroundColor = key === activeKey ? "#ff9800" : "#4CAF50";
    }
  });
  const customButton = document.getElementById("profile-custom");
  if (customButton) {
    customButton.style.backgroundColor = "#4CAF50";
  }
}

// ===== イベントリスナー設定 =====
function setupEventListeners() {
  // プロファイルボタン設定
  Object.keys(profiles).forEach(key => {
    const button = document.getElementById(`profile-${key}`);
    if (button) {
      button.addEventListener("click", () => {
        console.log(`Profile selected: ${key}`);
        selectProfile(key);
      });
    }
  });

  // カスタムボタン
  const customButton = document.getElementById("profile-custom");
  if (customButton) {
    customButton.addEventListener("click", () => {
      console.log("Custom mode selected");
      currentProfile = null;
      isProfileMode = false;
      if (customControls) customControls.style.display = "block";
      updateProfileButtonStyles(null);
    });
  }

  // スタートボタン
  if (startButton) {
    startButton.addEventListener("click", () => {
      console.log("Start clicked");
      onStartClick();
    });
  }

  // リセットボタン
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      console.log("Reset clicked");
      onResetClick();
    });
  }
}

// ===== スタート処理 =====
function onStartClick() {
  const now = new Date();
  console.log(`Current time: ${now.toLocaleTimeString()}`);

  if (isProfileMode && currentProfile) {
    // プロファイルモード
    selectProfile(currentProfile);
  } else {
    // カスタムモード：選択した時刻を設定してタイマーを追加
    const hours = Number(hourSelect.value);
    const minutes = Number(minuteSelect.value);
    const name = `${hours}:${minutes.toString().padStart(2, "0")}`;
    
    // 分単位の相対時間に変換
    const totalMinutes = hours * 60 + minutes;
    addTimer(name, totalMinutes);
  }
}

// ===== タイマー開始（プロファイル用） =====
function startTimer(profileKey) {
  const now = new Date();
  const profile = profiles[profileKey];
  
  if (!profile) return;
  
  console.log(`Starting timer: ${profileKey} (${profile.minutes} minutes)`);
  
  // 新しいタイマーを追加
  addTimer(profile.name, profile.minutes);
}

// ===== リセット処理 =====
function onResetClick() {
  clearAllTimers();
  currentProfile = null;
  isProfileMode = false;
  if (customControls) customControls.style.display = "none";
  updateProfileButtonStyles(null);
  stopBlink();
}

// ===== タイマー追加 =====
function addTimer(name, minutes) {
  const now = new Date();
  const endTime = new Date(now.getTime() + minutes * 60 * 1000);
  const timerId = ++timerCounter;
  
  timers[timerId] = {
    id: timerId,
    name: name,
    startTime: now,
    endTime: endTime,
    isRunning: true,
    isFinished: false,
    interval: null
  };
  
  console.log(`Timer added: ${timerId} - ${name} (${minutes} minutes)`);
  
  // 画面に表示
  renderTimer(timerId);
  
  // 更新タイマーを開始
  startTimerUpdate(timerId);
  
  return timerId;
}

// ===== タイマー削除 =====
function deleteTimer(timerId) {
  if (!timers[timerId]) return;
  
  if (timers[timerId].interval) {
    clearInterval(timers[timerId].interval);
  }
  
  delete timers[timerId];
  
  const timerElement = document.getElementById(`timer-${timerId}`);
  if (timerElement) {
    timerElement.remove();
  }
  
  console.log(`Timer deleted: ${timerId}`);
  
  // すべてのタイマーが削除されたらLEDを止める
  if (Object.keys(timers).length === 0) {
    stopBlink();
  }
}

// ===== すべてのタイマーをクリア =====
function clearAllTimers() {
  Object.keys(timers).forEach(timerId => {
    if (timers[timerId].interval) {
      clearInterval(timers[timerId].interval);
    }
  });
  timers = {};
  timerCounter = 0;
  
  if (timersContainer) {
    timersContainer.innerHTML = "";
  }
  
  console.log("All timers cleared");
}

// ===== タイマー表示 =====
function renderTimer(timerId) {
  if (!timersContainer || !timers[timerId]) return;
  
  const timer = timers[timerId];
  
  const timerCard = document.createElement("div");
  timerCard.className = "timer-card";
  timerCard.id = `timer-${timerId}`;
  
  timerCard.innerHTML = `
    <h3>${timer.name}</h3>
    <div class="timer-display" id="timer-display-${timerId}">00:00</div>
    <div class="timer-buttons">
      <button class="timer-stop-btn" onclick="toggleTimer(${timerId})">一時停止</button>
      <button class="timer-delete-btn" onclick="deleteTimer(${timerId})">削除</button>
    </div>
  `;
  
  timersContainer.appendChild(timerCard);
}

// ===== タイマー更新開始 =====
function startTimerUpdate(timerId) {
  if (!timers[timerId]) return;
  
  timers[timerId].interval = setInterval(() => {
    updateTimerDisplay(timerId);
  }, 1000);
  
  // 初回表示
  updateTimerDisplay(timerId);
}

// ===== タイマー表示更新 =====
function updateTimerDisplay(timerId) {
  if (!timers[timerId]) return;
  
  const timer = timers[timerId];
  const now = new Date();
  const diff = timer.endTime - now;
  
  const displayElement = document.getElementById(`timer-display-${timerId}`);
  const timerCard = document.getElementById(`timer-${timerId}`);
  
  if (!displayElement || !timerCard) return;
  
  if (diff <= 0) {
    // タイマー終了
    displayElement.textContent = "00:00";
    timerCard.classList.add("finished");
    timer.isFinished = true;
    timer.isRunning = false;
    
    if (timers[timerId].interval) {
      clearInterval(timers[timerId].interval);
    }
    
    startBlink(); // LED点滅開始
    console.log(`Timer finished: ${timerId}`);
    return;
  }
  
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  displayElement.textContent = 
    `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// ===== タイマー一時停止/再開 =====
function toggleTimer(timerId) {
  if (!timers[timerId]) return;
  
  const timer = timers[timerId];
  const button = event.target;
  
  if (timer.isRunning) {
    // 一時停止
    if (timer.interval) {
      clearInterval(timer.interval);
    }
    timer.isRunning = false;
    button.textContent = "再開";
    button.style.backgroundColor = "#4CAF50";
  } else {
    // 再開
    timer.isRunning = true;
    button.textContent = "一時停止";
    button.style.backgroundColor = "#ff9800";
    startTimerUpdate(timerId);
  }
}

// ===== LED 点滅開始 =====
function startBlink() {
  if (!led) return;

  let on = false;
  blinkTimer = setInterval(() => {
    on ? led.off() : led.on();
    on = !on;
  }, 500); // 0.5秒ごとに点滅
}

// ===== LED 点滅停止 =====
function stopBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }
  if (led) led.off();
}

// ===== 初期化処理（DOM読み込み完了後） =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing Timer App");
  
  if (initializeElements()) {
    generateSelects();
    setupEventListeners();
    console.log("Timer App ready");
  }
});
