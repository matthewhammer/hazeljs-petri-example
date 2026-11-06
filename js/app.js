// hazeljs-petri-example: the page's loader. The rules and the net are Hazel files (rules/*.hz; since 0.0.10 the net too, in
// rules/Main.hz, where net.json was), read by this page and by the Node example alike (node/petri.mjs); this puts them in the
// page's listings, then starts the two scripts it shares with
// ^report(43) (https://matthewhammer.org/hazel/reports/043/): js/hazel-listings.js (the listings as Hazel's editor, with go to
// definition between them) and js/live.js (the net, its events, hazeljs from npm building the rules, the event log).
(async () => {
  "use strict";
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  try {
    const [preamble, common, rules, main, version] = await Promise.all([text("rules/preamble.hz"), text("rules/Common.hz"), text("rules/Rules.hz"),
      text("rules/Main.hz"), fetch("version.json", { cache: "no-cache" }).then(r => r.json()).catch(() => null)]);
    document.querySelector('pre.hazel[data-program="petri"]:not([data-module])').textContent = preamble;
    document.querySelector('pre.hazel[data-module="Common"]').textContent = common;
    document.querySelector('pre.hazel[data-module="Rules"]').textContent = rules;
    document.querySelector('pre.hazel[data-module="Main"]').textContent = main;
    const data = document.createElement("script");
    data.type = "application/json"; data.id = "live-data";
    // the program ends by reading Main's members, all the page uses: the net, where it is drawn, and the handler it calls
    const tail = "(places = Main.places, place_at = Main.place_at, transitions = Main.transitions, transition_at = Main.transition_at, "
      + "marking = Main.marking, on_event = Main.on_event)";
    data.textContent = JSON.stringify({ preamble, tail, modules: [{ name: "Common", text: common }, { name: "Rules", text: rules }, { name: "Main", text: main }] });
    document.body.append(data);
    if (version) document.getElementById("app-foot").prepend(`version ${version.number} (${version.released}) · `);
    // (each named with the app's version, so a browser holding an older copy fetches the new one)
    const v = version ? "?v=" + encodeURIComponent(version.number) : "";
    await load("js/hazel-listings.js" + v);
    await load("js/live.js" + v);
  } catch (e) {
    document.getElementById("live-status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
})();
