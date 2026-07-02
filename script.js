const input = document.querySelector("[data-input]");
const output = document.querySelector("[data-output]");
const wordCount = document.querySelector("[data-word-count]");
const readyLabel = document.querySelector("[data-ready-label]");
const paper = document.querySelector("[data-paper-surface]");
const machine = document.querySelector("[data-machine]");
const carriage = document.querySelector("[data-carriage]");
const keyboardDeck = document.querySelector("[data-keyboard-deck]");
const importButton = document.querySelector("[data-import]");
const importFile = document.querySelector("[data-import-file]");
const exportPdfButton = document.querySelector("[data-export-pdf]");
const resetButton = document.querySelector("[data-reset]");
const soundButtons = Array.from(document.querySelectorAll("[data-sound-toggle]"));
const soundLabels = Array.from(document.querySelectorAll("[data-sound-label]"));
const inkButtons = Array.from(document.querySelectorAll("[data-ink]"));
const paperButtons = Array.from(document.querySelectorAll("[data-paper]"));
const typebars = document.querySelector(".typebars");

const seedText = [
  "The worst enemy to creativity is self-doubt.",
  "",
  "Trust the process. Allow yourself to make",
  "mistakes. And keep typing."
].join("\n");

const keyRows = [
  [
    ["`", "~\n`"], ["1", "!\n1"], ["2", "@\n2"], ["3", "#\n3"], ["4", "$\n4"], ["5", "%\n5"],
    ["6", "^\n6"], ["7", "&\n7"], ["8", "*\n8"], ["9", "(\n9"], ["0", ")\n0"], ["-", "_\n-"],
    ["=", "+\n="], ["Backspace", "Back space", "wide"]
  ],
  [
    ["Tab", "Tab", "wide"], ["q", "Q"], ["w", "W"], ["e", "E"], ["r", "R"],
    ["t", "T"], ["y", "Y"], ["u", "U"], ["i", "I"], ["o", "O"], ["p", "P"],
    ["[", "{"], ["]", "}"], ["\\", "|"]
  ],
  [
    ["CapsLock", "Caps lock", "wide"], ["a", "A"], ["s", "S"], ["d", "D"],
    ["f", "F"], ["g", "G"], ["h", "H"], ["j", "J"], ["k", "K"], ["l", "L"],
    [";", ":"], ["'", "\""], ["Enter", "Return", "wide"]
  ],
  [
    ["Shift", "Shift", "wide"], ["z", "Z"], ["x", "X"], ["c", "C"], ["v", "V"],
    ["b", "B"], ["n", "N"], ["m", "M"], [",", "<"], [".", ">"], ["/", "?"],
    ["ShiftRight", "Shift", "wide"]
  ],
  [
    ["Space", "", "space"]
  ]
];

const keyLookup = new Map();
let audioContext;
let soundEnabled = true;
let lastBellColumn = -1;
let strikeTimer;
let deckTimer;

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/pdf.worker.min.js";
}

buildKeyboard();
input.value = seedText;
renderPage();
input.focus({ preventScroll: true });

importButton.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const [file] = importFile.files;
  if (!file) {
    return;
  }

  setStatus("Importing");
  try {
    const text = await readPdfText(file);
    input.value = normalizeImportedText(text);
    renderPage();
    setStatus("Imported");
    playReturn();
    input.focus();
  } catch (error) {
    console.error(error);
    setStatus("PDF error");
    window.alert("I could not read text from that PDF. Try a text-based PDF rather than a scanned image.");
  } finally {
    importFile.value = "";
    window.setTimeout(() => setStatus(document.activeElement === input ? "Writing" : "Ready"), 1400);
  }
});

exportPdfButton.addEventListener("click", () => {
  const pdf = buildPdf(input.value || " ");
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "type-page.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported");
  playBell(0.16);
  window.setTimeout(() => setStatus(document.activeElement === input ? "Writing" : "Ready"), 1200);
});

resetButton.addEventListener("click", () => {
  input.value = "";
  renderPage();
  input.focus();
  setStatus("Ready");
  playReturn();
});

soundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ensureAudio();
    soundEnabled = !soundEnabled;
    updateSoundButtons();
    if (soundEnabled) {
      playBell(0.18);
    }
    input.focus();
  });
});

inkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    document.documentElement.style.setProperty("--ink", button.dataset.ink);
    markSelected(inkButtons, button);
    input.focus();
    animateKey("Ink");
    playKey(0.08);
  });
});

paperButtons.forEach((button) => {
  button.addEventListener("click", () => {
    paper.dataset.tone = button.dataset.paper;
    markSelected(paperButtons, button);
    input.focus();
    animateKey("Paper");
    playKey(0.08);
  });
});

input.addEventListener("pointerdown", ensureAudio);
input.addEventListener("focus", () => setStatus("Writing"));
input.addEventListener("blur", () => setStatus("Ready"));

input.addEventListener("input", () => {
  renderPage();
});

input.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  ensureAudio();
  animateKey(event.key);

  if (event.key === "Enter") {
    lastBellColumn = -1;
    playReturn();
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    playThud();
    return;
  }

  if (event.key.length === 1 || event.key === "Tab" || event.key === " ") {
    playKey();
    const column = currentColumn();
    if (column > 0 && column % 58 === 0 && column !== lastBellColumn) {
      lastBellColumn = column;
      window.setTimeout(() => playBell(0.1), 24);
    }
  }
});

