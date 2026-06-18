// Page d'options : affiche les raccourcis configurés et ouvre la page Chrome
// dédiée à leur personnalisation.

const COMMAND_LABELS = {
  'previous-tab': 'Onglet précédent',
  'next-tab': 'Onglet suivant',
};

function renderShortcuts(commands) {
  const list = document.getElementById('shortcuts');
  list.innerHTML = '';

  const relevant = commands.filter((c) => c.name in COMMAND_LABELS);
  for (const command of relevant) {
    const item = document.createElement('li');

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = COMMAND_LABELS[command.name];

    const shortcut = document.createElement('span');
    if (command.shortcut) {
      shortcut.className = 'kbd';
      shortcut.textContent = command.shortcut;
    } else {
      shortcut.className = 'kbd kbd--empty';
      shortcut.textContent = 'Non défini';
    }

    item.append(label, shortcut);
    list.appendChild(item);
  }

  if (relevant.length === 0) {
    const item = document.createElement('li');
    item.className = 'loading';
    item.textContent = 'Aucun raccourci trouvé.';
    list.appendChild(item);
  }
}

async function loadShortcuts() {
  try {
    const commands = await chrome.commands.getAll();
    renderShortcuts(commands);
  } catch {
    const list = document.getElementById('shortcuts');
    list.innerHTML = '<li class="loading">Impossible de lire les raccourcis.</li>';
  }
}

document.getElementById('open-shortcuts').addEventListener('click', () => {
  // Un lien <a href> direct vers une URL chrome:// est bloqué ; on passe par
  // l'API des onglets.
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

loadShortcuts();
