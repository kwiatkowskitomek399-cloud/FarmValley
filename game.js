
import * as THREE from "three";

// FARMA 3D — etap 1
// Sterowanie: joystick + przeciąganie po prawej stronie ekranu.

const $ = id => document.getElementById(id);
const gameRoot = $("game");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc7e5);
scene.fog = new THREE.Fog(0x9cc7e5, 100, 330);

const camera = new THREE.PerspectiveCamera(
  65, innerWidth / innerHeight, 0.1, 500
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
gameRoot.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xddeeff, 0x596344, 2));

const sun = new THREE.DirectionalLight(0xfff1d4, 3);
sun.position.set(-60, 100, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

// Materiały i proceduralna tekstura terenu.
function grassTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#617d3e";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 5000; i++) {
    const n = Math.random();
    ctx.fillStyle = n > .5
      ? "rgba(153,174,87,.18)"
      : "rgba(27,58,27,.18)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256,
      1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const mat = (color, roughness = .9, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const grassMat = new THREE.MeshStandardMaterial({
  map: grassTexture(),
  roughness: 1
});

const soilMat = mat(0x59402b);
const roadMat = mat(0x77796d);
const concreteMat = mat(0x8a8c82);
const greenMat = mat(0x3b812b);
const darkGreen = mat(0x28551e);
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x9ec9d8, roughness: .25, metalness: .1,
  transparent: true, opacity: .65
});
const blackMat = mat(0x191b19);
const tireMat = mat(0x20221f);
const metalMat = mat(0x8a938e, .45, .65);
const yellowMat = mat(0xf1bd36);
const redMat = mat(0xb72c20);

// Pomocnicze bryły.
function box(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, r1, r2, h, material, x, y, z, seg = 12) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, h, seg),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Teren.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  grassMat
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.08;
ground.receiveShadow = true;
scene.add(ground);

// Drogi.
function road(x, z, w, d) {
  box(scene, w, .08, d, roadMat, x, -.01, z);
  box(scene, w, .015, .12, mat(0xb6b5a4), x, .04, z);
}
road(0, 12, 10, 230);
road(-45, -28, 105, 7);
road(45, 65, 100, 7);
road(70, -15, 7, 130);

// Pole z rzędami upraw.
const field = new THREE.Group();
field.position.set(0, .01, -42);
scene.add(field);

const fieldGround = new THREE.Mesh(
  new THREE.PlaneGeometry(54, 62),
  soilMat
);
fieldGround.rotation.x = -Math.PI / 2;
fieldGround.position.y = .01;
fieldGround.receiveShadow = true;
field.add(fieldGround);

const cropRows = new THREE.Group();
field.add(cropRows);

let cropStage = 1;

function buildCrops() {
  cropRows.clear();

  if (cropStage === 0) return;

  const rowMat = mat(cropStage === 1 ? 0x64783b :
    cropStage === 2 ? 0x43852a : 0x9a883b);

  for (let x = -24; x <= 24; x += 3) {
    // Ślady rzędów.
    box(cropRows, .10, .025, 57, rowMat, x, .035, 0);

    if (cropStage >= 2) {
      for (let z = -27; z <= 27; z += 2) {
        const plant = new THREE.Group();
        plant.position.set(x, .05, z);

        const height = cropStage === 2 ? .65 : 1.5;
        const width = cropStage === 2 ? .14 : .2;
        box(plant, width, height, width, rowMat, 0,
          height / 2, 0);

        if (cropStage >= 3) {
          const ear = new THREE.Mesh(
            new THREE.SphereGeometry(.12, 6, 5),
            yellowMat
          );
          ear.position.set(0, height * .85, 0);
          plant.add(ear);
        }

        cropRows.add(plant);
      }
    }
  }
}
buildCrops();

// Proste drzewa.
const treePositions = [];

function makeTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  cylinder(tree, .25, .42, 2.6, mat(0x61442b), 0, 1.3, 0, 7);

  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.65, 1),
    mat(0x355d2b)
  );
  crown.position.set(0, 3.1, 0);
  crown.scale.set(1, 1.15, 1);
  crown.castShadow = true;
  tree.add(crown);

  scene.add(tree);
  treePositions.push(new THREE.Vector2(x, z));
}

