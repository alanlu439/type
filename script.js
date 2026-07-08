import * as THREE from "./assets/three.module.js";

const input = document.querySelector("[data-input]");
const output = document.querySelector("[data-output]");
const stage = document.querySelector("[data-stage]");
const canvas = document.querySelector("[data-scene]");
const wordCount = document.querySelector("[data-word-count]");
const readyLabel = document.querySelector("[data-ready-label]");
const exportPdfButton = document.querySelector("[data-export-pdf]");
const resetButton = document.querySelector("[data-reset]");
const focusButton = document.querySelector("[data-focus-mode]");
const focusLabel = document.querySelector("[data-focus-label]");
const clearPageButton = document.querySelector("[data-clear-page]");
const ribbonCycleButton = document.querySelector("[data-ribbon-cycle]");
const zoomOutButton = document.querySelector("[data-zoom-out]");
const correctionRibbonButton = document.querySelector("[data-correction-ribbon]");
const marginReleaseButton = document.querySelector("[data-margin-release]");
const tabStopButton = document.querySelector("[data-tab-stop]");
const paperUpButton = document.querySelector("[data-paper-up]");
const paperDownButton = document.querySelector("[data-paper-down]");
const carriageReturnButton = document.querySelector("[data-carriage-return]");
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

const seedText = "";

const paperTones = {
  ivory: { base: "#efe2ca", edge: "#cdbb9c", grid: "rgba(91, 67, 42, 0.08)" },
  linen: { base: "#dbc39c", edge: "#bda275", grid: "rgba(78, 56, 34, 0.1)" },
  mist: { base: "#d8d4c9", edge: "#b1ab9b", grid: "rgba(68, 64, 58, 0.08)" }
};

const paperMetrics = {
  canvasWidth: 2048,
  canvasHeight: 1024,
  planeWidth: 7.8,
  planeHeight: 3.2,
  marginX: 240,
  printLineY: 600,
  lineHeight: 72,
  charPitch: 28
};

const stateVersion = 3;
const storageKey = `type-state-v${stateVersion}`;
const ribbonShortcutColors = ["#201b17", "#641b1f"];

const printHeadMetrics = {
  glyphCenterX: -0.22,
  glyphCenterY: 32,
  contactY: 3.535,
  contactZ: -0.42,
  ribbonRestY: 1.9,
  ribbonRestZ: -0.48,
  strikeDuration: 220,
  strikeContactTime: 58,
  strikeAttackRatio: 0.28,
  strikeDwellRatio: 0.08,
  escapementDelay: 98
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

const printableTypeOrder = keyRows
  .flat()
  .map(([value]) => value)
  .filter((value) => value.length === 1)
  .map((value) => value.toLowerCase());

const defaultMargins = {
  left: 0,
  right: 56
};

const tabStops = [8, 16, 24, 32, 40, 48, 56];

const typewriterState = {
  row: 0,
  col: 0,
  leftMargin: defaultMargins.left,
  rightMargin: defaultMargins.right,
  marginRelease: false,
  lastBellColumn: -1,
  rollOffset: 0,
  correctionMode: false
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
  strikeHammer: null,
  activeStrikeArm: null,
  keys: new Map(),
  keyObjects: [],
  typebars: [],
  baseMachineX: 0,
  carriageShift: 0,
  targetCarriageShift: 0,
  carriageJerk: 0,
  carriageHoldUntil: 0,
  paperImpact: 0,
  paperImpactStart: 0,
  ribbonPulse: 0,
  ribbonStrikeStart: -Infinity,
  returnSweep: 0,
  shiftLift: 0,
  printGates: [],
  baseMachineY: -0.08,
  baseMachineZ: 0,
  zoom: 1,
  focusMode: false,
  paperAngle: 0,
  targetPaperAngle: 0,
  cameraTargetPosition: new THREE.Vector3(0, 5.5, 10.6),
  cameraLookAt: new THREE.Vector3(0, 1.1, 0),
  cameraTargetLookAt: new THREE.Vector3(0, 1.1, 0),
  cameraTargetFov: 32,
  ink: "#201b17",
  paperTone: "ivory",
  lastStrike: 0
};

let audioContext;
let soundEnabled = true;
let statusTimer;
let stateSaveTimer;

initScene();
if (!restoreState()) {
  input.value = seedText;
  input.setSelectionRange(input.value.length, input.value.length);
  setSidebarExpanded(true, { focus: false, persist: false });
}
syncCarriageFromInput();
renderPage();
updateFocusButton();
input.focus({ preventScroll: true });

stage.addEventListener("pointerdown", () => {
  ensureAudio();
  input.focus({ preventScroll: true });
});

input.addEventListener("focus", () => setStatus("Writing"));
input.addEventListener("blur", () => setStatus("Ready"));

input.addEventListener("input", () => {
  setStatus("Writing");
  syncCarriageFromInput();
  renderPage();
  queueSaveState();
});

input.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey) {
    return;
  }

  if (handleCommandShortcut(event, { fromInput: true })) {
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
window.addEventListener("keydown", (event) => {
  if (!shouldRouteGlobalShortcut(event)) {
    return;
  }
  handleCommandShortcut(event);
});

resetButton.addEventListener("click", () => clearPage());
clearPageButton?.addEventListener("click", () => clearPage());
focusButton?.addEventListener("click", () => setFocusMode(!sceneState.focusMode));

exportPdfButton.addEventListener("click", () => {
  const pdf = buildPdf(input.value || " ");
  downloadPdf(pdf);
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
    queueSaveState();
    input.focus({ preventScroll: true });
  });
});

ribbonCycleButton?.addEventListener("click", () => cycleRibbon());
zoomOutButton?.addEventListener("click", () => zoomOut());
correctionRibbonButton?.addEventListener("click", () => applyWhiteout());
marginReleaseButton?.addEventListener("click", () => toggleMarginRelease());
tabStopButton?.addEventListener("click", () => moveToNextTabStop());
paperUpButton?.addEventListener("click", () => moveRoller(-1));
paperDownButton?.addEventListener("click", () => moveRoller(1));
carriageReturnButton?.addEventListener("click", () => returnCarriage());
snapshotButton?.addEventListener("click", () => saveAsImage());
rotateLeftButton?.addEventListener("click", () => rotatePaper(-0.05));
rotateRightButton?.addEventListener("click", () => rotatePaper(0.05));
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
    queueSaveState();
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
    queueSaveState();
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
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 3));
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
  sceneState.cameraTargetPosition.copy(camera.position);
  sceneState.cameraLookAt.set(0, 1.1, 0);
  sceneState.cameraTargetLookAt.copy(sceneState.cameraLookAt);
  sceneState.cameraTargetFov = camera.fov;

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
  key.shadow.mapSize.set(4096, 4096);
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
  addReferenceBodyFill(machine, black, wornBlack, brass, darkRubber);
  addFullBodyShell(machine, black, wornBlack, brass, darkRubber);
  addPlaten(machine, darkRubber, brass);
  addPaper(machine);
  addCarriageDetails(brass, darkRubber, black);
  addRibbon(machine, black, brass, ribbonRed);
  addTypebars(machine, brass, black);
  addActiveHammer(machine, brass, black);
  addKeys(machine, black, brass);
  addKeyLinkages(machine, brass, black);
  addLevers(machine, brass, darkRubber);
  addMachineDetails(machine, black, wornBlack, brass, darkRubber);
  addAssemblyConnectors(machine, black, wornBlack, brass, darkRubber);
}

