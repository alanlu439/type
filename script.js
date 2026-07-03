import * as THREE from "./assets/three.module.js";

const input = document.querySelector("[data-input]");
const output = document.querySelector("[data-output]");
const stage = document.querySelector("[data-stage]");
const canvas = document.querySelector("[data-scene]");
const wordCount = document.querySelector("[data-word-count]");
const readyLabel = document.querySelector("[data-ready-label]");
const exportPdfButton = document.querySelector("[data-export-pdf]");
const resetButton = document.querySelector("[data-reset]");
const clearPageButton = document.querySelector("[data-clear-page]");
const ribbonCycleButton = document.querySelector("[data-ribbon-cycle]");
const zoomOutButton = document.querySelector("[data-zoom-out]");
const whiteoutButton = document.querySelector("[data-whiteout]");
const snapshotButton = document.querySelector("[data-snapshot]");
const rotateLeftButton = document.querySelector("[data-rotate-left]");
const rotateRightButton = document.querySelector("[data-rotate-right]");
const leftMarginButton = document.querySelector("[data-left-margin]");
const rightMarginButton = document.querySelector("[data-right-margin]");
const sidebarToggleButtons = Array.from(document.querySelectorAll("[data-sidebar-toggle]"));
const soundButtons = Array.from(document.querySelectorAll("[data-sound-toggle]"));
const soundLabels = Array.from(document.querySelectorAll("[data-sound-label]"));
const inkButtons = Array.from(document.querySelectorAll("[data-ink]"));
const paperButtons = Array.from(document.querySelectorAll("[data-paper]"));

const seedText = [
  "The worst enemy to creativity is self-doubt.",
  "",
  "Trust the process. Allow yourself to make",
  "mistakes. And keep typing."
].join("\n");

const paperTones = {
  ivory: { base: "#efe2ca", edge: "#cdbb9c", grid: "rgba(91, 67, 42, 0.08)" },
  linen: { base: "#dbc39c", edge: "#bda275", grid: "rgba(78, 56, 34, 0.1)" },
  mist: { base: "#d8d4c9", edge: "#b1ab9b", grid: "rgba(68, 64, 58, 0.08)" }
};

const keyRows = [
  [
    ["`", "~\n`"], ["1", "!\n1"], ["2", "@\n2"], ["3", "#\n3"], ["4", "$\n4"], ["5", "%\n5"],
    ["6", "^\n6"], ["7", "&\n7"], ["8", "*\n8"], ["9", "(\n9"], ["0", ")\n0"], ["-", "_\n-"],
    ["=", "+\n="], ["Backspace", "Back\nspace", "wide"]
  ],
  [
    ["Tab", "Tab", "wide"], ["q", "Q"], ["w", "W"], ["e", "E"], ["r", "R"],
    ["t", "T"], ["y", "Y"], ["u", "U"], ["i", "I"], ["o", "O"], ["p", "P"],
    ["[", "{"], ["]", "}"], ["\\", "|"]
  ],
  [
    ["CapsLock", "Caps\nLock", "wide"], ["a", "A"], ["s", "S"], ["d", "D"],
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

const defaultMargins = {
  left: 0,
  right: 56
};

const typewriterState = {
  row: 0,
  col: 0,
  leftMargin: defaultMargins.left,
  rightMargin: defaultMargins.right,
  marginRelease: false,
  lastBellColumn: -1
};

const sceneState = {
  renderer: null,
  scene: null,
  camera: null,
  machine: null,
  carriage: null,
  paperMesh: null,
  paperTexture: null,
  paperContext: null,
  paperCanvas: null,
  ribbonGuide: null,
  keys: new Map(),
  keyObjects: [],
  typebars: [],
  baseMachineX: 0,
  carriageShift: 0,
  targetCarriageShift: 0,
  carriageJerk: 0,
  deckJolt: 0,
  targetDeckJolt: 0,
  paperImpact: 0,
  ribbonPulse: 0,
  returnSweep: 0,
  baseMachineY: -0.08,
  baseMachineZ: 0,
  zoom: 1,
  viewRotation: 0,
  targetViewRotation: 0,
  ink: "#201b17",
  paperTone: "ivory",
  lastStrike: 0,
  pointer: { x: 0, y: 0 },
  targetPointer: { x: 0, y: 0 }
};

let audioContext;
let soundEnabled = true;
let statusTimer;

initScene();
input.value = seedText;
input.setSelectionRange(input.value.length, input.value.length);
syncCarriageFromInput();
renderPage();
setSidebarExpanded(window.innerWidth >= 1120, { focus: false });
input.focus({ preventScroll: true });

stage.addEventListener("pointerdown", () => {
  ensureAudio();
  input.focus({ preventScroll: true });
});

stage.addEventListener("pointermove", (event) => {
  const rect = stage.getBoundingClientRect();
  sceneState.targetPointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  sceneState.targetPointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
});

input.addEventListener("focus", () => setStatus("Writing"));
input.addEventListener("blur", () => setStatus("Ready"));

input.addEventListener("input", () => {
  setStatus("Writing");
  syncCarriageFromInput();
  renderPage();
});

input.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey) {
    return;
  }

  if (handleCommandShortcut(event)) {
    return;
  }

  if (event.key === "Alt") {
    typewriterState.marginRelease = true;
    setTemporaryStatus("Margin release", 650);
    playKey(0.06);
    return;
  }

  if (typeIntoTypewriter(event)) {
    event.preventDefault();
  }
});

input.addEventListener("keyup", releaseTypewriterModifier);
window.addEventListener("keyup", releaseTypewriterModifier);

