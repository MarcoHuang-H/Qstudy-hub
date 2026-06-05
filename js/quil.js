// quil.js — built-in quantum simulator.
// Parses BOTH pyQuil/Quil and Qiskit OpenQASM gate output (auto-detected),
// runs a full statevector simulation, animates each qubit's Bloch sphere,
// and draws a logic-gate circuit diagram.
// Reuses Bloch.draw / Bloch.rotate from js/bloch.js.
(function (global) {
  "use strict";

  // ── Angle expression evaluator (pi, numbers, + - * / parens) ──
  function evalAngle(str) {
    const s = String(str).replace(/\s+/g, "").replace(/π/g, "pi");
    let i = 0;
    const number = () => { let a = i; while (i < s.length && /[0-9.]/.test(s[i])) i++; return parseFloat(s.slice(a, i)); };
    function factor() {
      if (s[i] === "(") { i++; const v = expr(); if (s[i] === ")") i++; return v; }
      if (s[i] === "-") { i++; return -factor(); }
      if (s[i] === "+") { i++; return factor(); }
      if (s.startsWith("pi", i)) { i += 2; return Math.PI; }
      return number();
    }
    function term() { let v = factor(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; const r = factor(); v = o === "*" ? v * r : v / r; } return v; }
    function expr() { let v = term(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; const r = term(); v = o === "+" ? v + r : v - r; } return v; }
    const out = expr();
    return isNaN(out) ? 0 : out;
  }

  // ── Complex helpers ──
  const cmul = (a, b) => [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]];
  const cadd = (a, b) => [a[0]+b[0], a[1]+b[1]];

  // ── Single-qubit 2x2 complex gates ──
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
      case "SDG": return { a:[1,0], b:[0,0], c:[0,0], d:[0,-1] };
      case "T": return { a:[1,0], b:[0,0], c:[0,0], d:[Math.cos(Math.PI/4),Math.sin(Math.PI/4)] };
      case "TDG": return { a:[1,0], b:[0,0], c:[0,0], d:[Math.cos(-Math.PI/4),Math.sin(-Math.PI/4)] };
      default: return { a:[1,0], b:[0,0], c:[0,0], d:[1,0] };
    }
  }
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
      case "SDG": return { axis:[0,0,1], angle: -Math.PI/2 };
      case "T": return { axis:[0,0,1], angle: Math.PI/4 };
      case "TDG": return { axis:[0,0,1], angle: -Math.PI/4 };
      default: return { axis:[0,0,1], angle: 0 };
    }
  }

  // ── Parser (Quil + OpenQASM) ──
  const ONE_Q_PARAM = new Set(["RX","RY","RZ","PHASE","P","U1"]);
  const ONE_Q_FIX   = new Set(["H","X","Y","Z","S","SDG","T","TDG","I"]);
  const SKIP = /^(OPENQASM|INCLUDE|QREG|CREG|DECLARE|HALT|PRAGMA|GATE|BARRIER|RESET|GPHASE)\b/i;

  function extractQubits(s) {
    let m = [...s.matchAll(/q\[(\d+)\]/g)].map((x) => +x[1]);     // QASM: q[3]
    if (m.length) return m;
    return [...s.matchAll(/(?:^|[\s,])(\d+)(?=$|[\s,])/g)].map((x) => +x[1]); // Quil: bare ints
  }

  function parse(src) {
    const steps = [];
    let maxQ = 0;
    src.split("\n").forEach((line0) => {
      let line = line0.trim().replace(/;+\s*$/, "");
      if (!line || line.startsWith("#") || line.startsWith("//") || SKIP.test(line)) return;

      const head = line.match(/^([A-Za-z][\w]*)\s*(\(([^)]*)\))?\s*(.*)$/);
      if (!head) { steps.push({ kind:"unknown", raw:line }); return; }
      let name = head[1].toUpperCase();
      const param = head[3] != null ? head[3] : null;
      const operand = head[4] || "";

      if (name === "MEASURE") {
        const qs = extractQubits(operand);
        if (qs.length) { maxQ = Math.max(maxQ, qs[0]); steps.push({ kind:"measure", q:qs[0], raw:line }); }
        return;
      }
      // normalise aliases
      if (name === "CX") name = "CNOT";
      if (name === "P" || name === "U1") name = "PHASE";

      const qs = extractQubits(operand);
      if ((name === "CNOT" || name === "CZ" || name === "SWAP") && qs.length >= 2) {
        maxQ = Math.max(maxQ, qs[0], qs[1]);
        steps.push({ kind:"2q", name, q1:qs[0], q2:qs[1], raw:line });
      } else if (ONE_Q_PARAM.has(name) && qs.length) {
        maxQ = Math.max(maxQ, qs[0]);
        steps.push({ kind:"1q", name, theta: evalAngle(param || "0"), q:qs[0], raw:line });
      } else if (ONE_Q_FIX.has(name) && qs.length) {
        maxQ = Math.max(maxQ, qs[0]);
        steps.push({ kind:"1q", name, theta:0, q:qs[0], raw:line });
      } else {
        steps.push({ kind:"unknown", raw:line });
      }
    });
    return { n: Math.max(maxQ + 1, 1), steps };
  }

  // ── Statevector ──
  function newState(n) { const dim = 1 << n; const re = new Float64Array(dim), im = new Float64Array(dim); re[0] = 1; return { n, dim, re, im }; }
  function applySingle(st, g, q) {
    const { re, im, dim } = st;
    for (let i = 0; i < dim; i++) {
      if ((i >> q) & 1) continue;
      const j = i | (1 << q);
      const a0 = [re[i], im[i]], a1 = [re[j], im[j]];
      const ni = cadd(cmul(g.a, a0), cmul(g.b, a1));
      const nj = cadd(cmul(g.c, a0), cmul(g.d, a1));
      re[i] = ni[0]; im[i] = ni[1]; re[j] = nj[0]; im[j] = nj[1];
    }
  }
  function applyCZ(st, q1, q2) { const { re, im, dim } = st; for (let i = 0; i < dim; i++) if (((i>>q1)&1) && ((i>>q2)&1)) { re[i]=-re[i]; im[i]=-im[i]; } }
  function applyCNOT(st, c, t) { const { re, im, dim } = st; for (let i = 0; i < dim; i++) if (((i>>c)&1) && (((i>>t)&1)===0)) { const j=i|(1<<t); const tr=re[i],ti=im[i]; re[i]=re[j]; im[i]=im[j]; re[j]=tr; im[j]=ti; } }
  function applySWAP(st, a, b) { const { re, im, dim } = st; for (let i = 0; i < dim; i++) { const ba=(i>>a)&1, bb=(i>>b)&1; if (ba===1 && bb===0) { const j=(i&~(1<<a))|(1<<b); const tr=re[i],ti=im[i]; re[i]=re[j]; im[i]=im[j]; re[j]=tr; im[j]=ti; } } }
  function applyStep(st, step) {
    if (step.kind === "1q") applySingle(st, gateMatrix(step.name, step.theta), step.q);
    else if (step.kind === "2q") {
      if (step.name === "CZ") applyCZ(st, step.q1, step.q2);
      else if (step.name === "SWAP") applySWAP(st, step.q1, step.q2);
      else applyCNOT(st, step.q1, step.q2);
    }
  }
  function bloch(st, q) {
    const { re, im, dim } = st; let r01re = 0, r01im = 0, z = 0;
    for (let i = 0; i < dim; i++) {
      if ((i >> q) & 1) continue; const j = i | (1 << q);
      r01re += re[i]*re[j] + im[i]*im[j];
      r01im += im[i]*re[j] - re[i]*im[j];
      z += (re[i]*re[i] + im[i]*im[i]) - (re[j]*re[j] + im[j]*im[j]);
    }
    return [2*r01re, -2*r01im, z];
  }
  const lerp = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  const normAxis = (a) => { const m = Math.hypot(a[0],a[1],a[2]) || 1; return [a[0]/m, a[1]/m, a[2]/m]; };

  // ── Circuit diagram SVG ──
  function buildCircuit(prog) {
    const n = prog.n, steps = prog.steps;
    const L = 56, R = 16, T = 18, colW = 46, rowH = 50;
    const W = L + steps.length * colW + R, H = T + n * rowH + 16;
    const yq = (q) => T + q * rowH + rowH / 2;
    let s = `<svg viewBox='0 0 ${W} ${H}' width='${W}' height='${H}' font-family='Helvetica'>`;
    // moving cursor highlight
    s += `<rect id='circ-cursor' x='0' y='${T-4}' width='${colW}' height='${n*rowH+8}' fill='rgba(56,217,210,0.12)' style='display:none'/>`;
    for (let q = 0; q < n; q++) {
      const y = yq(q);
      s += `<line x1='${L}' y1='${y}' x2='${W-R}' y2='${y}' stroke='#46506b'/>`;
      s += `<text x='${L-10}' y='${y+4}' fill='#9aa6c4' font-size='12' text-anchor='end'>q${q}</text>`;
    }
    steps.forEach((st, idx) => {
      const x = L + idx * colW + colW / 2;
      if (st.kind === "1q") {
        const y = yq(st.q);
        s += `<rect x='${x-15}' y='${y-15}' width='30' height='30' rx='5' fill='#161d33' stroke='#38d9d2' stroke-width='1.3'/>`;
        const lbl = st.name === "PHASE" ? "P" : st.name;
        s += `<text x='${x}' y='${y+4}' fill='#e4e9f5' font-size='11' text-anchor='middle'>${lbl}</text>`;
      } else if (st.kind === "2q") {
        const y1 = yq(st.q1), y2 = yq(st.q2);
        s += `<line x1='${x}' y1='${Math.min(y1,y2)}' x2='${x}' y2='${Math.max(y1,y2)}' stroke='#6c7bff' stroke-width='2'/>`;
        if (st.name === "CNOT") {
          s += `<circle cx='${x}' cy='${y1}' r='5' fill='#6c7bff'/>`;
          s += `<circle cx='${x}' cy='${y2}' r='11' fill='none' stroke='#6c7bff' stroke-width='2'/>`;
          s += `<line x1='${x-11}' y1='${y2}' x2='${x+11}' y2='${y2}' stroke='#6c7bff' stroke-width='2'/>`;
          s += `<line x1='${x}' y1='${y2-11}' x2='${x}' y2='${y2+11}' stroke='#6c7bff' stroke-width='2'/>`;
        } else if (st.name === "CZ") {
          s += `<circle cx='${x}' cy='${y1}' r='5' fill='#6c7bff'/><circle cx='${x}' cy='${y2}' r='5' fill='#6c7bff'/>`;
          s += `<text x='${x+9}' y='${(y1+y2)/2+4}' fill='#6c7bff' font-size='10'>Z</text>`;
        } else { // SWAP
          [y1, y2].forEach((y) => { s += `<line x1='${x-6}' y1='${y-6}' x2='${x+6}' y2='${y+6}' stroke='#6c7bff' stroke-width='2'/><line x1='${x-6}' y1='${y+6}' x2='${x+6}' y2='${y-6}' stroke='#6c7bff' stroke-width='2'/>`; });
        }
      } else if (st.kind === "measure") {
        const y = yq(st.q);
        s += `<rect x='${x-15}' y='${y-15}' width='30' height='30' rx='5' fill='#2a3142' stroke='#ffd166' stroke-width='1.3'/>`;
        s += `<path d='M${x-8} ${y+6} a8 8 0 0 1 16 0' fill='none' stroke='#ffd166' stroke-width='1.5'/><line x1='${x}' y1='${y+6}' x2='${x+7}' y2='${y-5}' stroke='#ffd166' stroke-width='1.5'/>`;
      }
    });
    s += `</svg>`;
    return { svg: s, L, colW, T, n, rowH };
  }

  // ── Example programs ──
  const EX_QUIL = `DECLARE ro BIT[2]
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
  const EX_BELL = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q[0] -> c[0];
measure q[1] -> c[1];`;
  const EX_GHZ = `OPENQASM 2.0;
qreg q[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];`;
  const EX_SYND = `OPENQASM 2.0;
qreg q[5];
creg ro[1];
h q[0];
cx q[0],q[1];
cx q[0],q[2];
cx q[0],q[3];
cx q[0],q[4];
h q[0];
measure q[0] -> ro[0];`;

  const PRESETS = [
    { label: "2-qubit (pyQuil)", code: EX_QUIL },
    { label: "Bell 2q (QASM)",   code: EX_BELL },
    { label: "GHZ 3q (QASM)",    code: EX_GHZ },
    { label: "糾錯偵測 5q (QASM)", code: EX_SYND },
  ];

  // ── UI / driver ──
  function init(root) {
    root.innerHTML =
      `<div class="sim-header"><div class="sim-title">🧪 內建量子模擬器</div></div>` +
      `<p class="sim-desc">貼上 <b>Qiskit OpenQASM</b> 或 <b>pyQuil</b> 編譯出來的閘操作（自動偵測格式），逐步驅動每個 qubit 的 Bloch 球旋轉，並畫出線路圖。支援 RX/RY/RZ/P、H/X/Y/Z/S/T/Sdg/Tdg、CNOT(cx)/CZ/SWAP。qubit 數會依程式自動增減，遇到糾纏時 Bloch 向量會縮短。</p>` +
      `<div class="quil-presets">範例：` +
        PRESETS.map((p, i) => `<button class="chip-btn" data-preset="${i}">${p.label}</button>`).join("") +
      `</div>` +
      `<div class="quil-controls">` +
        `<textarea id="quil-src" spellcheck="false"></textarea>` +
        `<div class="quil-side">` +
          `<button class="btn" id="quil-load">載入 / 重新解析</button>` +
          `<button class="btn" id="quil-step">⏭ 單步</button>` +
          `<button class="btn" id="quil-run">▶ 全部執行</button>` +
          `<button class="btn" id="quil-reset">↺ 重設</button>` +
        `</div>` +
      `</div>` +
      `<div id="quil-msg" class="quil-msg"></div>` +
      `<h3 class="quil-h">線路圖</h3>` +
      `<div id="quil-circuit" class="quil-circuit"></div>` +
      `<h3 class="quil-h">Bloch 球（每個 qubit 一顆）</h3>` +
      `<div id="quil-spheres" class="quil-spheres"></div>` +
      `<h3 class="quil-h">指令序列</h3>` +
      `<div id="quil-gates" class="quil-gates"></div>`;

    const $ = (sel) => root.querySelector(sel);
    const srcEl = $("#quil-src"), msgEl = $("#quil-msg");
    const circuitEl = $("#quil-circuit"), spheresEl = $("#quil-spheres"), gatesEl = $("#quil-gates");
    srcEl.value = EX_QUIL;

    let prog = null, st = null, canvases = [], ptr = 0, busy = false, circ = null;

    function load() {
      prog = parse(srcEl.value);
      if (prog.n > 8) { msgEl.textContent = `qubit 數過多（${prog.n}），請控制在 8 以內（2⁸=256 維內）。`; return; }
      st = newState(prog.n); ptr = 0; busy = false;
      buildSpheres(); buildGateList();
      circ = buildCircuit(prog); circuitEl.innerHTML = circ.svg;
      renderAll(); highlight();
      msgEl.textContent = `已載入：${prog.n} 個 qubit、${prog.steps.length} 個步驟。`;
    }
    function buildSpheres() {
      spheresEl.innerHTML = ""; canvases = [];
      for (let q = 0; q < prog.n; q++) {
        const card = document.createElement("div"); card.className = "quil-sphere";
        const cv = document.createElement("canvas"); cv.width = 210; cv.height = 210; cv.className = "bloch-canvas";
        const label = document.createElement("div"); label.className = "quil-qlabel";
        label.innerHTML = `<b>q${q}</b> <span class="quil-purity"></span>`;
        card.appendChild(label); card.appendChild(cv); spheresEl.appendChild(card);
        canvases.push({ ctx: cv.getContext("2d"), purity: label.querySelector(".quil-purity") });
      }
    }
    function drawQ(q, vec) {
      window.Bloch.draw(canvases[q].ctx, 210, vec);
      const r = Math.hypot(vec[0], vec[1], vec[2]);
      canvases[q].purity.textContent = r > 0.99 ? "（純態）" : `（純度 ${r.toFixed(2)}，糾纏中）`;
    }
    function renderAll() { for (let q = 0; q < prog.n; q++) drawQ(q, bloch(st, q)); }
    function buildGateList() {
      gatesEl.innerHTML = prog.steps.map((s, idx) => `<span class="quil-gate" data-i="${idx}">${s.raw.replace(/</g,"&lt;")}</span>`).join("");
    }
    function highlight() {
      gatesEl.querySelectorAll(".quil-gate").forEach((el, idx) => { el.classList.toggle("done", idx < ptr); el.classList.toggle("cur", idx === ptr); });
      const cur = circuitEl.querySelector("#circ-cursor");
      if (cur && circ) {
        if (ptr < prog.steps.length) { cur.style.display = "block"; cur.setAttribute("x", circ.L + ptr * circ.colW); }
        else cur.style.display = "none";
      }
    }
    function animate(updates, dur, after) {
      const t0 = performance.now();
      (function frame(t) {
        const k = Math.min(1, (t - t0) / dur);
        const e = 0.5 - 0.5 * Math.cos(k * Math.PI);
        updates.forEach((u) => drawQ(u.q, u.interp(e)));
        if (k < 1) requestAnimationFrame(frame);
        else { renderAll(); if (after) after(); }
      })(performance.now());
    }
    function doStep(cb) {
      if (!prog || ptr >= prog.steps.length || busy) { if (cb) cb(false); return; }
      const step = prog.steps[ptr]; busy = true; highlight();
      if (step.kind === "1q") {
        const before = bloch(st, step.q); const rot = gateRotation(step.name, step.theta);
        applyStep(st, step);
        animate([{ q: step.q, interp: (e) => window.Bloch.rotate(before, normAxis(rot.axis), rot.angle * e) }], 600,
          () => { ptr++; busy = false; highlight(); if (cb) cb(true); });
      } else if (step.kind === "2q") {
        const b1 = bloch(st, step.q1), b2 = bloch(st, step.q2);
        applyStep(st, step);
        const a1 = bloch(st, step.q1), a2 = bloch(st, step.q2);
        msgEl.textContent = `${step.name} ${step.q1},${step.q2}：雙位元閘 → 可能產生糾纏（Bloch 向量縮短）。`;
        animate([{ q: step.q1, interp: (e) => lerp(b1, a1, e) }, { q: step.q2, interp: (e) => lerp(b2, a2, e) }], 750,
          () => { ptr++; busy = false; highlight(); if (cb) cb(true); });
      } else if (step.kind === "measure") {
        msgEl.textContent = `MEASURE q${step.q}（視覺化保留完整量子態，不做坍縮）。`;
        setTimeout(() => { ptr++; busy = false; highlight(); if (cb) cb(true); }, 420);
      } else { ptr++; busy = false; highlight(); if (cb) cb(true); }
    }
    function runAll() { doStep((ok) => { if (ok && ptr < prog.steps.length) runAll(); }); }

    $("#quil-load").addEventListener("click", load);
    $("#quil-step").addEventListener("click", () => doStep());
    $("#quil-run").addEventListener("click", () => { if (!busy) { if (ptr >= prog.steps.length) { st = newState(prog.n); ptr = 0; renderAll(); } runAll(); } });
    $("#quil-reset").addEventListener("click", () => { if (!prog) return; st = newState(prog.n); ptr = 0; busy = false; renderAll(); highlight(); msgEl.textContent = "已重設到初始態 |0…0⟩。"; });
    root.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { srcEl.value = PRESETS[+b.dataset.preset].code; load(); }));

    load();
  }

  global.Quil = { init };
})(window);
