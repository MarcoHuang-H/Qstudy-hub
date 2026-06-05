// quil.js — built-in quantum simulator.
// Parses pyQuil/Quil gate output, runs a full statevector simulation, and
// animates each qubit's Bloch sphere (entanglement shows as a shrinking vector).
// Reuses Bloch.draw / Bloch.rotate from js/bloch.js.
(function (global) {
  "use strict";

  // ── Angle expression evaluator (pi, numbers, + - * / parens) ──
  function evalAngle(str) {
    const s = str.replace(/\s+/g, "");
    let i = 0;
    function peek() { return s[i]; }
    function number() {
      let start = i;
      while (i < s.length && /[0-9.]/.test(s[i])) i++;
      return parseFloat(s.slice(start, i));
    }
    function factor() {
      if (s[i] === "(") { i++; const v = expr(); if (s[i] === ")") i++; return v; }
      if (s[i] === "-") { i++; return -factor(); }
      if (s[i] === "+") { i++; return factor(); }
      if (s.startsWith("pi", i)) { i += 2; return Math.PI; }
      return number();
    }
    function term() {
      let v = factor();
      while (s[i] === "*" || s[i] === "/") {
        const op = s[i++]; const r = factor();
        v = op === "*" ? v * r : v / r;
      }
      return v;
    }
    function expr() {
      let v = term();
      while (s[i] === "+" || s[i] === "-") {
        const op = s[i++]; const r = term();
        v = op === "+" ? v + r : v - r;
      }
      return v;
    }
    const out = expr();
    return isNaN(out) ? 0 : out;
  }

  // ── Complex helpers ──
  const cmul = (a, b) => [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]];
  const cadd = (a, b) => [a[0]+b[0], a[1]+b[1]];

  // ── Single-qubit 2x2 complex gates: {a,b,c,d} each [re,im] ──
  function gateMatrix(name, theta) {
    const c = Math.cos((theta||0)/2), s = Math.sin((theta||0)/2);
    switch (name) {
      case "RX": return { a:[c,0], b:[0,-s], c:[0,-s], d:[c,0] };
      case "RY": return { a:[c,0], b:[-s,0], c:[s,0], d:[c,0] };
      case "RZ": return { a:[Math.cos(-theta/2),Math.sin(-theta/2)], b:[0,0], c:[0,0], d:[Math.cos(theta/2),Math.sin(theta/2)] };
      case "PHASE": return { a:[1,0], b:[0,0], c:[0,0], d:[Math.cos(theta),Math.sin(theta)] };
      case "H": { const r=1/Math.sqrt(2); return { a:[r,0], b:[r,0], c:[r,0], d:[-r,0] }; }
      case "X": return { a:[0,0], b:[1,0], c:[1,0], d:[0,0] };
      case "Y": return { a:[0,0], b:[0,-1], c:[0,1], d:[0,0] };
      case "Z": return { a:[1,0], b:[0,0], c:[0,0], d:[-1,0] };
      case "S": return { a:[1,0], b:[0,0], c:[0,0], d:[0,1] };
      case "T": return { a:[1,0], b:[0,0], c:[0,0], d:[Math.cos(Math.PI/4),Math.sin(Math.PI/4)] };
      case "I": return { a:[1,0], b:[0,0], c:[0,0], d:[1,0] };
      default: return { a:[1,0], b:[0,0], c:[0,0], d:[1,0] };
    }
  }
  // Bloch rotation (axis, angle) for visualising a single-qubit gate
  const S2 = 1/Math.sqrt(2);
  function gateRotation(name, theta) {
    switch (name) {
      case "RX": return { axis:[1,0,0], angle: theta };
      case "RY": return { axis:[0,1,0], angle: theta };
      case "RZ": case "PHASE": return { axis:[0,0,1], angle: theta };
      case "X": return { axis:[1,0,0], angle: Math.PI };
      case "Y": return { axis:[0,1,0], angle: Math.PI };
      case "Z": return { axis:[0,0,1], angle: Math.PI };
      case "H": return { axis:[S2,0,S2], angle: Math.PI };
      case "S": return { axis:[0,0,1], angle: Math.PI/2 };
      case "T": return { axis:[0,0,1], angle: Math.PI/4 };
      default: return { axis:[0,0,1], angle: 0 };
    }
  }

  // ── Parser ──
  const ONE_Q_PARAM = /^(RX|RY|RZ|PHASE)\(([^)]+)\)\s+(\d+)/i;
  const ONE_Q_FIX   = /^(H|X|Y|Z|S|T|I)\s+(\d+)/i;
  const TWO_Q       = /^(CZ|CNOT|CX|CPHASE00|CPHASE)\s+(\d+)\s+(\d+)/i;
  const MEAS        = /^MEASURE\s+(\d+)(?:\s+(\S+))?/i;

  function parse(src) {
    const steps = [];
    let maxQ = 0;
    src.split("\n").forEach((line0) => {
      const line = line0.trim();
      if (!line || line.startsWith("#") || /^DECLARE/i.test(line) ||
          /^HALT/i.test(line) || /^PRAGMA/i.test(line)) return;
      let m;
      if ((m = line.match(ONE_Q_PARAM))) {
        const q = +m[3]; maxQ = Math.max(maxQ, q);
        steps.push({ kind:"1q", name:m[1].toUpperCase(), theta:evalAngle(m[2]), q, raw:line });
      } else if ((m = line.match(ONE_Q_FIX))) {
        const q = +m[2]; maxQ = Math.max(maxQ, q);
        steps.push({ kind:"1q", name:m[1].toUpperCase(), theta:0, q, raw:line });
      } else if ((m = line.match(TWO_Q))) {
        const a = +m[2], b = +m[3]; maxQ = Math.max(maxQ, a, b);
        steps.push({ kind:"2q", name:m[1].toUpperCase(), q1:a, q2:b, raw:line });
      } else if ((m = line.match(MEAS))) {
        const q = +m[1]; maxQ = Math.max(maxQ, q);
        steps.push({ kind:"measure", q, target:m[2]||"", raw:line });
      } else {
        steps.push({ kind:"unknown", raw:line });
      }
    });
    return { n: maxQ + 1, steps };
  }

  // ── Statevector ──
  function newState(n) {
    const dim = 1 << n;
    const re = new Float64Array(dim), im = new Float64Array(dim);
    re[0] = 1;
    return { n, dim, re, im };
  }
  function applySingle(st, g, q) {
    const { re, im, dim } = st;
    for (let i = 0; i < dim; i++) {
      if ((i >> q) & 1) continue;
      const j = i | (1 << q);
      const a0 = [re[i], im[i]], a1 = [re[j], im[j]];
      const ni = cadd(cmul(g.a, a0), cmul(g.b, a1));
      const nj = cadd(cmul(g.c, a0), cmul(g.d, a1));
      re[i] = ni[0]; im[i] = ni[1];
      re[j] = nj[0]; im[j] = nj[1];
    }
  }
  function applyCZ(st, q1, q2) {
    const { re, im, dim } = st;
    for (let i = 0; i < dim; i++)
      if (((i >> q1) & 1) && ((i >> q2) & 1)) { re[i] = -re[i]; im[i] = -im[i]; }
  }
  function applyCNOT(st, c, t) {
    const { re, im, dim } = st;
    for (let i = 0; i < dim; i++) {
      if (((i >> c) & 1) && (((i >> t) & 1) === 0)) {
        const j = i | (1 << t);
        const tr = re[i], ti = im[i];
        re[i] = re[j]; im[i] = im[j]; re[j] = tr; im[j] = ti;
      }
    }
  }
  function applyStep(st, step) {
    if (step.kind === "1q") applySingle(st, gateMatrix(step.name, step.theta), step.q);
    else if (step.kind === "2q") {
      if (step.name === "CZ" || step.name === "CPHASE") applyCZ(st, step.q1, step.q2);
      else applyCNOT(st, step.q1, step.q2);
    }
  }
  // reduced Bloch vector for qubit q
  function bloch(st, q) {
    const { re, im, dim } = st;
    let r01re = 0, r01im = 0, z = 0;
    for (let i = 0; i < dim; i++) {
      if ((i >> q) & 1) continue;
      const j = i | (1 << q);
      r01re += re[i]*re[j] + im[i]*im[j];
      r01im += im[i]*re[j] - re[i]*im[j];
      z += (re[i]*re[i] + im[i]*im[i]) - (re[j]*re[j] + im[j]*im[j]);
    }
    return [2*r01re, -2*r01im, z];
  }
  const lerp = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

  // ── Default program (the user's example) ──
  const DEFAULT = `DECLARE ro BIT[2]
RX(pi/2) 1
RZ(pi/2) 1
RX(-pi/2) 1
RZ(pi) 0
RX(pi/2) 0
RZ(pi/2) 0
RX(-pi/2) 0
CZ 1 0
RX(pi/2) 1
RZ(-pi/2) 1
RX(-pi/2) 1
RZ(pi) 0
RX(pi/2) 0
MEASURE 1 ro[1]
RX(-pi/2) 0
MEASURE 0 ro[0]
HALT`;

  // ── UI / driver ──
  function init(root) {
    root.innerHTML =
      `<div class="sim-header"><div class="sim-title">🧪 內建量子模擬器</div></div>` +
      `<p class="sim-desc">貼上 Qiskit 編譯出來的閘操作，逐步驅動每個 qubit 的 Bloch 球旋轉。支援 RX/RY/RZ/PHASE、H/X/Y/Z/S/T、CZ/CNOT。遇到 CZ 等雙位元閘產生糾纏時，Bloch 向量會縮短（代表純度下降）。</p>` +
      `<div class="quil-top">` +
        `<textarea id="quil-src" spellcheck="false"></textarea>` +
        `<div class="quil-buttons">` +
          `<button class="btn" id="quil-load">載入程式</button>` +
          `<button class="btn" id="quil-step">⏭ 單步</button>` +
          `<button class="btn" id="quil-run">▶ 全部執行</button>` +
          `<button class="btn" id="quil-reset">↺ 重設</button>` +
        `</div>` +
      `</div>` +
      `<div id="quil-msg" class="quil-msg"></div>` +
      `<div id="quil-spheres" class="quil-spheres"></div>` +
      `<div id="quil-gates" class="quil-gates"></div>`;

    const srcEl = root.querySelector("#quil-src");
    srcEl.value = DEFAULT;
    const msgEl = root.querySelector("#quil-msg");
    const spheresEl = root.querySelector("#quil-spheres");
    const gatesEl = root.querySelector("#quil-gates");

    let prog = null, st = null, canvases = [], ptr = 0, busy = false;

    function load() {
      prog = parse(srcEl.value);
      if (prog.n > 8) { msgEl.textContent = `qubit 數過多（${prog.n}），請控制在 8 以內。`; prog = null; return; }
      st = newState(prog.n);
      ptr = 0; busy = false;
      buildSpheres();
      buildGateList();
      renderAll();
      msgEl.textContent = `已載入：${prog.n} 個 qubit、${prog.steps.length} 個步驟。按「單步」或「全部執行」。`;
    }

    function buildSpheres() {
      spheresEl.innerHTML = "";
      canvases = [];
      for (let q = 0; q < prog.n; q++) {
        const card = document.createElement("div");
        card.className = "quil-sphere";
        const cv = document.createElement("canvas");
        cv.width = 220; cv.height = 220; cv.className = "bloch-canvas";
        const label = document.createElement("div");
        label.className = "quil-qlabel";
        label.innerHTML = `<b>q${q}</b> <span class="quil-purity"></span>`;
        card.appendChild(label); card.appendChild(cv);
        spheresEl.appendChild(card);
        canvases.push({ ctx: cv.getContext("2d"), purity: label.querySelector(".quil-purity") });
      }
    }

    function drawQ(q, vec) {
      window.Bloch.draw(canvases[q].ctx, 220, vec);
      const r = Math.hypot(vec[0], vec[1], vec[2]);
      canvases[q].purity.textContent = r > 0.99 ? "（純態）" : `（純度 r=${r.toFixed(2)}，與他位元糾纏）`;
    }
    function renderAll() { for (let q = 0; q < prog.n; q++) drawQ(q, bloch(st, q)); }

    function buildGateList() {
      gatesEl.innerHTML = prog.steps.map((s, idx) =>
        `<span class="quil-gate" data-i="${idx}">${s.raw.replace(/</g,"&lt;")}</span>`
      ).join("");
    }
    function highlight() {
      gatesEl.querySelectorAll(".quil-gate").forEach((el, idx) => {
        el.classList.toggle("done", idx < ptr);
        el.classList.toggle("cur", idx === ptr);
      });
    }

    function animate(updates, dur, after) {
      // updates: array of {q, from, to}
      const t0 = performance.now();
      (function frame(t) {
        const k = Math.min(1, (t - t0) / dur);
        const ease = 0.5 - 0.5*Math.cos(k*Math.PI);
        updates.forEach(u => drawQ(u.q, u.interp(ease)));
        if (k < 1) requestAnimationFrame(frame);
        else { renderAll(); if (after) after(); }
      })(performance.now());
    }

    function doStep(cb) {
      if (!prog || ptr >= prog.steps.length || busy) { if (cb) cb(false); return; }
      const step = prog.steps[ptr];
      busy = true;
      highlight();

      if (step.kind === "1q") {
        const before = bloch(st, step.q);
        const rot = gateRotation(step.name, step.theta);
        const axis = rot.axis;
        applyStep(st, step);
        animate([{ q: step.q, interp: (e) => window.Bloch.rotate(before, normAxis(axis), rot.angle*e) }],
                600, () => { ptr++; busy = false; highlight(); if (cb) cb(true); });
      } else if (step.kind === "2q") {
        const b1 = bloch(st, step.q1), b2 = bloch(st, step.q2);
        applyStep(st, step);
        const a1 = bloch(st, step.q1), a2 = bloch(st, step.q2);
        msgEl.textContent = `${step.name} ${step.q1},${step.q2}：雙位元閘 → 可能產生糾纏（Bloch 向量縮短）。`;
        animate([
          { q: step.q1, interp: (e) => lerp(b1, a1, e) },
          { q: step.q2, interp: (e) => lerp(b2, a2, e) },
        ], 750, () => { ptr++; busy = false; highlight(); if (cb) cb(true); });
      } else if (step.kind === "measure") {
        msgEl.textContent = `MEASURE q${step.q} → ${step.target}（視覺化保留完整量子態，不做坍縮）。`;
        setTimeout(() => { ptr++; busy = false; highlight(); if (cb) cb(true); }, 450);
      } else {
        ptr++; busy = false; highlight(); if (cb) cb(true);
      }
    }

    function runAll() {
      doStep((ok) => { if (ok && ptr < prog.steps.length) runAll(); });
    }
    function normAxis(a){ const m=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/m,a[1]/m,a[2]/m]; }

    root.querySelector("#quil-load").addEventListener("click", load);
    root.querySelector("#quil-step").addEventListener("click", () => doStep());
    root.querySelector("#quil-run").addEventListener("click", () => { if (!busy) runAll(); });
    root.querySelector("#quil-reset").addEventListener("click", () => {
      if (!prog) return; st = newState(prog.n); ptr = 0; busy = false; renderAll(); highlight();
      msgEl.textContent = "已重設到初始態 |0…0⟩。";
    });

    load();
  }

  global.Quil = { init };
})(window);