resetButton.addEventListener("click", () => clearPage());
clearPageButton?.addEventListener("click", () => clearPage());

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
  strikeMachine("Export");
  playBell(0.16);
  setTemporaryStatus("Exported", 1200);
});

soundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ensureAudio();
    soundEnabled = !soundEnabled;
    updateSoundButtons();
    if (soundEnabled) {
      playBell(0.18);
    }
    input.focus({ preventScroll: true });
  });
});

ribbonCycleButton?.addEventListener("click", () => cycleRibbon());
zoomOutButton?.addEventListener("click", () => zoomOut());
whiteoutButton?.addEventListener("click", () => applyWhiteout());
snapshotButton?.addEventListener("click", () => saveAsImage());
rotateLeftButton?.addEventListener("click", () => rotateView(-0.18));
rotateRightButton?.addEventListener("click", () => rotateView(0.18));
leftMarginButton?.addEventListener("click", () => setMargin("left"));
rightMarginButton?.addEventListener("click", () => setMargin("right"));
sidebarToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const expanded = document.body.classList.contains("controls-hidden");
    setSidebarExpanded(expanded);
  });
});

inkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sceneState.ink = button.dataset.ink;
    document.documentElement.style.setProperty("--ink", button.dataset.ink);
    markSelected(inkButtons, button);
    renderPage();
    strikeMachine("Ink");
    playKey(0.08);
    input.focus({ preventScroll: true });
  });
});

paperButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sceneState.paperTone = button.dataset.paper;
    markSelected(paperButtons, button);
    renderPage();
    strikeMachine("Paper");
    playKey(0.08);
    input.focus({ preventScroll: true });
  });
});

window.addEventListener("resize", resizeScene);

function initScene() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x090706, 0.035);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 5.5, 10.6);
  camera.lookAt(0, 1.1, 0);

  sceneState.renderer = renderer;
  sceneState.scene = scene;
  sceneState.camera = camera;

  buildLighting(scene);
  buildDesk(scene);
  buildTypewriter(scene);
  resizeScene();
  animate();
}

function buildLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xffedd0, 0x070606, 1.15));

  const key = new THREE.DirectionalLight(0xffe0a8, 4.8);
  key.position.set(-4.5, 8, 6.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 22;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x7aa8ff, 0.9);
  rim.position.set(4.5, 5.5, -6);
  scene.add(rim);

  const paperGlow = new THREE.PointLight(0xffd79a, 1.7, 9);
  paperGlow.position.set(0, 3.8, 1.8);
  scene.add(paperGlow);

  const frontFill = new THREE.PointLight(0xf4c982, 2.8, 8);
  frontFill.position.set(0, 2.1, 4.9);
  scene.add(frontFill);

  const keyGlow = new THREE.PointLight(0xffd8a6, 2.6, 5.4);
  keyGlow.position.set(0, 1.75, 4.1);
  scene.add(keyGlow);
}

function buildDesk(scene) {
  const deskMaterial = new THREE.MeshStandardMaterial({
    color: 0x22170f,
    roughness: 0.84,
    metalness: 0.05
  });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(18, 0.28, 12), deskMaterial);
  desk.position.set(0, -0.82, 0.5);
  desk.receiveShadow = true;
  scene.add(desk);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 18),
    new THREE.MeshBasicMaterial({ color: 0x050403 })
  );
  back.position.set(0, 5.8, -8.2);
  scene.add(back);
}

function buildTypewriter(scene) {
  const machine = new THREE.Group();
  sceneState.machine = machine;
  scene.add(machine);

  const black = new THREE.MeshStandardMaterial({
    color: 0x11100d,
    roughness: 0.48,
    metalness: 0.72,
    envMapIntensity: 0.6
  });
  const wornBlack = new THREE.MeshStandardMaterial({
    color: 0x1b1611,
    roughness: 0.56,
    metalness: 0.68
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xd2a35e,
    roughness: 0.3,
    metalness: 0.86
  });
  const darkRubber = new THREE.MeshStandardMaterial({
    color: 0x060606,
    roughness: 0.74,
    metalness: 0.2
  });
  const ribbonRed = new THREE.MeshStandardMaterial({
    color: 0x6c1215,
    roughness: 0.46,
    metalness: 0.28
  });

  addBody(machine, black, wornBlack, brass);
  addPlaten(machine, darkRubber, brass);
  addPaper(machine);
  addRibbon(machine, black, brass, ribbonRed);
  addTypebars(machine, brass, black);
  addKeys(machine, black, brass);
  addLevers(machine, brass, darkRubber);
}

function addBody(machine, black, wornBlack, brass) {
  const base = roundedBox(9.4, 0.58, 4.9, 0.28, black);
  base.position.set(0, 0, 1.35);
  base.castShadow = true;
  base.receiveShadow = true;
  machine.add(base);

  const frontLip = roundedBox(8.5, 0.55, 0.52, 0.22, wornBlack);
  frontLip.position.set(0, 0.34, 3.55);
  frontLip.castShadow = true;
  machine.add(frontLip);

  const deck = roundedBox(8.3, 0.42, 3.2, 0.25, wornBlack);
  deck.position.set(0, 0.42, 1.75);
  deck.rotation.x = -0.1;
  deck.castShadow = true;
  deck.receiveShadow = true;
  machine.add(deck);

  const backRail = roundedBox(8.7, 0.26, 0.22, 0.08, black);
  backRail.position.set(0, 1.82, -1.05);
  backRail.castShadow = true;
  machine.add(backRail);

  [-4.9, 4.9].forEach((x) => {
    const side = roundedBox(0.82, 1.02, 4.15, 0.24, black);
    side.position.set(x, 0.42, 1.4);
    side.rotation.z = x > 0 ? -0.07 : 0.07;
    side.castShadow = true;
    machine.add(side);

    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 12, 44), brass);
    trim.position.set(x * 0.98, 0.8, 0.15);
    trim.rotation.y = Math.PI / 2;
    trim.castShadow = true;
    machine.add(trim);
  });

  const ruler = roundedBox(6.7, 0.08, 0.1, 0.02, brass);
  ruler.position.set(0, 1.98, -0.82);
  machine.add(ruler);

  for (let i = 0; i < 42; i += 1) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.015, i % 5 === 0 ? 0.14 : 0.08, 0.018), brass);
    tick.position.set(-3.2 + i * 0.156, 2.03, -0.74);
    machine.add(tick);
  }
}

