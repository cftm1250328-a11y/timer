// ===== obniz 設定 =====
const obniz = new Obniz("OBNIZ_ID"); // ←自分のIDに変更
let led;
let blinkTimer = null;

// ===== HTML 要素 =====
const hourSelect = document.getElementById("hour");
const minuteSelect = document.getElementById("minute");
const startButton = document.getElementById("start");
const resetButton = document.getElementById("reset");
const display = document.getElementById("timer-display");
display.textContent = "00:00:00";

// ===== プルダウン生成 =====
for (let h = 0; h < 24; h++) {
  hourSelect.appendChild(new Option(h.toString().padStart(2, "0"), h));
}
for (let m = 0; m < 60; m++) {
  minuteSelect.appendChild(new Option(m.toString().padStart(2, "0"), m));
}

// ===== タイマー変数 =====
let targetTime = null;
let timerId = null;

// ===== obniz 接続 =====
obniz.onconnect = async () => {
  led = obniz.wired("LED", { anode: 0, cathode: 1 });
};

// ===== スタート =====
startButton.addEventListener("click", () => {
  const now = new Date();

  targetTime = new Date();
  targetTime.setHours(Number(hourSelect.value));
  targetTime.setMinutes(Number(minuteSelect.value));
  targetTime.setSeconds(0);

  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  stopBlink(); // 念のため止める

  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
  updateTimer();
});

// ===== リセット =====
resetButton.addEventListener("click", () => {
  clearInterval(timerId);
  timerId = null;
  targetTime = null;
  display.textContent = "00:00:00";
  stopBlink();
});
// ===== タイマー更新 =====
function updateTimer() {
  const now = new Date();
  const diff = targetTime - now;

  if (diff <= 0) {
    display.textContent = "⏰ じかんだよ！";
    clearInterval(timerId);
    startBlink();
    return;
  }

  const sec = Math.floor(diff / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  display.textContent =
    `${h.toString().padStart(2, "0")}:` +
    `${m.toString().padStart(2, "0")}:` +
    `${s.toString().padStart(2, "0")}`;
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
