# Architecture — My Tab Switcher

Document technique décrivant le fonctionnement interne de l'extension. Pour
l'usage, voir le [README](../README.md). Pour les décisions de conception, voir
`docs/superpowers/specs/2026-06-18-tab-switcher-design.md`.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│ Chrome                                                    │
│                                                           │
│  Évènements ─────────────────┐                            │
│  • tabs.onActivated          │                            │
│  • tabs.onRemoved            ▼                            │
│  • windows.onRemoved   ┌──────────────────┐  storage      │
│  • commands.onCommand  │ service-worker.js │◀────────────▶│ chrome.storage
│                        └─────────┬────────┘  session      │  .session
│                                  │ (logique pure)          │
│                                  ▼                          │
│                          ┌──────────────┐                  │
│                          │   mru.js     │                  │
│                          │  (TabMru)    │                  │
│                          └──────────────┘                  │
│                                                           │
│  options.html / options.js  ── commands.getAll() ──┐      │
│   « Modifier les raccourcis » ──▶ chrome://extensions/shortcuts │
└─────────────────────────────────────────────────────────┘
```

## Composants

### `src/mru.js` — logique pure (`TabMru`)

Aucune dépendance aux API Chrome ⇒ entièrement testable en Node (`tests/mru.test.js`).

État, **par fenêtre** :

- `lists: Map<windowId, number[]>` — pile d'IDs d'onglets ordonnée par récence
  (index `0` = onglet le plus récent / courant).
- `cursors: Map<windowId, number>` — position courante dans la pile pendant une
  session de navigation back/forward.

Opérations :

| Méthode | Rôle |
|---|---|
| `recordActivation(windowId, tabId)` | Activation manuelle : l'onglet passe en tête, curseur remis à 0. |
| `previous(windowId)` | Recule (onglet plus ancien) ; renvoie l'ID cible ou `null`. |
| `next(windowId)` | Avance (onglet plus récent) ; renvoie l'ID cible ou `null`. |
| `removeTab(windowId, tabId)` | Retire un onglet fermé, corrige le curseur. |
| `removeWindow(windowId)` | Purge une fenêtre fermée. |
| `serialize()` / `restore(data)` | Persistance (compatible JSON). |

### `src/service-worker.js` — câblage Chrome + persistance

Traduit les évènements Chrome en appels à `TabMru`, et gère deux contraintes
propres à Manifest V3.

**1. Cycle de vie du service worker.** Le SW peut être arrêté à tout moment ;
les variables en mémoire sont alors perdues. L'état est donc **persisté dans
`chrome.storage.session`** et rechargé à chaque évènement. Chrome n'exposant
aucun historique d'activation, l'état ne peut pas être reconstruit après coup :
la persistance est indispensable. Toutes les opérations passent par une file
sérialisée (`runExclusive`) pour éviter les courses lecture-modification-écriture.

**2. Distinguer navigation programmatique et activation manuelle.** Quand nos
raccourcis changent d'onglet via `chrome.tabs.update`, Chrome émet un
`tabs.onActivated` qu'il ne faut **pas** traiter comme une activation manuelle
(sinon l'onglet remonterait en tête et casserait le back/forward).

La distinction est faite **sans flag transitoire** (qui ne survivrait pas à un
redémarrage du SW) : dans `onActivated`, on compare l'onglet activé à celui que
désigne déjà le curseur. S'ils coïncident, c'est notre propre navigation → on
ignore. Sinon, c'est une activation manuelle → `recordActivation`. C'est correct
car activer manuellement l'onglet déjà courant n'émet pas d'évènement.

Correspondance évènement → action :

| Évènement Chrome | Action |
|---|---|
| `tabs.onActivated` | `recordActivation` (sauf navigation programmatique, ignorée) |
| `tabs.onRemoved` | `removeTab` |
| `windows.onRemoved` | `removeWindow` |
| `commands.onCommand` | `previous` / `next` puis `chrome.tabs.update(..., {active:true})` |
| `runtime.onInstalled` / `onStartup` | amorçage avec l'onglet actif de chaque fenêtre |

### `src/options.*` — page d'options

- Affiche les raccourcis configurés via `chrome.commands.getAll()`.
- Bouton ouvrant `chrome://extensions/shortcuts` via `chrome.tabs.create`
  (un lien `<a href>` direct vers une URL `chrome://` est bloqué).

## Permissions

- **`storage`** uniquement, pour `chrome.storage.session`.
- Pas de permission `tabs` ni d'accès aux pages : seules des métadonnées
  d'onglets (id, windowId, état actif) sont manipulées, disponibles sans
  permission.

## Tests

`tests/mru.test.js` couvre `TabMru` en Node pur : ordre de récence, bornes de
`previous`/`next`, réinitialisation du curseur sur activation manuelle, retrait
d'onglet/fenêtre, et round-trip `serialize`/`restore`.

```bash
npm test
```

Le service worker, fait essentiellement de câblage d'API Chrome, n'est pas testé
unitairement (cela imposerait de mocker l'intégralité de l'API). Sa complexité
est volontairement réduite, toute la logique vivant dans `mru.js`.