function addPlaten(machine, darkRubber, brass) {
  const carriage = new THREE.Group();
  sceneState.carriage = carriage;
  machine.add(carriage);

  const platen = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 8.7, 48), darkRubber);
  platen.rotation.z = Math.PI / 2;
  platen.position.set(0, 3.0, -1.03);
  platen.castShadow = true;
  platen.receiveShadow = true;
  carriage.add(platen);

  [-4.75, 4.75].forEach((x) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.34, 40), darkRubber);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(x, 3.0, -1.03);
    knob.castShadow = true;
    carriage.add(knob);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.035, 12, 48), brass);
    ring.position.set(x + (x > 0 ? 0.18 : -0.18), 3.0, -1.03);
    ring.rotation.y = Math.PI / 2;
    carriage.add(ring);
  });
}

function addPaper(machine) {
  const paperCanvas = document.createElement("canvas");
  paperCanvas.width = 1536;
  paperCanvas.height = 768;
  const paperContext = paperCanvas.getContext("2d");
  const paperTexture = new THREE.CanvasTexture(paperCanvas);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.anisotropy = 8;

  const paperMaterial = new THREE.MeshStandardMaterial({
    map: paperTexture,
    roughness: 0.76,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.PlaneGeometry(7.8, 3.2, 32, 4);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    position.setZ(i, Math.sin((y + 1.6) / 3.2 * Math.PI) * -0.1);
  }
  geometry.computeVertexNormals();

  const paper = new THREE.Mesh(geometry, paperMaterial);
  paper.position.set(0, 3.16, -0.55);
  paper.castShadow = true;
  paper.receiveShadow = true;
  sceneState.paperMesh = paper;
  sceneState.paperCanvas = paperCanvas;
  sceneState.paperContext = paperContext;
  sceneState.paperTexture = paperTexture;
  sceneState.carriage.add(paper);
}

function addRibbon(machine, black, brass, ribbonRed) {
  [-3.15, 3.15].forEach((x) => {
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.22, 48), black);
    spool.position.set(x, 1.52, 0.15);
    spool.rotation.x = Math.PI / 2;
    spool.castShadow = true;
    machine.add(spool);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 12, 48), brass);
    ring.position.set(x, 1.52, 0.28);
    ring.castShadow = true;
    machine.add(ring);

    for (let i = 0; i < 5; i += 1) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 18), black);
      const angle = i * Math.PI * 0.4;
      hole.position.set(x + Math.cos(angle) * 0.28, 1.52 + Math.sin(angle) * 0.28, 0.31);
      hole.rotation.x = Math.PI / 2;
      machine.add(hole);
    }
  });

  const leftRibbon = makeRibbonSegment(new THREE.Vector3(-3.55, 1.46, 0.3), new THREE.Vector3(-0.1, 1.92, -0.55), 0.09, ribbonRed);
  const rightRibbon = makeRibbonSegment(new THREE.Vector3(3.55, 1.46, 0.3), new THREE.Vector3(0.1, 1.92, -0.55), 0.09, ribbonRed);
  machine.add(leftRibbon, rightRibbon);

  const ribbonGuide = roundedBox(0.74, 0.12, 0.16, 0.04, brass);
  ribbonGuide.position.set(0, 1.9, -0.48);
  ribbonGuide.rotation.x = -0.12;
  sceneState.ribbonGuide = ribbonGuide;
  machine.add(ribbonGuide);
}

function addTypebars(machine, brass, black) {
  const count = 31;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const spread = (t - 0.5) * 4.85;
    const start = new THREE.Vector3(spread, 1.1, 0.35 + Math.abs(t - 0.5) * 0.18);
    const rest = new THREE.Vector3(spread * 0.28, 1.77, -0.22);
    const target = new THREE.Vector3((t - 0.5) * 0.16, 2.72, -0.52);
    const rod = cylinderBetween(start, rest, 0.017, brass);
    const slug = roundedBox(0.16, 0.12, 0.07, 0.02, black);
    slug.position.copy(rest);
    slug.lookAt(target);
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), brass);
    hinge.position.copy(start);
    const arm = { start, rest, target, rod, slug, hinge, strikeStart: -Infinity, intensity: 0, phase: i / count };
    sceneState.typebars.push(arm);
    machine.add(rod, slug, hinge);
  }

  const basket = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.035, 12, 96, Math.PI), brass);
  basket.position.set(0, 1.03, 0.35);
  basket.rotation.x = Math.PI * 0.53;
  basket.rotation.z = Math.PI;
  machine.add(basket);
}

