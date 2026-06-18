# My Tab Switcher — extension Chrome

Naviguer instantanément vers l'**onglet récent précédent ou suivant** grâce à des
raccourcis clavier, façon « Alt+Tab pour onglets ».

L'extension mémorise l'ordre dans lequel tu consultes tes onglets (historique de
récence — MRU) **dans chaque fenêtre**, et te laisse remonter / redescendre cette
pile au clavier.

| | Raccourci par défaut | Effet |
|---|---|---|
| **Onglet précédent** | <kbd>Alt</kbd>+<kbd>Q</kbd> | Recule dans l'historique de récence |
| **Onglet suivant** | <kbd>Alt</kbd>+<kbd>W</kbd> | Avance dans l'historique de récence |

> Sur macOS, <kbd>Alt</kbd> correspond à la touche <kbd>Option</kbd> (⌥).

---

## Installation (mode développeur)

L'extension n'est pas (encore) publiée sur le Chrome Web Store. Pour l'installer
localement :

1. Télécharge ou clone ce dépôt.
2. Ouvre `chrome://extensions` dans Chrome.
3. Active le **Mode développeur** (interrupteur en haut à droite).
4. Clique sur **Charger l'extension non empaquetée** et sélectionne le dossier
   du projet (celui qui contient `manifest.json`).
5. L'extension apparaît dans la liste ; épingle-la si tu veux son icône dans la
   barre d'outils.

---

## Utilisation

1. Navigue entre tes onglets normalement (clic, <kbd>Ctrl</kbd>+<kbd>Tab</kbd>,
   etc.). L'extension enregistre l'ordre de récence.
2. Appuie sur <kbd>Alt</kbd>+<kbd>Q</kbd> pour revenir à l'onglet précédemment
   utilisé. Appuie encore pour remonter plus loin dans l'historique.
3. Appuie sur <kbd>Alt</kbd>+<kbd>W</kbd> pour ré-avancer dans l'historique.
4. Dès que tu cliques manuellement sur un onglet, il repasse en tête de
   l'historique et la navigation repart de là.

L'historique est **propre à chaque fenêtre** : la navigation ne fait jamais
changer de fenêtre.

---

## Personnaliser les raccourcis

Chrome réserve la modification des raccourcis d'extension à une page dédiée.

- **Le plus simple :** clic droit sur l'icône de l'extension → **Options**, puis
  bouton **« Modifier les raccourcis »**.
- **Directement :** ouvre `chrome://extensions/shortcuts`, trouve *My Tab
  Switcher* et clique sur le crayon en face de chaque commande pour saisir ta
  combinaison.

### Pourquoi pas F7 / F8 par défaut ?

L'API native de Chrome (`chrome.commands`) **impose un modificateur**
(<kbd>Ctrl</kbd> ou <kbd>Alt</kbd>) et n'accepte pas les touches de fonction
nues comme valeur par défaut dans le manifest. Les défauts utilisent donc
<kbd>Alt</kbd>+<kbd>Q</kbd> / <kbd>Alt</kbd>+<kbd>W</kbd>.

Tu peux **essayer d'assigner F7 / F8 toi-même** depuis
`chrome://extensions/shortcuts` : selon la version de Chrome, l'interface est
parfois plus permissive que le manifest et les accepte.

> **Sur macOS**, les touches F1–F12 sont des touches multimédia par défaut. Pour
> déclencher un vrai F7/F8, tiens la touche <kbd>fn</kbd> en plus, ou active
> *Réglages Système → Clavier → « Utiliser les touches F1, F2, etc. comme touches
> de fonction standard »*.

---

## Limitations connues

- Les raccourcis ne sont actifs que lorsqu'une fenêtre Chrome a le focus.
- La personnalisation des touches passe par la page Chrome dédiée (limite de
  l'API native).
- L'historique de récence est volatile : il est réinitialisé lorsque la session
  du navigateur se termine.

---

## Développement

Le projet n'a **aucune dépendance de production**. La logique métier est isolée
dans un module pur et testable.

```bash
npm test                    # lance les tests unitaires (node --test)
node tools/generate-icons.mjs   # régénère les icônes PNG
```

- `manifest.json` — déclaration de l'extension (Manifest V3).
- `src/mru.js` — logique pure de l'historique de récence (sans API Chrome).
- `src/service-worker.js` — câblage des évènements Chrome + persistance.
- `src/options.*` — page d'options.
- `tests/mru.test.js` — tests unitaires de la logique MRU.
- `tools/generate-icons.mjs` — générateur d'icônes.

Pour les détails de conception, voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
et le document de design dans `docs/superpowers/specs/`.

---

## Licence

MIT.
