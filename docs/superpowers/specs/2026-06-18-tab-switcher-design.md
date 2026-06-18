# Design — My Tab Switcher (extension Chrome MV3)

Date : 2026-06-18

## Objectif

Une extension Chrome qui permet de naviguer vers l'onglet **précédent** ou
**suivant** via des raccourcis clavier, selon un historique de récence
(MRU — Most Recently Used), façon « Alt+Tab pour onglets ». Les raccourcis sont
personnalisables.

## Décisions de conception (issues du brainstorming)

| Sujet | Décision | Raison |
|---|---|---|
| Sémantique navigation | MRU (onglets récents), pas voisin gauche/droite | Choix utilisateur ; plus utile au quotidien |
| Modèle des deux touches | Back/forward avec pointeur de position | Correspond à deux touches distinctes « précédent / suivant » |
| Portée | Fenêtre courante uniquement | Plus simple, pas de saut de fenêtre surprenant |
| Mécanisme raccourcis | API native `chrome.commands` | Fiable partout, léger ; choix utilisateur |
| Raccourcis par défaut | `Alt+Q` (précédent) / `Alt+W` (suivant) | Touches libres, adjacentes, faciles ; modifiables |
| Personnalisation | Via `chrome://extensions/shortcuts` | Contrainte Chrome : l'API native ne permet pas à l'extension de réassigner les touches |

### Contrainte clé à connaître

`chrome.commands` **n'autorise pas** les touches de fonction nues (F7/F8) : tout
raccourci de commande doit contenir `Ctrl` ou `Alt`, et F1–F12 ne font pas partie
des touches supportées par le manifest. Les défauts sont donc des combinaisons à
modificateur. L'utilisateur peut ensuite rebinder librement dans
`chrome://extensions/shortcuts` (l'UI Chrome accepte parfois des touches que le
manifest refuse, dont éventuellement les touches de fonction).

Sources :
- https://developer.chrome.com/docs/extensions/reference/api/commands
- https://dev.to/paulasantamaria/adding-shortcuts-to-your-chrome-extension-2i20

## Architecture (Manifest V3)

| Unité | Rôle | Dépendances |
|---|---|---|
| `manifest.json` | Déclare les 2 commandes + défauts, le service worker, la page d'options, la permission `storage` | — |
| `src/mru.js` | **Logique pure** : pile MRU par fenêtre + navigation recul/avance. Aucun appel API Chrome → testable isolément | aucune |
| `src/service-worker.js` | Câble les évènements Chrome à `mru.js`, gère l'activation programmatique et la persistance | `mru.js`, API Chrome |
| `src/options.html` / `options.js` / `options.css` | Page de config : explique l'extension, affiche les raccourcis actuels, bouton vers `chrome://extensions/shortcuts` | API Chrome |
| `tests/mru.test.js` | Tests unitaires de `mru.js` (Node pur) | `mru.js` |

### Logique pure — `src/mru.js`

État géré, indépendant de Chrome :

- `lists` : `Map<windowId, number[]>` — tableau d'IDs d'onglets par fenêtre, **front = plus récent**.
- `cursor` : `Map<windowId, number>` — index courant dans la pile pendant une session de navigation (0 = onglet le plus récent / actif).

Opérations (fonctions pures ou méthodes sans effet de bord externe) :

- `recordActivation(windowId, tabId)` — activation **manuelle** : déplace `tabId`
  en tête de la pile de sa fenêtre et **réinitialise le curseur à 0**.
- `previous(windowId)` — recule dans la pile : incrémente le curseur (borné à la
  taille−1), retourne le `tabId` cible (ou `null` si rien).
- `next(windowId)` — avance : décrémente le curseur (borné à 0), retourne le
  `tabId` cible (ou `null`).
- `applyNavigation(windowId, tabId)` — après une navigation par raccourci, met à
  jour l'onglet « courant » **sans réordonner** la pile (préserve la sémantique
  back/forward).
- `removeTab(windowId, tabId)` — retire un onglet fermé et corrige le curseur.
- `removeWindow(windowId)` — purge une fenêtre fermée.
- `serialize()` / `restore(data)` — pour la persistance.

### Câblage — `src/service-worker.js`

Écouteurs Chrome :

- `chrome.tabs.onActivated({tabId, windowId})` : si l'activation **n'est pas**
  programmatique → `recordActivation`. Si elle l'est (déclenchée par nous) →
  `applyNavigation`, puis on retombe le flag.
- `chrome.tabs.onRemoved(tabId, {windowId})` : `removeTab`.
- `chrome.windows.onRemoved(windowId)` : `removeWindow`.
- `chrome.commands.onCommand(command)` : récupère la fenêtre focalisée, appelle
  `previous`/`next`, puis active l'onglet cible via
  `chrome.tabs.update(tabId, {active: true})` en levant le flag d'activation
  programmatique.

Détails :

- **Flag d'activation programmatique** : `pendingProgrammaticTabId`. Avant
  `chrome.tabs.update`, on mémorise le `tabId` cible ; dans `onActivated`, si le
  `tabId` correspond, on traite en `applyNavigation` au lieu de `recordActivation`.
- **Persistance (cycle de vie SW MV3)** : à chaque mutation, on écrit l'état dans
  `chrome.storage.session`. Au démarrage du SW, on appelle `restore`. Si l'état
  est vide pour la fenêtre concernée au moment d'un raccourci, on initialise avec
  l'onglet actif courant (`chrome.tabs.query({active:true, currentWindow})`).
  Chrome n'exposant pas l'historique d'activation, l'état ne peut pas être
  reconstruit après coup — d'où la persistance.

### Page d'options — `src/options.*`

- Affiche un texte explicatif (FR).
- Liste les raccourcis actuels via `chrome.commands.getAll()`.
- Bouton « Modifier les raccourcis » → `chrome.tabs.create({url: 'chrome://extensions/shortcuts'})`
  (un lien `<a href>` direct vers `chrome://` est bloqué).
- Explique comment essayer F7/F8 manuellement et la limite (raccourcis actifs
  seulement quand Chrome a le focus).

## Permissions

- `storage` uniquement (pour `chrome.storage.session`).
- **Pas** de permission `tabs` ni d'accès aux pages : on ne manipule que des IDs
  d'onglets, disponibles sans permission.

## Limitations connues

- Personnalisation des touches via la page Chrome dédiée, pas dans l'UI de
  l'extension (limite de l'API native).
- Pas de F7/F8 par défaut (limite `chrome.commands`).
- Raccourcis actifs uniquement quand une fenêtre Chrome a le focus.
- Historique MRU réinitialisé si la session de navigateur se termine
  (`storage.session` est volatile par design).

## Plan de tests

`tests/mru.test.js` (Node pur, sans Chrome), développé en TDD :

- Enregistrement d'activations → ordre MRU correct.
- `previous`/`next` parcourent la pile et respectent les bornes.
- Activation manuelle pendant une navigation → réinitialise le curseur.
- Fermeture d'onglet → retiré de la pile, curseur corrigé.
- Fermeture de fenêtre → pile purgée.
- `serialize`/`restore` → round-trip fidèle.

## Documentation livrée

- `README.md` (FR) : présentation, installation (mode développeur), utilisation,
  personnalisation des raccourcis, limitations.
- `docs/` : ce document de design + une doc d'architecture/fonctionnement.