function addKeys(machine, black, brass) {
  const keyMaterial = new THREE.MeshStandardMaterial({
    color: 0x24180f,
    roughness: 0.38,
    metalness: 0.58
  });
  const keySpacingX = 0.52;
  const rowGap = 0.09;
  const rowZ = [1.12, 1.66, 2.2, 2.74, 3.24];
  const rowY = [1.14, 1.08, 1.01, 0.94, 0.86];
  const rowOffsets = [0, -0.06, -0.15, -0.04, 0];

  keyRows.forEach((row, rowIndex) => {
    const rowWidth = row.reduce((sum, item) => sum + keyUnit(item[2]) * keySpacingX, 0) + (row.length - 1) * rowGap;
    let cursor = -rowWidth / 2 + rowOffsets[rowIndex];

    const rowSocket = roundedBox(rowWidth + 0.34, 0.09, 0.12, 0.045, black);
    rowSocket.position.set(rowOffsets[rowIndex], rowY[rowIndex] - 0.32, rowZ[rowIndex] + 0.03);
    rowSocket.rotation.x = -0.18;
    machine.add(rowSocket);

    row.forEach(([value, label, variant]) => {
      const unit = keyUnit(variant);
      const width = unit * keySpacingX;
      const x = cursor + width / 2;
      const z = rowZ[rowIndex];
      const key = new THREE.Group();
      key.position.set(x, rowY[rowIndex], z);
      key.rotation.x = -0.18;
      key.userData.homeY = key.position.y;
      key.userData.press = 0;
      key.userData.value = value;
      key.userData.label = label;

      addKeyCap(key, width, variant, keyMaterial, brass);

      if (label) {
        const labelMesh = makeKeyLabel(label, width, variant);
        labelMesh.position.y = variant === "space" ? 0.184 : 0.176;
        labelMesh.rotation.x = -Math.PI / 2;
        key.add(labelMesh);
      }

      sceneState.keyObjects.push(key);
      registerKey(value, key);
      if (value.length === 1) {
        registerKey(value.toLowerCase(), key);
        registerKey(value.toUpperCase(), key);
      }
      key.addEventListener = null;
      machine.add(key);
      cursor += width + 0.08;
    });
  });

  registerKey(" ", sceneState.keys.get("Space"));
  registerKey("Delete", sceneState.keys.get("Backspace"));
}

function addKeyCap(key, width, variant, keyMaterial, brass) {
  if (variant === "wide" || variant === "space") {
    const stemCount = variant === "space" ? 3 : 2;
    const span = variant === "space" ? width * 0.34 : width * 0.28;
    for (let i = 0; i < stemCount; i += 1) {
      const t = stemCount === 1 ? 0 : i / (stemCount - 1) - 0.5;
      addKeyStem(key, t * span * 2, width, keyMaterial, brass);
    }

    const brassBase = roundedBox(width * 0.95, 0.1, variant === "space" ? 0.34 : 0.42, 0.18, brass);
    brassBase.position.y = 0.02;
    const top = roundedBox(width * 0.84, 0.12, variant === "space" ? 0.24 : 0.3, 0.13, keyMaterial);
    top.position.y = 0.1;
    key.add(brassBase, top);
    return;
  }

  addKeyStem(key, 0, width, keyMaterial, brass);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.41, width * 0.46, 0.14, 48),
    keyMaterial
  );
  cap.castShadow = true;
  cap.receiveShadow = true;
  key.add(cap);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(width * 0.43, 0.027, 12, 48), brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.085;
  key.add(rim);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.32, width * 0.33, 0.018, 48),
    new THREE.MeshStandardMaterial({
      color: 0x21180f,
      roughness: 0.24,
      metalness: 0.15,
      transparent: true,
      opacity: 0.94
    })
  );
  glass.position.y = 0.095;
  key.add(glass);
}

function addKeyStem(key, x, width, keyMaterial, brass) {
  const stemRadius = Math.min(0.062, width * 0.12);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(stemRadius, stemRadius * 1.08, 0.42, 18),
    keyMaterial
  );
  stem.position.set(x, -0.17, 0);
  stem.castShadow = true;
  stem.receiveShadow = true;
  key.add(stem);

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(stemRadius * 1.65, stemRadius * 1.95, 0.055, 28),
    brass
  );
  socket.position.set(x, -0.39, 0);
  socket.castShadow = true;
  socket.receiveShadow = true;
  key.add(socket);
}

function addLevers(machine, brass, darkRubber) {
  const lever = cylinderBetween(
    new THREE.Vector3(-4.4, 2.8, -1.15),
    new THREE.Vector3(-5.6, 1.4, 0.55),
    0.035,
    brass
  );
  machine.add(lever);

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), darkRubber);
  handle.position.set(-5.72, 1.26, 0.7);
  handle.castShadow = true;
  machine.add(handle);
}

function keyUnit(variant) {
  if (variant === "space") {
    return 10.2;
  }
  if (variant === "wide") {
    return 2.15;
  }
  return 1;
}

function makeKeyLabel(label, width, variant) {
  const texture = new THREE.CanvasTexture(drawKeyLabel(label, variant));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false
  });
  const labelWidth = variant === "wide" ? width * 0.86 : variant === "space" ? width * 0.84 : width * 0.88;
  const labelDepth = variant === "wide" ? 0.34 : variant === "space" ? 0.26 : width * 0.88;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(labelWidth, labelDepth), material);
  mesh.renderOrder = 10;
  return mesh;
}

