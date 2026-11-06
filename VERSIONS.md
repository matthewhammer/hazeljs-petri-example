# hazeljs-petri-example: versions

Each version lists what the app does as of that version. The newest version is first.

## Unreleased

## 0.0.5 (2026-11-06)

Everything in 0.0.4, plus:

- **An edit to the vocabulary no longer breaks every rule.** The vocabulary's editor holds the vocabulary alone, ending in `in` with nothing after it, an empty hole it writes as `?`. That `?` came with every edit to the vocabulary, so the whole program was broken, and every rule showed errors, however the edit was undone. Now the vocabulary is its text without it.

## 0.0.4 (2026-11-06)

Everything in 0.0.3, plus:

- **A divider in full screen.** Between the net and the rules, when the screen is wide enough for two columns: drag it to give either side more room, or use the arrow keys on it; a double-click puts it back. The app keeps its place for next time.
- **Every error shown, under its own rule.** An error typed into one module was reported by the other module's editor and could be shown nowhere; now each error is shown under the listing it is in, whichever editor reports it.
- **The `¤` explained.** It marks a gap: two pieces side by side with nothing joining them (`0. 1`, say). The message under the listing says so, and what to do: join them, with an operator or a comma, or delete one.

## 0.0.3 (2026-11-06)

Everything in 0.0.2, plus:

- **Errors under the rule they are in.** Hazel's editor outlines an error where it is; now its message is shown too, under the listing it is in (a type error said as a person reads it: "a Float is wanted here, but this is a String"), with its holes and unfinished brackets. Hazel's own app shows these in a bar the editor in a frame does not have.
- **Your own copy of Hazel's editor.** The page can frame a copy of the editor served from its own site (`data-frame` on `js/hazel-listings.js`'s script tag). An editor takes messages from a page on its own site, so a copy beside the page works on any site.

## 0.0.2 (2026-11-06)

Everything in 0.0.1, plus:

- **⛶ Full screen.** A button beside Step makes the whole app, the net, its log and the rules, fill the screen, in two columns when the screen is wide enough. Where the browser has no full screen for part of a page (iPhone Safari), the app fills the window instead; the same button, or Escape, leaves it.
- **The event log's lines open in full.** A closed entry stays on one line; an opened one shows the whole line, every token that moved.
- **The site is live** at https://matthewhammer.org/hazeljs-petri-example/.

## 0.0.1 (2026-11-06)

The first version, the worked example of [^report(43)](https://matthewhammer.org/hazel/reports/043/) as an app of its own:

- **A Petri net, run by the page, decided by Hazel.** Two processes sharing one lock (`net.json`). Click a transition to fire it, or step at random. The page keeps the marking and draws it; a Hazel function, `Rules.on_event`, decides what each event does, and the page acts out its answer.
- **The rules in Hazel's own editor.** The vocabulary (`rules/preamble.hz`) and the two modules (`rules/Common.hz`, `rules/Rules.hz`), each in Hazel's tile editor, with go to definition between them (Ctrl+click, or F12). Each edit is built again by [hazeljs](https://www.npmjs.com/package/hazeljs) 0.0.4, from npm.
- **The page keeps working while the rules don't.** With an error, a hole or an unfinished bracket in the rules, the page's own JavaScript answers instead, and says why.
- **🪵 an event log,** as Messed Up Dress Up's: each event, which engine answered, the answer acted out, and the marking before and after.
- **The same rules in Node** (`npm run example`): events by hand, 2,000 random steps, a mistake and a hole, and what each costs.
