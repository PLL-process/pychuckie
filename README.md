# 🐣 PyChuckie

Bienvenue dans **PyChuckie**, un jeu éducatif pour apprendre à programmer en **Python** directement dans le navigateur, grâce à **Pyodide**.

🎮 **Accès au jeu en ligne :**  
👉 [https://pll-process.github.io/pychuckie/](https://pll-process.github.io/pychuckie/)

---

## 🧠 Objectif pédagogique

Ce projet est destiné aux élèves de **3ᵉ** (cycle 4) pour :
- découvrir les bases de la programmation Python,
- manipuler des instructions, boucles, conditions, fonctions,
- progresser à travers **25 niveaux** interactifs.

---

## 📁 Structure du dépôt

- `index.html` – page d’accueil du jeu (interface HTML + chargement Pyodide)
- `main.js` – script JavaScript principal (chargement des niveaux, exécution)
- `style.css` – style du jeu (mode sombre, boutons, messages)
- `niveaux/` – répertoire contenant les **25 fichiers de niveau** nommés :
  ```
  niveau_1.py.txt
  niveau_2.py.txt
  ...
  niveau_25.py.txt
  ```

---

## 🛠️ Instructions

1. Clone ou télécharge ce dépôt :
   ```bash
   git clone https://github.com/PLL-process/pychuckie.git
   ```

2. Ouvre le fichier `index.html` dans ton navigateur ou visite la version en ligne.

3. Choisis un niveau dans la liste déroulante, clique sur **"Lancer le niveau"**.

---

## ✏️ Contributeurs

Projet conçu et développé par **Procédé PLL** (Académie de Martinique), avec l’assistance de ChatGPT pour le code, la pédagogie et la structuration.

---

## ⚠️ Remarques techniques

- Ce jeu s’exécute **entièrement dans le navigateur** grâce à [Pyodide](https://pyodide.org/), sans serveur externe.
- Les fichiers `.py` ont été renommés en `.py.txt` pour pouvoir être chargés via JavaScript depuis GitHub Pages.
- Compatible avec la plupart des navigateurs modernes (Edge, Firefox, Chrome...).

---

## 📜 Licence

Libre pour usage pédagogique. Crédits recommandés en cas de réutilisation.
