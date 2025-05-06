let pyodide = null;
async function main() {
    pyodide = await loadPyodide();
    document.getElementById("lancer").onclick = async () => {
        let niveau = document.getElementById("niveau-select").value;
        const response = await fetch(niveau);
        const code = await response.text();
        try {
            await pyodide.runPythonAsync(code);
        } catch (err) {
            document.getElementById("output").textContent = "Erreur : " + err;
        }
    };
    document.getElementById("reset").onclick = () => {
        document.getElementById("output").textContent = "Réinitialisé.";
    };
}
main();