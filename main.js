let pyodide = null;

async function loadPyodideAndRun() {
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/" });
  document.getElementById("status").textContent = "Pyodide chargé.";
}

document.getElementById("launchBtn").addEventListener("click", async () => {
  if (!pyodide) {
    document.getElementById("status").textContent = "Erreur : Pyodide non chargé.";
    return;
  }

  const level = document.getElementById("levelSelect").value;
  document.getElementById("status").textContent = `Lancement du niveau ${level}...`;

  const pythonCode = `
import pygame
import asyncio

pygame.init()
screen = pygame.display.set_mode((400, 300))
pygame.display.set_caption("PyChuckie - Niveau " + str(${level}))
running = True

async def game_loop():
    global running
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        pygame.display.flip()
        await asyncio.sleep(0.016)

asyncio.ensure_future(game_loop())
  `;
  await pyodide.runPythonAsync(pythonCode);
});

loadPyodideAndRun();
