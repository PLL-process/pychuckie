// Variable globale qui contiendra le moteur Python Pyodide.
let pyodide = null;

// Variable qui indique si Pyodide est prêt.
let pyodideReady = false;

// Récupère le canvas dans la page HTML.
const canvas = document.getElementById("gameCanvas");

// Récupère le contexte 2D du canvas pour dessiner le jeu.
const ctx = canvas.getContext("2d");

// Récupère le sélecteur de niveau.
const levelSelect = document.getElementById("levelSelect");

// Récupère la zone des consignes.
const missionBox = document.getElementById("mission");

// Récupère l'éditeur de code Python.
const codeEditor = document.getElementById("codeEditor");

// Récupère la console de sortie.
const output = document.getElementById("output");

// Récupère le bouton d'exécution.
const runButton = document.getElementById("runButton");

// Récupère le bouton de réinitialisation.
const resetButton = document.getElementById("resetButton");

// Récupère le bouton d'indice.
const hintButton = document.getElementById("hintButton");

// Définit la taille d'une case du jeu.
const TILE = 40;

// Définit les niveaux disponibles pour le premier prototype.
const levels = [
  {
    id: 1,
    title: "Niveau 1 — Jouer, observer, programmer",
    concept: "Instructions simples et déplacement horizontal",
    goal: "Récupérer les trois œufs sans toucher l'autruche.",
    hint: "Joue d'abord avec les flèches, puis reproduis ton trajet avec tolkaze.move_right().",
    start: { x: 1, y: 8 },
    eggs: [{ x: 5, y: 8 }, { x: 9, y: 8 }, { x: 13, y: 8 }],
    ostriches: [{ x: 11, y: 8, dir: -1 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Objectif : récupérer les œufs.\n# Écris les actions de Tolkaze ci-dessous.\n\ntolkaze.move_right()\ntolkaze.move_right()\n"
  },
  {
    id: 2,
    title: "Niveau 2 — Répéter avec une boucle",
    concept: "Boucle for et répétition d'instructions",
    goal: "Traverser la plateforme et récupérer les œufs plus efficacement.",
    hint: "Une boucle for évite de répéter plusieurs fois la même ligne.",
    start: { x: 1, y: 8 },
    eggs: [{ x: 4, y: 8 }, { x: 8, y: 8 }, { x: 12, y: 8 }],
    ostriches: [{ x: 14, y: 8, dir: -1 }],
    ladders: [],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }],
    starterCode: "# Utilise une boucle pour avancer plusieurs fois.\n\nfor i in range(4):\n    tolkaze.move_right()\n"
  },
  {
    id: 3,
    title: "Niveau 3 — Monter et descendre",
    concept: "Échelles, coordonnées et décomposition d'un trajet",
    goal: "Utiliser l'échelle pour atteindre l'œuf supérieur.",
    hint: "Utilise tolkaze.climb_up() quand Tolkaze est sur une échelle.",
    start: { x: 2, y: 8 },
    eggs: [{ x: 2, y: 5 }, { x: 8, y: 5 }, { x: 12, y: 8 }],
    ostriches: [{ x: 10, y: 8, dir: 1 }],
    ladders: [{ x: 2, y1: 5, y2: 8 }, { x: 8, y1: 5, y2: 8 }],
    platforms: [{ x: 0, y: 9, w: 16, h: 1 }, { x: 2, y: 6, w: 8, h: 1 }],
    starterCode: "# Monte à l'échelle, puis avance.\n\ntolkaze.climb_up()\ntolkaze.climb_up()\ntolkaze.climb_up()\n"
  }
];

// Mémorise le niveau actuel.
let currentLevel = levels[0];

// Mémorise l'état complet du jeu.
let state = null;

// Fonction qui copie une position sous forme d'objet indépendant.
function copyPos(pos) {
  return { x: pos.x, y: pos.y };
}

// Fonction qui crée ou réinitialise l'état du jeu.
function resetGame() {
  state = {
    tolkaze: copyPos(currentLevel.start),
    eggs: currentLevel.eggs.map(copyPos),
    ostriches: currentLevel.ostriches.map(o => ({ x: o.x, y: o.y, dir: o.dir })),
    collected: 0,
    status: "playing",
    message: "Mode Jouer : utilise les flèches pour explorer le niveau."
  };
  codeEditor.value = currentLevel.starterCode;
  output.textContent = "Joue d'abord, observe le trajet, puis programme Tolkaze.";
  drawGame();
}

// Fonction qui vérifie si une case contient une plateforme sous les pieds.
function hasGround(x, y) {
  return currentLevel.platforms.some(p => x >= p.x && x < p.x + p.w && y + 1 === p.y);
}

// Fonction qui vérifie si Tolkaze est sur une échelle.
function isOnLadder(x, y) {
  return currentLevel.ladders.some(l => x === l.x && y >= l.y1 && y <= l.y2);
}

// Fonction qui limite une valeur dans la zone de jeu.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Fonction qui récupère les œufs situés sur la position de Tolkaze.
function collectEggs() {
  state.eggs = state.eggs.filter(egg => {
    const sameCell = egg.x === state.tolkaze.x && egg.y === state.tolkaze.y;
    if (sameCell) {
      state.collected += 1;
    }
    return !sameCell;
  });
  if (state.eggs.length === 0) {
    state.status = "success";
    state.message = "Mission réussie : tous les œufs sont récupérés.";
  }
}

