// Logique pure de l'historique de récence (MRU) des onglets, par fenêtre.
// Aucune dépendance aux API Chrome -> testable en Node pur.
//
// Modèle : pour chaque fenêtre on conserve une pile d'IDs d'onglets ordonnée
// par récence (index 0 = onglet le plus récent / courant) et un curseur qui
// indique la position courante pendant une session de navigation back/forward.

export class TabMru {
  constructor() {
    this.lists = new Map(); // windowId -> number[] (front = plus récent)
    this.cursors = new Map(); // windowId -> number (index courant)
  }

  // Activation manuelle : l'onglet passe en tête, le curseur est réinitialisé.
  recordActivation(windowId, tabId) {
    let list = this.lists.get(windowId);
    if (!list) {
      list = [];
      this.lists.set(windowId, list);
    }
    const idx = list.indexOf(tabId);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(tabId);
    this.cursors.set(windowId, 0);
  }

  // Recule dans l'historique (vers les onglets plus anciens).
  // Retourne l'ID de l'onglet cible, ou null si on est déjà au plus ancien.
  previous(windowId) {
    const list = this.lists.get(windowId);
    if (!list || list.length === 0) return null;
    const cursor = this.cursors.get(windowId) ?? 0;
    if (cursor + 1 > list.length - 1) return null;
    const next = cursor + 1;
    this.cursors.set(windowId, next);
    return list[next];
  }

  // Avance dans l'historique (vers les onglets plus récents).
  // Retourne l'ID de l'onglet cible, ou null si on est déjà au plus récent.
  next(windowId) {
    const list = this.lists.get(windowId);
    if (!list || list.length === 0) return null;
    const cursor = this.cursors.get(windowId) ?? 0;
    if (cursor - 1 < 0) return null;
    const prev = cursor - 1;
    this.cursors.set(windowId, prev);
    return list[prev];
  }

  // Retire un onglet fermé et corrige le curseur.
  removeTab(windowId, tabId) {
    const list = this.lists.get(windowId);
    if (!list) return;
    const idx = list.indexOf(tabId);
    if (idx === -1) return;
    list.splice(idx, 1);
    if (list.length === 0) {
      this.lists.delete(windowId);
      this.cursors.delete(windowId);
      return;
    }
    let cursor = this.cursors.get(windowId) ?? 0;
    if (idx < cursor) cursor -= 1;
    if (cursor > list.length - 1) cursor = list.length - 1;
    if (cursor < 0) cursor = 0;
    this.cursors.set(windowId, cursor);
  }

  // Purge l'historique d'une fenêtre fermée.
  removeWindow(windowId) {
    this.lists.delete(windowId);
    this.cursors.delete(windowId);
  }

  // Sérialise l'état pour persistance (compatible JSON, clés numériques conservées).
  serialize() {
    return {
      lists: Array.from(this.lists.entries()),
      cursors: Array.from(this.cursors.entries()),
    };
  }

  // Reconstruit une instance à partir d'un état sérialisé.
  static restore(data) {
    const mru = new TabMru();
    if (data && Array.isArray(data.lists)) mru.lists = new Map(data.lists);
    if (data && Array.isArray(data.cursors)) mru.cursors = new Map(data.cursors);
    return mru;
  }
}
