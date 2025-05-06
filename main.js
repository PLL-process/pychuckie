
let pyodide = null;

async function initPyodide() {
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.1/full/" });
  document.getElementById("output").textContent = "Pyodide prêt. Choisissez un niveau.";
}

async function loadSelectedLevel() {
  const selector = document.getElementById("levelSelector");
  const level = selector.value;
  const output = document.getElementById("output");
  output.textContent = "Chargement de " + level + "...";

  try {
    const response = await fetch("levels/" + level);
    const code = await response.text();
    output.textContent = "Exécution de " + level + "...";
    pyodide.runPython(code);
  } catch (error) {
    output.textContent = "Erreur : " + error;
  }
}

initPyodide();