function addBody(machine, black, wornBlack, brass) {
  const lowerPan = roundedBox(9.85, 0.44, 5.05, 0.32, black);
  lowerPan.position.set(0, -0.26, 1.36);
  lowerPan.castShadow = true;
  lowerPan.receiveShadow = true;
  machine.add(lowerPan);

  const base = roundedBox(9.4, 0.58, 4.9, 0.28, black);
  base.position.set(0, 0, 1.35);
  base.castShadow = true;
  base.receiveShadow = true;
  machine.add(base);

  const frontApron = roundedBox(9.05, 0.74, 0.58, 0.22, black);
  frontApron.position.set(0, 0.08, 3.72);
  frontApron.castShadow = true;
  frontApron.receiveShadow = true;
  machine.add(frontApron);

  const frontLip = roundedBox(8.5, 0.55, 0.52, 0.22, wornBlack);
  frontLip.position.set(0, 0.34, 3.55);
  frontLip.castShadow = true;
  machine.add(frontLip);

  const keyBed = roundedBox(8.45, 0.22, 3.08, 0.2, wornBlack);
  keyBed.position.set(0, 0.56, 2.18);
  keyBed.rotation.x = -0.12;
  keyBed.castShadow = true;
  keyBed.receiveShadow = true;
  machine.add(keyBed);

  const deck = roundedBox(8.3, 0.42, 3.2, 0.25, wornBlack);
  deck.position.set(0, 0.42, 1.75);
  deck.rotation.x = -0.1;
  deck.castShadow = true;
  deck.receiveShadow = true;
  machine.add(deck);

  const rearShoulder = roundedBox(8.75, 0.48, 1.2, 0.2, black);
  rearShoulder.position.set(0, 0.68, 0);
  rearShoulder.rotation.x = -0.05;
  rearShoulder.castShadow = true;
  rearShoulder.receiveShadow = true;
  machine.add(rearShoulder);

  const typeBasketPlate = roundedBox(4.35, 0.18, 1.14, 0.12, wornBlack);
  typeBasketPlate.position.set(0, 0.86, 0.74);
  typeBasketPlate.rotation.x = -0.08;
  typeBasketPlate.castShadow = true;
  typeBasketPlate.receiveShadow = true;
  machine.add(typeBasketPlate);

  const carriageBridge = roundedBox(8.95, 0.22, 0.46, 0.12, black);
  carriageBridge.position.set(0, 2.08, -0.94);
  carriageBridge.castShadow = true;
  carriageBridge.receiveShadow = true;
  machine.add(carriageBridge);

  const backRail = roundedBox(8.7, 0.26, 0.22, 0.08, black);
  backRail.position.set(0, 1.82, -1.05);
  backRail.castShadow = true;
  machine.add(backRail);

  [-4.9, 4.9].forEach((x) => {
    const sideFill = roundedBox(0.92, 0.82, 4.65, 0.24, black);
    sideFill.position.set(x * 0.94, 0.08, 1.42);
    sideFill.rotation.z = x > 0 ? -0.05 : 0.05;
    sideFill.castShadow = true;
    sideFill.receiveShadow = true;
    machine.add(sideFill);

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

function addReferenceBodyFill(machine, black, wornBlack, brass, darkRubber) {
  const glossyBlack = new THREE.MeshStandardMaterial({
    color: 0x070605,
    roughness: 0.32,
    metalness: 0.8,
    envMapIntensity: 0.72
  });
  const agedSteel = new THREE.MeshStandardMaterial({
    color: 0xb9aa8d,
    roughness: 0.38,
    metalness: 0.82
  });

  const keyboardSurround = roundedBox(8.95, 0.18, 3.8, 0.32, glossyBlack);
  keyboardSurround.position.set(0, 0.64, 2.18);
  keyboardSurround.rotation.x = -0.12;
  keyboardSurround.castShadow = true;
  keyboardSurround.receiveShadow = true;
  machine.add(keyboardSurround);

  const frontBezel = roundedBox(8.85, 0.24, 0.35, 0.16, glossyBlack);
  frontBezel.position.set(0, 0.78, 3.15);
  frontBezel.rotation.x = -0.12;
  frontBezel.castShadow = true;
  frontBezel.receiveShadow = true;
  machine.add(frontBezel);

  [-1, 1].forEach((side) => {
    const shoulder = roundedBox(1.12, 0.48, 3.25, 0.32, glossyBlack);
    shoulder.position.set(side * 4.28, 0.78, 1.65);
    shoulder.rotation.x = -0.08;
    shoulder.rotation.z = side * -0.05;
    shoulder.castShadow = true;
    shoulder.receiveShadow = true;
    machine.add(shoulder);

    const rearCheek = roundedBox(1.22, 0.82, 1.32, 0.32, glossyBlack);
    rearCheek.position.set(side * 3.65, 1.25, 0.12);
    rearCheek.rotation.z = side * -0.06;
    rearCheek.castShadow = true;
    rearCheek.receiveShadow = true;
    machine.add(rearCheek);

    const trimRail = cylinderBetween(
      new THREE.Vector3(side * 3.96, 0.98, 3.15),
      new THREE.Vector3(side * 3.52, 1.34, 0.05),
      0.018,
      brass
    );
    machine.add(trimRail);
  });

  const segmentWell = roundedBox(5.25, 0.22, 1.2, 0.32, wornBlack);
  segmentWell.position.set(0, 0.98, 0.84);
  segmentWell.rotation.x = -0.1;
  segmentWell.castShadow = true;
  segmentWell.receiveShadow = true;
  machine.add(segmentWell);

  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.08, 14, 120, Math.PI), agedSteel);
  basketRim.position.set(0, 1.18, 0.62);
  basketRim.rotation.x = Math.PI * 0.54;
  basketRim.rotation.z = Math.PI;
  basketRim.castShadow = true;
  basketRim.receiveShadow = true;
  machine.add(basketRim);

  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.028, 10, 96, Math.PI), brass);
  innerRim.position.set(0, 1.2, 0.68);
  innerRim.rotation.x = Math.PI * 0.54;
  innerRim.rotation.z = Math.PI;
  innerRim.castShadow = true;
  machine.add(innerRim);

  for (let i = 0; i <= 48; i += 1) {
    const t = i / 48;
    const angle = Math.PI * (1 - t);
    const x = Math.cos(angle) * 2.03;
    const z = 0.64 + Math.sin(angle) * 0.78;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.11, 0.16), agedSteel);
    tooth.position.set(x, 1.27, z);
    tooth.rotation.y = -angle + Math.PI / 2;
    tooth.rotation.x = -0.22;
    tooth.castShadow = true;
    machine.add(tooth);
  }

  [-3.38, 3.38].forEach((x) => {
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.7, 0.26, 56), glossyBlack);
    cover.position.set(x, 1.78, 0.25);
    cover.castShadow = true;
    cover.receiveShadow = true;
    machine.add(cover);

    const coverRing = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.032, 12, 72), brass);
    coverRing.position.set(x, 1.93, 0.25);
    coverRing.rotation.x = Math.PI / 2;
    coverRing.castShadow = true;
    machine.add(coverRing);

    const coverSlot = roundedBox(0.46, 0.035, 0.08, 0.018, darkRubber);
    coverSlot.position.set(x, 1.94, 0.25);
    coverSlot.rotation.y = Math.PI * 0.14;
    machine.add(coverSlot);
  });

  const carriageShelf = roundedBox(8.92, 0.18, 0.42, 0.12, glossyBlack);
  carriageShelf.position.set(0, 2.32, -0.96);
  carriageShelf.castShadow = true;
  carriageShelf.receiveShadow = true;
  machine.add(carriageShelf);
}