for (let i = 0; i < 180; i++) {
  const x = (Math.random() - .5) * 450;
  const z = (Math.random() - .5) * 450;

  // Zostawiamy miejsce na drogę, gospodarstwo i pole.
  if (Math.abs(x) < 36 && z < 25 && z > -80) continue;
  if (Math.abs(z - 12) < 8) continue;
  if (Math.abs(z + 28) < 9 && x > -55 && x < 10) continue;

  makeTree(x, z, .7 + Math.random() * .8);
}

// Gospodarstwo.
function makeBuilding(x, z, w, h, d, wallColor, roofColor) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  box(g, w, h, d, mat(wallColor), 0, h / 2, 0);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * .75, h * .45, 4),
    mat(roofColor)
  );
  roof.position.set(0, h + h * .2, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, d / w);
  roof.castShadow = true;
  g.add(roof);

  scene.add(g);
}

makeBuilding(-17, 3, 13, 5, 11, 0xd0c4a4, 0x75402b);
makeBuilding(-36, 1, 10, 4, 8, 0xb5b6a5, 0x484e4b);
makeBuilding(-23, -12, 16, 4, 10, 0x9d7953, 0x703b29);

// Duże drzwi stodoły.
box(scene, 3.4, 3.2, .12, mat(0x613b24), -17, 1.7, 8.56);

// Traktor.
const tractor = new THREE.Group();
scene.add(tractor);
tractor.position.set(0, 0, 4);

const tractorBody = new THREE.Group();
tractor.add(tractorBody);

box(tractorBody, 2.2, .7, 3.4, greenMat, 0, 1.15, 0);
box(tractorBody, 1.9, .25, 1.2, darkGreen, 0, 1.55, -.7);
box(tractorBody, 1.65, 1.25, 1.4, greenMat, 0, 1.85, .55);
box(tractorBody, 1.45, 1.05, 1.15, glassMat, 0, 2.05, .55);
box(tractorBody, 1.75, .12, 1.45, darkGreen, 0, 2.65, .55);

// Koła po obu stronach, z przodu i z tyłu.
const wheels = [];

function makeWheel(x, z, radius) {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, .34, 18),
    tireMat
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, radius, z);
  wheel.castShadow = true;
  tractorBody.add(wheel);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * .42, radius * .42, .36, 12),
    metalMat
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.copy(wheel.position);
  tractorBody.add(hub);

  wheels.push(wheel);
}

makeWheel(-1.12, -1.05, .78);
makeWheel(1.12, -1.05, .78);
makeWheel(-1.05, 1.15, .49);
makeWheel(1.05, 1.15, .49);

box(tractorBody, .12, .18, .25, yellowMat, -.7, 1.35, 1.68);
box(tractorBody, .12, .18, .25, yellowMat, .7, 1.35, 1.68);
box(tractorBody, .9, .12, .2, blackMat, 0, .55, -1.85);

// Postać gracza.
const player = new THREE.Group();
scene.add(player);
player.position.set(3, 0, 4);

const skinMat = mat(0xc9966c);
const shirtMat = mat(0x315f8c);
const pantsMat = mat(0x353d49);

box(player, .65, .85, .38, shirtMat, 0, 1.15, 0);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(.23, 12, 10), skinMat
);
head.position.y = 1.8;
head.castShadow = true;
player.add(head);
box(player, .16, .65, .18, pantsMat, -.17, .42, 0);
box(player, .16, .65, .18, pantsMat, .17, .42, 0);

// Stan gry.
let driving = false;
let cameraMode = 0; // 0: zewnętrzna, 1: kabina
let yaw = 0;
let pitch = .2;
let speed = 0;
let money = 12500;

const input = { x: 0, y: 0 };
const keys = {};

function showMessage(text) {
  const el = $("message");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2200);
}

function updateHud() {
  $("vehicleInfo").textContent = driving ? "TRAKTOR" : "POSTAĆ";
  $("speed").textContent = `${Math.round(Math.abs(speed) * 12)} km/h`;
  $("money").textContent = `${money.toLocaleString("pl-PL")} zł`;
  $("status").textContent = driving ? "Praca w gospodarstwie" : "Gospodarstwo";
  $("enterBtn").textContent = driving ? "WYSIĄDŹ" : "WEJDŹ";
  $("cameraBtn").textContent = cameraMode === 0 ? "KABINA" : "ZEWN.";
}