function drawKeyLabel(label, variant) {
  const size = 512;
  const keyCanvas = document.createElement("canvas");
  keyCanvas.width = size;
  keyCanvas.height = size;
  const context = keyCanvas.getContext("2d");
  context.clearRect(0, 0, size, size);

  context.save();
  context.fillStyle = "rgba(26, 21, 15, 0.98)";
  context.strokeStyle = "rgba(240, 202, 133, 0.76)";
  context.lineWidth = 9;
  if (variant === "wide" || variant === "space") {
    roundedRectPath(context, 34, variant === "space" ? 150 : 122, size - 68, variant === "space" ? 212 : 268, 58);
    context.fill();
    context.stroke();
  } else {
    context.beginPath();
    context.arc(size / 2, size / 2, 204, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();

  context.fillStyle = "#fff1c8";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.75)";
  context.shadowBlur = 10;
  const lines = label.split("\n");
  const compact = label.length > 5;
  if (variant === "wide") {
    context.font = compact ? "800 108px Georgia" : "800 136px Georgia";
  } else if (variant === "space") {
    context.font = "800 72px Georgia";
  } else {
    context.font = lines.length > 1 ? "800 138px Georgia" : "800 242px Georgia";
  }
  const lineStep = variant === "wide" ? 108 : 152;
  lines.forEach((line, index) => {
    context.fillText(line, size / 2, size / 2 + (index - (lines.length - 1) / 2) * lineStep);
  });
  return keyCanvas;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function roundedBox(width, height, depth, radius, material) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.01, width - radius * 2), height, depth),
    material
  );
  const side = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, Math.max(0.01, depth - radius * 2)),
    material
  );
  group.add(core, side);
  [
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ].forEach(([sx, sz]) => {
    const corner = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
    corner.scale.y = height / (radius * 2);
    corner.position.set(sx * (width / 2 - radius), 0, sz * (depth / 2 - radius));
    group.add(corner);
  });
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function makeRibbonSegment(from, to, thickness, material) {
  const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const length = from.distanceTo(to);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, thickness, 0.035), material);
  mesh.position.copy(midpoint);
  mesh.rotation.y = Math.atan2(from.z - to.z, to.x - from.x);
  mesh.rotation.z = Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z));
  mesh.castShadow = true;
  return mesh;
}

function cylinderBetween(from, to, radius, material) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function updateCylinderBetween(mesh, from, to) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  mesh.scale.y = length / (mesh.geometry.parameters.height || 1);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function registerKey(value, key) {
  if (value && key) {
    sceneState.keys.set(value, key);
  }
}

function releaseTypewriterModifier(event) {
  if (event.key === "Alt" && typewriterState.marginRelease) {
    typewriterState.marginRelease = false;
    setTemporaryStatus("Margin locked", 500);
    playKey(0.04);
  }
}

function typeIntoTypewriter(event) {
  const key = event.key === "Spacebar" ? " " : event.key;
  ensureAudio();

  if (event.altKey) {
    typewriterState.marginRelease = true;
  }

  if (key === "Shift" || key === "CapsLock") {
    strikeMachine(key);
    playKey(0.055);
    return true;
  }

  if (key === "Backspace") {
    moveCarriage(-1);
    strikeMachine("Backspace");
    playThud();
    return true;
  }

  if (key === "Delete") {
    applyWhiteout();
    return true;
  }

  if (key === "Enter") {
    returnCarriage();
    return true;
  }

  if (key === "PageUp" || key === "ArrowUp") {
    moveRoller(-1);
    return true;
  }

  if (key === "PageDown" || key === "ArrowDown") {
    moveRoller(1);
    return true;
  }

  if (key === "ArrowLeft") {
    setTemporaryStatus("Use Backspace");
    playThud();
    return true;
  }

  if (key === "ArrowRight") {
    setTemporaryStatus("Use Space");
    playThud();
    return true;
  }

  if (key === "`" || key === "§") {
    halfSpace();
    return true;
  }

  if (key.length === 1) {
    printTypewriterCharacter(key);
    return true;
  }

  return false;
}

function getPaperLines() {
  return input.value.split("\n");
}

function ensurePaperLine(lines, row) {
  while (lines.length <= row) {
    lines.push("");
  }
}

function writePaperLines(lines) {
  input.value = lines.join("\n");
  setTextareaCaretFromCarriage();
  renderPage();
}

function printTypewriterCharacter(character) {
  if (typewriterState.col >= typewriterState.rightMargin && !typewriterState.marginRelease) {
    setTemporaryStatus("Right margin");
    playBell(0.14);
    return;
  }

  const lines = getPaperLines();
  ensurePaperLine(lines, typewriterState.row);
  const column = Math.max(0, Math.floor(typewriterState.col));
  const currentLine = lines[typewriterState.row].padEnd(column + 1, " ");
  lines[typewriterState.row] = `${currentLine.slice(0, column)}${character}${currentLine.slice(column + 1)}`;
  typewriterState.col += 1;
  setStatus("Writing");
  strikeMachine(character);
  playKey();
  writePaperLines(lines);
  ringMarginBell();
}

function moveCarriage(delta) {
  const next = typewriterState.col + delta;
  if (next < typewriterState.leftMargin && !typewriterState.marginRelease) {
    setTemporaryStatus("Left margin");
    return;
  }

  typewriterState.col = Math.max(0, next);
  typewriterState.lastBellColumn = -1;
  setTextareaCaretFromCarriage();
  updateCarriage();
  setTemporaryStatus("Carriage moved");
}

function moveRoller(delta) {
  typewriterState.row = Math.max(0, typewriterState.row + delta);
  const lines = getPaperLines();
  ensurePaperLine(lines, typewriterState.row);
  input.value = lines.join("\n");
  setTextareaCaretFromCarriage();
  renderPage();
  strikeMachine(delta > 0 ? "PageDown" : "PageUp");
  playReturn();
  setTemporaryStatus(delta > 0 ? "Roller down" : "Roller up");
}

