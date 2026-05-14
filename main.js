// PyChuckie - L'Odyssee du Code : moteur principal.
let pyodide = null;
let pyodideReady = false;

// Elements HTML principaux.
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const levelSelect = document.getElementById("levelSelect");
const missionBox = document.getElementById("mission");
const codeEditor = document.getElementById("codeEditor");
const output = document.getElementById("output");
const runButton = document.getElementById("runButton");
const resetButton = document.getElementById("resetButton");
const hintButton = document.getElementById("hintButton");

// Taille d'une case.
const TILE = 40;

// Chargement des sprites originaux du projet.
const sprites = {
  tolkaze: loadSprite("assets/tolkaze.svg"),
  egg: loadSprite("assets/egg.svg"),
  ostrich: loadSprite("assets/ostrich.svg"),
  ladder: loadSprite("assets/ladder.svg")
};

// Fonction utilitaire pour charger une image.
function loadSprite(src) {
  const image = new Image();
  image.src = src;
  image.onload = () => drawGame();
  return image;
}

// Niveaux pédagogiques du prototype.
const levels = [
  {
    id: 1,
    title: "Niveau 1 - Jouer, observer, programmer",
    concept: "Instructions simples et deplacement horizontal",
    goal: "Recuperer les trois oeufs sans toucher l'autruche.",
    hint: "Joue d'abord avec les fleches, puis reproduis ton trajet avec tolkaze.move_right().",
    start: { x: 1, y: 8 },
    eggs: [{ x: 5, y: 8 }, { x: 9, y: 8 }, { x: 13, y: 8 }],
    ostriches: [{ x: 11, y: 8, dir: -1, minX: 10, maxX: 14 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Objectif : recuperer les oeufs.\n# Ecris les actions de Tolkaze ci-dessous.\n\nfor i in range(12):\n    tolkaze.move_right()\n"
  },
  {
    id: 2,
    title: "Niveau 2 - Repeter avec une boucle",
    concept: "Boucle for et repetition d'instructions",
    goal: "Traverser la plateforme et recuperer les oeufs plus efficacement.",
    hint: "Une boucle for evite de repeter plusieurs fois la meme ligne.",
    start: { x: 1, y: 8 },
    eggs: [{ x: 4, y: 8 }, { x: 8, y: 8 }, { x: 12, y: 8 }],
    ostriches: [{ x: 14, y: 8, dir: -1, minX: 11, maxX: 15 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Utilise une boucle pour avancer plusieurs fois.\n\nfor i in range(11):\n    tolkaze.move_right()\n"
  },
  {
    id: 3,
    title: "Niveau 3 - Monter et descendre",
    concept: "Echelles, coordonnees et decomposition d'un trajet",
    goal: "Utiliser l'echelle pour atteindre l'oeuf superieur.",
    hint: "Utilise tolkaze.climb_up() quand Tolkaze est sur une echelle.",
    start: { x: 2, y: 8 },
    eggs: [{ x: 2, y: 5 }, { x: 8, y: 5 }, { x: 12, y: 8 }],
    ostriches: [{ x: 10, y: 8, dir: 1, minX: 9, maxX: 14 }],
    ladders: [{ x: 2, y1: 5, y2: 8 }, { x: 8, y1: 5, y2: 8 }],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }, { x: 2, y: 6, w: 8, h: 1 }],
    starterCode: "# Monte a l'echelle, puis avance.\n\nfor i in range(3):\n    tolkaze.climb_up()\n"
  },
  {
    id: 4,
    title: "Niveau 4 - Decider avec if",
    concept: "Condition if et observation du danger",
    goal: "Avancer seulement si aucune autruche n'est proche.",
    hint: "Teste tolkaze.see_ostrich() avant d'avancer.",
    start: { x: 1, y: 8 },
    eggs: [{ x: 4, y: 8 }, { x: 7, y: 8 }, { x: 10, y: 8 }],
    ostriches: [{ x: 12, y: 8, dir: -1, minX: 8, maxX: 13 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Observe le danger avant d'avancer.\n\nif not tolkaze.see_ostrich():\n    tolkaze.move_right()\n"
  }
];

// Etat du jeu.
let currentLevel = levels[0];
let state = null;
let ostrichTimer = null;

// Copie une position.
function copyPos(pos) {
  return { x: pos.x, y: pos.y };
}

// Copie une autruche.
function copyOstrich(ostrich) {
  return { x: ostrich.x, y: ostrich.y, dir: ostrich.dir, minX: ostrich.minX ?? 0, maxX: ostrich.maxX ?? 15 };
}

// Reinitialise le niveau.
function resetGame() {
  state = {
    tolkaze: copyPos(currentLevel.start),
    eggs: currentLevel.eggs.map(copyPos),
    ostriches: currentLevel.ostriches.map(copyOstrich),
    collected: 0,
    status: "playing",
    mode: "play",
    message: "Mode Jouer : utilise les fleches pour explorer le niveau."
  };
  codeEditor.value = currentLevel.starterCode;
  output.textContent = "Joue d'abord, observe le trajet, puis programme Tolkaze.";
  drawGame();
}

// Verifie si Tolkaze a du sol sous les pieds.
function hasGround(x, y) {
  return currentLevel.platforms.some(p => x >= p.x && x < p.x + p.w && y + 1 === p.y);
}

// Verifie si une case appartient a une echelle.
function isOnLadder(x, y) {
  return currentLevel.ladders.some(l => x === l.x && y >= l.y1 && y <= l.y2);
}

// Limite une valeur.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Recupere les oeufs.
function collectEggs() {
  state.eggs = state.eggs.filter(egg => {
    const taken = egg.x === state.tolkaze.x && egg.y === state.tolkaze.y;
    if (taken) state.collected += 1;
    return !taken;
  });
  if (state.eggs.length === 0) {
    state.status = "success";
    state.message = "Mission reussie : tous les oeufs sont recuperes.";
  }
}

// Verifie les collisions.
function checkOstrichCollision() {
  if (state.ostriches.some(o => o.x === state.tolkaze.x && o.y === state.tolkaze.y)) {
    state.status = "failed";
    state.message = "Tolkaze a ete touche par une autruche. Analyse le trajet et recommence.";
  }
}

// Detecte une autruche proche.
function seeOstrich() {
  return state.ostriches.some(o => o.y === state.tolkaze.y && Math.abs(o.x - state.tolkaze.x) <= 2);
}

// Donne le nombre d'oeufs restants.
function eggsLeft() {
  return state.eggs.length;
}

// Donne la position de Tolkaze.
function tolkazePosition() {
  return `x=${state.tolkaze.x}, y=${state.tolkaze.y}`;
}

// Avance les autruches.
function stepOstriches() {
  if (!state || state.status !== "playing") return;
  state.ostriches.forEach(o => {
    const nextX = o.x + o.dir;
    if (nextX < o.minX || nextX > o.maxX) o.dir *= -1;
    o.x += o.dir;
  });
  checkOstrichCollision();
  drawGame();
}

// Deplace Tolkaze.
function moveTolkaze(dx, dy) {
  if (state.status !== "playing") return;
  const nx = clamp(state.tolkaze.x + dx, 0, 15);
  const ny = clamp(state.tolkaze.y + dy, 0, 9);
  if (dy < 0 && !isOnLadder(state.tolkaze.x, state.tolkaze.y)) return;
  if (dy > 0 && !isOnLadder(state.tolkaze.x, ny)) return;
  if (dy === 0 && !hasGround(nx, state.tolkaze.y) && !isOnLadder(nx, state.tolkaze.y)) return;
  state.tolkaze.x = nx;
  state.tolkaze.y = ny;
  collectEggs();
  checkOstrichCollision();
  if (state.mode === "program") stepOstriches();
  drawGame();
}

// Fait sauter Tolkaze.
function jumpTolkaze() {
  if (state.status !== "playing") return;
  moveTolkaze(0, -1);
  setTimeout(() => moveTolkaze(0, 1), 180);
}

// Dessine un sprite si charge, sinon une couleur de secours.
function drawSprite(image, x, y, fallbackColor) {
  if (image.complete && image.naturalWidth > 0) ctx.drawImage(image, x * TILE, y * TILE, TILE, TILE);
  else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x * TILE + 6, y * TILE + 6, 28, 28);
  }
}

// Dessine le fond etoile.
function drawBackground() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1e293b";
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % canvas.width;
    const y = (i * 53) % 330;
    ctx.fillRect(x, y, 2, 2);
  }
}