function addFullBodyShell(machine, black, wornBlack, brass, darkRubber) {
  const enamel = new THREE.MeshStandardMaterial({
    color: 0x050504,
    roughness: 0.26,
    metalness: 0.82,
    envMapIntensity: 0.78
  });
  const innerShadow = new THREE.MeshStandardMaterial({
    color: 0x090705,
    roughness: 0.7,
    metalness: 0.44
  });

  const caseBase = roundedBox(10.7, 0.22, 5.75, 0.42, darkRubber);
  caseBase.position.set(0, -0.58, 1.38);
  caseBase.castShadow = true;
  caseBase.receiveShadow = true;
  machine.add(caseBase);

  const baseRim = roundedBox(10.18, 0.22, 5.28, 0.38, enamel);
  baseRim.position.set(0, -0.42, 1.34);
  baseRim.castShadow = true;
  baseRim.receiveShadow = true;
  machine.add(baseRim);

  const frontCrown = roundedBox(8.96, 0.38, 0.42, 0.18, enamel);
  frontCrown.position.set(0, 0.5, 3.35);
  frontCrown.rotation.x = -0.1;
  frontCrown.castShadow = true;
  frontCrown.receiveShadow = true;
  machine.add(frontCrown);

  const rearDeck = roundedBox(8.86, 0.42, 1.18, 0.22, enamel);
  rearDeck.position.set(0, 1.18, -0.18);
  rearDeck.rotation.x = -0.08;
  rearDeck.castShadow = true;
  rearDeck.receiveShadow = true;
  machine.add(rearDeck);

  const rearBackPanel = roundedBox(9.1, 0.86, 0.32, 0.14, enamel);
  rearBackPanel.position.set(0, 1.78, -1.26);
  rearBackPanel.castShadow = true;
  rearBackPanel.receiveShadow = true;
  machine.add(rearBackPanel);

  const rearNamePlate = makePlateLabel("TYPE", 1.65, 0.32);
  rearNamePlate.position.set(0, 1.9, -1.45);
  rearNamePlate.rotation.x = -0.04;
  machine.add(rearNamePlate);

  const basketFloor = roundedBox(5.35, 0.18, 1.36, 0.18, innerShadow);
  basketFloor.position.set(0, 0.98, 0.38);
  basketFloor.rotation.x = -0.08;
  basketFloor.castShadow = true;
  basketFloor.receiveShadow = true;
  machine.add(basketFloor);

  const centerMask = roundedBox(3.35, 0.14, 0.56, 0.18, enamel);
  centerMask.position.set(0, 1.08, 1.2);
  centerMask.rotation.x = -0.2;
  centerMask.castShadow = true;
  centerMask.receiveShadow = true;
  machine.add(centerMask);

  [-1, 1].forEach((side) => {
    const sideWall = roundedBox(1.18, 1.02, 5.12, 0.34, enamel);
    sideWall.position.set(side * 4.82, 0.22, 1.32);
    sideWall.rotation.z = side * -0.045;
    sideWall.castShadow = true;
    sideWall.receiveShadow = true;
    machine.add(sideWall);

    const upperCheek = roundedBox(1.54, 0.88, 1.72, 0.32, enamel);
    upperCheek.position.set(side * 3.76, 1.48, -0.04);
    upperCheek.rotation.z = side * -0.08;
    upperCheek.castShadow = true;
    upperCheek.receiveShadow = true;
    machine.add(upperCheek);

    const spoolPedestal = roundedBox(1.55, 0.44, 1.35, 0.32, enamel);
    spoolPedestal.position.set(side * 3.38, 1.28, 0.28);
    spoolPedestal.castShadow = true;
    spoolPedestal.receiveShadow = true;
    machine.add(spoolPedestal);

    const sideSkirt = roundedBox(0.72, 0.68, 3.6, 0.24, wornBlack);
    sideSkirt.position.set(side * 4.28, 0.18, 1.92);
    sideSkirt.rotation.z = side * -0.055;
    sideSkirt.castShadow = true;
    sideSkirt.receiveShadow = true;
    machine.add(sideSkirt);

    const sideTrim = cylinderBetween(
      new THREE.Vector3(side * 4.12, 0.54, 3.32),
      new THREE.Vector3(side * 3.68, 1.58, -0.62),
      0.022,
      brass
    );
    machine.add(sideTrim);

    const rearFoot = roundedBox(0.86, 0.24, 0.58, 0.18, darkRubber);
    rearFoot.position.set(side * 3.92, -0.58, -1.05);
    rearFoot.castShadow = true;
    rearFoot.receiveShadow = true;
    machine.add(rearFoot);
  });

  const frontGoldRail = cylinderBetween(
    new THREE.Vector3(-4.42, 0.48, 3.44),
    new THREE.Vector3(4.42, 0.48, 3.44),
    0.018,
    brass
  );
  machine.add(frontGoldRail);

  const rearGoldRail = cylinderBetween(
    new THREE.Vector3(-4.2, 2.02, -1.12),
    new THREE.Vector3(4.2, 2.02, -1.12),
    0.018,
    brass
  );
  machine.add(rearGoldRail);
}

function addPlaten(machine, darkRubber, brass) {
  const carriage = new THREE.Group();
  sceneState.carriage = carriage;
  machine.add(carriage);

  const axle = cylinderBetween(
    new THREE.Vector3(-4.92, 3.0, -1.03),
    new THREE.Vector3(4.92, 3.0, -1.03),
    0.035,
    brass
  );
  carriage.add(axle);

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

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.2, 32), brass);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x - Math.sign(x) * 0.22, 3.0, -1.03);
    hub.castShadow = true;
    carriage.add(hub);
  });
}

function addPaper(machine) {
  const paperCanvas = document.createElement("canvas");
  paperCanvas.width = paperMetrics.canvasWidth;
  paperCanvas.height = paperMetrics.canvasHeight;
  const paperContext = paperCanvas.getContext("2d");
  const paperTexture = new THREE.CanvasTexture(paperCanvas);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.anisotropy = 16;
  paperTexture.magFilter = THREE.LinearFilter;
  paperTexture.minFilter = THREE.LinearMipmapLinearFilter;
  paperTexture.generateMipmaps = true;

  const paperMaterial = new THREE.MeshStandardMaterial({
    map: paperTexture,
    roughness: 0.76,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.PlaneGeometry(paperMetrics.planeWidth, paperMetrics.planeHeight, 32, 4);
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

function addCarriageDetails(brass, darkRubber, black) {
  const carriage = sceneState.carriage;
  if (!carriage) {
    return;
  }

  const paperBail = cylinderBetween(
    new THREE.Vector3(-3.65, 2.72, -0.32),
    new THREE.Vector3(3.65, 2.72, -0.32),
    0.018,
    brass
  );
  carriage.add(paperBail);

  [-2.5, 0, 2.5].forEach((x) => {
    const pressureRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 24), darkRubber);
    pressureRoller.rotation.x = Math.PI / 2;
    pressureRoller.position.set(x, 2.72, -0.29);
    pressureRoller.castShadow = true;
    carriage.add(pressureRoller);

    const rollerBracket = roundedBox(0.18, 0.035, 0.08, 0.025, brass);
    rollerBracket.position.set(x, 2.61, -0.33);
    rollerBracket.rotation.x = -0.18;
    carriage.add(rollerBracket);
  });

  [-3.85, 3.85].forEach((x) => {
    const bailArm = cylinderBetween(
      new THREE.Vector3(x, 2.36, -0.34),
      new THREE.Vector3(x, 3.03, -0.34),
      0.015,
      brass
    );
    carriage.add(bailArm);

    const paperClamp = roundedBox(0.2, 0.12, 0.12, 0.035, brass);
    paperClamp.position.set(x, 3.08, -0.36);
    paperClamp.castShadow = true;
    carriage.add(paperClamp);
  });

  const paperScale = roundedBox(7.2, 0.055, 0.08, 0.02, brass);
  paperScale.position.set(0, 3.36, -0.42);
  carriage.add(paperScale);

  for (let i = 0; i <= 48; i += 1) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.012, i % 6 === 0 ? 0.1 : 0.055, 0.018), black);
    tick.position.set(-3.43 + i * 0.143, 3.42, -0.36);
    carriage.add(tick);
  }

  [-2.98, 2.98].forEach((x) => {
    const marginStop = roundedBox(0.22, 0.18, 0.18, 0.045, brass);
    marginStop.position.set(x, 2.18, -0.78);
    marginStop.castShadow = true;
    carriage.add(marginStop);
  });

  const carriageRack = cylinderBetween(
    new THREE.Vector3(-4.1, 2.18, -0.82),
    new THREE.Vector3(4.1, 2.18, -0.82),
    0.024,
    brass
  );
  carriage.add(carriageRack);

  const rearPlatenCover = roundedBox(8.58, 0.46, 0.34, 0.12, black);
  rearPlatenCover.position.set(0, 3.28, -1.34);
  rearPlatenCover.castShadow = true;
  rearPlatenCover.receiveShadow = true;
  carriage.add(rearPlatenCover);

  const rearLogo = makePlateLabel("TYPE", 1.42, 0.28);
  rearLogo.position.set(-1.84, 3.38, -1.53);
  rearLogo.rotation.x = -0.04;
  carriage.add(rearLogo);

  const topGuideRail = cylinderBetween(
    new THREE.Vector3(-4.2, 3.5, -1.1),
    new THREE.Vector3(4.2, 3.5, -1.1),
    0.024,
    brass
  );
  carriage.add(topGuideRail);

  const lowerGuideRail = cylinderBetween(
    new THREE.Vector3(-4.18, 2.48, -1.1),
    new THREE.Vector3(4.18, 2.48, -1.1),
    0.02,
    brass
  );
  carriage.add(lowerGuideRail);

  [-1, 1].forEach((side) => {
    const x = side * 4.28;
    const endPlate = roundedBox(0.34, 1.06, 0.78, 0.12, black);
    endPlate.position.set(x, 2.9, -0.77);
    endPlate.castShadow = true;
    endPlate.receiveShadow = true;
    carriage.add(endPlate);

    const sideFrame = roundedBox(0.16, 1.2, 0.18, 0.055, black);
    sideFrame.position.set(side * 4.03, 2.84, -0.38);
    sideFrame.castShadow = true;
    sideFrame.receiveShadow = true;
    carriage.add(sideFrame);

    const chromeBracket = roundedBox(0.12, 0.82, 0.14, 0.045, brass);
    chromeBracket.position.set(side * 4.02, 2.88, -0.42);
    chromeBracket.rotation.z = side * 0.08;
    chromeBracket.castShadow = true;
    carriage.add(chromeBracket);

    const platenAxle = cylinderBetween(
      new THREE.Vector3(side * 3.96, 3.0, -1.03),
      new THREE.Vector3(side * 4.44, 3.0, -1.03),
      0.035,
      brass
    );
    carriage.add(platenAxle);

    const returnLeverBracket = roundedBox(0.16, 0.36, 0.46, 0.06, brass);
    returnLeverBracket.position.set(side * 4.32, 3.28, -1.08);
    returnLeverBracket.rotation.z = side * 0.16;
    returnLeverBracket.castShadow = true;
    carriage.add(returnLeverBracket);

    const lowerSideRail = cylinderBetween(
      new THREE.Vector3(side * 4.02, 2.36, -0.48),
      new THREE.Vector3(side * 4.02, 2.36, -1.12),
      0.018,
      brass
    );
    carriage.add(lowerSideRail);
  });

}

