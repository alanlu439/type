const input = document.querySelector("[data-input]");
const output = document.querySelector("[data-output]");
const wordCount = document.querySelector("[data-word-count]");
const readyLabel = document.querySelector("[data-ready-label]");
const paper = document.querySelector("[data-paper-surface]");
const soundButtons = Array.from(document.querySelectorAll("[data-sound-toggle]"));
const soundLabels = Array.from(document.querySelectorAll("[data-sound-label]"));
const startWriting = document.querySelector("[data-start-writing]");
const resetButton = document.querySelector("[data-reset]");
const exportButton = document.querySelector("[data-export]");
const inkButtons = Array.from(document.querySelectorAll("[data-ink]"));
const paperButtons = Array.from(document.querySelectorAll("[data-paper]"));

const seedText = [
  "There's a certain rhythm to the keys,",
  "a small resistance, a soft return.",
  "Words arrive slower, truer.",
  "Ideas have room to breathe."
].join("\n");

let audioContext;
let soundEnabled = true;
let lastBellLine = 0;

input.value = seedText;
renderPage();

startWriting.addEventListener("click", () => {
  window.setTimeout(() => {
    input.focus({ preventScroll: true });
    input.selectionStart = input.value.length;
    input.selectionEnd = input.value.length;
  }, 500);
});

soundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ensureAudio();
    soundEnabled = !soundEnabled;
    updateSoundButtons();
    if (soundEnabled) {
      playBell(0.18);
    }
  });
});

input.addEventListener("pointerdown", ensureAudio);
input.addEventListener("focus", () => {
  readyLabel.textContent = "Writing";
});
input.addEventListener("blur", () => {
  readyLabel.textContent = "Ready";
});

input.addEventListener("input", () => {
  renderPage();
});

input.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  ensureAudio();

  if (event.key === "Enter") {
    playReturn();
    lastBellLine = 0;
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    playThud();
    return;
  }

  if (event.key.length === 1 || event.key === "Tab") {
    playKey();
    const column = currentColumn();
    if (column > 0 && column % 58 === 0 && column !== lastBellLine) {
      lastBellLine = column;
      window.setTimeout(() => playBell(0.1), 24);
    }
  }
});

resetButton.addEventListener("click", () => {
  input.value = "";
  renderPage();
  input.focus();
  playReturn();
});

exportButton.addEventListener("click", () => {
  const text = input.value.trimEnd();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "type-page.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  playBell(0.16);
});

inkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const ink = button.dataset.ink;
    document.documentElement.style.setProperty("--ink", ink);
    markSelected(inkButtons, button);
    input.focus();
    playKey(0.08);
  });
});

paperButtons.forEach((button) => {
  button.addEventListener("click", () => {
    paper.dataset.tone = button.dataset.paper;
    markSelected(paperButtons, button);
    input.focus();
    playKey(0.08);
  });
});

document.querySelector(".paper").addEventListener("click", () => {
  input.focus();
});

function renderPage() {
  const fragment = document.createDocumentFragment();
  const text = input.value;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "\n") {
      fragment.appendChild(document.createElement("br"));
      continue;
    }

    const span = document.createElement("span");
    span.className = "char";
    span.textContent = char === " " ? "\u00a0" : char;
    span.style.setProperty("--x", `${jitter(index, 0.6)}px`);
    span.style.setProperty("--y", `${jitter(index + 17, 0.75)}px`);
    span.style.setProperty("--r", `${jitter(index + 31, 0.32)}deg`);
    span.style.setProperty("--alpha", String(0.78 + Math.abs(jitter(index + 47, 0.18))));
    fragment.appendChild(span);
  }

  const caret = document.createElement("span");
  caret.className = "visual-caret";
  fragment.appendChild(caret);

  output.replaceChildren(fragment);
  const words = text.trim().match(/\S+/g);
  wordCount.textContent = words ? words.length : 0;
}

function markSelected(group, selected) {
  group.forEach((button) => {
    const isSelected = button === selected;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function updateSoundButtons() {
  soundButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(soundEnabled));
  });
  soundLabels.forEach((label) => {
    label.textContent = soundEnabled ? "Sound on" : "Sound off";
  });
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) {
      audioContext = new AudioCtor();
    }
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playKey(volume = 0.13) {
  if (!canPlay()) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  osc.type = "square";
  osc.frequency.setValueAtTime(150 + Math.random() * 90, now);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900 + Math.random() * 650, now);
  filter.Q.setValueAtTime(5, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.055);

  playNoise(volume * 0.38, 0.026);
}

function playReturn() {
  if (!canPlay()) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(96, now);
  osc.frequency.exponentialRampToValueAtTime(62, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.16);
  window.setTimeout(() => playBell(0.12), 70);
}

function playThud() {
  if (!canPlay()) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(105, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

function playBell(volume = 0.14) {
  if (!canPlay()) {
    return;
  }

  const now = audioContext.currentTime;
  [1318, 1760].forEach((frequency, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume / (index + 1), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  });
}

function playNoise(volume, duration) {
  if (!canPlay()) {
    return;
  }

  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start();
}

function canPlay() {
  return soundEnabled && audioContext;
}

function currentColumn() {
  const text = input.value.slice(0, input.selectionStart);
  const lastBreak = text.lastIndexOf("\n");
  return text.length - lastBreak - 1;
}

function jitter(index, amount) {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * amount;
}