// Dessine une plateforme retro.
function drawPlatform(x, y) {
  ctx.fillStyle = "#475569";
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x * TILE, y * TILE, TILE, 8);
}

// Dessine tout le niveau.
function drawGame() {
  if (!state) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  currentLevel.platforms.forEach(p => {
    for (let x = p.x; x < p.x + p.w; x++) drawPlatform(x, p.y);
  });
  currentLevel.ladders.forEach(l => {
    for (let y = l.y1; y <= l.y2; y++) drawSprite(sprites.ladder, l.x, y, "#92400e");
  });
  state.eggs.forEach(egg => drawSprite(sprites.egg, egg.x, egg.y, "#fef3c7"));
  state.ostriches.forEach(o => drawSprite(sprites.ostrich, o.x, o.y, "#fb7185"));
  drawSprite(sprites.tolkaze, state.tolkaze.x, state.tolkaze.y, "#38bdf8");
  ctx.fillStyle = "#f8fafc";
  ctx.font = "12px monospace";
  ctx.fillText(`Oeufs : ${state.collected}/${currentLevel.eggs.length}`, 10, 20);
  ctx.fillText(`Position : ${tolkazePosition()}`, 10, 38);
  ctx.fillText(state.message, 10, 390);
}

// Met a jour la mission.
function updateMission() {
  missionBox.innerHTML = `
    <h2>${currentLevel.title}</h2>
    <p><strong>Principe :</strong> joue d'abord, observe le parcours, puis programme Tolkaze.</p>
    <p><strong>Notion Python :</strong> ${currentLevel.concept}</p>
    <p><strong>Objectif :</strong> ${currentLevel.goal}</p>
    <p><strong>Commandes clavier :</strong> fleches pour se deplacer, espace pour sauter.</p>
    <p><strong>Commandes Python :</strong> <code>tolkaze.move_right()</code>, <code>tolkaze.move_left()</code>, <code>tolkaze.climb_up()</code>, <code>tolkaze.climb_down()</code>, <code>tolkaze.jump()</code>, <code>tolkaze.see_ostrich()</code>, <code>tolkaze.eggs_left()</code></p>
  `;
}