function addRibbon(machine, black, brass, ribbonRed) {
  [-3.15, 3.15].forEach((x) => {
    const pedestal = roundedBox(0.94, 0.16, 0.72, 0.14, black);
    pedestal.position.set(x, 1.28, 0.17);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    machine.add(pedestal);

    const stem = cylinderBetween(
      new THREE.Vector3(x, 1.28, 0.17),
      new THREE.Vector3(x, 1.65, 0.17),
      0.055,
      brass
    );
    machine.add(stem);

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

  const ribbonGuide = new THREE.Group();
  const guideFrame = roundedBox(0.82, 0.12, 0.16, 0.04, brass);
  const ribbonWindow = roundedBox(0.7, 0.045, 0.045, 0.018, ribbonRed);
  ribbonWindow.position.set(0, 0.012, 0.045);
  ribbonGuide.add(guideFrame, ribbonWindow);
  ribbonGuide.position.set(0, printHeadMetrics.ribbonRestY, printHeadMetrics.ribbonRestZ);
  ribbonGuide.rotation.x = -0.12;
  sceneState.ribbonGuide = ribbonGuide;
  machine.add(ribbonGuide);
}

function addTypebars(machine, brass, black) {
  const count = 31;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const spread = (t - 0.5) * 4.85;
    const start = new THREE.Vector3(spread, 0.98, 0.72 + Math.abs(t - 0.5) * 0.22);
    const target = getPrintHeadTarget();
    const length = start.distanceTo(target);
    const restBase = new THREE.Vector3(spread * 0.34, 1.2, 2.85 + Math.abs(t - 0.5) * 0.3);
    const restDirection = restBase.sub(start).normalize();
    const rest = start.clone().add(restDirection.multiplyScalar(length));
    const apex = new THREE.Vector3(spread * 0.12, 2.64, -0.4);
    const rod = cylinderBetween(start, rest, 0.017, brass);
    const slug = roundedBox(0.19, 0.15, 0.08, 0.02, black);
    slug.position.copy(rest);
    slug.lookAt(getPrintSlugLookTarget(target));
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), brass);
    hinge.position.copy(start);
    const arm = { start, rest, apex, target, length, rod, slug, hinge, strikeStart: -Infinity, intensity: 0, phase: i / count };
    sceneState.typebars.push(arm);
    machine.add(rod, slug, hinge);
  }

  const basket = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.035, 12, 96, Math.PI), brass);
  basket.position.set(0, 1.03, 0.35);
  basket.rotation.x = Math.PI * 0.53;
  basket.rotation.z = Math.PI;
  machine.add(basket);
}

function addActiveHammer(machine, brass, black) {
  const activeBrass = new THREE.MeshStandardMaterial({
    color: 0xf0ba66,
    roughness: 0.24,
    metalness: 0.9,
    emissive: 0x2f1a06,
    emissiveIntensity: 0.18
  });
  const slugMaterial = new THREE.MeshStandardMaterial({
    color: 0x090807,
    roughness: 0.42,
    metalness: 0.82
  });
  const group = new THREE.Group();
  const leftRod = cylinderBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, 0), 0.025, activeBrass);
  const rightRod = cylinderBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, 0), 0.025, activeBrass);
  const centerRod = cylinderBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, 0), 0.014, brass);
  const slug = roundedBox(0.36, 0.24, 0.15, 0.028, slugMaterial);
  const face = roundedBox(0.24, 0.1, 0.03, 0.01, activeBrass);
  const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), activeBrass);
  face.position.z = -0.085;
  slug.add(face);
  group.add(leftRod, rightRod, centerRod, slug, hinge);
  group.visible = false;
  sceneState.strikeHammer = { group, leftRod, rightRod, centerRod, slug, hinge };
  machine.add(group);
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
        labelMesh.position.y = variant === "space" || variant === "wide" ? 0.164 : 0.108;
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

function addKeyLinkages(machine, brass, black) {
  const linkageMaterial = new THREE.MeshStandardMaterial({
    color: 0xb98742,
    roughness: 0.34,
    metalness: 0.86
  });
  const pivotMaterial = new THREE.MeshStandardMaterial({
    color: 0x080706,
    roughness: 0.5,
    metalness: 0.72
  });

  const printableKeys = sceneState.keyObjects.filter((key) => {
    const value = key.userData.value;
    return typeof value === "string" && value.length === 1 && value !== " ";
  });

  printableKeys.forEach((key, index) => {
    const start = new THREE.Vector3(key.position.x, key.position.y - 0.42, key.position.z - 0.08);
    const target = new THREE.Vector3(key.position.x * 0.34, 0.78, 0.98 + Math.abs(key.position.x) * 0.03);
    const rod = cylinderBetween(start, target, index % 3 === 0 ? 0.01 : 0.008, linkageMaterial);
    rod.castShadow = true;
    machine.add(rod);

    if (index % 5 === 0) {
      const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), brass);
      pivot.position.copy(target);
      pivot.castShadow = true;
      machine.add(pivot);
    }
  });

  const linkageComb = roundedBox(5.35, 0.1, 0.22, 0.06, pivotMaterial);
  linkageComb.position.set(0, 0.78, 1.02);
  linkageComb.rotation.x = -0.1;
  linkageComb.castShadow = true;
  linkageComb.receiveShadow = true;
  machine.add(linkageComb);

  const rearPivotRail = cylinderBetween(
    new THREE.Vector3(-2.65, 0.88, 0.9),
    new THREE.Vector3(2.65, 0.88, 0.9),
    0.026,
    brass
  );
  machine.add(rearPivotRail);
}

function addLevers(machine, brass, darkRubber) {
  const parent = sceneState.carriage || machine;
  const lever = cylinderBetween(
    new THREE.Vector3(-4.68, 3.08, -1.02),
    new THREE.Vector3(-5.08, 2.18, -0.24),
    0.035,
    brass
  );
  parent.add(lever);

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), darkRubber);
  handle.position.set(-5.14, 2.08, -0.14);
  handle.castShadow = true;
  parent.add(handle);
}