function returnCarriage() {
  typewriterState.row += 1;
  typewriterState.col = typewriterState.leftMargin;
  typewriterState.lastBellColumn = -1;
  const lines = getPaperLines();
  ensurePaperLine(lines, typewriterState.row);
  input.value = lines.join("\n");
  setTextareaCaretFromCarriage();
  renderPage();
  strikeMachine("Enter");
  sceneState.returnSweep = 1;
  sceneState.carriageJerk = -0.5;
  playReturn();
  setTemporaryStatus("Carriage return");
}

function halfSpace() {
  typewriterState.col += 0.5;
  setTextareaCaretFromCarriage();
  updateCarriage();
  strikeMachine("`");
  playKey(0.08);
  setTemporaryStatus("Half-space");
}

function setMargin(side) {
  const column = Math.max(0, Math.round(typewriterState.col));
  if (side === "left") {
    typewriterState.leftMargin = Math.min(column, typewriterState.rightMargin - 2);
    if (typewriterState.col < typewriterState.leftMargin) {
      typewriterState.col = typewriterState.leftMargin;
    }
    setTemporaryStatus("Left margin set");
  } else {
    typewriterState.rightMargin = Math.max(column, typewriterState.leftMargin + 2);
    setTemporaryStatus("Right margin set");
  }
  typewriterState.lastBellColumn = -1;
  updateCarriage();
  strikeMachine(side === "left" ? "F3" : "F4");
  playBell(0.1);
}

function resetMargins() {
  typewriterState.leftMargin = defaultMargins.left;
  typewriterState.rightMargin = defaultMargins.right;
  typewriterState.lastBellColumn = -1;
}

function syncCarriageFromInput() {
  if (!input.value) {
    typewriterState.row = 0;
    typewriterState.col = 0;
    return;
  }
  const caret = input.selectionStart ?? input.value.length;
  const beforeCaret = input.value.slice(0, caret);
  const lines = beforeCaret.split("\n");
  typewriterState.row = Math.max(0, lines.length - 1);
  typewriterState.col = lines[lines.length - 1]?.length || 0;
}

function setTextareaCaretFromCarriage() {
  const lines = getPaperLines();
  ensurePaperLine(lines, typewriterState.row);
  const column = Math.max(0, Math.floor(typewriterState.col));
  lines[typewriterState.row] = lines[typewriterState.row].padEnd(column, " ");
  const index = lines.slice(0, typewriterState.row).reduce((sum, line) => sum + line.length + 1, 0) + column;
  input.value = lines.join("\n");
  input.setSelectionRange(index, index);
}

function ringMarginBell() {
  const nearRightMargin = typewriterState.col >= typewriterState.rightMargin - 5 && typewriterState.col <= typewriterState.rightMargin;
  if (nearRightMargin && typewriterState.lastBellColumn !== typewriterState.row) {
    typewriterState.lastBellColumn = typewriterState.row;
    window.setTimeout(() => playBell(0.1), 24);
  } else if (!nearRightMargin) {
    typewriterState.lastBellColumn = -1;
  }
}

function strikeMachine(value) {
  const normalized = value === " " ? " " : value;
  const key = sceneState.keys.get(normalized) || sceneState.keys.get(String(normalized).toLowerCase());
  if (key) {
    key.userData.press = 1;
  }

  const index = keyIndexForValue(normalized);
  const primary = sceneState.typebars[index % sceneState.typebars.length];
  if (primary) {
    const now = performance.now();
    primary.strikeStart = now;
    primary.intensity = 1;
    const previous = sceneState.typebars[(index - 1 + sceneState.typebars.length) % sceneState.typebars.length];
    const next = sceneState.typebars[(index + 1) % sceneState.typebars.length];
    previous.strikeStart = now + 22;
    previous.intensity = Math.max(previous.intensity, 0.28);
    next.strikeStart = now + 18;
    next.intensity = Math.max(next.intensity, 0.32);
    sceneState.lastStrike = now;
  }

  sceneState.paperImpact = 1;
  sceneState.ribbonPulse = 1;
  sceneState.carriageJerk += normalized === "Enter" ? -0.34 : 0.055;
  sceneState.targetDeckJolt = 1;
  window.setTimeout(() => {
    sceneState.targetDeckJolt = 0;
  }, 90);
}

function keyIndexForValue(value) {
  const stringValue = String(value || "");
  let total = 0;
  for (let i = 0; i < stringValue.length; i += 1) {
    total += stringValue.charCodeAt(i);
  }
  return Math.abs(total || 7);
}

function renderPage() {
  output.textContent = input.value;
  const words = input.value.trim().match(/\S+/g);
  wordCount.textContent = words ? words.length : 0;
  drawPaper();
  updateCarriage();
}

