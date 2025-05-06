let pyodide = null;
async function initPyodide() {
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.1/full/" });
  document.getElementById("output").textContent = "Pyodide prêt. Choisissez un niveau.";
}
async function runSelectedLevel() {
  const level = document.getElementById("levelSelect").value;
  const output = document.getElementById("output");
  try {
    const response = await fetch(level);
    if (!response.ok) throw new Error("Fichier introuvable");
    const code = await response.text();
    output.textContent = "";
    pyodide.runPython(code);
  } catch (err) {
    output.textContent = "Erreur : " + err.message;
  }
}
initPyodide();