function addMachineDetails(machine, black, wornBlack, brass, darkRubber) {
  const badge = makePlateLabel("TYPE", 1.12, 0.34);
  badge.position.set(0, 0.68, 3.83);
  machine.add(badge);

  const frontRod = cylinderBetween(
    new THREE.Vector3(-3.95, 0.68, 3.86),
    new THREE.Vector3(3.95, 0.68, 3.86),
    0.017,
    brass
  );
  machine.add(frontRod);

  [-4.1, -1.05, 1.05, 4.1].forEach((x) => {
    const screw = makeScrewHead(0.08, brass, black);
    screw.position.set(x, 0.5, 3.86);
    screw.rotation.x = Math.PI / 2;
    machine.add(screw);
  });

  [-3.82, 3.82].forEach((x) => {
    [-0.36, 3.28].forEach((z) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 28), darkRubber);
      foot.position.set(x, -0.46, z);
      foot.castShadow = true;
      foot.receiveShadow = true;
      machine.add(foot);
    });
  });

  const segmentComb = roundedBox(3.85, 0.08, 0.16, 0.04, brass);
  segmentComb.position.set(0, 1.12, 0.52);
  segmentComb.rotation.x = -0.12;
  machine.add(segmentComb);

  for (let i = 0; i < 27; i += 1) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.18), wornBlack);
    slot.position.set(-1.82 + i * 0.14, 1.17, 0.58);
    slot.rotation.x = -0.12;
    machine.add(slot);
  }

  [-2.95, 2.95].forEach((x) => {
    const ribbonFork = cylinderBetween(
      new THREE.Vector3(x, 1.56, 0.35),
      new THREE.Vector3(x * 0.36, 1.86, -0.34),
      0.012,
      brass
    );
    machine.add(ribbonFork);
  });
}

function addAssemblyConnectors(machine, black, wornBlack, brass, darkRubber) {
  [-1, 1].forEach((side) => {
    const rearPost = roundedBox(0.28, 1.38, 0.34, 0.1, black);
    rearPost.position.set(side * 4.15, 1.42, -0.98);
    rearPost.rotation.z = side * -0.035;
    rearPost.castShadow = true;
    rearPost.receiveShadow = true;
    machine.add(rearPost);

    const cheekBridge = cylinderBetween(
      new THREE.Vector3(side * 3.58, 1.82, -0.5),
      new THREE.Vector3(side * 4.16, 2.18, -0.98),
      0.035,
      brass
    );
    machine.add(cheekBridge);

    const bodyTie = cylinderBetween(
      new THREE.Vector3(side * 4.28, 0.62, 2.98),
      new THREE.Vector3(side * 4.04, 1.52, -0.82),
      0.018,
      brass
    );
    machine.add(bodyTie);

    const rearSaddle = roundedBox(0.7, 0.24, 0.7, 0.14, wornBlack);
    rearSaddle.position.set(side * 3.72, 1.72, -0.66);
    rearSaddle.rotation.z = side * -0.04;
    rearSaddle.castShadow = true;
    rearSaddle.receiveShadow = true;
    machine.add(rearSaddle);

    const footTie = cylinderBetween(
      new THREE.Vector3(side * 4.2, -0.38, 3.18),
      new THREE.Vector3(side * 4.2, -0.38, -1.12),
      0.026,
      darkRubber
    );
    machine.add(footTie);
  });

  const frontCrossmember = roundedBox(8.6, 0.18, 0.28, 0.12, black);
  frontCrossmember.position.set(0, 0.2, 3.26);
  frontCrossmember.castShadow = true;
  frontCrossmember.receiveShadow = true;
  machine.add(frontCrossmember);

  const basketConnector = roundedBox(5.25, 0.12, 0.34, 0.12, wornBlack);
  basketConnector.position.set(0, 1.0, 1.28);
  basketConnector.rotation.x = -0.14;
  basketConnector.castShadow = true;
  basketConnector.receiveShadow = true;
  machine.add(basketConnector);

  [-0.5, 0.5].forEach((x) => {
    const vibratorTrack = cylinderBetween(
      new THREE.Vector3(x, 1.58, -0.48),
      new THREE.Vector3(x, 2.34, -0.46),
      0.013,
      brass
    );
    machine.add(vibratorTrack);

    const lowerGuideBlock = roundedBox(0.18, 0.14, 0.12, 0.04, black);
    lowerGuideBlock.position.set(x, 1.56, -0.48);
    lowerGuideBlock.castShadow = true;
    lowerGuideBlock.receiveShadow = true;
    machine.add(lowerGuideBlock);
  });
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
  texture.anisotropy = 16;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    toneMapped: false
  });
  const labelWidth = variant === "wide" ? width * 0.78 : variant === "space" ? width * 0.78 : width * 0.62;
  const labelDepth = variant === "wide" ? 0.3 : variant === "space" ? 0.23 : width * 0.62;
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

function makePlateLabel(text, width, height) {
  const plateCanvas = document.createElement("canvas");
  plateCanvas.width = 512;
  plateCanvas.height = 180;
  const context = plateCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, plateCanvas.height);
  gradient.addColorStop(0, "#f1c27c");
  gradient.addColorStop(0.55, "#c9934e");
  gradient.addColorStop(1, "#7e5528");
  context.fillStyle = gradient;
  roundedRectPath(context, 18, 18, plateCanvas.width - 36, plateCanvas.height - 36, 34);
  context.fill();
  context.strokeStyle = "rgba(42, 28, 14, 0.58)";
  context.lineWidth = 8;
  context.stroke();
  context.fillStyle = "#2a1a0d";
  context.font = "800 86px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, plateCanvas.width / 2, plateCanvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(plateCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function makeScrewHead(radius, brass, black) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.032, 28), brass);
  head.castShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.45, radius * 0.18, radius * 0.28), black);
  slot.position.y = 0.02;
  group.add(head, slot);
  return group;
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
    queueSaveState();
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

  if (key === "Tab") {
    moveToNextTabStop();
    return true;
  }

  if (event.code === "Backslash") {
    moveCarriage(-1);
    typewriterState.correctionMode = true;
    strikeMachine("Backspace");
    playThud();
    setTemporaryStatus("Correction ribbon");
    queueSaveState();
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
  queueSaveState();
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

  if (typewriterState.correctionMode) {
    const currentLine = lines[typewriterState.row].padEnd(column + 1, " ");
    lines[typewriterState.row] = `${currentLine.slice(0, column)} ${currentLine.slice(column + 1)}`;
    typewriterState.correctionMode = false;
    setTemporaryStatus("Corrected");
    strikeMachine(character);
    playThud();
    writePaperLines(lines);
    return;
  }

  const currentLine = lines[typewriterState.row].padEnd(column + 1, " ");
  lines[typewriterState.row] = `${currentLine.slice(0, column)}${character}${currentLine.slice(column + 1)}`;
  if (character !== " ") {
    gatePrintedCharacter(typewriterState.row, column);
  }
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
  queueSaveState();
}

function gatePrintedCharacter(row, col) {
  sceneState.printGates.push({
    row,
    col,
    revealAt: performance.now() + printHeadMetrics.strikeContactTime + 16
  });
}

function moveToNextTabStop() {
  const fallbackStop = Math.min(typewriterState.rightMargin, Math.ceil((typewriterState.col + 1) / 8) * 8);
  const nextStop = tabStops.find((stop) => stop > typewriterState.col && stop <= typewriterState.rightMargin) ?? fallbackStop;
  if (nextStop <= typewriterState.col) {
    setTemporaryStatus("No tab stop");
    playBell(0.1);
    return;
  }

  typewriterState.col = nextStop;
  typewriterState.lastBellColumn = -1;
  setTextareaCaretFromCarriage();
  updateCarriage();
  strikeMachine("Tab");
  playReturn();
  setTemporaryStatus("Tab stop");
  queueSaveState();
}

function moveRoller(delta) {
  typewriterState.rollOffset = Math.max(
    -paperMetrics.lineHeight * 6,
    Math.min(paperMetrics.lineHeight * 6, typewriterState.rollOffset + delta * (paperMetrics.lineHeight / 3))
  );
  renderPage();
  strikeMachine(delta > 0 ? "PageDown" : "PageUp");
  playReturn();
  setTemporaryStatus(delta > 0 ? "Roller down" : "Roller up");
  queueSaveState();
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
  queueSaveState();
}

function halfSpace() {
  typewriterState.col += 0.5;
  setTextareaCaretFromCarriage();
  updateCarriage();
  strikeMachine("`");
  playKey(0.08);
  setTemporaryStatus("Half-space");
  queueSaveState();
}