function drawPaper() {
  const context = sceneState.paperContext;
  const paperCanvas = sceneState.paperCanvas;
  const tone = paperTones[sceneState.paperTone] || paperTones.ivory;
  if (!context || !paperCanvas) {
    return;
  }

  const { width, height } = paperCanvas;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, lighten(tone.base, 0.11));
  gradient.addColorStop(0.55, tone.base);
  gradient.addColorStop(1, darken(tone.base, 0.08));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = tone.grid;
  for (let x = 0; x < width; x += 34) {
    context.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += 34) {
    context.fillRect(0, y, width, 1);
  }

  const vignette = context.createRadialGradient(width * 0.5, height * 0.45, 40, width * 0.5, height * 0.5, width * 0.72);
  vignette.addColorStop(0, "rgba(255,255,255,0.2)");
  vignette.addColorStop(1, "rgba(79,48,20,0.18)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  context.fillStyle = sceneState.ink;
  context.textBaseline = "top";
  context.font = "700 35px Courier New, monospace";
  const paperLines = input.value ? input.value.split(/\r?\n/) : [""];
  const firstVisibleLine = Math.max(0, typewriterState.row - 8);
  const lines = paperLines.slice(firstVisibleLine, firstVisibleLine + 9);
  const marginX = 180;
  const marginY = 138;
  const lineHeight = 54;
  lines.slice(0, 9).forEach((line, lineIndex) => {
    let x = marginX;
    const y = marginY + lineIndex * lineHeight;
    [...line].forEach((char, charIndex) => {
      context.globalAlpha = 0.78 + Math.abs(jitter(charIndex + lineIndex * 31, 0.18));
      context.save();
      context.translate(x + jitter(charIndex, 1.6), y + jitter(charIndex + 17, 2.2));
      context.rotate((jitter(charIndex + 29, 0.45) * Math.PI) / 180);
      context.fillText(char, 0, 0);
      context.restore();
      x += context.measureText(char).width || 20;
    });
  });
  context.globalAlpha = 1;

  if (document.activeElement === input || input.value) {
    const caretLine = Math.max(0, Math.min(typewriterState.row - firstVisibleLine, 8));
    const caretText = (paperLines[typewriterState.row] || "").slice(0, Math.max(0, Math.floor(typewriterState.col)));
    const caretX = marginX + context.measureText(caretText).width + 7;
    const caretY = marginY + caretLine * lineHeight + 3;
    context.fillRect(caretX, caretY, 5, 42);
  }

  sceneState.paperTexture.needsUpdate = true;
}

function updateCarriage() {
  const column = currentColumn();
  sceneState.targetCarriageShift = Math.max(-0.42, Math.min(0.42, (column - 28) * -0.016));
}

function animate() {
  requestAnimationFrame(animate);
  const state = sceneState;
  const now = performance.now();
  const time = now * 0.001;

  state.pointer.x += (state.targetPointer.x - state.pointer.x) * 0.04;
  state.pointer.y += (state.targetPointer.y - state.pointer.y) * 0.04;
  state.carriageShift += (state.targetCarriageShift - state.carriageShift) * 0.16;
  state.deckJolt += (state.targetDeckJolt - state.deckJolt) * 0.2;
  state.carriageJerk *= 0.72;
  state.paperImpact *= 0.72;
  state.ribbonPulse *= 0.68;
  state.returnSweep *= 0.82;

  if (state.machine) {
    state.viewRotation += (state.targetViewRotation - state.viewRotation) * 0.12;
    state.machine.rotation.y = state.viewRotation + state.pointer.x * 0.035;
    state.machine.rotation.x = -0.015 - state.pointer.y * 0.018;
    state.machine.position.x = state.baseMachineX;
    state.machine.position.y = state.baseMachineY - state.deckJolt * 0.025;
    state.machine.position.z = state.baseMachineZ;
  }

  if (state.carriage) {
    state.carriage.position.x = state.carriageShift + state.carriageJerk - state.returnSweep * 0.18;
  }

  state.keyObjects.forEach((key) => {
    key.userData.press *= 0.72;
    key.position.y = key.userData.homeY - key.userData.press * 0.16 - state.deckJolt * 0.015;
  });

  state.typebars.forEach((arm) => {
    const elapsed = now - arm.strikeStart;
    let lift = 0;
    if (elapsed >= 0 && elapsed < 260) {
      const t = elapsed / 260;
      const attack = 0.34;
      lift = t < attack
        ? easeOutCubic(t / attack)
        : 1 - easeInCubic((t - attack) / (1 - attack));
      lift *= arm.intensity;
    } else if (elapsed >= 260) {
      arm.intensity = 0;
    }
    const end = arm.rest.clone().lerp(arm.target, lift);
    const impact = Math.max(0, 1 - Math.abs(elapsed - 88) / 34) * arm.intensity;
    end.y += impact * 0.06;
    end.z -= impact * 0.05;
    end.x += Math.sin(time * 3 + arm.phase * 8) * 0.01 * (1 - lift);
    updateCylinderBetween(arm.rod, arm.start, end);
    arm.slug.position.copy(end);
    arm.slug.lookAt(arm.target);
  });

  if (state.paperMesh) {
    state.paperMesh.position.z = -0.55 + state.paperImpact * 0.035;
    state.paperMesh.position.y = 3.16 + state.returnSweep * 0.045;
  }

  if (state.ribbonGuide) {
    state.ribbonGuide.position.y = 1.9 + state.ribbonPulse * 0.28;
    state.ribbonGuide.position.z = -0.48 - state.ribbonPulse * 0.05;
  }

  state.renderer.render(state.scene, state.camera);
}

function resizeScene() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  sceneState.renderer.setSize(width, height, false);
  sceneState.camera.aspect = width / height;
  const isCompact = width < 1120;
  const isMobile = width < 760;
  const zoom = sceneState.zoom;
  sceneState.camera.position.set(0, isMobile ? 4.85 : isCompact ? 5.55 : 5.75, (isMobile ? 15.1 : isCompact ? 14.2 : 13.6) * zoom);
  sceneState.camera.fov = isMobile ? 40 : isCompact ? 36 : 32;
  sceneState.camera.lookAt(0, isMobile ? 0.95 : 0.9, isMobile ? 1.0 : 0.55);
  if (sceneState.machine) {
    const scale = isMobile ? Math.max(0.42, Math.min(0.5, width / 820)) : isCompact ? 0.76 : 0.82;
    const railVisible = !document.body.classList.contains("controls-hidden");
    sceneState.machine.scale.setScalar(scale);
    sceneState.baseMachineX = !isMobile && railVisible ? 0.85 : 0;
    sceneState.baseMachineY = isMobile ? -0.58 : isCompact ? -0.66 : -0.54;
    sceneState.baseMachineZ = isMobile ? 1.32 : isCompact ? 0.78 : 0.52;
  }
  sceneState.camera.updateProjectionMatrix();
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

