// hazeljs-petri-example, in Node: the same rules and net (rules/*.hz; the net in rules/Main.hz since 0.0.10) as the page, run through hazeljs; a few events by
// hand, 2,000 random steps, a mistake and a hole, and what each costs. ^report(43) (https://matthewhammer.org/hazel/reports/043/)
// quotes this example's runs.
//
//   npm install && npm run example        (prints what it measures, and writes node/run.json)
import Hazel from "hazeljs";
import { readFileSync, writeFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8").replace(/\s+$/, "");
// ---- 1. The vocabulary (what the rule is told, what happened, what it may say) and 2. the rules, as files
const PREAMBLE = read("rules/preamble.hz");
const COMMON = read("rules/Common.hz");
const RULES = read("rules/Rules.hz");
// ---- 3. The net: Hazel too (rules/Main.hz, with the handler the app calls); the program ends by reading Main's members
const MAIN = read("rules/Main.hz");
const TAIL = "(places = Main.places, place_at = Main.place_at, transitions = Main.transitions, transition_at = Main.transition_at, "
  + "marking = Main.marking, on_event = Main.on_event)";
const spec = rules => ({ preamble: PREAMBLE, modules: [{ name: "Common", text: COMMON }, { name: "Rules", text: rules }, { name: "Main", text: MAIN }], tail: TAIL });
const NET = Hazel.runProgram(spec(RULES)).value;   // the app's state starts from Main's net: places, transitions, marking
const PLACES = NET.places;
// (the view in the order of Net's fields, marking first: hazeljs 0.0.4 gets stuck on an object whose keys come in another order
// when a field is a list; see the README)

// ---- 4. The app acts out a command: a chain, each command with the rest after it. Hazel never touches the state itself.
function perform(cmd, marking, log) {
  const m = marking.slice();
  for (let c = cmd; c && c.tag !== "Done"; ) {
    const [a, b, rest] = Array.isArray(c.value) ? c.value : [c.value];
    if (c.tag === "Take") { m[a] -= b; c = rest; }
    else if (c.tag === "Put") { m[a] += b; c = rest; }
    else if (c.tag === "Say") { log.push(a); c = b; }
    else throw new Error("a command this app does not know: " + c.tag);
  }
  return m;
}

// ---- 5. The app's own JS handler, for while the Hazel rules are not ready (errors, holes, unfinished brackets).
function jsHandler(net, ev) {
  const t = net.transitions[ev.tag === "Fire" ? ev.value : 0];
  const ok = t && t.inputs.every(a => net.marking[a.place] >= a.weight);
  if (!ok) return { tag: "Say", value: ["(js) cannot fire", { tag: "Done" }] };
  let k = { tag: "Done" };
  for (const a of [...t.outputs].reverse()) k = { tag: "Put", value: [a.place, a.weight, k] };
  for (const a of [...t.inputs].reverse()) k = { tag: "Take", value: [a.place, a.weight, k] };
  return { tag: "Say", value: ["(js) " + t.name, k] };
}

// ---- 6. Build the program once per text (Hazel remembers the modules' texts), and use it only when it is ok.
function build(rules) {
  const r = Hazel.runProgram(spec(rules));
  return { ok: r.ok, errors: r.errors.map(e => `${e.module ?? "the program"}: ${e.message.replace(/\s+/g, " ")}`),
           holes: r.holes, incomplete: r.incomplete, ms: r.ms, handler: r.ok ? r.value.on_event : null };
}
const handlerOf = b => b.ok ? b.handler : jsHandler;

const out = { hazeljs: Hazel.version, build: Hazel.build, node: process.version, runs: {} };

// (a) the rules as written: ok; a few events by hand, then 2,000 random steps
const built = build(RULES);
out.built = { ok: built.ok, errors: built.errors, holes: built.holes, ms: +built.ms.toFixed(1) };
console.log("built:", JSON.stringify(out.built));
let marking = NET.marking.slice(), said = [];
const on = handlerOf(built);
const by_hand = [{ tag: "Fire", value: 0 }, { tag: "Fire", value: 2 }, { tag: "Fire", value: 1 }, { tag: "Fire", value: 2 }];
out.by_hand = [];
for (const ev of by_hand) {
  const cmd = on({ marking, transitions: NET.transitions, draw: 0 }, ev);
  said = []; marking = perform(cmd, marking, said);
  out.by_hand.push({ event: ev, said: said.join("; "), marking: marking.slice(), cmd });
  console.log(JSON.stringify(ev), "->", said.join("; "), "->", JSON.stringify(marking));
}
// a deterministic stream of draws, so the run can be repeated
let seed = 7; const draw = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
marking = NET.marking.slice();
const counts = {}, times = [];
let both_busy = 0;
for (let i = 0; i < 2000; i++) {
  const t0 = performance.now();
  const cmd = on({ marking, transitions: NET.transitions, draw: draw() }, { tag: "Step" });
  times.push(performance.now() - t0);
  said = []; marking = perform(cmd, marking, said);
  counts[said[0]] = (counts[said[0]] || 0) + 1;
  if (marking[1] && marking[3]) both_busy++;
}
times.sort((a, b) => a - b);
const q = p => +times[Math.floor(p * (times.length - 1))].toFixed(3);
out.steps = { n: 2000, fired: counts, both_busy, final: marking, call_ms: { min: q(0), median: q(0.5), p90: q(0.9), max: q(1) } };
console.log("2,000 steps:", JSON.stringify(out.steps));
// the same 2,000 calls to the app's own JS handler (Fire of the transition Hazel's step would pick is not needed: a Fire(0) each time)
{ const tj = []; let mj = NET.marking.slice();
  for (let i = 0; i < 2000; i++) { const t0 = performance.now(); const cmd = jsHandler({ marking: mj, transitions: NET.transitions }, { tag: "Fire", value: i % 4 }); tj.push(performance.now() - t0); mj = perform(cmd, mj, []); }
  tj.sort((a, b) => a - b); out.js_call_ms = { median: +tj[1000].toFixed(4), p90: +tj[1800].toFixed(4) };
  console.log("JS handler:", JSON.stringify(out.js_call_ms)); }

// (b) a mistake in the rules: a name for a number. Hazel says where, by module; the app keeps using its JS handler
const wrong = RULES.replace("fire_at(n, i)", "fire_at(n, \"one\")");
const b2 = build(wrong);
out.with_error = { ok: b2.ok, errors: b2.errors, holes: b2.holes, incomplete: b2.incomplete,
  answered_by: handlerOf(b2) === jsHandler ? "the app's JS" : "Hazel",
  answer: perform(handlerOf(b2)({ marking: NET.marking, transitions: NET.transitions, draw: 0 }, { tag: "Fire", value: 0 }), NET.marking, said = []) && said.join("; ") };
console.log("with an error:", JSON.stringify(out.with_error));

// (c) a rule still being written: a hole where the Step case's answer goes. No error, but not ok
const unfinished = RULES.replace(/\| Step =>[\s\S]*end$/, "| Step => ?\n  end");
const b3 = build(unfinished);
out.unfinished = { ok: b3.ok, errors: b3.errors, holes: b3.holes, incomplete: b3.incomplete };
console.log("unfinished:", JSON.stringify(out.unfinished));

// (d) building again after one module changed, and again unchanged
const t1 = performance.now(); build(RULES + "\n"); const again = performance.now() - t1;
const t2 = performance.now(); build(RULES + "\n"); const same = performance.now() - t2;
out.rebuild_ms = { one_module_changed: +again.toFixed(1), unchanged: +same.toFixed(1) };
console.log("rebuild:", JSON.stringify(out.rebuild_ms));

// (e) the same 2,000 steps with the tail unannotated: ^report(25) found a call into Hazel re-checks a function's annotation
// at run time (the cast around it), which #2681 removes; hazeljs 0.0.4 is built from before it
{ const r = Hazel.runProgram({ ...spec(RULES), tail: "Rules.on_event" });
  let m = NET.marking.slice(); seed = 7; const ts = [];
  for (let i = 0; i < 2000; i++) { const t0 = performance.now(); const cmd = r.value({ marking: m, transitions: NET.transitions, draw: draw() }, { tag: "Step" }); ts.push(performance.now() - t0); m = perform(cmd, m, []); }
  ts.sort((a, b) => a - b); out.unannotated_tail_call_ms = { ok: r.ok, median: +ts[1000].toFixed(3), p90: +ts[1800].toFixed(3), final: m };
  console.log("tail unannotated:", JSON.stringify(out.unannotated_tail_call_ms)); }

writeFileSync(new URL("./run.json", import.meta.url), JSON.stringify(out, null, 1));
