(function () {
  const STORAGE_KEYS = {
    theme: "trainingTimer.theme",
    sound: "trainingTimer.sound",
    wakeLock: "trainingTimer.wakeLock",
    duration: "trainingTimer.duration",
  };

  const elements = {
    themeToggle: document.getElementById("themeToggle"),
    stopwatchMode: document.getElementById("stopwatchMode"),
    timerMode: document.getElementById("timerMode"),
    modeLabel: document.getElementById("modeLabel"),
    timerDisplay: document.getElementById("timerDisplay"),
    statusText: document.getElementById("statusText"),
    timerSettings: document.getElementById("timerSettings"),
    durationInput: document.getElementById("durationInput"),
    btnLap: document.getElementById("btnLap"),
    btnStartStop: document.getElementById("btnStartStop"),
    btnReset: document.getElementById("btnReset"),
    lapsSection: document.getElementById("lapsSection"),
    pulseDot: document.getElementById("pulseDot"),
    soundToggle: document.getElementById("soundToggle"),
    wakeLockToggle: document.getElementById("wakeLockToggle"),
    presetButtons: Array.from(document.querySelectorAll(".preset-button")),
  };

  const state = {
    mode: "stopwatch",
    running: false,
    startTime: 0,
    elapsed: 0,
    duration: 90 * 1000,
    laps: [],
    lastLapTime: 0,
    frameId: null,
    wakeLock: null,
    audioContext: null,
  };

  function readBoolean(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  }

  function clampDuration(seconds) {
    const parsed = Number.parseInt(seconds, 10);
    if (!Number.isFinite(parsed)) {
      return 90;
    }
    return Math.min(5999, Math.max(5, parsed));
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }

  function formatTime(ms, includeCentiseconds) {
    const safeMs = Math.max(0, ms);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((safeMs % 1000) / 10);
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    const cs = String(centiseconds).padStart(2, "0");

    return includeCentiseconds
      ? `${mm}:${ss}<span class="milliseconds">.${cs}</span>`
      : `${mm}:${ss}`;
  }

  function currentElapsed() {
    return state.running ? Date.now() - state.startTime + state.elapsed : state.elapsed;
  }

  function timerRemaining() {
    return Math.max(0, state.duration - currentElapsed());
  }

  function updateDisplay() {
    const isStopwatch = state.mode === "stopwatch";
    const value = isStopwatch ? currentElapsed() : timerRemaining();
    const warning = !isStopwatch && state.running && value <= 10000;

    elements.timerDisplay.innerHTML = formatTime(value, isStopwatch);
    elements.timerDisplay.classList.toggle("warning", warning);
    elements.timerDisplay.classList.toggle("done", !isStopwatch && value === 0 && !state.running);

    if (!isStopwatch && state.running && value <= 0) {
      finishTimer();
      return;
    }

    if (state.running) {
      state.frameId = requestAnimationFrame(updateDisplay);
    }
  }

  function updateButtons() {
    const isStopwatch = state.mode === "stopwatch";

    elements.btnStartStop.textContent = state.running ? "Stop" : "Start";
    elements.btnStartStop.classList.toggle("running", state.running);
    elements.btnReset.disabled = state.running && isStopwatch ? true : state.elapsed === 0 && state.laps.length === 0;
    elements.btnLap.disabled = !state.running || !isStopwatch;
    elements.pulseDot.classList.toggle("active", state.running);
    elements.statusText.textContent = getStatusText();
  }

  function getStatusText() {
    if (state.mode === "stopwatch") {
      if (state.running) return "Pomiar trwa";
      return state.elapsed > 0 ? "Pauza" : "Gotowy";
    }

    if (state.running) return "Przerwa trwa";
    if (state.elapsed >= state.duration) return "Koniec przerwy";
    return state.elapsed > 0 ? "Pauza" : "Gotowy do przerwy";
  }

  async function requestWakeLock() {
    if (!elements.wakeLockToggle.checked || !("wakeLock" in navigator)) {
      return;
    }

    try {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", function () {
        state.wakeLock = null;
      });
    } catch (_error) {
      state.wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    if (!state.wakeLock) {
      return;
    }

    try {
      await state.wakeLock.release();
    } finally {
      state.wakeLock = null;
    }
  }

  function start() {
    if (state.running) {
      return;
    }

    if (state.mode === "timer" && state.elapsed >= state.duration) {
      state.elapsed = 0;
    }

    state.running = true;
    state.startTime = Date.now();
    requestWakeLock();
    updateButtons();
    updateDisplay();
  }

  function stop() {
    if (!state.running) {
      return;
    }

    state.elapsed += Date.now() - state.startTime;
    state.running = false;
    cancelFrame();
    releaseWakeLock();
    updateButtons();
    updateDisplay();
  }

  function reset() {
    state.running = false;
    state.startTime = 0;
    state.elapsed = 0;
    state.laps = [];
    state.lastLapTime = 0;
    cancelFrame();
    releaseWakeLock();
    elements.lapsSection.innerHTML = "";
    updateButtons();
    updateDisplay();
  }

  function cancelFrame() {
    if (state.frameId !== null) {
      cancelAnimationFrame(state.frameId);
      state.frameId = null;
    }
  }

  function addLap() {
    if (!state.running || state.mode !== "stopwatch") {
      return;
    }

    const current = currentElapsed();
    const lapTime = current - state.lastLapTime;
    state.lastLapTime = current;
    state.laps.push({ total: current, lap: lapTime });

    const lapNumber = state.laps.length;
    const lapElement = document.createElement("div");
    lapElement.className = "lap-item";
    lapElement.innerHTML = [
      `<span class="lap-number">#${String(lapNumber).padStart(2, "0")}</span>`,
      `<span class="lap-diff">+${formatTime(lapTime, true).replace(/<\/?span[^>]*>/g, "")}</span>`,
      `<span class="lap-time">${formatTime(current, true).replace(/<\/?span[^>]*>/g, "")}</span>`,
    ].join("");

    elements.lapsSection.prepend(lapElement);
  }

  function switchMode(mode) {
    if (state.mode === mode) {
      return;
    }

    reset();
    state.mode = mode;
    const isTimer = mode === "timer";
    elements.stopwatchMode.classList.toggle("active", !isTimer);
    elements.timerMode.classList.toggle("active", isTimer);
    elements.stopwatchMode.setAttribute("aria-pressed", String(!isTimer));
    elements.timerMode.setAttribute("aria-pressed", String(isTimer));
    elements.timerSettings.hidden = !isTimer;
    elements.lapsSection.hidden = isTimer;
    elements.modeLabel.textContent = isTimer ? "Minutnik" : "Stoper";
    updateButtons();
    updateDisplay();
  }

  function setDuration(seconds) {
    const clamped = clampDuration(seconds);
    state.duration = clamped * 1000;
    elements.durationInput.value = String(clamped);
    localStorage.setItem(STORAGE_KEYS.duration, String(clamped));
    elements.presetButtons.forEach(function (button) {
      button.classList.toggle("active", Number(button.dataset.minutes) * 60 === clamped);
    });

    if (state.mode === "timer" && !state.running) {
      state.elapsed = 0;
      updateButtons();
      updateDisplay();
    }
  }

  function finishTimer() {
    state.elapsed = state.duration;
    state.running = false;
    cancelFrame();
    releaseWakeLock();
    playDoneSound();
    if ("vibrate" in navigator) {
      navigator.vibrate([180, 80, 180]);
    }
    updateButtons();
    updateDisplay();
  }

  function playDoneSound() {
    if (!elements.soundToggle.checked) {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    state.audioContext = state.audioContext || new AudioContext();
    const now = state.audioContext.currentTime;
    [0, 0.18, 0.36].forEach(function (offset) {
      const oscillator = state.audioContext.createOscillator();
      const gain = state.audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
      oscillator.connect(gain);
      gain.connect(state.audioContext.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.14);
    });
  }

  function bindEvents() {
    elements.themeToggle.addEventListener("click", function () {
      const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
      setTheme(nextTheme);
    });

    elements.stopwatchMode.addEventListener("click", function () {
      switchMode("stopwatch");
    });

    elements.timerMode.addEventListener("click", function () {
      switchMode("timer");
    });

    elements.btnStartStop.addEventListener("click", function () {
      state.running ? stop() : start();
    });

    elements.btnReset.addEventListener("click", reset);
    elements.btnLap.addEventListener("click", addLap);

    elements.durationInput.addEventListener("change", function () {
      setDuration(elements.durationInput.value);
    });

    elements.presetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setDuration(Number(button.dataset.minutes) * 60);
      });
    });

    elements.soundToggle.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEYS.sound, String(elements.soundToggle.checked));
    });

    elements.wakeLockToggle.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEYS.wakeLock, String(elements.wakeLockToggle.checked));
      if (!elements.wakeLockToggle.checked) {
        releaseWakeLock();
      } else if (state.running) {
        requestWakeLock();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && state.running) {
        requestWakeLock();
        updateDisplay();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        state.running ? stop() : start();
      } else if (event.code === "KeyR" && !state.running) {
        reset();
      } else if (event.code === "KeyL") {
        addLap();
      } else if (event.code === "KeyT") {
        const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
        setTheme(nextTheme);
      } else if (event.code === "Digit1") {
        switchMode("stopwatch");
      } else if (event.code === "Digit2") {
        switchMode("timer");
      }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        // GitHub Pages can serve the app without the service worker; offline cache is a bonus.
      });
    });
  }

  function init() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    setTheme(savedTheme || getSystemTheme());

    elements.soundToggle.checked = readBoolean(STORAGE_KEYS.sound, true);
    elements.wakeLockToggle.checked = readBoolean(STORAGE_KEYS.wakeLock, true);
    setDuration(localStorage.getItem(STORAGE_KEYS.duration) || 90);
    bindEvents();
    updateButtons();
    updateDisplay();
    registerServiceWorker();
  }

  init();
})();
