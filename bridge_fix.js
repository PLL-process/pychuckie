// Ce fichier corrige le pont entre Pyodide et JavaScript.
// Il est chargé après main.js pour remplacer l'exécution Python défaillante.

// Cette fonction expose les actions du jeu dans l'objet window.
function installPyChuckieBridgeFix() {
  // On crée un pont accessible depuis le code Python exécuté par Pyodide.
  window.pyChuckieBridge = {
    // Cette commande déplace Tolkaze vers la droite.
    moveRight: function () {
      moveTolkaze(1, 0);
    },
    // Cette commande déplace Tolkaze vers la gauche.
    moveLeft: function () {
      moveTolkaze(-1, 0);
    },
    // Cette commande fait monter Tolkaze sur une échelle.
    climbUp: function () {
      moveTolkaze(0, -1);
    },
    // Cette commande fait descendre Tolkaze sur une échelle.
    climbDown: function () {
      moveTolkaze(0, 1);
    },
    // Cette commande fait sauter Tolkaze.
    jump: function () {
      jumpTolkaze();
    }
  };
}

// Cette fonction exécute le code Python de l'élève avec le pont corrigé.
async function runPythonCodeFixed() {
  // On récupère Pyodide depuis l'environnement global de la page.
  const py = window.eval("pyodide");

  // On vérifie que Pyodide est bien disponible.
  if (!py) {
    output.textContent = "Python n'est pas encore chargé.";
    return;
  }

  // On réinstalle le pont par sécurité avant chaque exécution.
  installPyChuckieBridgeFix();

  // On réinitialise le niveau avant de lancer le programme.
  resetGame();

  // Ce code Python crée l'objet tolkaze utilisé par les élèves.
  const bridgeCode = `
from js import window

class Tolkaze:
    def move_right(self):
        window.pyChuckieBridge.moveRight()

    def move_left(self):
        window.pyChuckieBridge.moveLeft()

    def climb_up(self):
        window.pyChuckieBridge.climbUp()

    def climb_down(self):
        window.pyChuckieBridge.climbDown()

    def jump(self):
        window.pyChuckieBridge.jump()

tolkaze = Tolkaze()
`;

  // On exécute le code et on affiche un retour pédagogique.
  try {
    output.textContent = "Exécution du programme...";
    await py.runPythonAsync(bridgeCode + "\n" + codeEditor.value);
    const status = window.eval("state.status");
    if (status === "success") {
      output.textContent = "✅ Bravo : programme validé. Les œufs ont été récupérés.";
    } else if (status === "failed") {
      output.textContent = "❌ Programme à corriger : Tolkaze a été touché.";
    } else {
      output.textContent = "⚠️ Programme exécuté, mais la mission n'est pas encore terminée.";
    }
  } catch (error) {
    output.textContent = "Erreur Python : " + error.message;
  }

  // On redessine le jeu après l'exécution.
  drawGame();
}

// On installe le pont dès le chargement du fichier correctif.
installPyChuckieBridgeFix();

// On intercepte le clic sur le bouton avant l'ancien gestionnaire.
runButton.addEventListener("click", function (event) {
  // On empêche l'ancien gestionnaire d'exécution de se lancer.
  event.stopImmediatePropagation();
  // On lance la nouvelle fonction corrigée.
  runPythonCodeFixed();
}, true);
