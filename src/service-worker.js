// Service worker MV3 : câble les évènements Chrome à la logique pure TabMru.
//
// Cycle de vie : le service worker peut être arrêté à tout moment. L'état MRU
// est donc persisté dans chrome.storage.session (en mémoire, partagé entre les
// réveils du service worker pendant la session du navigateur) et rechargé à
// chaque évènement. Toutes les opérations passent par une file (runExclusive)
// pour éviter les courses lecture-modification-écriture.

import { TabMru } from './mru.js';

const STORAGE_KEY = 'mruState';

// --- File d'exécution sérialisée (évite les écritures concurrentes) ----------
let queue = Promise.resolve();
function runExclusive(task) {
  const result = queue.then(() => task());
  // On neutralise les rejets pour ne pas casser la chaîne.
  queue = result.then(
    () => {},
    () => {},
  );
  return result;
}

// --- Persistance -------------------------------------------------------------
async function loadMru() {
  const data = await chrome.storage.session.get(STORAGE_KEY);
  return TabMru.restore(data[STORAGE_KEY]);
}

async function saveMru(mru) {
  await chrome.storage.session.set({ [STORAGE_KEY]: mru.serialize() });
}

// Initialise les fenêtres ouvertes avec leur onglet actif (au cas où aucun
// évènement d'activation n'a encore été observé, ex. juste après installation).
async function seedActiveTabs() {
  const mru = await loadMru();
  const tabs = await chrome.tabs.query({ active: true });
  for (const tab of tabs) {
    if (tab.id != null && tab.windowId != null && !mru.lists.has(tab.windowId)) {
      mru.recordActivation(tab.windowId, tab.id);
    }
  }
  await saveMru(mru);
}

// --- Évènements --------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => runExclusive(seedActiveTabs));
chrome.runtime.onStartup.addListener(() => runExclusive(seedActiveTabs));

// Activation d'un onglet : on distingue une navigation programmatique (déclenchée
// par nos raccourcis) d'une activation manuelle, sans flag transitoire, en
// comparant l'onglet activé à celui que désigne déjà le curseur.
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  runExclusive(async () => {
    const mru = await loadMru();
    const list = mru.lists.get(windowId);
    const cursor = mru.cursors.get(windowId) ?? 0;
    if (list && list[cursor] === tabId) {
      // L'onglet activé est déjà celui pointé par le curseur : c'est notre
      // propre navigation, on ne réordonne pas.
      return;
    }
    mru.recordActivation(windowId, tabId);
    await saveMru(mru);
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  runExclusive(async () => {
    const mru = await loadMru();
    mru.removeTab(removeInfo.windowId, tabId);
    await saveMru(mru);
  });
});

chrome.windows.onRemoved.addListener((windowId) => {
  runExclusive(async () => {
    const mru = await loadMru();
    mru.removeWindow(windowId);
    await saveMru(mru);
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'previous-tab' && command !== 'next-tab') return;
  runExclusive(async () => {
    const win = await chrome.windows.getLastFocused();
    if (!win || win.id == null) return;
    const windowId = win.id;

    const mru = await loadMru();

    // Amorçage de secours si la fenêtre est inconnue.
    if (!mru.lists.has(windowId)) {
      const [active] = await chrome.tabs.query({ active: true, windowId });
      if (active && active.id != null) mru.recordActivation(windowId, active.id);
    }

    const targetId =
      command === 'previous-tab' ? mru.previous(windowId) : mru.next(windowId);
    await saveMru(mru);

    if (targetId == null) return;

    try {
      await chrome.tabs.update(targetId, { active: true });
    } catch {
      // L'onglet n'existe plus : on le retire de l'historique.
      const fresh = await loadMru();
      fresh.removeTab(windowId, targetId);
      await saveMru(fresh);
    }
  });
});