function setMargin(side) {
  const column = Math.max(0, Math.round(typewriterState.col));
  input.focus({ preventScroll: true });
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
  queueSaveState();
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
  const printableStrike = String(normalized).length === 1 && normalized !== " ";
  const key = sceneState.keys.get(normalized) || sceneState.keys.get(String(normalized).toLowerCase());
  if (key) {
    key.userData.press = 1;
  }
  if (normalized === "Shift" || normalized === "CapsLock") {
    sceneState.shiftLift = 1;
  }

  const now = performance.now();
  sceneState.typebars.forEach((arm) => {
    arm.strikeStart = -Infinity;
    arm.intensity = 0;
  });

  if (printableStrike) {
    const index = keyIndexForValue(normalized);
    const primary = sceneState.typebars[index % sceneState.typebars.length];
    if (primary) {
      primary.strikeStart = now;
      primary.intensity = 1;
      sceneState.activeStrikeArm = primary;
      sceneState.lastStrike = now;
    }
  }

  if (printableStrike) {
    sceneState.carriageHoldUntil = Math.max(sceneState.carriageHoldUntil, now + printHeadMetrics.escapementDelay);
    sceneState.paperImpactStart = now + printHeadMetrics.strikeContactTime;
    sceneState.ribbonStrikeStart = now;
    window.setTimeout(drawPaper, printHeadMetrics.strikeContactTime + 24);
    window.setTimeout(() => playThud(), printHeadMetrics.strikeContactTime);
  } else {
    sceneState.paperImpact = 1;
  }
  sceneState.ribbonPulse = printableStrike ? 1 : Math.max(sceneState.ribbonPulse, 0.28);
  sceneState.carriageJerk += normalized === "Enter" ? -0.34 : printableStrike ? 0.014 : 0.055;
}

function keyIndexForValue(value) {
  const stringValue = String(value || "");
  const normalized = stringValue.toLowerCase();
  const orderedIndex = printableTypeOrder.indexOf(normalized);
  if (orderedIndex >= 0 && sceneState.typebars.length > 1) {
    return Math.round((orderedIndex / Math.max(1, printableTypeOrder.length - 1)) * (sceneState.typebars.length - 1));
  }

  let total = 0;
  for (let i = 0; i < stringValue.length; i += 1) {
    total += stringValue.charCodeAt(i);
  }
  return Math.abs(total || 7);
}

function paperCanvasXToLocal(canvasX) {
  return (canvasX / paperMetrics.canvasWidth - 0.5) * paperMetrics.planeWidth;
}

function paperCanvasYToLocal(canvasY) {
  return (canvasY / paperMetrics.canvasHeight - 0.5) * paperMetrics.planeHeight;
}

function strikeCanvasX(column = currentColumn()) {
  return paperMetrics.marginX + column * paperMetrics.charPitch + paperMetrics.charPitch * printHeadMetrics.glyphCenterX;
}

function strikeCanvasY() {
  return paperMetrics.printLineY + printHeadMetrics.glyphCenterY;
}

function getPrintHeadTarget() {
  return new THREE.Vector3(0, printHeadMetrics.contactY, printHeadMetrics.contactZ);
}

function getPrintSlugLookTarget(target = getPrintHeadTarget()) {
  return new THREE.Vector3(target.x, target.y, target.z - 0.36);
}

function renderPage() {
  output.textContent = input.value;
  const words = input.value.trim().match(/\S+/g);
  if (wordCount) {
    wordCount.textContent = words ? words.length : 0;
  }
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
  const textureScale = paperMetrics.canvasWidth / 1536;
  const gridStep = Math.round(34 * textureScale);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, lighten(tone.base, 0.11));
  gradient.addColorStop(0.55, tone.base);
  gradient.addColorStop(1, darken(tone.base, 0.08));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = tone.grid;
  for (let x = 0; x < width; x += gridStep) {
    context.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += gridStep) {
    context.fillRect(0, y, width, 1);
  }

  const vignette = context.createRadialGradient(width * 0.5, height * 0.45, 54, width * 0.5, height * 0.5, width * 0.72);
  vignette.addColorStop(0, "rgba(255,255,255,0.2)");
  vignette.addColorStop(1, "rgba(79,48,20,0.18)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  context.fillStyle = sceneState.ink;
  context.textBaseline = "top";
  context.font = "700 47px Courier New, monospace";
  const paperLines = input.value ? input.value.split(/\r?\n/) : [""];
  const now = performance.now();
  sceneState.printGates = sceneState.printGates.filter((gate) => now < gate.revealAt);
  const firstVisibleLine = Math.max(0, typewriterState.row - 8);
  const lastVisibleLine = Math.min(paperLines.length, firstVisibleLine + 12);
  for (let lineIndex = firstVisibleLine; lineIndex < lastVisibleLine; lineIndex += 1) {
    const line = paperLines[lineIndex] || "";
    let x = paperMetrics.marginX;
    const y = paperMetrics.printLineY + typewriterState.rollOffset + (lineIndex - typewriterState.row) * paperMetrics.lineHeight;
    if (y < -paperMetrics.lineHeight || y > height) {
      continue;
    }
    [...line].forEach((char, charIndex) => {
      if (sceneState.printGates.some((gate) => gate.row === lineIndex && gate.col === charIndex)) {
        x += paperMetrics.charPitch;
        return;
      }
      context.globalAlpha = 0.84 + Math.abs(jitter(charIndex + lineIndex * 31, 0.1));
      context.save();
      context.translate(x + jitter(charIndex, 0.85), y + jitter(charIndex + 17, 1.1));
      context.rotate((jitter(charIndex + 29, 0.22) * Math.PI) / 180);
      context.fillText(char, 0, 0);
      context.restore();
      x += paperMetrics.charPitch;
    });
  }
  context.globalAlpha = 1;

  if ((document.activeElement === input || input.value) && performance.now() >= sceneState.carriageHoldUntil) {
    const caretX = strikeCanvasX(typewriterState.col) - 3.5;
    const caretY = strikeCanvasY() - 28;
    context.fillRect(caretX, caretY, 7, 56);
  }

  sceneState.paperTexture.needsUpdate = true;
}

function updateCarriage() {
  const column = currentColumn();
  const targetShift = -paperCanvasXToLocal(strikeCanvasX(column));
  sceneState.targetCarriageShift = Math.max(-3.18, Math.min(3.18, targetShift));
}

function typebarTipPosition(arm, lift) {
  const t = Math.max(0, Math.min(1, lift));
  const restDirection = new THREE.Vector3().subVectors(arm.rest, arm.start).normalize();
  const targetDirection = new THREE.Vector3().subVectors(arm.target, arm.start).normalize();
  const direction = restDirection.lerp(targetDirection, easeInOutSine(t)).normalize();
  return arm.start.clone().add(direction.multiplyScalar(arm.length));
}

function typebarLift(elapsed, intensity = 1) {
  if (elapsed < 0 || elapsed >= printHeadMetrics.strikeDuration || intensity <= 0) {
    return 0;
  }

  const t = elapsed / printHeadMetrics.strikeDuration;
  const attack = printHeadMetrics.strikeAttackRatio;
  const dwell = printHeadMetrics.strikeDwellRatio;
  if (t < attack) {
    return easeOutCubic(t / attack) * intensity;
  }
  if (t < attack + dwell) {
    return intensity;
  }
  return (1 - easeOutCubic((t - attack - dwell) / (1 - attack - dwell))) * intensity;
}

function typebarImpact(elapsed, intensity = 1) {
  if (elapsed < 0 || intensity <= 0) {
    return 0;
  }
  return Math.max(0, 1 - Math.abs(elapsed - printHeadMetrics.strikeContactTime) / 12) * intensity;
}

function ribbonLiftForStrike(elapsed) {
  if (elapsed < 0 || elapsed > printHeadMetrics.strikeDuration) {
    return 0;
  }

  const riseStart = printHeadMetrics.strikeContactTime * 0.35;
  const fallEnd = printHeadMetrics.strikeContactTime + 92;
  if (elapsed < riseStart) {
    return 0;
  }
  if (elapsed <= printHeadMetrics.strikeContactTime) {
    return easeOutCubic((elapsed - riseStart) / (printHeadMetrics.strikeContactTime - riseStart));
  }
  return Math.max(0, 1 - easeInCubic((elapsed - printHeadMetrics.strikeContactTime) / (fallEnd - printHeadMetrics.strikeContactTime)));
}