// Remplit la liste des niveaux.
function populateLevels() {
  levelSelect.innerHTML = "";
  levels.forEach(level => {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = level.title;
    levelSelect.appendChild(option);
  });
}

// Expose les commandes a Pyodide.
function exposeGameCommandsToWindow() {
  window.js_move_right = () => moveTolkaze(1, 0);
  window.js_move_left = () => moveTolkaze(-1, 0);
  window.js_climb_up = () => moveTolkaze(0, -1);
  window.js_climb_down = () => moveTolkaze(0, 1);
  window.js_jump = () => jumpTolkaze();
  window.js_see_ostrich = () => seeOstrich();
  window.js_eggs_left = () => eggsLeft();
  window.js_position = () => tolkazePosition();
}

// Charge Pyodide.
async function initPyodide() {
  output.textContent = "Chargement de Python dans le navigateur...";
  exposeGameCommandsToWindow();
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/" });
  pyodideReady = true;
  output.textContent = "Python est pret. Tu peux jouer, puis programmer Tolkaze.";
}

// Execute le code Python eleve.
async function runPythonCode() {
  if (!pyodideReady) {
    output.textContent = "Python n'est pas encore charge.";
    return;
  }
  const studentCode = codeEditor.value;
  resetGame();
  state.mode = "program";
  codeEditor.value = studentCode;
  const bridgeCode = `
from js import window

class Tolkaze:
    def move_right(self):
        window.js_move_right()

    def move_left(self):
        window.js_move_left()

    def climb_up(self):
        window.js_climb_up()

    def climb_down(self):
        window.js_climb_down()

    def jump(self):
        window.js_jump()

    def see_ostrich(self):
        return bool(window.js_see_ostrich())

    def eggs_left(self):
        return int(window.js_eggs_left())

    def position(self):
        return str(window.js_position())

tolkaze = Tolkaze()
`;
  try {
    output.textContent = "Execution du programme...";
    await pyodide.runPythonAsync(bridgeCode + "\n" + studentCode);
    if (state.status === "success") output.textContent = "Bravo : programme valide. Les oeufs ont ete recuperes.";
    else if (state.status === "failed") output.textContent = "Programme a corriger : Tolkaze a ete touche.";
    else output.textContent = "Programme execute, mais la mission n'est pas encore terminee.";
  } catch (error) {
    output.textContent = "Erreur Python : " + error.message;
  }
  state.mode = "play";
  drawGame();
}

// Gestion du clavier.
document.addEventListener("keydown", event => {
  if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
  if (event.key === "ArrowRight") moveTolkaze(1, 0);
  if (event.key === "ArrowLeft") moveTolkaze(-1, 0);
  if (event.key === "ArrowUp") moveTolkaze(0, -1);
  if (event.key === "ArrowDown") moveTolkaze(0, 1);
  if (event.code === "Space") jumpTolkaze();
});

// Gestion du changement de niveau.
levelSelect.addEventListener("change", () => {
  currentLevel = levels.find(level => String(level.id) === levelSelect.value);
  updateMission();
  resetGame();
});

// Gestion des boutons.
runButton.addEventListener("click", runPythonCode);
resetButton.addEventListener("click", resetGame);
hintButton.addEventListener("click", () => output.textContent = "Indice : " + currentLevel.hint);

// Initialisation.
populateLevels();
updateMission();
resetGame();
initPyodide();
ostrichTimer = setInterval(() => {
  if (state && state.mode === "play" && state.status === "playing") stepOstriches();
}, 800);
