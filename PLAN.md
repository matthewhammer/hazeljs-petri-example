# Plan: the app's Pages site

Where this app goes next: a site of its own at **https://matthewhammer.org/hazeljs-petri-example/** (GitHub Pages from this repository, under Matthew's domain), made in the style of [Messed Up Dress Up](https://matthewhammer.org/kids-choice-games/dress-up/), the first app whose rules are written in Hazel. Launched 2026-11-06, as the page is (step 2 below, without ℹ️ About yet); the rest of this plan is to come.

Why that domain: Hazel's editor frame takes messages only from the sites in its allowlist (matthewhammer.org and localhost today), so the site must be served from matthewhammer.org until the frame's origin policy changes (hazelgrove/hazeljs, an editor in the package).

## What the site has, after Messed Up Dress Up

1. **The net, full screen.** The net drawn large, as the game's picture is; ⛶ full screen (the browser's own, as the game's `js/22-full-screen.js`), and a ✕ back. Tokens move along their arcs when a transition fires, so a firing can be seen.
2. **A control panel with tabs,** as the game's: the net's own controls first (Step, Run, Reset), then:
   - **📜 Scripts:** the rules, one box per module, each in Hazel's editor, with the game's chip to switch a box to text; each box's errors and holes under its name; 🪵 the event log; the outline of the program (its types and its definitions), each a link that goes to its definition.
   - **🧩 Nets:** pick a net (mutual exclusion; producer and consumer; dining philosophers; a coloured net once the rules have types for tokens), each a `nets/*.json`, and edit its marking by clicking places.
   - **⚙️ Advanced:** which engine answers (Hazel, or the page's JS, to compare), the speed of Run, the editor's font size and line numbers, the theme, and the costs measured on this device (a call into Hazel, a build).
   - **ℹ️ About:** the version and its date (`version.json`, `VERSIONS.md`), the repository and its commit, hazeljs's version and the Hazel commit it was built from (`Hazel.build`), the editor's build, the licences, and links: the source on GitHub, ^report(43), hazeljs on npm.
3. **Versions as the game has them:** `0.0.N`, each released when it deploys, each in `VERSIONS.md` with what it adds; the version shown in ℹ️ and in the page's corner; a service worker only if offline play is wanted (the game has one; this app need not).
4. **A net drawn from its definition,** not drawn by hand (done in 0.0.10: the net is Hazel, `rules/Main.hz`, with a position for each place and transition, and the page draws it again after every edit; laying it out from the arcs alone is still to do).

## For other people's Petri nets

The point of the example is that someone with their own kind of net can see where theirs fits:

- **Coloured nets** (tokens that carry data; "types" in some groups' words): the marking becomes a list of tokens per place, each a Hazel value of the place's type, and a transition's guard and output become Hazel functions in the rules. Hazel's types then check the colours.
- **Weights, inhibitor arcs, priorities, timing:** each a field in the net (`rules/Main.hz`) and a few lines in `Common`, with the vocabulary in `rules/preamble.hz`.
- **The choice among enabled transitions** is the rule's (`Step`), so a group's own scheduling policy is a rule, written in Hazel, swapped without touching the app.

## Steps

1. 0.0.1: the example as an app (this version).
2. A first site: Pages on, the page as it is (done 2026-11-06, checked over HTTPS on matthewhammer.org), then ℹ️ About (version, repository, hazeljs and Hazel builds).
3. The game's look: the full-screen net, the tabbed panel, 📜 Scripts with the outline, ⚙️ Advanced.
4. 🧩 Nets: more nets (the drawing from the definition is done, 0.0.10), then a coloured net with typed tokens.
5. Ask the group Cyrus named (Cambridge) what their nets need, and add one of theirs.