document.querySelector(".paper").addEventListener("click", () => input.focus());

function buildKeyboard() {
  keyRows.forEach((row) => {
    const rowElement = document.createElement("div");
    rowElement.className = "key-row";

    row.forEach(([value, label, variant]) => {
      const key = document.createElement("button");
      key.type = "button";
      key.className = `key ${variant || ""}`.trim();
      key.dataset.key = value;
      key.setAttribute("aria-label", label || "Space");
      key.textContent = label;
      key.addEventListener("click", () => pressVisualKey(value));
      rowElement.appendChild(key);
      registerKey(value, key);
      if (value.length === 1) {
        registerKey(value.toLowerCase(), key);
        registerKey(value.toUpperCase(), key);
      }
    });

    keyboardDeck.appendChild(rowElement);
  });

  registerKey(" ", keyboardDeck.querySelector('[data-key="Space"]'));
  registerKey("Delete", keyboardDeck.querySelector('[data-key="Backspace"]'));
}

function pressVisualKey(value) {
  input.focus();
  const start = input.selectionStart;
  const end = input.selectionEnd;

  if (value === "Backspace") {
    if (start !== end) {
      input.value = input.value.slice(0, start) + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start;
    } else if (start > 0) {
      input.value = input.value.slice(0, start - 1) + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start - 1;
    }
    playThud();
  } else if (value === "Enter") {
    insertAtSelection("\n");
    playReturn();
  } else if (value === "Tab") {
    insertAtSelection("  ");
    playKey();
  } else if (value === "Space") {
    insertAtSelection(" ");
    playKey();
  } else if (!["Shift", "ShiftRight", "CapsLock"].includes(value)) {
    insertAtSelection(value.length === 1 ? value : "");
    playKey();
  }

  animateKey(value);
  renderPage();
}

function insertAtSelection(text) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + text.length;
}

function registerKey(value, element) {
  if (value && element) {
    keyLookup.set(value, element);
  }
}

function animateKey(value) {
  const normalized = value === " " ? " " : value;
  const key = keyLookup.get(normalized) || keyLookup.get(String(normalized).toLowerCase());

  if (key) {
    key.classList.remove("is-struck");
    key.offsetWidth;
    key.classList.add("is-struck");
    window.setTimeout(() => key.classList.remove("is-struck"), 130);
  }

  typebars.classList.remove("is-striking");
  typebars.offsetWidth;
  typebars.classList.add("is-striking");
  window.clearTimeout(strikeTimer);
  strikeTimer = window.setTimeout(() => typebars.classList.remove("is-striking"), 190);

  machine.style.setProperty("--deck-y", "0.34rem");
  window.clearTimeout(deckTimer);
  deckTimer = window.setTimeout(() => machine.style.setProperty("--deck-y", "0px"), 120);
}

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
  updateCarriage();
}

function updateCarriage() {
  const column = currentColumn();
  const shift = Math.max(-42, Math.min(42, (column - 28) * -1.45));
  machine.style.setProperty("--carriage-x", `${shift}px`);
}

async function readPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF parser is unavailable.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

function normalizeImportedText(text) {
  return text
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function buildPdf(text) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72;
  const fontSize = 12;
  const lineHeight = 18;
  const maxChars = 74;
  const maxLines = Math.floor((pageHeight - margin * 2) / lineHeight);
  const lines = wrapText(text, maxChars);
  const pages = [];

  for (let i = 0; i < lines.length || i === 0; i += maxLines) {
    pages.push(lines.slice(i, i + maxLines));
  }

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids ${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")} >>`
  ];

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const stream = makePdfStream(pageLines, margin, pageHeight - margin, fontSize, lineHeight);
    objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  const offsets = [0];
  let body = "%PDF-1.4\n% Type PDF\n";

  objects.forEach((object, index) => {
    offsets.push(byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return body;
}

function wrapText(text, maxChars) {
  const lines = [];
  text.split(/\r?\n/).forEach((rawLine) => {
    let line = rawLine;
    if (!line) {
      lines.push("");
      return;
    }

    while (line.length > maxChars) {
      let breakAt = line.lastIndexOf(" ", maxChars);
      if (breakAt < 24) {
        breakAt = maxChars;
      }
      lines.push(line.slice(0, breakAt));
      line = line.slice(breakAt).trimStart();
    }
    lines.push(line);
  });
  return lines;
}

function makePdfStream(lines, x, y, fontSize, lineHeight) {
  const encoded = lines.map((line, index) => {
    const yy = y - index * lineHeight;
    return `BT /F1 ${fontSize} Tf ${x} ${yy} Td (${escapePdfText(line)}) Tj ET`;
  });
  return encoded.join("\n");
}

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function byteLength(text) {
  return new Blob([text]).size;
}

function markSelected(group, selected) {
  group.forEach((button) => {
    const isSelected = button === selected;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function updateSoundButtons() {
  soundButtons.forEach((button) => button.setAttribute("aria-pressed", String(soundEnabled)));
  soundLabels.forEach((label) => {
    label.textContent = soundEnabled ? "Sound on" : "Sound off";
  });
}

function setStatus(status) {
  readyLabel.textContent = status;
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
