# My Tab Switcher — Chrome extension

Instantly jump to the **previous or next recent tab** with keyboard
shortcuts, like "Alt+Tab for tabs".

The extension remembers the order in which you view your tabs (most-recently-used
history — MRU) **within each window**, and lets you move up / down that stack
with the keyboard.

| | Default shortcut | Effect |
|---|---|---|
| **Previous tab** | <kbd>Alt</kbd>+<kbd>Q</kbd> | Move back through the recency history |
| **Next tab** | <kbd>Alt</kbd>+<kbd>W</kbd> | Move forward through the recency history |

> On macOS, <kbd>Alt</kbd> is the <kbd>Option</kbd> (⌥) key.

---

## Installation (developer mode)

The extension is not (yet) published on the Chrome Web Store. To install it
locally:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder (the one that
   contains `manifest.json`).
5. The extension appears in the list; pin it if you want its icon in the
   toolbar.

---

## Usage

1. Switch between your tabs as usual (click, <kbd>Ctrl</kbd>+<kbd>Tab</kbd>,
   etc.). The extension records the recency order.
2. Press <kbd>Alt</kbd>+<kbd>Q</kbd> to go back to the previously used tab.
   Press again to move further back through the history.
3. Press <kbd>Alt</kbd>+<kbd>W</kbd> to move forward through the history again.
4. As soon as you manually click a tab, it moves back to the top of the
   history and navigation resumes from there.

The history is **specific to each window**: navigation never switches between
windows.

---

## Customizing the shortcuts

Chrome restricts changing extension shortcuts to a dedicated page.

- **Easiest:** right-click the extension icon → **Options**, then the
  **"Edit shortcuts"** button.
- **Directly:** open `chrome://extensions/shortcuts`, find *My Tab Switcher*
  and click the pencil next to each command to enter your combination.

### Why not F7 / F8 by default?

Chrome's native API (`chrome.commands`) **requires a modifier**
(<kbd>Ctrl</kbd> or <kbd>Alt</kbd>) and does not accept bare function keys as a
default value in the manifest. The defaults therefore use
<kbd>Alt</kbd>+<kbd>Q</kbd> / <kbd>Alt</kbd>+<kbd>W</kbd>.

You can **try to assign F7 / F8 yourself** from
`chrome://extensions/shortcuts`: depending on the Chrome version, the interface
is sometimes more permissive than the manifest and accepts them.

> **On macOS**, the F1–F12 keys are media keys by default. To trigger a real
> F7/F8, also hold the <kbd>fn</kbd> key, or enable *System Settings → Keyboard →
> "Use F1, F2, etc. keys as standard function keys"*.

---

## Known limitations

- The shortcuts are only active while a Chrome window has focus.
- Customizing the keys goes through Chrome's dedicated page (a limitation of the
  native API).
- The recency history is volatile: it is reset when the browser session ends.

---

## Development

The project has **no production dependencies**. The business logic is isolated
in a pure, testable module.

```bash
npm test                    # run the unit tests (node --test)
node tools/generate-icons.mjs   # regenerate the PNG icons
```

- `manifest.json` — extension declaration (Manifest V3).
- `src/mru.js` — pure recency-history logic (no Chrome API).
- `src/service-worker.js` — wiring of Chrome events + persistence.
- `src/options.*` — options page.
- `tests/mru.test.js` — unit tests for the MRU logic.
- `tools/generate-icons.mjs` — icon generator.

For design details, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the
design document in `docs/superpowers/specs/`.

---

## License

MIT.