function enterVehicle() {
  if (driving) {
    driving = false;
    player.position.copy(tractor.position);
    player.position.x += 2.5;
    player.rotation.y = tractor.rotation.y;
    showMessage("Wysiadłeś z traktora");
    updateHud();
    return;
  }

  const distance = player.position.distanceTo(tractor.position);

  if (distance < 7) {
    driving = true;
    showMessage("Wsiadłeś do traktora");
    updateHud();
  } else {
    showMessage("Podejdź bliżej traktora!");
  }
}

$("enterBtn").addEventListener("click", enterVehicle);

$("cameraBtn").addEventListener("click", () => {
  cameraMode = cameraMode === 0 ? 1 : 0;
  updateHud();
  showMessage(cameraMode === 0 ? "Kamera zewnętrzna" : "Widok z kabiny");
});

$("workBtn").addEventListener("click", () => {
  if (driving) {
    if (Math.abs(tractor.position.x) < 30 &&
        tractor.position.z < -10 &&
        tractor.position.z > -76) {
      cropStage = (cropStage + 1) % 4;
      buildCrops();
      showMessage([
        "Pole przygotowane",
        "Rozpoczęto uprawę",
        "Uprawa rośnie",
        "Plony dojrzewają"
      ][cropStage]);
    } else {
      showMessage("Podjedź na pole uprawne!");
    }
  } else {
    showMessage("Najpierw wsiądź do traktora, aby pracować na polu.");
  }
});

$("saveBtn").addEventListener("click", () => {
  const save = {
    player: player.position.toArray(),
    tractor: tractor.position.toArray(),
    tractorRotation: tractor.rotation.y,
    cropStage,
    money
  };

  try {
    localStorage.setItem("farma3d-save", JSON.stringify(save));
    showMessage("Gra zapisana!");
  } catch {
    showMessage("Nie udało się zapisać gry.");
  }
});

// Wczytywanie zapisu.
try {
  const raw = localStorage.getItem("farma3d-save");
  if (raw) {
    const save = JSON.parse(raw);

    if (Array.isArray(save.player) && save.player.length === 3)
      player.position.fromArray(save.player);

    if (Array.isArray(save.tractor) && save.tractor.length === 3)
      tractor.position.fromArray(save.tractor);

    if (Number.isFinite(save.tractorRotation))
      tractor.rotation.y = save.tractorRotation;

    if (Number.isInteger(save.cropStage) &&
        save.cropStage >= 0 && save.cropStage <= 3) {
      cropStage = save.cropStage;
      buildCrops();
    }

    if (Number.isFinite(save.money)) money = save.money;
  }
} catch {
  console.warn("Nie udało się odczytać zapisu.");
}

// Joystick dotykowy.
const stickZone = $("stickZone");
const stickKnob = $("stickKnob");
let stickPointer = null;

function resetStick() {
  input.x = 0;
  input.y = 0;
  stickKnob.style.transform = "translate(0px, 0px)";
}

stickZone.addEventListener("pointerdown", e => {
  stickPointer = e.pointerId;
  stickZone.setPointerCapture(e.pointerId);
  updateStick(e);
});

stickZone.addEventListener("pointermove", e => {
  if (e.pointerId === stickPointer) updateStick(e);
});

function updateStick(e) {
  const r = stickZone.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const max = 35;

  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const len = Math.hypot(dx, dy);

  if (len > max) {
    dx = dx / len * max;
    dy = dy / len * max;
  }

  input.x = dx / max;
  input.y = dy / max;
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function endStick(e) {
  if (e.pointerId === stickPointer) {
    stickPointer = null;
    resetStick();
  }
}

stickZone.addEventListener("pointerup", endStick);
stickZone.addEventListener("pointercancel", endStick);

// Klawiatura — pomocna przy testowaniu na komputerze.
addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});

addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// Przeciąganie palcem poza przyciskami obraca kamerę.
// Pointer capture joysticka pozostaje niezależny.
let lookPointer = null;
let lastLookX = 0;
let lastLookY = 0;

renderer.domElement.addEventListener("pointerdown", e => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (e.clientX < innerWidth * .42) return;

  lookPointer = e.pointerId;
  lastLookX = e.clientX;
  lastLookY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener("pointermove", e => {
  if (e.pointerId !== lookPointer) return;

  const dx = e.clientX - lastLookX;
  const dy = e.clientY - lastLookY;

  yaw -= dx * .006;
  pitch = THREE.MathUtils.clamp(pitch + dy * .004, -.15, 1.1);

  lastLookX = e.clientX;
  lastLookY = e.clientY;
});

function endLook(e) {
  if (e.pointerId === lookPointer) lookPointer = null;
}

renderer.domElement.addEventListener("pointerup", endLook);
renderer.domElement.addEventListener("pointercancel", endLook);

// Ruch i aktualizacja kamery.
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function update(dt) {
  const kx = (keys["d"] || keys["arrowright"] ? 1 : 0) -
             (keys["a"] || keys["arrowleft"] ? 1 : 0);
  const ky = (keys["s"] || keys["arrowdown"] ? 1 : 0) -
             (keys["w"] || keys["arrowup"] ? 1 : 0);

  const ix = THREE.MathUtils.clamp(input.x + kx, -1, 1);
  const iy = THREE.MathUtils.clamp(input.y + ky, -1, 1);

  if (driving) {
    const throttle = -iy;
    speed += throttle * 9 * dt;
    speed *= Math.pow(.12, dt);
    speed = THREE.MathUtils.clamp(speed, -5, 18);

    tractor.rotation.y -= ix * dt * Math.min(2.0, .35 + Math.abs(speed) * .12);

    const fwd = new THREE.Vector3(
      Math.sin(tractor.rotation.y), 0,
      Math.cos(tractor.rotation.y)
    );

    tractor.position.addScaledVector(fwd, -speed * dt);

    // Proste granice świata.
    tractor.position.x = THREE.MathUtils.clamp(tractor.position.x, -280, 280);
    tractor.position.z = THREE.MathUtils.clamp(tractor.position.z, -280, 280);

    wheels.forEach(w => {
      w.rotation.x += speed * dt * 1.5;
    });

    player.visible = false;
  } else {
    speed = 0;
    const move = new THREE.Vector3(ix, 0, iy);

    if (move.lengthSq() > 0.01) {
      move.normalize().multiplyScalar(7 * dt);

      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      const mx = move.x * cos + move.z * sin;
      const mz = -move.x * sin + move.z * cos;

      player.position.x += mx;
      player.position.z += mz;

      player.rotation.y = Math.atan2(mx, mz);
    }

    player.position.x = THREE.MathUtils.clamp(player.position.x, -280, 280);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -280, 280);
    player.visible = true;
  }

  updateHud();

  const target = driving ? tractor : player;

  if (cameraMode === 1 && driving) {
    // Widok z kabiny.
    const angle = tractor.rotation.y;
    camera.position.set(
      tractor.position.x + Math.sin(angle) * .1,
      tractor.position.y + 2.45,
      tractor.position.z + Math.cos(angle) * .1
    );

    lookTarget.set(
      tractor.position.x + Math.sin(angle) * 20,
      tractor.position.y + 2.1,
      tractor.position.z + Math.cos(angle) * 20
    );
  } else {
    const angle = driving ? tractor.rotation.y : yaw;
    const distance = driving ? 9 : 7;
    const height = driving ? 4.4 : 3.2;

    desiredCamera.set(
      target.position.x + Math.sin(angle) * distance,
      target.position.y + height + pitch * 2,
      target.position.z + Math.cos(angle) * distance
    );

    camera.position.lerp(desiredCamera, 1 - Math.pow(.001, dt));
    lookTarget.set(
      target.position.x,
      target.position.y + (driving ? 1.6 : 1.3),
      target.position.z
    );
  }

  camera.lookAt(lookTarget);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), .04);
  update(dt);
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
});

updateHud();
showMessage("Witaj na gospodarstwie!");