function updateActiveHammer(state, now) {
  const hammer = state.strikeHammer;
  const arm = state.activeStrikeArm;
  if (!hammer || !arm) {
    return;
  }

  const elapsed = now - arm.strikeStart;
  const lift = typebarLift(elapsed, arm.intensity);
  if (lift <= 0) {
    hammer.group.visible = false;
    return;
  }

  const impact = typebarImpact(elapsed, arm.intensity);
  const end = typebarTipPosition(arm, lift);
  end.y += impact * 0.035;
  end.z += impact * 0.038;
  const sideOffset = strikeBarSideOffset(arm.start, end, 0.055);
  const sideEndOffset = sideOffset.clone().multiplyScalar(0.36);
  const leftStart = arm.start.clone().add(sideOffset);
  const rightStart = arm.start.clone().sub(sideOffset);
  const leftEnd = end.clone().add(sideEndOffset);
  const rightEnd = end.clone().sub(sideEndOffset);
  hammer.group.visible = true;
  hammer.hinge.position.copy(arm.start);
  updateCylinderBetween(hammer.leftRod, leftStart, leftEnd);
  updateCylinderBetween(hammer.rightRod, rightStart, rightEnd);
  updateCylinderBetween(hammer.centerRod, arm.start, end);
  hammer.slug.position.copy(end);
  hammer.slug.scale.set(1 + impact * 0.2, 1 + impact * 0.12, 1 + impact * 0.08);
  hammer.slug.lookAt(getPrintSlugLookTarget(arm.target));
}

function strikeBarSideOffset(start, end, width) {
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const facing = new THREE.Vector3(0, 0, 1);
  const side = new THREE.Vector3().crossVectors(direction, facing);
  if (side.lengthSq() < 0.001) {
    side.set(1, 0, 0);
  }
  return side.normalize().multiplyScalar(width);
}

function animate() {
  requestAnimationFrame(animate);
  const state = sceneState;
  const now = performance.now();

  if (now >= state.carriageHoldUntil) {
    state.carriageShift += (state.targetCarriageShift - state.carriageShift) * 0.16;
  }
  state.carriageJerk *= 0.72;
  if (state.paperImpactStart && now >= state.paperImpactStart) {
    state.paperImpact = Math.max(state.paperImpact, 1);
    state.paperImpactStart = 0;
  }
  state.paperImpact *= 0.72;
  state.ribbonPulse *= 0.68;
  state.returnSweep *= 0.82;
  state.shiftLift *= 0.76;

  if (state.machine) {
    state.machine.rotation.y = 0;
    state.machine.rotation.x = -0.015;
    state.machine.position.x = state.baseMachineX;
    state.machine.position.y = state.baseMachineY;
    state.machine.position.z = state.baseMachineZ;
  }

  if (state.carriage) {
    state.carriage.position.x = state.carriageShift + state.carriageJerk - state.returnSweep * 0.18;
  }

  state.keyObjects.forEach((key) => {
    key.userData.press *= 0.72;
    key.position.y = key.userData.homeY - key.userData.press * 0.16;
  });

  state.typebars.forEach((arm) => {
    const elapsed = now - arm.strikeStart;
    const lift = typebarLift(elapsed, arm.intensity);
    if (elapsed >= printHeadMetrics.strikeDuration) {
      arm.intensity = 0;
      arm.strikeStart = -Infinity;
    }
    const end = typebarTipPosition(arm, lift);
    end.y += state.shiftLift * 0.055;
    const impact = typebarImpact(elapsed, arm.intensity);
    end.y += impact * 0.028;
    end.z += impact * 0.026;
    updateCylinderBetween(arm.rod, arm.start, end);
    arm.slug.position.copy(end);
    arm.slug.scale.set(1 + impact * 0.22, 1 + impact * 0.12, 1 + impact * 0.08);
    arm.slug.lookAt(getPrintSlugLookTarget(arm.target));
  });
  updateActiveHammer(state, now);

  if (state.paperMesh) {
    state.paperAngle += (state.targetPaperAngle - state.paperAngle) * 0.16;
    state.paperMesh.position.z = -0.55 + state.paperImpact * 0.035;
    state.paperMesh.position.y = 3.16 + state.returnSweep * 0.045;
    state.paperMesh.rotation.z = state.paperAngle;
  }

  if (state.ribbonGuide) {
    const printTarget = getPrintHeadTarget();
    const strikeRibbonLift = ribbonLiftForStrike(now - state.ribbonStrikeStart);
    if (now - state.ribbonStrikeStart > printHeadMetrics.strikeDuration) {
      state.ribbonStrikeStart = -Infinity;
    }
    const lift = Math.max(strikeRibbonLift, Math.min(1, state.ribbonPulse * 0.42));
    state.ribbonGuide.position.y = printHeadMetrics.ribbonRestY + (printTarget.y - 0.02 - printHeadMetrics.ribbonRestY) * lift;
    state.ribbonGuide.position.z = printHeadMetrics.ribbonRestZ + (printTarget.z + 0.04 - printHeadMetrics.ribbonRestZ) * lift;
  }

  if (state.camera) {
    state.camera.position.lerp(state.cameraTargetPosition, 0.12);
    state.cameraLookAt.lerp(state.cameraTargetLookAt, 0.12);
    state.camera.fov += (state.cameraTargetFov - state.camera.fov) * 0.12;
    state.camera.lookAt(state.cameraLookAt);
    state.camera.updateProjectionMatrix();
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
  if (sceneState.focusMode) {
    sceneState.cameraTargetPosition.set(0, isMobile ? 3.85 : isCompact ? 3.95 : 4.05, (isMobile ? 8.2 : isCompact ? 6.95 : 6.45) * zoom);
    sceneState.cameraTargetLookAt.set(0, isMobile ? 1.64 : isCompact ? 1.72 : 1.78, isMobile ? 0.48 : 0.28);
    sceneState.cameraTargetFov = isMobile ? 27 : isCompact ? 25 : 24;
  } else {
    sceneState.cameraTargetPosition.set(0, isMobile ? 5.2 : isCompact ? 5.75 : 6.0, (isMobile ? 17.8 : isCompact ? 16.25 : 15.25) * zoom);
    sceneState.cameraTargetLookAt.set(0, isMobile ? 1.25 : 1.2, isMobile ? 1.15 : 0.65);
    sceneState.cameraTargetFov = isMobile ? 40 : isCompact ? 36 : 33;
  }
  if (sceneState.machine) {
    const scale = isMobile ? Math.max(0.32, Math.min(0.4, width / 1030)) : isCompact ? 0.62 : 0.74;
    sceneState.machine.scale.setScalar(scale);
    sceneState.baseMachineX = 0;
    sceneState.baseMachineY = isMobile ? -0.06 : isCompact ? -0.14 : -0.18;
    sceneState.baseMachineZ = isMobile ? 1.42 : isCompact ? 0.92 : 0.72;
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
  const tone = paperTones[sceneState.paperTone] || paperTones.ivory;
  const backgroundColor = toPdfRgb(tone.base);
  const borderColor = toPdfRgb(tone.edge);
  const inkColor = toPdfRgb(sceneState.ink);
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
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const stream = makePdfStream(pageLines, margin, pageHeight - margin, fontSize, lineHeight, {
      backgroundColor,
      borderColor,
      inkColor,
      pageWidth,
      pageHeight
    });
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

function makePdfStream(lines, x, y, fontSize, lineHeight, options = {}) {
  const {
    backgroundColor = "1 1 1",
    borderColor = "0.8 0.74 0.64",
    inkColor = "0.12 0.1 0.08",
    pageWidth = 612,
    pageHeight = 792
  } = options;
  const background = [
    `q ${backgroundColor} rg 0 0 ${pageWidth} ${pageHeight} re f Q`,
    `q ${borderColor} RG 1.4 w 40 40 ${pageWidth - 80} ${pageHeight - 80} re S Q`
  ];
  const encoded = lines.map((line, index) => {
    const yy = y - index * lineHeight;
    return `${inkColor} rg BT /F1 ${fontSize} Tf ${x} ${yy} Td (${escapePdfText(line)}) Tj ET`;
  });
  return background.concat(encoded).join("\n");
}

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function downloadPdf(pdf) {
  const link = document.createElement("a");
  link.download = "type-page.pdf";
  let objectUrl = "";
  const canUseObjectUrl = typeof Blob !== "undefined"
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function";

  if (canUseObjectUrl) {
    const blob = new Blob([pdf], { type: "application/pdf" });
    objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
  } else {
    link.href = `data:application/pdf;charset=utf-8,${encodeURIComponent(pdf)}`;
  }

  document.body.appendChild(link);
  link.click();
  link.remove();

  if (objectUrl && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl);
  }
}

function byteLength(text) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }

  let length = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      length += 1;
    } else if (code < 0x800) {
      length += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      length += 4;
      i += 1;
    } else {
      length += 3;
    }
  }
  return length;
}

