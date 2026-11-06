// hazeljs-petri-example: the page's loader. The rules (rules/*.hz) and the net (net.json) are files, read by this page and by the
// Node example alike (node/petri.mjs); this puts them in the page's listings, then starts the two scripts it shares with
// ^report(43) (https://matthewhammer.org/hazel/reports/043/): js/hazel-listings.js (the listings as Hazel's editor, with go to
// definition between them) and js/live.js (the net, its events, hazeljs from npm building the rules, the event log).
(async () => {
  "use strict";
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  try {
    const [preamble, common, rules, net, version] = await Promise.all([text("rules/preamble.hz"), text("rules/Common.hz"), text("rules/Rules.hz"),
      fetch("net.json").then(r => r.json()), fetch("version.json").then(r => r.json()).catch(() => null)]);
    document.querySelector('pre.hazel[data-program="petri"]:not([data-module])').textContent = preamble;
    document.querySelector('pre.hazel[data-module="Common"]').textContent = common;
    document.querySelector('pre.hazel[data-module="Rules"]').textContent = rules;
    const data = document.createElement("script");
    data.type = "application/json"; data.id = "live-data";
    data.textContent = JSON.stringify({ preamble, tail: net.tail, modules: [{ name: "Common", text: common }, { name: "Rules", text: rules }],
      places: net.places, transitions: net.transitions, marking: net.marking });
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
