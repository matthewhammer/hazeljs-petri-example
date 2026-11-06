// ^report(43)'s worked example, live on the page (its Hazel listings are hazel-listings.js's; Matthew, 2026-11-06: "can we use the npm package itself on this page, and have
// real hazel editors, not just listings of hazel?"). The same pattern as Messed Up Dress Up's scripts (its js/25-scripting.js):
//   - the page keeps the Petri net's marking and draws it (#live-net, drawn first by gen043.py, then kept up to date here);
//   - its two modules of rules are edited in Hazel's own editor: Hazel's app in a frame, one per module, from Hazel's
//     embed-editable build (embed mode, protocol 1, plus {type: "editable"} and {type: "focus", module}), each edit posted back;
//   - each change of text is built by hazeljs from npm (Hazel.runProgram), and while the build is ok, Hazel's on_event answers each
//     event; while it is not (an error, a hole, an unfinished bracket), the page's own JS handler answers, and the log says which.
(() => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const root = document.getElementById("live");
  const dataEl = document.getElementById("live-data");
  if (!root || !dataEl) return;
  const D = JSON.parse(dataEl.textContent);   // {preamble, tail, modules: [{name, text}]}: since 0.0.10 the net is Hazel's (Main)
  const $ = sel => root.querySelector(sel);
  const el = (tag, attrs = {}, kids = []) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (k === "text") e.textContent = v; else e.setAttribute(k, v);
    for (const k of [].concat(kids)) e.append(k);
    return e;
  };

  // ---- the state the page keeps (the rules' texts are the listings', hazel-listings.js)
  const L = window.HazelListings;
  const PROGRAM = "petri";
  // (the net, S.net, is the last one a build gave: Main's places, transitions, where each is drawn, and its first marking)
  const S = { net: null, marking: [], built: null, log: [], n: 0 };
  if (L) L.tail(PROGRAM, D.tail);
  const spec = () => L ? L.spec(PROGRAM, D.tail) : { preamble: D.preamble, modules: D.modules, tail: D.tail };

  // ---- the page's own JS handler: what answers while the Hazel rules are not ready (as petri.mjs's jsHandler)
  function jsHandler(net, ev) {
    const enabled = t => t.inputs.every(a => net.marking[a.place] >= a.weight);
    let i = ev.tag === "Fire" ? ev.value : -1;
    if (ev.tag === "Step") {
      const r = net.transitions.map((t, k) => enabled(t) ? k : -1).filter(k => k >= 0);
      if (!r.length) return { tag: "Say", value: ["(js) deadlock: nothing can fire", { tag: "Done" }] };
      i = r[Math.floor(net.draw * r.length)];
    }
    const t = net.transitions[i];
    if (!t || !enabled(t)) return { tag: "Say", value: [`(js) ${t ? t.name : "transition " + i} cannot fire now`, { tag: "Done" }] };
    let k = { tag: "Done" };
    for (const a of [...t.outputs].reverse()) k = { tag: "Put", value: [a.place, a.weight, k] };
    for (const a of [...t.inputs].reverse()) k = { tag: "Take", value: [a.place, a.weight, k] };
    return { tag: "Say", value: ["(js) " + t.name, k] };
  }

  // ---- the page acts out a command: a chain, each command with the rest after it. It keeps control: a Take that would leave a
  // place below zero is refused, and so is a command it does not know
  function perform(cmd) {
    const m = S.marking.slice(), said = [];
    let note = "";
    for (let c = cmd, steps = 0; c && c.tag !== "Done"; steps++) {
      if (steps > 500) { note = "stopped: more than 500 commands"; break; }
      const v = Array.isArray(c.value) ? c.value : [c.value];
      if (c.tag === "Take" && v.length === 3) {
        if (!(v[0] in m)) { note = `refused: there is no place ${v[0]}`; break; }
        if (m[v[0]] - v[1] < 0) { note = `refused: ${S.net.places[v[0]]} would go below zero`; break; }
        m[v[0]] -= v[1]; c = v[2];
      } else if (c.tag === "Put" && v.length === 3) {
        if (!(v[0] in m)) { note = `refused: there is no place ${v[0]}`; break; }
        m[v[0]] += v[1]; c = v[2];
      } else if (c.tag === "Say" && v.length === 2) { said.push(String(v[0])); c = v[1]; }
      else { note = `refused: a command this page does not know (${c.tag || (c.hazel ? "not a value" : "?")})`; break; }
    }
    if (!note) S.marking = m;
    return { said, note };
  }

  // a value as Hazel writes it: Say("enter1", Take(0, 1, Done))
  const hz = v => v === null || v === undefined ? "()" : typeof v === "string" ? JSON.stringify(v) : typeof v !== "object" ? String(v)
    : Array.isArray(v) ? "[" + v.map(hz).join(", ") + "]" : v.tag ? v.tag + (v.value === undefined ? "" : "(" + (Array.isArray(v.value) ? v.value.map(hz).join(", ") : hz(v.value)) + ")")
    : typeof v.hazel === "string" ? "‹not a value›" : "(" + Object.entries(v).map(([k, x]) => `${k} = ${hz(x)}`).join(", ") + ")";

  // ---- events, each kept for the 🪵 event log (as Messed Up Dress Up's: the engine that answered, the answer, what it did)
  const LOG_KEEP = 50;
  function event(ev, quiet) {
    const before = S.marking.slice();
    const view = { marking: before.slice(), transitions: S.net.transitions, draw: Math.random() };
    const hazel = !!(S.built && S.built.ok && S.built.handler);
    let cmd, threw = "";
    const t0 = performance.now();
    try { cmd = hazel ? S.built.handler(view, ev) : jsHandler(view, ev); }
    catch (e) { threw = String(e && e.message || e); cmd = jsHandler(view, ev); }
    const ms = performance.now() - t0;
    const r = perform(cmd);
    const entry = { n: ++S.n, at: new Date(), ev, eng: hazel && !threw ? "hazel" : "js", said: r.said, note: threw ? "Hazel threw: " + threw : r.note,
                    cmd, ms, before, after: S.marking.slice(), places: S.net.places };
    if (!quiet) keep(entry);
    return entry;
  }
  function runMany(n) {
    const before = S.marking.slice(), counts = {}, engs = new Set(), t0 = performance.now();
    let notes = 0;
    for (let i = 0; i < n; i++) {
      const e = event({ tag: "Step" }, true);
      engs.add(e.eng); if (e.note) notes++;
      const k = e.said[0] || e.note || "?"; counts[k] = (counts[k] || 0) + 1;
    }
    keep({ n: ++S.n, at: new Date(), ev: { tag: "Step" }, times: n, eng: engs.size === 1 ? [...engs][0] : "mixed", counts, notes,
           ms: performance.now() - t0, before, after: S.marking.slice(), places: S.net.places });
  }
  function keep(entry) { S.log.unshift(entry); if (S.log.length > LOG_KEEP) S.log.length = LOG_KEEP; }

  // ---- the net, drawn from its definition in Hazel (0.0.10, Matthew 2026-11-06: "let's expose all hidden definitions, to be
  // edited"; "we need to re-generate the net dynamically"). Main's places, transitions and where each is drawn: a place a circle,
  // its tokens a dot (or a count), a transition a bar, an arc an arrow, straight unless a straight line would pass close by
  // another place or transition, then bent to the side that keeps it furthest from them. Drawn again whenever the definition
  // changes; the tokens and which transitions can fire, after every event (drawNet).
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}, text) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const PR = 24, TW = 12, TH = 48;   // a place's radius; a transition's width and height
  function renderNet(net) {
    const holder = $("#live-net");
    const P = net.places.map((name, i) => ({ name, ...(net.place_at[i] || { x: 60 + 120 * i, y: 50 }) }));
    const T = net.transitions.map((t, i) => ({ ...t, ...(net.transition_at[i] || { x: 120 + 120 * i, y: 150 }) }));
    const nodes = [...P.map(p => ({ x: p.x, y: p.y })), ...T.map(t => ({ x: t.x, y: t.y }))];
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    // where a line toward (tx, ty) leaves a node: a place's circle, or a transition's bar
    const exit = (n, isPlace, tx, ty) => {
      const dx = tx - n.x, dy = ty - n.y, len = Math.hypot(dx, dy) || 1;
      if (isPlace) return [n.x + dx / len * (PR + 1), n.y + dy / len * (PR + 1)];
      const s = Math.min((TW / 2 + 1) / Math.abs(dx || 1e-9), (TH / 2 + 1) / Math.abs(dy || 1e-9));
      return [n.x + dx * s, n.y + dy * s];
    };
    const near = (pts, skip) => Math.min(...nodes.filter((_, k) => !skip.includes(k)).map(n => Math.min(...pts.map(([x, y]) => Math.hypot(x - n.x, y - n.y)))), Infinity);
    const quad = (a, c, b, k) => { const u = k / 10; return [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]]; };
    const arcs = [];
    T.forEach((t, ti) => {
      for (const a of t.inputs) arcs.push({ from: [a.place, true], to: [ti, false], w: a.weight });
      for (const a of t.outputs) arcs.push({ from: [ti, false], to: [a.place, true], w: a.weight });
    });
    const nodeOf = ([i, isPlace]) => isPlace ? P[i] : T[i];
    const idx = ([i, isPlace]) => isPlace ? i : P.length + i;
    const g = svgEl("g");
    for (const arc of arcs) {
      const A = nodeOf(arc.from), B = nodeOf(arc.to);
      if (!A || !B) continue;
      const skip = [idx(arc.from), idx(arc.to)];
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      const straight = [0, 2, 4, 6, 8, 10].map(k => [A.x + dx * k / 10, A.y + dy * k / 10]);
      // an arc back the other way between the same two nodes bends, so the two do not lie on each other
      const twin = arcs.some(o => o !== arc && idx(o.from) === idx(arc.to) && idx(o.to) === idx(arc.from));
      let ctrl = null;
      if (twin || near(straight.slice(1, -1), skip) < 34) {
        let best = null;
        for (const bend of [0.3, 0.55, 0.8]) for (const side of [1, -1]) {
          const c = [(A.x + B.x) / 2 - dy / len * bend * len * side, (A.y + B.y) / 2 + dx / len * bend * len * side];
          const d = near([1, 3, 5, 7, 9].map(k => quad([A.x, A.y], c, [B.x, B.y], k)), skip);
          // (equal room either way, as in a net drawn symmetric: below, so mirror images bend alike)
          if (!best || d > best.d + 2 || (Math.abs(d - best.d) <= 2 && c[1] > best.c[1])) best = { c, d };
        }
        ctrl = best.c;
      }
      const toward = ctrl || [B.x, B.y], back = ctrl || [A.x, A.y];
      const s = exit(A, arc.from[1], toward[0], toward[1]), e = exit(B, arc.to[1], back[0], back[1]);
      const d = ctrl ? `M${s[0].toFixed(1)} ${s[1].toFixed(1)} Q${ctrl[0].toFixed(1)} ${ctrl[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}` : `M${s[0].toFixed(1)} ${s[1].toFixed(1)} L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
      g.append(svgEl("path", { d, fill: "none", stroke: "var(--muted)", "stroke-width": 1.8 }));
      const [hx, hy] = ctrl ? [e[0] - ctrl[0], e[1] - ctrl[1]] : [e[0] - s[0], e[1] - s[1]], hl = Math.hypot(hx, hy) || 1;
      const ux = hx / hl, uy = hy / hl, px = -uy, py = ux;
      g.append(svgEl("path", { d: `M${(e[0] - 9 * ux + 4.5 * px).toFixed(1)} ${(e[1] - 9 * uy + 4.5 * py).toFixed(1)} L${e[0].toFixed(1)} ${e[1].toFixed(1)} L${(e[0] - 9 * ux - 4.5 * px).toFixed(1)} ${(e[1] - 9 * uy - 4.5 * py).toFixed(1)}`,
                               fill: "none", stroke: "var(--muted)", "stroke-width": 1.8, "stroke-linejoin": "round" }));
      if (arc.w !== 1) {
        const m = ctrl ? quad(s, ctrl, e, 5) : [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
        g.append(svgEl("text", { x: (m[0] + 8 * px).toFixed(1), y: (m[1] + 8 * py + 4).toFixed(1), "font-size": 12, "text-anchor": "middle", fill: "var(--ink)", "font-weight": 700 }, String(arc.w)));
      }
    }
    P.forEach((p, i) => {
      g.append(svgEl("circle", { cx: p.x, cy: p.y, r: PR, fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.8 }));
      g.lastChild.append(svgEl("title", {}, p.name));
      g.append(svgEl("circle", { id: `live-tok-${i}`, cx: p.x, cy: p.y, r: 6, fill: "var(--ink)" }));
      g.append(svgEl("text", { id: `live-cnt-${i}`, x: p.x, y: p.y + 5, "font-size": 15, "text-anchor": "middle", fill: "var(--ink)", "font-weight": 700, style: "display:none" }));
      g.append(svgEl("text", { x: p.x, y: p.y + PR + 18, "font-size": 12.5, "text-anchor": "middle", fill: "var(--ink)", "font-weight": 700 }, p.name));
    });
    T.forEach((t, i) => {
      const r = svgEl("rect", { id: `live-tr-${i}`, class: "live-tr", x: t.x - TW / 2, y: t.y - TH / 2, width: TW, height: TH, rx: 2, fill: "var(--accent)",
                                tabindex: 0, role: "button", "aria-label": `Fire ${t.name}` });
      r.append(svgEl("title", {}, "transition " + t.name));
      g.append(r);
      const left = t.x < cx;
      g.append(svgEl("text", { x: t.x + (left ? -16 : 16), y: t.y + 4, "font-size": 12, "text-anchor": left ? "end" : "start", fill: "var(--accent)", "font-weight": 700 }, t.name));
    });
    const pad = 90, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - PR - 16, x1 = Math.max(...xs) + pad, y1 = Math.max(...ys) + PR + 34;
    const svg = svgEl("svg", { viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, role: "img", style: "width:100%;height:auto;display:block",
      "aria-label": `The net, as Main defines it: ${P.length} places (${P.map(p => p.name).join(", ")}) and ${T.length} transitions (${T.map(t => t.name).join(", ")}).` });
    svg.append(g);
    holder.replaceChildren(svg);
  }
  // the net in the program's answer, checked: Main's places, place_at, transitions, transition_at and marking; or why not
  function netOf(v) {
    if (!v || typeof v !== "object") return [null, "the program gave no net"];
    const { places, place_at, transitions, transition_at, marking } = v;
    const list = x => Array.isArray(x);
    if (!list(places) || !places.every(p => typeof p === "string")) return [null, "Main.places is not a list of names"];
    if (!list(marking) || marking.length !== places.length || !marking.every(k => Number.isInteger(k) && k >= 0)) return [null, "Main.marking is not a count for each place"];
    if (!list(transitions) || !transitions.every(t => t && typeof t.name === "string" && list(t.inputs) && list(t.outputs))) return [null, "Main.transitions is not a list of transitions"];
    const okArc = a => a && Number.isInteger(a.place) && a.place >= 0 && a.place < places.length && Number.isInteger(a.weight) && a.weight > 0;
    if (!transitions.every(t => t.inputs.every(okArc) && t.outputs.every(okArc))) return [null, "an arc in Main.transitions names no place, or has no positive weight"];
    const okAt = (xs, n) => list(xs) && xs.length === n && xs.every(p => p && typeof p.x === "number" && typeof p.y === "number");
    if (!okAt(place_at, places.length)) return [null, "Main.place_at is not a position for each place"];
    if (!okAt(transition_at, transitions.length)) return [null, "Main.transition_at is not a position for each transition"];
    return [{ places, place_at, transitions, transition_at, marking }, ""];
  }
  // a net from a build: drawn again when its shape changes; its marking started again when its places or its first marking do
  function takeNet(net) {
    const was = S.net;
    S.net = net;
    const shape = n => JSON.stringify([n.places, n.place_at, n.transitions, n.transition_at]);
    if (!was || shape(was) !== shape(net)) renderNet(net);
    if (!was || was.places.length !== net.places.length || JSON.stringify(was.marking) !== JSON.stringify(net.marking)) S.marking = net.marking.slice();
    drawAll();
  }

  // ---- drawing: the net's tokens and which transitions can fire, the status, the log
  function drawNet() {
    if (!S.net) return;
    S.marking.forEach((k, i) => {
      const dot = root.querySelector(`#live-tok-${i}`), cnt = root.querySelector(`#live-cnt-${i}`);
      if (dot) dot.style.display = k === 1 ? "" : "none";
      if (cnt) { cnt.style.display = k === 1 || k === 0 ? "none" : ""; cnt.textContent = String(k); }
    });
    S.net.transitions.forEach((t, i) => {
      const r = root.querySelector(`#live-tr-${i}`);
      if (r) r.classList.toggle("off", !t.inputs.every(a => S.marking[a.place] >= a.weight));
    });
    $("#live-marking").textContent = S.net.places.map((p, i) => `${p} ${S.marking[i]}`).join(" · ");
  }
  function errorText(message) {
    const m = String(message).match(/^Error in term:\s*\n\s*([\s\S]*?)\nNature of error: Expecting type ([\s\S]*?) but got inconsistent type ([\s\S]*)$/);
    if (!m) return String(message).replace(/\s+/g, " ");
    // (a type with a comma at its top, a pair, in parentheses: "a (Net, Int)", not "a Net, Int")
    const ty = t => { t = t.trim().replace(/\s+/g, " "); return /,/.test(t) && !/^\(.*\)$/.test(t) ? `(${t})` : t; };
    const a = t => (/^[AEIOU]/.test(ty(t)) ? "an " : "a ") + ty(t);
    const term = m[1].trim().replace(/\s+/g, " ");
    return `${term.length > 60 ? term.slice(0, 57) + "…" : term}: ${a(m[2])} is wanted here, but this is ${a(m[3])}`;
  }
  function drawStatus() {
    const st = $("#live-status");
    st.replaceChildren();
    if (!window.Hazel) { st.className = "live-status wait"; st.append(S.libFailed ? "Hazel did not load from jsDelivr; the page's own JS answers events." : "⏳ Loading Hazel (hazeljs 0.0.4 from jsDelivr, about 650 kB); until then the page's own JS answers events."); return; }
    const b = S.built;
    if (!b) return;
    if (b.ok) { st.className = "live-status ok"; st.append(`✓ The rules are ready: Hazel answers each event. Built by hazeljs in ${b.ms.toFixed(0)} ms.`); return; }
    st.className = "live-status no";
    st.append(el("b", { text: "Not ready, so the page's own JS answers events." }));
    const ul = el("ul");
    for (const e of b.errors) ul.append(el("li", { text: `${e.module || "the program"}: ${errorText(e.message)}` }));
    for (const m of Object.keys(b.holes || {})) if (b.holes[m]) ul.append(el("li", { text: `${m}: ${b.holes[m]} hole${b.holes[m] > 1 ? "s" : ""} to fill` }));
    for (const m of Object.keys(b.incomplete || {})) if (b.incomplete[m]) ul.append(el("li", { text: `${m}: ${b.incomplete[m]} bracket or keyword without its partner` }));
    if (b.threw) ul.append(el("li", { text: "hazeljs: " + b.threw }));
    if (b.netWhy && !b.errors.length) ul.append(el("li", { text: "the net: " + b.netWhy + (S.net ? "; the last whole net is kept" : "") }));
    st.append(ul);
  }
  // the 🪵 event log, drawn as Messed Up Dress Up's: one line an event (its number, time, engine, call, time taken, and what changed),
  // opened for the event and the answer, the answer acted out, the time, and the marking before and after in full
  const opened = new Set();
  const span = (cls, kids) => el("span", { class: cls }, [].concat(kids));
  const clock = d => d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0");
  const fmtMs = ms => ms < 1 ? ms.toFixed(2) + " ms" : ms < 100 ? ms.toFixed(1) + " ms" : Math.round(ms) + " ms";
  const evText = e => e.times ? `Step ×${e.times}` : e.ev.tag + (e.ev.value === undefined ? "" : `(${hz(e.ev.value)})`);
  // a place that changed, as a chip: its name (a field chip, as the game's globals' fields) and its tokens before and after
  function changes(e) {
    const ch = e.places.map((p, i) => [p, e.before[i], e.after[i]]).filter(([, b, a]) => b !== a);
    if (!ch.length) return [span("log-chip log-quiet", "no change")];
    return ch.map(([p, b, a]) => span("log-chip", [span("log-field", p), span("log-eq", "="), `${b} ⟶ ${a}`]));
  }
  // the answer's commands, each as a chip, the places by name
  function commands(cmd, places) {
    const out = [];
    for (let c = cmd, k = 0; c && c.tag !== "Done" && k < 60; k++) {
      const v = Array.isArray(c.value) ? c.value : [c.value];
      if ((c.tag === "Take" || c.tag === "Put") && v.length === 3) { out.push(span("log-chip", [span("log-field", places[v[0]] ?? String(v[0])), ` ${c.tag === "Take" ? "−" : "+"}${v[1]}`])); c = v[2]; }
      else if (c.tag === "Say" && v.length === 2) { out.push(span("log-chip", `Say(${JSON.stringify(String(v[0]))})`)); c = v[1]; }
      else { out.push(span("log-chip log-bad", hz(c))); break; }
    }
    return out.length ? out : [span("log-chip log-quiet", "Done")];
  }
  const row = (k, v) => [span("log-k", k), el("div", { class: "log-v" }, [].concat(v))];
  function body(e) {
    const grid = el("div", { class: "log-grid" });
    if (e.times) {
      grid.append(...row("fired", el("div", { class: "log-chips" }, Object.entries(e.counts).map(([k, v]) => span("log-chip", `${k} ×${v}`)))));
      if (e.notes) grid.append(...row("", el("div", { class: "log-bad" }, `${e.notes} of the ${e.times} answers refused by the page`)));
    } else {
      grid.append(...row("event", el("code", { class: "log-json", text: hz(e.ev) })));
      grid.append(...row("answer", el("code", { class: "log-json", text: hz(e.cmd) })));
      const fx = el("div", { class: "log-effect" }, [
        ...row("the answer, acted out", el("div", { class: "log-chips" }, commands(e.cmd, e.places))),
        ...row("the marking", el("div", { class: "log-chips" }, changes(e))),
        ...(e.note ? row("", el("div", { class: "log-bad", text: "⚠️ " + e.note })) : [])]);
      grid.append(fx);
    }
    grid.append(...row("time", span("log-diff", e.times ? `${fmtMs(e.ms)} for ${e.times} steps, ${fmtMs(e.ms / e.times)} each` : `rule ${fmtMs(e.ms)}`)));
    const side = (title, m) => el("div", {}, [el("div", { class: "log-k", style: "text-align:left", text: title }),
      el("pre", { class: "log-json", text: e.places.map((p, i) => `${p.padEnd(6)} ${m[i]}`).join("\n") })]);
    const whole = el("details", { class: "log-globals" }, [el("summary", { text: "the marking before and after, in full" }),
      el("div", { class: "log-sides" }, [side("before", e.before), side("after", e.after)])]);
    return [grid, whole];
  }
  // (as the game's log: the handler's name goes to its definition, in its listing)
  function goLink(name) {
    const b = el("button", { type: "button", class: "log-goto", title: `go to ${name}'s definition`, text: name });
    b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); if (L) L.goto(PROGRAM, name); });
    return b;
  }
  function drawLog() {
    const list = $("#live-log .log-list"), count = $("#live-log .log-count");
    count.textContent = S.log.length ? `${S.n} event${S.n === 1 ? "" : "s"}${S.n > LOG_KEEP ? ` (the most recent ${LOG_KEEP})` : ""}` : "";
    if (!S.log.length) { list.replaceChildren(el("div", { class: "hint", text: "no events yet: click a transition, or Step; every event the page hands to a rule is kept here, whichever answers it (Hazel or the page's JS)" })); return; }
    list.replaceChildren(...S.log.map(e => {
      const eng = e.eng === "hazel" ? "Hazel" : e.eng === "js" ? "JS" : "both";
      const head = el("summary", {}, [span("log-n", "#" + e.n), " ", span("log-at", clock(e.at)), " ",
        span(`log-eng log-${e.eng}`, eng), " ",
        e.times ? el("code", { text: evText(e) }) : el("code", {}, [goLink("Rules.on_event"), `(${evText(e)})`]), " ", span("log-ms", fmtMs(e.ms)), " ",
        ...(e.note ? [span("log-chip log-bad", "refused")]
          : e.times ? Object.entries(e.counts).map(([k, v]) => span("log-chip", `${k} ×${v}`))
          : e.before.some((b, i) => b !== e.after[i]) ? changes(e) : [span("log-chip log-quiet", e.said[0] || "no change")])]);
      const det = el("details", { class: "log-entry" }, [head]);
      det.addEventListener("toggle", () => { if (det.open) { opened.add(e.n); if (det.children.length === 1) det.append(...body(e)); } else opened.delete(e.n); });
      if (opened.has(e.n)) { det.append(...body(e)); det.open = true; }   // (an entry opened stays open as new ones come in)
      return det;
    }));
  }
  const drawAll = () => { drawNet(); drawStatus(); drawLog(); };

  // ---- building: once per change of text, a moment after typing stops
  let buildTimer = 0;
  function buildSoon(delay = 350) { clearTimeout(buildTimer); buildTimer = setTimeout(build, delay); }
  function build() {
    if (!window.Hazel) return;
    const sp = spec(), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    let r, threw = "";
    const t0 = performance.now();
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    const [net, why] = netOf(v);
    S.built = { key, ok: !!r.ok, errors: r.errors || [], holes: r.holes, incomplete: r.incomplete, ms: performance.now() - t0, threw,
                handler: r.ok && v && typeof v.on_event === "function" ? v.on_event : null, netWhy: net ? "" : why };
    if (S.built.ok && !(S.built.handler && net)) S.built.ok = false;
    // (a net that is whole is taken even while the program is not ok, so an error in the rules leaves the net Main defines)
    if (net) takeNet(net); else drawAll();
  }
  function loadLib() {
    if (window.Hazel || S.libLoading) return;
    S.libLoading = true;
    const s = el("script", { src: LIB, async: "" });
    s.onload = () => { drawStatus(); build(); };
    s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }

  // ---- the page's parts, wired
  function wire() {
    if (L) L.onChange(PROGRAM, () => buildSoon());
    // a transition fires on a click or Enter, wherever the drawing has it (the drawing is made again when the net changes)
    const fireAt = target => { const r = target && target.closest && target.closest(".live-tr"); if (!r || !S.net) return false;
      event({ tag: "Fire", value: Number(r.id.replace("live-tr-", "")) }); drawAll(); return true; };
    $("#live-net").addEventListener("click", e => fireAt(e.target));
    $("#live-net").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && fireAt(e.target)) e.preventDefault(); });
    $("#live-step").addEventListener("click", () => { if (!S.net) return; event({ tag: "Step" }); drawAll(); });
    $("#live-run").addEventListener("click", () => { if (!S.net) return; runMany(100); drawAll(); });
    $("#live-reset").addEventListener("click", () => { if (!S.net) return; S.marking = S.net.marking.slice(); drawAll(); });
    $("#live-log-clear").addEventListener("click", () => { S.log = []; opened.clear(); drawLog(); });
    $("#live-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); buildSoon(0); });
    // ⛶ full screen (Matthew, 2026-11-06: "We need some FS support here, even in blog/report form?"), as the game's ⛶: the
    // whole example, the net, its log and the editors, on the screen, in two columns when it is wide enough. The browser's own
    // full screen where it has one for an element; where it has none (iPhone Safari), the example made to fill the window,
    // Escape or the button to leave.
    // The divider between the net and the rules, wherever it is wide enough for two columns: in full screen (Matthew, 2026-11-06:
    // "when we do FS here ... we need to have LHS vs RHS slider"), and since 0.0.7 on the page too (his "yes, add it"), as the
    // game's (its js/21-size-and-divider.js): dragged, or the arrow keys on it; a double-click, the first split again. Its place
    // is kept, as a share of the width, for next time; one share for the page and full screen, as the game's views share theirs.
    const grid = $(".live-grid");
    const divider = el("div", { class: "live-divider", role: "separator", "aria-orientation": "vertical", tabindex: "0",
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Between the net and the rules",
      title: "Drag to give the net or the rules more room (double-click: as it was)" });
    grid.insertBefore(divider, $(".live-right"));
    // (the first column's share, whichever column a page puts first: the example app puts the rules there, as code is put
    // on the left in Messed Up Dress Up; per page, as this report and the app share a site)
    const SPLIT_KEY = "live-split-first:" + location.pathname;
    const setSplit = (px, keep) => {
      const w = grid.clientWidth;
      if (px == null) {
        let f = NaN; try { f = parseFloat(localStorage.getItem(SPLIT_KEY)); } catch (_) {}
        if (!(f > 0 && f < 1)) { grid.style.removeProperty("--split"); divider.removeAttribute("aria-valuenow"); return; }
        px = f * w;
      }
      px = Math.min(Math.max(280, w - 26 - 360), Math.max(280, px));   // (each column at least as wide as its controls)
      grid.style.setProperty("--split", Math.round(px) + "px");
      divider.setAttribute("aria-valuenow", String(Math.round(100 * px / w)));
      if (keep) try { localStorage.setItem(SPLIT_KEY, String(px / w)); } catch (_) {}
    };
    let drag = null;
    divider.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId }; divider.setPointerCapture(e.pointerId);
      divider.classList.add("drag"); document.documentElement.classList.add("dragging-split"); e.preventDefault();
    });
    divider.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.px = e.clientX - grid.getBoundingClientRect().left - 13;   // (the divider's middle: a 6 px gap and half its 14 px)
      setSplit(drag.px);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.px != null) setSplit(drag.px, true);
      drag = null; divider.classList.remove("drag"); document.documentElement.classList.remove("dragging-split");
    };
    divider.addEventListener("pointerup", endDrag);
    divider.addEventListener("pointercancel", endDrag);
    divider.addEventListener("dblclick", () => { try { localStorage.removeItem(SPLIT_KEY); } catch (_) {} setSplit(); });
    divider.addEventListener("keydown", e => {
      const d = { ArrowLeft: -40, ArrowRight: 40 }[e.key];
      if (!d) return;
      e.preventDefault();
      setSplit(divider.getBoundingClientRect().left - grid.getBoundingClientRect().left - 6 + d, true);   // (the first column, by the divider)
    });
    const fsBtn = el("button", { type: "button", id: "live-fs", title: "the example, full screen", text: "⛶ full screen" });
    $(".live-controls").append(fsBtn);
    const isFs = () => document.fullscreenElement === root || root.classList.contains("live-max");
    const fsLabel = () => { fsBtn.textContent = isFs() ? "✕ leave full screen" : "⛶ full screen"; };
    // (the kept split, at the width there is now, the page's or the full screen's; after a timer, not an animation frame: a page
    // in the background has none)
    const splitSoon = () => { setTimeout(() => setSplit(), 0); };
    const maxOn = on => { root.classList.toggle("live-max", on); document.documentElement.classList.toggle("live-max-on", on); fsLabel(); splitSoon(); };
    fsBtn.addEventListener("click", () => {
      if (document.fullscreenElement === root) { document.exitFullscreen(); return; }
      if (root.classList.contains("live-max")) { maxOn(false); return; }
      if (!root.requestFullscreen) { maxOn(true); return; }
      // (a request some embedded browsers leave unanswered: the window filled if it has not settled in 0.8 s, and that
      // undone if the browser's own full screen comes after all)
      let settled = false;
      root.requestFullscreen().then(() => { settled = true; maxOn(false); }, () => { settled = true; maxOn(true); });
      setTimeout(() => { if (!settled && document.fullscreenElement !== root) maxOn(true); }, 800);
    });
    document.addEventListener("fullscreenchange", () => { fsLabel(); splitSoon(); });
    addEventListener("resize", splitSoon);
    addEventListener("keydown", e => { if (e.key === "Escape" && root.classList.contains("live-max")) maxOn(false); });
    // (0.0.8, Matthew 2026-11-06: "should default to a FS mode, no margins") a page whose example says data-start="max" opens
    // with the example filling the window (the browser's own full screen needs a click); the button or Escape gives the page
    root.classList.add("on");
    if (root.dataset.start === "max") maxOn(true);
    splitSoon();
    drawAll();
    // Hazel's library only once the section is near the screen, about 650 kB (the editors start on their own: hazel-listings.js)
    // (looked for on load, on scroll and every second, not by an IntersectionObserver: in a page in the background those never
    // called back, and Messed Up Dress Up's panel found the same)
    let started = false;
    const near = () => { const r = root.getBoundingClientRect(); return r.top < innerHeight + 600 && r.bottom > -600; };
    const check = () => { if (!started && near()) { started = true; removeEventListener("scroll", check); clearInterval(poll); loadLib(); } };
    addEventListener("scroll", check, { passive: true });
    const poll = setInterval(check, 1000);
    check();
  }
  wire();
})();
