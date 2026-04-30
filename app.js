(function () {
  const STORAGE_KEYS = {
    theme: "trainingTimer.theme",
    sound: "trainingTimer.sound",
    countdown: "trainingTimer.countdown",
    countdownSound: "trainingTimer.countdownSound",
    wakeLock: "trainingTimer.wakeLock",
    duration: "trainingTimer.duration",
    workDuration: "trainingTimer.workDuration",
    restDuration: "trainingTimer.restDuration",
    rounds: "trainingTimer.rounds",
    exercises: "trainingTimer.exercises",
  };

  const TEMPLATES = {
    basic: ["Pompki", "Przysiady", "Plank"],
    core: ["Plank", "Dead bug", "Mountain climbers", "Side plank"],
    mobility: ["Krążenia barków", "Przysiad z pauzą", "Wykrok z rotacją", "Rozciąganie bioder"],
  };

  const elements = {
    infoToggle: document.getElementById("infoToggle"),
    footerInfoToggle: document.getElementById("footerInfoToggle"),
    infoDialog: document.getElementById("infoDialog"),
    infoClose: document.getElementById("infoClose"),
    themeToggle: document.getElementById("themeToggle"),
    fullscreenToggle: document.getElementById("fullscreenToggle"),
    stopwatchMode: document.getElementById("stopwatchMode"),
    timerMode: document.getElementById("timerMode"),
    workoutMode: document.getElementById("workoutMode"),
    timerPanel: document.getElementById("timerPanel"),
    modeLabel: document.getElementById("modeLabel"),
    timerDisplay: document.getElementById("timerDisplay"),
    workoutFocus: document.getElementById("workoutFocus"),
    workoutFocusTitle: document.getElementById("workoutFocusTitle"),
    workoutFocusDetail: document.getElementById("workoutFocusDetail"),
    countdownOverlay: document.getElementById("countdownOverlay"),
    countdownValue: document.getElementById("countdownValue"),
    statusText: document.getElementById("statusText"),
    timerSettings: document.getElementById("timerSettings"),
    workoutSettings: document.getElementById("workoutSettings"),
    workoutOverview: document.getElementById("workoutOverview"),
    durationInput: document.getElementById("durationInput"),
    workDurationInput: document.getElementById("workDurationInput"),
    restDurationInput: document.getElementById("restDurationInput"),
    roundsInput: document.getElementById("roundsInput"),
    exerciseNamesInput: document.getElementById("exerciseNamesInput"),
    btnLap: document.getElementById("btnLap"),
    btnStartStop: document.getElementById("btnStartStop"),
    btnReset: document.getElementById("btnReset"),
    lapsSection: document.getElementById("lapsSection"),
    pulseDot: document.getElementById("pulseDot"),
    soundToggle: document.getElementById("soundToggle"),
    countdownToggle: document.getElementById("countdownToggle"),
    countdownSoundToggle: document.getElementById("countdownSoundToggle"),
    wakeLockToggle: document.getElementById("wakeLockToggle"),
    presetButtons: Array.from(document.querySelectorAll(".preset-row .preset-button")),
    templateButtons: Array.from(document.querySelectorAll(".template-row .preset-button")),
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
    countdownTimerId: null,
    countdownRunning: false,
    countdownRemaining: 3,
    wakeLock: null,
    audioContext: null,
    workout: {
      workDuration: 40 * 1000,
      restDuration: 20 * 1000,
      rounds: 3,
      exercises: TEMPLATES.basic,
      steps: [],
      stepIndex: 0,
      completed: false,
    },
  };

  function readBoolean(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  }

  function clampNumber(value, fallback, min, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currentElapsed() {
    return state.running ? Date.now() - state.startTime + state.elapsed : state.elapsed;
  }

  function timerRemaining() {
    return Math.max(0, state.duration - currentElapsed());
  }

  function currentWorkoutStep() {
    return state.workout.steps[state.workout.stepIndex] || null;
  }

  function workoutRemaining() {
    const step = currentWorkoutStep();
    return step ? Math.max(0, step.duration - currentElapsed()) : 0;
  }

  function updateDisplay() {
    const isStopwatch = state.mode === "stopwatch";
    const isTimer = state.mode === "timer";
    const value = isStopwatch ? currentElapsed() : isTimer ? timerRemaining() : workoutRemaining();
    const warning = !isStopwatch && state.running && value <= 10000;
    const done = !isStopwatch && value === 0 && !state.running;

    elements.timerDisplay.innerHTML = formatTime(value, isStopwatch);
    elements.timerDisplay.classList.toggle("warning", warning);
    elements.timerDisplay.classList.toggle("done", done);

    if (isTimer && state.running && value <= 0) {
      finishTimer();
      return;
    }

    if (state.mode === "workout" && state.running && value <= 0) {
      advanceWorkout();
      return;
    }

    if (state.running) {
      state.frameId = requestAnimationFrame(updateDisplay);
    }
  }

  function updateButtons() {
    const isStopwatch = state.mode === "stopwatch";
    const isWorkout = state.mode === "workout";
    const workoutTouched = isWorkout && (state.elapsed > 0 || state.workout.stepIndex > 0 || state.workout.completed);
    const canReset = isWorkout ? workoutTouched : state.elapsed > 0 || state.laps.length > 0;

    elements.btnStartStop.textContent = state.running || state.countdownRunning ? "Stop" : "Start";
    elements.btnStartStop.classList.toggle("running", state.running || state.countdownRunning);
    elements.btnReset.disabled = state.running && isStopwatch ? true : !canReset;
    elements.btnLap.disabled = !state.running || !isStopwatch;
    elements.btnLap.hidden = !isStopwatch;
    elements.pulseDot.classList.toggle("active", state.running || state.countdownRunning);
    updateWorkoutFocus();
    elements.statusText.textContent = getStatusText();
  }

  function getStatusText() {
    if (state.countdownRunning) {
      return `Start za ${state.countdownRemaining}`;
    }

    if (state.mode === "stopwatch") {
      if (state.running) return "Pomiar trwa";
      return state.elapsed > 0 ? "Pauza" : "Gotowy";
    }

    if (state.mode === "timer") {
      if (state.running) return "Przerwa trwa";
      if (state.elapsed >= state.duration) return "Koniec przerwy";
      return state.elapsed > 0 ? "Pauza" : "Gotowy do przerwy";
    }

    const step = currentWorkoutStep();
    if (state.workout.completed) return "Trening zakończony";
    if (!step) return "Ustaw plan treningu";

    const progress = `Runda ${step.round}/${state.workout.rounds} • ${state.workout.stepIndex + 1}/${state.workout.steps.length}`;
    const phase = state.running ? "Pomiar trwa" : state.elapsed > 0 ? "Pauza" : "Gotowy";
    return `${phase} • ${progress}`;
  }

  function updateWorkoutFocus() {
    const isWorkout = state.mode === "workout";
    elements.workoutFocus.hidden = !isWorkout;
    elements.timerPanel.classList.toggle("workout-timer", isWorkout);

    if (!isWorkout) {
      return;
    }

    const step = currentWorkoutStep();
    const isRest = step && step.type === "rest";
    let title = "Plan";
    let detail = "Ustaw plan treningu";

    if (state.workout.completed) {
      title = "Gotowe";
      detail = "Trening zako\u0144czony";
    } else if (step) {
      title = isRest ? "Przerwa" : step.name;
      detail = isRest
        ? `Po: ${step.name} • Runda ${step.round}/${state.workout.rounds}`
        : `Runda ${step.round}/${state.workout.rounds}`;
    }

    elements.workoutFocus.classList.toggle("rest", Boolean(isRest));
    elements.workoutFocusTitle.textContent = title;
    elements.workoutFocusDetail.textContent = detail;
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

  function start(skipCountdown) {
    if (state.running) {
      return;
    }

    if (state.mode === "timer" && state.elapsed >= state.duration) {
      state.elapsed = 0;
    }

    if (state.mode === "workout") {
      if (!state.workout.steps.length || state.workout.completed) {
        buildWorkoutPlan();
      }
      state.workout.completed = false;
    }

    if (!skipCountdown && shouldStartWithCountdown()) {
      beginCountdown();
      return;
    }

    state.running = true;
    state.startTime = Date.now();
    requestWakeLock();
    updateButtons();
    updateDisplay();
    renderWorkoutOverview();
  }

  function stop() {
    if (state.countdownRunning) {
      cancelCountdown();
      releaseWakeLock();
      updateButtons();
      return;
    }

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
    cancelCountdown();
    state.startTime = 0;
    state.elapsed = 0;
    state.laps = [];
    state.lastLapTime = 0;
    state.workout.stepIndex = 0;
    state.workout.completed = false;
    cancelFrame();
    releaseWakeLock();
    elements.lapsSection.innerHTML = "";
    updateButtons();
    updateDisplay();
    renderWorkoutOverview();
  }

  function cancelFrame() {
    if (state.frameId !== null) {
      cancelAnimationFrame(state.frameId);
      state.frameId = null;
    }
  }

  function shouldStartWithCountdown() {
    if (!elements.countdownToggle.checked || state.countdownRunning) {
      return false;
    }

    if (state.mode === "workout") {
      return state.elapsed === 0 && state.workout.stepIndex === 0 && !state.workout.completed;
    }

    return state.elapsed === 0;
  }

  function beginCountdown() {
    state.countdownRunning = true;
    state.countdownRemaining = 3;
    showCountdown();
    playCountdownSound();
    requestWakeLock();
    updateButtons();

    state.countdownTimerId = window.setInterval(function () {
      state.countdownRemaining -= 1;

      if (state.countdownRemaining <= 0) {
        cancelCountdown();
        start(true);
        return;
      }

      showCountdown();
      playCountdownSound();
      updateButtons();
    }, 1000);
  }

  function showCountdown() {
    elements.countdownValue.textContent = String(state.countdownRemaining);
    elements.countdownOverlay.hidden = false;
    elements.countdownOverlay.classList.remove("pop");
    void elements.countdownOverlay.offsetWidth;
    elements.countdownOverlay.classList.add("pop");
  }

  function cancelCountdown() {
    if (state.countdownTimerId !== null) {
      window.clearInterval(state.countdownTimerId);
      state.countdownTimerId = null;
    }

    state.countdownRunning = false;
    elements.countdownOverlay.hidden = true;
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
    const isWorkout = mode === "workout";
    document.body.dataset.mode = mode;

    [
      [elements.stopwatchMode, mode === "stopwatch"],
      [elements.timerMode, isTimer],
      [elements.workoutMode, isWorkout],
    ].forEach(function ([button, active]) {
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    elements.timerSettings.hidden = !isTimer;
    elements.workoutSettings.hidden = !isWorkout;
    elements.workoutOverview.hidden = !isWorkout;
    elements.lapsSection.hidden = mode !== "stopwatch";
    elements.modeLabel.textContent = isTimer ? "Minutnik" : isWorkout ? "Trening" : "Stoper";
    buildWorkoutPlan();
    updateButtons();
    updateDisplay();
    renderWorkoutOverview();
  }

  function setDuration(seconds) {
    const clamped = clampNumber(seconds, 90, 5, 5999);
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

  function readExerciseNames() {
    const names = elements.exerciseNamesInput.value
      .split("\n")
      .map(function (name) {
        return name.trim();
      })
      .filter(Boolean);

    return names.length ? names : TEMPLATES.basic;
  }

  function saveWorkoutSettings() {
    state.workout.workDuration = clampNumber(elements.workDurationInput.value, 40, 5, 1800) * 1000;
    state.workout.restDuration = clampNumber(elements.restDurationInput.value, 20, 0, 1800) * 1000;
    state.workout.rounds = clampNumber(elements.roundsInput.value, 3, 1, 20);
    state.workout.exercises = readExerciseNames();

    elements.workDurationInput.value = String(state.workout.workDuration / 1000);
    elements.restDurationInput.value = String(state.workout.restDuration / 1000);
    elements.roundsInput.value = String(state.workout.rounds);

    localStorage.setItem(STORAGE_KEYS.workDuration, String(state.workout.workDuration / 1000));
    localStorage.setItem(STORAGE_KEYS.restDuration, String(state.workout.restDuration / 1000));
    localStorage.setItem(STORAGE_KEYS.rounds, String(state.workout.rounds));
    localStorage.setItem(STORAGE_KEYS.exercises, state.workout.exercises.join("\n"));

    if (!state.running) {
      buildWorkoutPlan();
      reset();
    }
  }

  function buildWorkoutPlan() {
    const steps = [];
    const exercises = state.workout.exercises.length ? state.workout.exercises : TEMPLATES.basic;

    for (let round = 1; round <= state.workout.rounds; round += 1) {
      exercises.forEach(function (name, exerciseIndex) {
        steps.push({
          type: "work",
          name,
          round,
          duration: state.workout.workDuration,
        });

        const isLastExercise = exerciseIndex === exercises.length - 1;
        const isLastRound = round === state.workout.rounds;
        if (state.workout.restDuration > 0 && !(isLastExercise && isLastRound)) {
          steps.push({
            type: "rest",
            name,
            round,
            duration: state.workout.restDuration,
          });
        }
      });
    }

    state.workout.steps = steps;
    state.workout.stepIndex = Math.min(state.workout.stepIndex, Math.max(0, steps.length - 1));
    renderWorkoutOverview();
  }

  function advanceWorkout() {
    playDoneSound(0.12);
    if ("vibrate" in navigator) {
      navigator.vibrate(120);
    }

    if (state.workout.stepIndex >= state.workout.steps.length - 1) {
      state.elapsed = 0;
      state.running = false;
      state.workout.completed = true;
      cancelFrame();
      releaseWakeLock();
      playDoneSound(0.2);
      if ("vibrate" in navigator) {
        navigator.vibrate([180, 80, 180]);
      }
      updateButtons();
      updateDisplay();
      renderWorkoutOverview();
      return;
    }

    state.workout.stepIndex += 1;
    state.elapsed = 0;
    state.startTime = Date.now();
    updateButtons();
    renderWorkoutOverview();
    updateDisplay();
  }

  function renderWorkoutOverview() {
    if (state.mode !== "workout") {
      return;
    }

    const steps = state.workout.steps;
    if (!steps.length) {
      elements.workoutOverview.innerHTML = "";
      return;
    }

    const current = currentWorkoutStep();
    const doneCount = state.workout.completed ? steps.length : state.workout.stepIndex;
    const currentTitle = state.workout.completed ? "Gotowe" : current && current.type === "rest" ? "Przerwa" : current ? current.name : "Plan";
    const currentDetail = state.workout.completed ? "Trening zakończony" : current && current.type === "rest" ? `Po: ${current.name}` : current ? `Runda ${current.round}/${state.workout.rounds}` : "";

    elements.workoutOverview.innerHTML = [
      `<div class="workout-summary"><span>${state.workout.exercises.length} ćw.</span><span>${state.workout.rounds} rundy</span><span>${Math.round(totalWorkoutDuration() / 1000 / 60)} min</span></div>`,
      `<div class="current-step ${current && current.type === "rest" ? "rest" : "work"}"><span class="current-step-title">${escapeHtml(currentTitle)}</span><span class="current-step-detail">${escapeHtml(currentDetail)}</span></div>`,
      `<div class="step-list">${steps.map(function (step, index) {
        const className = index < doneCount ? "done" : index === state.workout.stepIndex && !state.workout.completed ? "active" : "";
        const label = step.type === "work" ? step.name : "Przerwa";
        return `<span class="step-pill ${className}">${escapeHtml(label)}</span>`;
      }).join("")}</div>`,
    ].join("");
  }

  function totalWorkoutDuration() {
    return state.workout.steps.reduce(function (sum, step) {
      return sum + step.duration;
    }, 0);
  }

  function finishTimer() {
    state.elapsed = state.duration;
    state.running = false;
    cancelFrame();
    releaseWakeLock();
    playDoneSound(0.2);
    if ("vibrate" in navigator) {
      navigator.vibrate([180, 80, 180]);
    }
    updateButtons();
    updateDisplay();
  }

  function playDoneSound(volume) {
    if (!elements.soundToggle.checked) {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    state.audioContext = state.audioContext || new AudioContext();
    const now = state.audioContext.currentTime;
    const peak = volume || 0.18;
    [0, 0.18, 0.36].forEach(function (offset) {
      const oscillator = state.audioContext.createOscillator();
      const gain = state.audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
      oscillator.connect(gain);
      gain.connect(state.audioContext.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.14);
    });
  }

  function playCountdownSound() {
    if (!elements.countdownSoundToggle.checked) {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    state.audioContext = state.audioContext || new AudioContext();
    const now = state.audioContext.currentTime;
    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(state.countdownRemaining === 1 ? 980 : 740, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(state.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (_error) {
        return;
      }
    } else {
      await document.exitFullscreen();
    }
  }

  function updateFullscreenButton() {
    const isFullscreen = Boolean(document.fullscreenElement);
    elements.fullscreenToggle.setAttribute("aria-pressed", String(isFullscreen));
    elements.fullscreenToggle.textContent = isFullscreen ? "ESC" : "FS";
    elements.fullscreenToggle.title = isFullscreen ? "Wyjdź z pełnego ekranu (Esc)" : "Pełny ekran (F)";
  }

  function openInfo() {
    if (typeof elements.infoDialog.showModal === "function") {
      elements.infoDialog.showModal();
    } else {
      elements.infoDialog.setAttribute("open", "");
    }
  }

  function closeInfo() {
    if (typeof elements.infoDialog.close === "function") {
      elements.infoDialog.close();
    } else {
      elements.infoDialog.removeAttribute("open");
    }
  }

  function bindEvents() {
    elements.infoToggle.addEventListener("click", openInfo);
    elements.footerInfoToggle.addEventListener("click", openInfo);
    elements.infoClose.addEventListener("click", closeInfo);
    elements.infoDialog.addEventListener("click", function (event) {
      if (event.target === elements.infoDialog) {
        closeInfo();
      }
    });

    elements.themeToggle.addEventListener("click", function () {
      const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
      setTheme(nextTheme);
    });

    elements.fullscreenToggle.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", updateFullscreenButton);

    elements.stopwatchMode.addEventListener("click", function () {
      switchMode("stopwatch");
    });

    elements.timerMode.addEventListener("click", function () {
      switchMode("timer");
    });

    elements.workoutMode.addEventListener("click", function () {
      switchMode("workout");
    });

    elements.btnStartStop.addEventListener("click", function () {
      state.running || state.countdownRunning ? stop() : start();
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

    [elements.workDurationInput, elements.restDurationInput, elements.roundsInput, elements.exerciseNamesInput].forEach(function (input) {
      input.addEventListener("change", saveWorkoutSettings);
    });

    elements.templateButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const names = TEMPLATES[button.dataset.template] || TEMPLATES.basic;
        elements.exerciseNamesInput.value = names.join("\n");
        saveWorkoutSettings();
      });
    });

    elements.soundToggle.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEYS.sound, String(elements.soundToggle.checked));
    });

    elements.countdownToggle.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEYS.countdown, String(elements.countdownToggle.checked));
      if (!elements.countdownToggle.checked) {
        cancelCountdown();
        releaseWakeLock();
        updateButtons();
      }
    });

    elements.countdownSoundToggle.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEYS.countdownSound, String(elements.countdownSoundToggle.checked));
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
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        state.running || state.countdownRunning ? stop() : start();
      } else if (event.code === "KeyR" && !state.running) {
        reset();
      } else if (event.code === "KeyL") {
        addLap();
      } else if (event.code === "KeyT") {
        const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
        setTheme(nextTheme);
      } else if (event.code === "KeyF") {
        toggleFullscreen();
      } else if (event.code === "Digit1") {
        switchMode("stopwatch");
      } else if (event.code === "Digit2") {
        switchMode("timer");
      } else if (event.code === "Digit3") {
        switchMode("workout");
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

  function initWorkoutSettings() {
    const savedExercises = localStorage.getItem(STORAGE_KEYS.exercises);
    state.workout.workDuration = clampNumber(localStorage.getItem(STORAGE_KEYS.workDuration), 40, 5, 1800) * 1000;
    state.workout.restDuration = clampNumber(localStorage.getItem(STORAGE_KEYS.restDuration), 20, 0, 1800) * 1000;
    state.workout.rounds = clampNumber(localStorage.getItem(STORAGE_KEYS.rounds), 3, 1, 20);
    state.workout.exercises = savedExercises ? savedExercises.split("\n").map(function (name) {
      return name.trim();
    }).filter(Boolean) : TEMPLATES.basic;

    elements.workDurationInput.value = String(state.workout.workDuration / 1000);
    elements.restDurationInput.value = String(state.workout.restDuration / 1000);
    elements.roundsInput.value = String(state.workout.rounds);
    elements.exerciseNamesInput.value = state.workout.exercises.join("\n");
    buildWorkoutPlan();
  }

  function init() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    setTheme(savedTheme || getSystemTheme());

    elements.soundToggle.checked = readBoolean(STORAGE_KEYS.sound, true);
    elements.countdownToggle.checked = readBoolean(STORAGE_KEYS.countdown, true);
    elements.countdownSoundToggle.checked = readBoolean(STORAGE_KEYS.countdownSound, true);
    elements.wakeLockToggle.checked = readBoolean(STORAGE_KEYS.wakeLock, true);
    setDuration(localStorage.getItem(STORAGE_KEYS.duration) || 90);
    initWorkoutSettings();
    bindEvents();
    updateButtons();
    updateDisplay();
    updateFullscreenButton();
    registerServiceWorker();
  }

  init();
})();
