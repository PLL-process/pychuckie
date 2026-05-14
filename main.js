// Variable globale qui contiendra Pyodide, c'est-à-dire Python dans le navigateur.
let pyodide = null;

// Variable booléenne qui indique si Python est prêt à exécuter du code.
let pyodideReady = false;

// Récupère la zone graphique du jeu.
const canvas = document.getElementById("gameCanvas");

// Prépare le dessin en deux dimensions sur le canvas.
const ctx = canvas.getContext("2d");

// Récupère la liste déroulante des niveaux.
const levelSelect = document.getElementById("levelSelect");

// Récupère la zone qui affiche la mission.
const missionBox = document.getElementById("mission");

// Récupère la zone de saisie du code Python.
const codeEditor = document.getElementById("codeEditor");

// Récupère la console de sortie.
const output = document.getElementById("output");

// Récupère le bouton qui exécute le code Python.
const runButton = document.getElementById("runButton");

// Récupère le bouton qui réinitialise le niveau.
const resetButton = document.getElementById("resetButton");

// Récupère le bouton qui affiche un indice.
const hintButton = document.getElementById("hintButton");

// Définit la taille d'une case du jeu.
const TILE = 40;

// Définit les premiers niveaux pédagogiques du prototype.
const levels = [
  {
    id: 1,
    title: "Niveau 1 — Jouer, observer, programmer",
    concept: "Instructions simples et déplacement horizontal",
    goal: "Récupérer les trois œufs sans toucher l'autruche.",
    hint: "Joue d'abord avec les flèches, puis reproduis ton trajet avec tolkaze.move_right().",
    start: { x: 1, y: 8 },
    eggs: [{ x: 5, y: 8 }, { x: 9, y: 8 }, { x: 13, y: 8 }],
    ostriches: [{ x: 11, y: 8, dir: -1, minX: 10, maxX: 14 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Objectif : récupérer les œufs.\n# Écris les actions de Tolkaze ci-dessous.\n\nfor i in range(12):\n    tolkaze.move_right()\n"
  },
  {
    id: 2,
    title: "Niveau 2 — Répéter avec une boucle",
    concept: "Boucle for et répétition d'instructions",
    goal: "Traverser la plateforme et récupérer les œufs plus efficacement.",
    hint: "Une boucle for évite de répéter plusieurs fois la même ligne.",
    start: { x: 1, y: 8 },
    eggs: [{ x: 4, y: 8 }, { x: 8, y: 8 }, { x: 12, y: 8 }],
    ostriches: [{ x: 14, y: 8, dir: -1, minX: 11, maxX: 15 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Utilise une boucle pour avancer plusieurs fois.\n\nfor i in range(11):\n    tolkaze.move_right()\n"
  },
  {
    id: 3,
    title: "Niveau 3 — Monter et descendre",
    concept: "Échelles, coordonnées et décomposition d'un trajet",
    goal: "Utiliser l'échelle pour atteindre l'œuf supérieur.",
    hint: "Utilise tolkaze.climb_up() quand Tolkaze est sur une échelle.",
    start: { x: 2, y: 8 },
    eggs: [{ x: 2, y: 5 }, { x: 8, y: 5 }, { x: 12, y: 8 }],
    ostriches: [{ x: 10, y: 8, dir: 1, minX: 9, maxX: 14 }],
    ladders: [{ x: 2, y1: 5, y2: 8 }, { x: 8, y1: 5, y2: 8 }],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }, { x: 2, y: 6, w: 8, h: 1 }],
    starterCode: "# Monte à l'échelle, puis avance.\n\nfor i in range(3):\n    tolkaze.climb_up()\n"
  },
  {
    id: 4,
    title: "Niveau 4 — Décider avec if",
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

// Stocke le niveau actuellement sélectionné.
let currentLevel = levels[0];

// Stocke l'état courant du jeu.
let state = null;

// Stocke l'identifiant du minuteur qui anime les autruches.
let ostrichTimer = null;

// Copie une position afin d'éviter de modifier le modèle du niveau.
function copyPos(pos) {
  return { x: pos.x, y: pos.y };
}

// Copie une autruche avec ses limites de patrouille.
function copyOstrich(ostrich) {
  return {
    x: ostrich.x,
    y: ostrich.y,
    dir: ostrich.dir,
    minX: ostrich.minX ?? 0,
    maxX: ostrich.maxX ?? 15
  };
}

// Réinitialise le niveau actuel.
function resetGame() {
  state = {
    tolkaze: copyPos(currentLevel.start),
    eggs: currentLevel.eggs.map(copyPos),
    ostriches: currentLevel.ostriches.map(copyOstrich),
    collected: 0,
    status: "playing",
    mode: "play",
    message: "Mode Jouer : utilise les flèches pour explorer le niveau."
  };
  codeEditor.value = currentLevel.starterCode;
  output.textContent = "Joue d'abord, observe le trajet, puis programme Tolkaze.";
  drawGame();
}

// Vérifie si une plateforme se trouve sous la case indiquée.
function hasGround(x, y) {
  return currentLevel.platforms.some(p => x >= p.x && x < p.x + p.w && y + 1 === p.y);
}

// Vérifie si une case appartient à une échelle.
function isOnLadder(x, y) {
  return currentLevel.ladders.some(l => x === l.x && y >= l.y1 && y <= l.y2);
}

// Limite une valeur entre un minimum et un maximum.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Récupère les œufs situés sur la case de Tolkaze.
function collectEggs() {
  state.eggs = state.eggs.filter(egg => {
    const sameCell = egg.x === state.tolkaze.x && egg.y === state.tolkaze.y;
    if (sameCell) state.collected += 1;
    return !sameCell;
  });
  if (state.eggs.length === 0) {
    state.status = "success";
    state.message = "Mission réussie : tous les œufs sont récupérés.";
  }
}

// Vérifie si Tolkaze touche une autruche.
function checkOstrichCollision() {
  const touched = state.ostriches.some(o => o.x === state.tolkaze.x && o.y === state.tolkaze.y);
  if (touched) {
    state.status = "failed";
    state.message = "Tolkaze a été touché par une autruche. Analyse le trajet et recommence.";
  }
}

// Vérifie si une autruche est proche de Tolkaze.
function seeOstrich() {
  return state.ostriches.some(o => o.y === state.tolkaze.y && Math.abs(o.x - state.tolkaze.x) <= 2);
}

// Retourne le nombre d'œufs restants.
function eggsLeft() {
  return state.eggs.length;
}

// Retourne la position de Tolkaze sous forme de texte.
function tolkazePosition() {
  return `x=${state.tolkaze.x}, y=${state.tolkaze.y}`;
}

// Déplace toutes les autruches d'une case pendant leur patrouille.
function stepOstriches() {
  if (!state || state.status !== "playing") return;
  state.ostriches.forEach(o => {
    const nextX = o.x + o.dir;
    if (nextX < o.minX || nextX > o.maxX) {
      o.dir *= -1;
    }
    o.x += o.dir;
  });
  checkOstrichCollision();
  drawGame();
}

// Déplace Tolkaze dans la grille du jeu.
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

// Fait sauter Tolkaze d'une case puis le fait redescendre.
function jumpTolkaze() {
  if (state.status !== "playing") return;
  moveTolkaze(0, -1);
  setTimeout(() => moveTolkaze(0, 1), 180);
}

// Dessine une case colorée sur le canvas.
function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

// Dessine Tolkaze avec une forme temporaire lisible.
function drawTolkaze() {
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(state.tolkaze.x * TILE + 6, state.tolkaze.y * TILE + 6, 28, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("T", state.tolkaze.x * TILE + 15, state.tolkaze.y * TILE + 25);
}

// Dessine une autruche temporaire en attendant les sprites définitifs.
function drawOstrich(o) {
  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.arc(o.x * TILE + 20, o.y * TILE + 20, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.fillText("O", o.x * TILE + 15, o.y * TILE + 25);
}

// Dessine tout le niveau.
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  currentLevel.platforms.forEach(p => {
    for (let x = p.x; x < p.x + p.w; x++) drawTile(x, p.y, "#475569");
  });
  currentLevel.ladders.forEach(l => {
    for (let y = l.y1; y <= l.y2; y++) {
      drawTile(l.x, y, "#92400e");
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(l.x * TILE + 10, y * TILE + 5, 20, 5);
    }
  });
  state.eggs.forEach(egg => {
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.ellipse(egg.x * TILE + 20, egg.y * TILE + 22, 11, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  state.ostriches.forEach(drawOstrich);
  drawTolkaze();
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`Œufs : ${state.collected}/${currentLevel.eggs.length}`, 10, 20);
  ctx.fillText(`Position : ${tolkazePosition()}`, 10, 38);
  ctx.fillText(state.message, 10, 390);
}

// Met à jour la fiche de mission affichée à gauche.
function updateMission() {
  missionBox.innerHTML = `
    <h2>${currentLevel.title}</h2>
    <p><strong>Principe :</strong> joue d'abord, observe le parcours, puis programme Tolkaze.</p>
    <p><strong>Notion Python :</strong> ${currentLevel.concept}</p>
    <p><strong>Objectif :</strong> ${currentLevel.goal}</p>
    <p><strong>Commandes clavier :</strong> flèches pour se déplacer, espace pour sauter.</p>
    <p><strong>Commandes Python :</strong> <code>tolkaze.move_right()</code>, <code>tolkaze.move_left()</code>, <code>tolkaze.climb_up()</code>, <code>tolkaze.climb_down()</code>, <code>tolkaze.jump()</code>, <code>tolkaze.see_ostrich()</code>, <code>tolkaze.eggs_left()</code></p>
  `;
}

// Remplit automatiquement la liste des niveaux.
function populateLevels() {
  levelSelect.innerHTML = "";
  levels.forEach(level => {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = level.title;
    levelSelect.appendChild(option);
  });
}

// Expose les commandes JavaScript dans window pour que Pyodide puisse les appeler.
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

// Charge Pyodide et prépare les commandes accessibles depuis Python.
async function initPyodide() {
  output.textContent = "Chargement de Python dans le navigateur...";
  exposeGameCommandsToWindow();
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/" });
  pyodideReady = true;
  output.textContent = "Python est prêt. Tu peux jouer, puis programmer Tolkaze.";
}

// Exécute le code Python de l'élève.
async function runPythonCode() {
  if (!pyodideReady) {
    output.textContent = "Python n'est pas encore chargé.";
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
    output.textContent = "Exécution du programme...";
    await pyodide.runPythonAsync(bridgeCode + "\n" + studentCode);
    if (state.status === "success") output.textContent = "✅ Bravo : programme validé. Les œufs ont été récupérés.";
    else if (state.status === "failed") output.textContent = "❌ Programme à corriger : Tolkaze a été touché.";
    else output.textContent = "⚠️ Programme exécuté, mais la mission n'est pas encore terminée.";
  } catch (error) {
    output.textContent = "Erreur Python : " + error.message;
  }
  state.mode = "play";
  drawGame();
}

// Gère le clavier pour le mode Jouer.
document.addEventListener("keydown", event => {
  if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
  if (event.key === "ArrowRight") moveTolkaze(1, 0);
  if (event.key === "ArrowLeft") moveTolkaze(-1, 0);
  if (event.key === "ArrowUp") moveTolkaze(0, -1);
  if (event.key === "ArrowDown") moveTolkaze(0, 1);
  if (event.code === "Space") jumpTolkaze();
});

// Change de niveau quand l'élève utilise la liste déroulante.
levelSelect.addEventListener("change", () => {
  currentLevel = levels.find(level => String(level.id) === levelSelect.value);
  updateMission();
  resetGame();
});

// Lance le programme Python quand l'élève clique sur le bouton.
runButton.addEventListener("click", runPythonCode);

// Réinitialise le niveau quand l'élève clique sur le bouton.
resetButton.addEventListener("click", resetGame);

// Affiche l'indice du niveau actuel.
hintButton.addEventListener("click", () => {
  output.textContent = "Indice : " + currentLevel.hint;
});

// Prépare la liste des niveaux.
populateLevels();

// Affiche la première mission.
updateMission();

// Réinitialise le premier niveau.
resetGame();

// Lance le chargement de Python.
initPyodide();

// Anime les autruches automatiquement en mode Jouer.
ostrichTimer = setInterval(() => {
  if (state && state.mode === "play" && state.status === "playing") stepOstriches();
}, 800);