function toPdfRgb(color) {
  const rgb = colorToRgb(color);
  return rgb.map((channel) => (channel / 255).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")).join(" ");
}

function colorToRgb(color) {
  const value = String(color || "").trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const normalized = hex.length === 3
      ? hex.split("").map((character) => character + character).join("")
      : hex.padEnd(6, "0").slice(0, 6);
    const number = parseInt(normalized, 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    return rgbMatch[1].split(",").slice(0, 3).map((part) => Math.max(0, Math.min(255, Number.parseFloat(part) || 0)));
  }

  return [32, 27, 23];
}

function restoreState() {
  const saved = readSavedState();
  if (!saved || saved.version !== stateVersion) {
    return false;
  }

  input.value = typeof saved.text === "string" ? saved.text : "";
  const savedLines = input.value.split("\n");
  typewriterState.row = Number.isFinite(saved.row) ? Math.max(0, Math.min(savedLines.length - 1, saved.row)) : 0;
  const activeLine = savedLines[typewriterState.row] || "";
  typewriterState.col = Number.isFinite(saved.col) ? Math.max(0, Math.min(activeLine.length, saved.col)) : 0;
  typewriterState.leftMargin = Number.isFinite(saved.leftMargin) ? Math.max(0, saved.leftMargin) : defaultMargins.left;
  typewriterState.rightMargin = Number.isFinite(saved.rightMargin) ? Math.max(typewriterState.leftMargin + 2, saved.rightMargin) : defaultMargins.right;
  typewriterState.rollOffset = Number.isFinite(saved.rollOffset) ? Math.max(-paperMetrics.lineHeight * 6, Math.min(paperMetrics.lineHeight * 6, saved.rollOffset)) : 0;
  typewriterState.marginRelease = false;
  typewriterState.correctionMode = false;
  typewriterState.lastBellColumn = -1;

  soundEnabled = saved.soundEnabled !== false;
  updateSoundButtons();

  if (typeof saved.ink === "string") {
    const inkButton = inkButtons.find((button) => button.dataset.ink === saved.ink);
    if (inkButton) {
      sceneState.ink = saved.ink;
      document.documentElement.style.setProperty("--ink", saved.ink);
      markSelected(inkButtons, inkButton);
    }
  }

  if (typeof saved.paperTone === "string" && paperTones[saved.paperTone]) {
    const paperButton = paperButtons.find((button) => button.dataset.paper === saved.paperTone);
    if (paperButton) {
      sceneState.paperTone = saved.paperTone;
      markSelected(paperButtons, paperButton);
    }
  }

  sceneState.zoom = saved.zoom > 1 ? 1.26 : 1;
  sceneState.focusMode = false;
  sceneState.targetPaperAngle = Number.isFinite(saved.paperAngle) ? Math.max(-0.42, Math.min(0.42, saved.paperAngle)) : 0;
  sceneState.paperAngle = sceneState.targetPaperAngle;
  setSidebarExpanded(true, { focus: false, persist: false });
  setTextareaCaretFromCarriage();
  resizeScene();
  return true;
}

function readSavedState() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function queueSaveState() {
  if (stateSaveTimer) {
    window.clearTimeout(stateSaveTimer);
  }
  stateSaveTimer = window.setTimeout(() => {
    stateSaveTimer = undefined;
    saveStateNow();
  }, 120);
}

function saveStateNow() {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: stateVersion,
      text: input.value,
      row: typewriterState.row,
      col: typewriterState.col,
      leftMargin: typewriterState.leftMargin,
      rightMargin: typewriterState.rightMargin,
      rollOffset: typewriterState.rollOffset,
      ink: sceneState.ink,
      paperTone: sceneState.paperTone,
      paperAngle: sceneState.targetPaperAngle,
      sidebarExpanded: !document.body.classList.contains("controls-hidden"),
      soundEnabled,
      zoom: sceneState.zoom
    }));
  } catch {
    // Private browsing or locked-down storage should not block the simulator.
  }
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
  typewriterState.rollOffset = 0;
  typewriterState.correctionMode = false;
  resetMargins();
  sceneState.zoom = 1;
  sceneState.focusMode = false;
  sceneState.targetPaperAngle = 0;
  sceneState.paperAngle = 0;
  sceneState.printGates = [];
  setTextareaCaretFromCarriage();
  renderPage();
  updateFocusButton();
  resizeScene();
  input.focus({ preventScroll: true });
  setStatus("Ready");
  strikeMachine("Enter");
  sceneState.returnSweep = 1;
  sceneState.carriageJerk = -0.5;
  playReturn();
  saveStateNow();
}

function cycleRibbon() {
  const selected = inkButtons.find((button) => button.classList.contains("is-selected"));
  const currentColor = selected?.dataset.ink || sceneState.ink;
  const currentIndex = ribbonShortcutColors.indexOf(currentColor);
  const nextColor = ribbonShortcutColors[(currentIndex + 1) % ribbonShortcutColors.length];
  const next = inkButtons.find((button) => button.dataset.ink === nextColor);
  if (next) {
    next.click();
    setTemporaryStatus("Ribbon changed");
  }
}

function toggleMarginRelease() {
  typewriterState.marginRelease = !typewriterState.marginRelease;
  input.focus({ preventScroll: true });
  setTemporaryStatus(typewriterState.marginRelease ? "Margin release" : "Margin locked", 900);
  strikeMachine("Alt");
  playKey(0.06);
  queueSaveState();
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
  queueSaveState();
}

function zoomOut() {
  if (sceneState.focusMode) {
    setFocusMode(false);
    return;
  }
  sceneState.zoom = sceneState.zoom > 1 ? 1 : 1.26;
  resizeScene();
  input.focus({ preventScroll: true });
  setTemporaryStatus(sceneState.zoom === 1 ? "Zoom reset" : "Zoomed out");
  playKey(0.08);
  queueSaveState();
}

function setFocusMode(enabled) {
  sceneState.focusMode = enabled;
  sceneState.zoom = 1;
  updateFocusButton();
  resizeScene();
  input.focus({ preventScroll: true });
  setTemporaryStatus(enabled ? "Focus mode" : "Full view");
  playKey(0.08);
  queueSaveState();
}

function updateFocusButton() {
  focusButton?.setAttribute("aria-pressed", String(sceneState.focusMode));
  if (focusLabel) {
    focusLabel.textContent = sceneState.focusMode ? "Full view" : "Focus";
  }
}

function rotatePaper(amount) {
  sceneState.targetPaperAngle = Math.max(-0.42, Math.min(0.42, sceneState.targetPaperAngle + amount));
  input.focus({ preventScroll: true });
  setTemporaryStatus(amount < 0 ? "Rotated left" : "Rotated right");
  strikeMachine("Rotate");
  playKey(0.08);
  queueSaveState();
}

function saveAsImage() {
  input.focus({ preventScroll: true });
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
      label.textContent = expanded ? "Hide shortcuts" : "Show shortcuts";
    }
  });
  resizeScene();
  if (options.focus !== false) {
    input.focus({ preventScroll: true });
  }
  if (options.persist !== false) {
    queueSaveState();
  }
}

function handleCommandShortcut(event, options = {}) {
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
    moveToNextTabStop();
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
    rotatePaper(-0.05);
    return true;
  }
  if (event.key === "F6") {
    event.preventDefault();
    rotatePaper(0.05);
    return true;
  }
  if (event.key === "F10") {
    event.preventDefault();
    clearPage();
    return true;
  }
  return false;
}

function shouldRouteGlobalShortcut(event) {
  if (event.defaultPrevented || event.target === input || event.metaKey || event.ctrlKey) {
    return false;
  }

  const commandKeys = new Set(["F1", "Escape", "Delete", "Tab", "F3", "F4", "F5", "F6", "F10"]);
  if (!commandKeys.has(event.key)) {
    return false;
  }

  return true;
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
  if (readyLabel) {
    readyLabel.textContent = status;
  }
}

function setTemporaryStatus(status, delay = 900) {
  if (!readyLabel) {
    return;
  }
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
  return Math.max(0, typewriterState.col);
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

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
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