function clearPage() {
  input.value = "";
  typewriterState.row = 0;
  typewriterState.col = 0;
  resetMargins();
  setTextareaCaretFromCarriage();
  renderPage();
  input.focus({ preventScroll: true });
  setStatus("Ready");
  strikeMachine("Enter");
  sceneState.returnSweep = 1;
  sceneState.carriageJerk = -0.5;
  playReturn();
}

function cycleRibbon() {
  const currentIndex = Math.max(0, inkButtons.findIndex((button) => button.classList.contains("is-selected")));
  const next = inkButtons[(currentIndex + 1) % inkButtons.length];
  if (next) {
    next.click();
    setTemporaryStatus("Ribbon changed");
  }
}

function applyWhiteout() {
  const lines = getPaperLines();
  ensurePaperLine(lines, typewriterState.row);
  let column = Math.max(0, Math.floor(typewriterState.col));
  const line = lines[typewriterState.row] || "";
  if ((!line[column] || line[column] === " ") && column > 0) {
    column -= 1;
  }
  lines[typewriterState.row] = line.padEnd(column + 1, " ");
  lines[typewriterState.row] = `${lines[typewriterState.row].slice(0, column)} ${lines[typewriterState.row].slice(column + 1)}`;
  typewriterState.col = column + 1;
  writePaperLines(lines);
  input.focus({ preventScroll: true });
  setTemporaryStatus("White-out");
  strikeMachine("Delete");
  playThud();
}

function zoomOut() {
  sceneState.zoom = sceneState.zoom >= 1.24 ? 1 : Math.min(1.26, sceneState.zoom + 0.13);
  resizeScene();
  input.focus({ preventScroll: true });
  setTemporaryStatus(sceneState.zoom === 1 ? "Zoom reset" : "Zoomed out");
  playKey(0.08);
}

function rotateView(amount) {
  sceneState.targetViewRotation = Math.max(-0.42, Math.min(0.42, sceneState.targetViewRotation + amount));
  input.focus({ preventScroll: true });
  setTemporaryStatus(amount < 0 ? "Rotated left" : "Rotated right");
  strikeMachine("Rotate");
  playKey(0.08);
}

function saveAsImage() {
  const imageCanvas = sceneState.renderer?.domElement || canvas;
  if (!imageCanvas?.toBlob) {
    setStatus("Image unavailable");
    return;
  }

  imageCanvas.toBlob((blob) => {
    if (!blob) {
      setStatus("Image unavailable");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "typewriter-snapshot.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setTemporaryStatus("Image saved", 1200);
    strikeMachine("Image");
    playBell(0.12);
  }, "image/png");
}

function setSidebarExpanded(expanded, options = {}) {
  document.body.classList.toggle("controls-hidden", !expanded);
  sidebarToggleButtons.forEach((button) => {
    button.setAttribute("aria-expanded", String(expanded));
    const label = button.querySelector("[data-sidebar-label]");
    if (label) {
      label.textContent = expanded ? "Hide sidebar" : "Show controls";
    }
  });
  resizeScene();
  if (options.focus !== false) {
    input.focus({ preventScroll: true });
  }
}

function handleCommandShortcut(event) {
  if (event.key === "F1") {
    event.preventDefault();
    cycleRibbon();
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    zoomOut();
    return true;
  }
  if (event.key === "Delete") {
    event.preventDefault();
    applyWhiteout();
    return true;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    setSidebarExpanded(document.body.classList.contains("controls-hidden"));
    return true;
  }
  if (event.key === "F3") {
    event.preventDefault();
    setMargin("left");
    return true;
  }
  if (event.key === "F4") {
    event.preventDefault();
    setMargin("right");
    return true;
  }
  if (event.key === "F5") {
    event.preventDefault();
    rotateView(-0.18);
    return true;
  }
  if (event.key === "F6") {
    event.preventDefault();
    rotateView(0.18);
    return true;
  }
  if (event.key === "F10") {
    event.preventDefault();
    clearPage();
    return true;
  }
  return false;
}

function updateSoundButtons() {
  soundButtons.forEach((button) => button.setAttribute("aria-pressed", String(soundEnabled)));
  soundLabels.forEach((label) => {
    label.textContent = soundEnabled ? "Sound on" : "Sound off";
  });
}

function setStatus(status) {
  if (statusTimer) {
    window.clearTimeout(statusTimer);
    statusTimer = undefined;
  }
  readyLabel.textContent = status;
}

function setTemporaryStatus(status, delay = 900) {
  if (statusTimer) {
    window.clearTimeout(statusTimer);
  }
  readyLabel.textContent = status;
  statusTimer = window.setTimeout(() => {
    statusTimer = undefined;
    readyLabel.textContent = document.activeElement === input ? "Writing" : "Ready";
  }, delay);
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
  return Math.max(0, Math.floor(typewriterState.col));
}

function jitter(index, amount) {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * amount;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value) {
  return value ** 3;
}

function lighten(hex, amount) {
  return shade(hex, amount);
}

function darken(hex, amount) {
  return shade(hex, -amount);
}

function shade(hex, amount) {
  const value = hex.replace("#", "");
  const number = parseInt(value, 16);
  const r = Math.min(255, Math.max(0, Math.round((number >> 16) + 255 * amount)));
  const g = Math.min(255, Math.max(0, Math.round(((number >> 8) & 255) + 255 * amount)));
  const b = Math.min(255, Math.max(0, Math.round((number & 255) + 255 * amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
