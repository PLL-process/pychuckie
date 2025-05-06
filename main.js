async function loadPyodideAndRun() {
  let output = document.getElementById("output");
  output.textContent = "Chargement de Pyodide...";
  let pyodide = await loadPyodide();
  output.textContent = "Pyodide prêt. Exécution du script...";

  const code = `
def saluer():
    print("Bienvenue dans PyChuckie !")

saluer()
`;
  pyodide.runPython(code);
}
