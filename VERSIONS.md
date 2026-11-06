# hazeljs-petri-example: versions

Each version lists what the app does as of that version. The newest version is first.

## Unreleased

## 0.0.1 (2026-11-06)

The first version, the worked example of [^report(43)](https://matthewhammer.org/hazel/reports/043/) as an app of its own:

- **A Petri net, run by the page, decided by Hazel.** Two processes sharing one lock (`net.json`). Click a transition to fire it, or step at random. The page keeps the marking and draws it; a Hazel function, `Rules.on_event`, decides what each event does, and the page acts out its answer.
- **The rules in Hazel's own editor.** The vocabulary (`rules/preamble.hz`) and the two modules (`rules/Common.hz`, `rules/Rules.hz`), each in Hazel's tile editor, with go to definition between them (Ctrl+click, or F12). Each edit is built again by [hazeljs](https://www.npmjs.com/package/hazeljs) 0.0.4, from npm.
- **The page keeps working while the rules don't.** With an error, a hole or an unfinished bracket in the rules, the page's own JavaScript answers instead, and says why.
- **🪵 an event log,** as Messed Up Dress Up's: each event, which engine answered, the answer acted out, and the marking before and after.
- **The same rules in Node** (`npm run example`): events by hand, 2,000 random steps, a mistake and a hole, and what each costs.