// Fonction qui vérifie les collisions avec les autruches.
function checkOstrichCollision() {
  const touched = state.ostriches.some(o => o.x === state.tolkaze.x && o.y === state.tolkaze.y);
  if (touched) {
    state.status = "failed";
    state.message = "Tolkaze a été touché par une autruche. Analyse le trajet et recommence.";
  }
}

// Fonction qui déplace Tolkaze d'une case.
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
  drawGame();
}

// Fonction qui fait sauter Tolkaze.
function jumpTolkaze() {
  if (state.status !== "playing") return;
  moveTolkaze(0, -1);
  setTimeout(() => moveTolkaze(0, 1), 180);
}

// Fonction qui dessine une case.
function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

// Fonction qui dessine tout le jeu.
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
  state.ostriches.forEach(o => {
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(o.x * TILE + 20, o.y * TILE + 20, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.fillText("O", o.x * TILE + 15, o.y * TILE + 25);
  });
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(state.tolkaze.x * TILE + 6, state.tolkaze.y * TILE + 6, 28, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("T", state.tolkaze.x * TILE + 15, state.tolkaze.y * TILE + 25);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`Œufs : ${state.collected}/${currentLevel.eggs.length}`, 10, 20);
  ctx.fillText(state.message, 10, 390);
}

// Fonction qui met à jour la consigne affichée.
function updateMission() {
  missionBox.innerHTML = `
    <h2>${currentLevel.title}</h2>
    <p><strong>Principe :</strong> joue d'abord, observe le parcours, puis programme Tolkaze.</p>
    <p><strong>Notion Python :</strong> ${currentLevel.concept}</p>
    <p><strong>Objectif :</strong> ${currentLevel.goal}</p>
    <p><strong>Commandes clavier :</strong> flèches pour se déplacer, espace pour sauter.</p>
    <p><strong>Commandes Python :</strong> <code>tolkaze.move_right()</code>, <code>tolkaze.move_left()</code>, <code>tolkaze.climb_up()</code>, <code>tolkaze.climb_down()</code>, <code>tolkaze.jump()</code></p>
  `;
}

// Fonction qui remplit la liste des niveaux.
function populateLevels() {
  levelSelect.innerHTML = "";
  levels.forEach(level => {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = level.title;
    levelSelect.appendChild(option);
  });
}

// Fonction qui charge Pyodide.
async function initPyodide() {
  output.textContent = "Chargement de Python dans le navigateur...";
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/" });
  pyodide.globals.set("js_move_right", () => moveTolkaze(1, 0));
  pyodide.globals.set("js_move_left", () => moveTolkaze(-1, 0));
  pyodide.globals.set("js_climb_up", () => moveTolkaze(0, -1));
  pyodide.globals.set("js_climb_down", () => moveTolkaze(0, 1));
  pyodide.globals.set("js_jump", () => jumpTolkaze());
  pyodideReady = true;
  output.textContent = "Python est prêt. Tu peux jouer, puis programmer Tolkaze.";
}

// Fonction qui exécute le code Python de l'élève.
async function runPythonCode() {
  if (!pyodideReady) {
    output.textContent = "Python n'est pas encore chargé.";
    return;
  }
  resetGame();
  const bridgeCode = `
from js import js_move_right, js_move_left, js_climb_up, js_climb_down, js_jump

class Tolkaze:
    def move_right(self):
        js_move_right()

    def move_left(self):
        js_move_left()

    def climb_up(self):
        js_climb_up()

    def climb_down(self):
        js_climb_down()

    def jump(self):
        js_jump()

tolkaze = Tolkaze()
`;
  try {
    output.textContent = "Exécution du programme...";
    await pyodide.runPythonAsync(bridgeCode + "\n" + codeEditor.value);
    if (state.status === "success") {
      output.textContent = "✅ Bravo : programme validé. Les œufs ont été récupérés.";
    } else if (state.status === "failed") {
      output.textContent = "❌ Programme à corriger : Tolkaze a été touché.";
    } else {
      output.textContent = "⚠️ Programme exécuté, mais la mission n'est pas encore terminée.";
    }
  } catch (error) {
    output.textContent = "Erreur Python : " + error.message;
  }
  drawGame();
}

// Écoute les touches du clavier pour le mode Jouer.
document.addEventListener("keydown", event => {
  if (event.key === "ArrowRight") moveTolkaze(1, 0);
  if (event.key === "ArrowLeft") moveTolkaze(-1, 0);
  if (event.key === "ArrowUp") moveTolkaze(0, -1);
  if (event.key === "ArrowDown") moveTolkaze(0, 1);
  if (event.code === "Space") jumpTolkaze();
});

// Change le niveau quand l'élève choisit une autre mission.
levelSelect.addEventListener("change", () => {
  currentLevel = levels.find(level => String(level.id) === levelSelect.value);
  updateMission();
  resetGame();
});

// Lance le programme Python quand l'élève clique sur le bouton.
runButton.addEventListener("click", runPythonCode);

// Réinitialise le niveau quand l'élève clique sur le bouton.
resetButton.addEventListener("click", resetGame);

// Affiche l'indice du niveau.
hintButton.addEventListener("click", () => {
  output.textContent = "Indice : " + currentLevel.hint;
});

// Initialise l'application.
populateLevels();

// Affiche la mission du premier niveau.
updateMission();

// Réinitialise le jeu au chargement.
resetGame();

// Charge Python avec Pyodide.
initPyodide();
