// bloch.js — self-contained interactive Bloch sphere with animated gate rotations.
// No dependencies. Auto-initializes elements with class "bloch-widget".
//
// Usage (HTML built by article.js):
//   <div class="bloch-widget" data-gates="X,Y,Z,H,S,T" data-state="0"></div>
// Then call Bloch.initAll() after inserting into the DOM.
(function (global) {
  "use strict";

  const AX = 26 * Math.PI / 180;   // view azimuth
  const EL = 18 * Math.PI / 180;   // view elevation

  // ── 3D math ──
  function project(p, cx, cy, R) {
    const vx = p[0] * Math.cos(AX) - p[1] * Math.sin(AX);
    const vy = p[0] * Math.sin(AX) + p[1] * Math.cos(AX);
    const sx = cx + R * vx;
    const sy = cy - R * (p[2] * Math.cos(EL) - vy * Math.sin(EL));
    const depth = p[2] * Math.sin(EL) + vy * Math.cos(EL);
    return [sx, sy, depth];
  }
  function rotate(v, k, a) {            // Rodrigues rotation
    const c = Math.cos(a), s = Math.sin(a);
    const dot = v[0]*k[0] + v[1]*k[1] + v[2]*k[2];
    const cx = k[1]*v[2] - k[2]*v[1];
    const cy = k[2]*v[0] - k[0]*v[2];
    const cz = k[0]*v[1] - k[1]*v[0];
    return [
      v[0]*c + cx*s + k[0]*dot*(1-c),
      v[1]*c + cy*s + k[1]*dot*(1-c),
      v[2]*c + cz*s + k[2]*dot*(1-c),
    ];
  }
  const norm = (v) => { const m = Math.hypot(...v) || 1; return [v[0]/m, v[1]/m, v[2]/m]; };

  // Gate → { axis, angle, label }. Bloch rotation: U=exp(-i θ/2 n·σ) rotates by θ about n.
  const S2 = 1 / Math.sqrt(2);
  const GATES = {
    X: { axis: [1,0,0], angle: Math.PI,    name: "X" },
    Y: { axis: [0,1,0], angle: Math.PI,    name: "Y" },
    Z: { axis: [0,0,1], angle: Math.PI,    name: "Z" },
    H: { axis: [S2,0,S2], angle: Math.PI,  name: "H" },
    S: { axis: [0,0,1], angle: Math.PI/2,  name: "S" },
    T: { axis: [0,0,1], angle: Math.PI/4,  name: "T" },
    Rx:{ axis: [1,0,0], angle: Math.PI/2,  name: "Rx(π/2)" },
    Ry:{ axis: [0,1,0], angle: Math.PI/2,  name: "Ry(π/2)" },
    Rz:{ axis: [0,0,1], angle: Math.PI/2,  name: "Rz(π/2)" },
  };
  const STATES = {
    "0": [0,0,1], "1": [0,0,-1],
    "+": [1,0,0], "-": [-1,0,0],
    "+i":[0,1,0], "-i":[0,-1,0],
  };

  function draw(ctx, w, h, vec) {
    const cx = w/2, cy = h/2, R = Math.min(w,h)*0.38;
    ctx.clearRect(0,0,w,h);

    // sphere disk
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2*Math.PI);
    ctx.fillStyle = "rgba(40,53,83,0.25)"; ctx.fill();
    ctx.strokeStyle = "#2a3553"; ctx.lineWidth = 1.5; ctx.stroke();

    // equator (ellipse in projection)
    ctx.beginPath();
    for (let i=0;i<=64;i++){
      const t = i/64*2*Math.PI;
      const p = project([Math.cos(t), Math.sin(t), 0], cx, cy, R);
      i===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]);
    }
    ctx.strokeStyle = "#26314d"; ctx.lineWidth = 1; ctx.stroke();

    // meridian
    ctx.beginPath();
    for (let i=0;i<=64;i++){
      const t = i/64*2*Math.PI;
      const p = project([Math.cos(t),0,Math.sin(t)], cx, cy, R);
      i===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]);
    }
    ctx.strokeStyle = "#26314d"; ctx.stroke();

    // axes
    const axis = (a,b,color,lbl,lblPos) => {
      const pa = project(a,cx,cy,R), pb = project(b,cx,cy,R);
      ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash([4,3]); ctx.stroke();
      ctx.setLineDash([]);
      if (lbl){ const pl = project(lblPos,cx,cy,R);
        ctx.fillStyle = color; ctx.font = "12px Helvetica";
        ctx.textAlign="center"; ctx.fillText(lbl, pl[0], pl[1]); }
    };
    axis([-1,0,0],[1,0,0], "#ff7b9c", "|+⟩",[1.18,0,0]);
    axis([0,-1,0],[0,1,0], "#7bffd0", "|+i⟩",[0,1.22,0]);
    axis([0,0,-1],[0,0,1], "#7b9cff", null,null);
    // z labels
    let p0 = project([0,0,1.2],cx,cy,R), p1 = project([0,0,-1.25],cx,cy,R);
    ctx.fillStyle="#7b9cff"; ctx.font="13px Helvetica"; ctx.textAlign="center";
    ctx.fillText("|0⟩", p0[0], p0[1]); ctx.fillText("|1⟩", p1[0], p1[1]);

    // state vector
    const tip = project(vec, cx, cy, R);
    const o = project([0,0,0], cx, cy, R);
    const front = vec[2]*Math.sin(EL) + (vec[0]*Math.sin(AX)+vec[1]*Math.cos(AX))*Math.cos(EL) >= 0;
    ctx.beginPath(); ctx.moveTo(o[0],o[1]); ctx.lineTo(tip[0],tip[1]);
    ctx.strokeStyle = front ? "#ffd166" : "#8a7a33"; ctx.lineWidth = 3; ctx.stroke();
    // arrow head
    ctx.beginPath(); ctx.arc(tip[0],tip[1],5,0,2*Math.PI);
    ctx.fillStyle = front ? "#ffd166" : "#8a7a33"; ctx.fill();
  }

  function readout(vec) {
    // θ from z, φ from x,y
    const theta = Math.acos(Math.max(-1,Math.min(1,vec[2])));
    let phi = Math.atan2(vec[1], vec[0]); if (phi<0) phi+=2*Math.PI;
    const a = Math.cos(theta/2), b = Math.sin(theta/2);
    const deg = (r)=> (r*180/Math.PI).toFixed(0);
    const bphase = Math.abs(b)<1e-3 ? "" : (Math.abs(phi)<1e-2 ? "" : ` e^{i·${deg(phi)}°}`);
    return `|ψ⟩ ≈ ${a.toFixed(2)}|0⟩ + ${b.toFixed(2)}${bphase}|1⟩   (θ=${deg(theta)}°, φ=${deg(phi)}°)`;
  }

  function setup(widget) {
    if (widget.dataset.init === "done") return;
    widget.dataset.init = "done";

    const gates = (widget.dataset.gates || "X,Y,Z,H,S,T").split(",").map(s=>s.trim()).filter(Boolean);
    let vec = (STATES[widget.dataset.state] || [0,0,1]).slice();
    let busy = false;

    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 300;
    canvas.className = "bloch-canvas";
    const ctx = canvas.getContext("2d");

    const controls = document.createElement("div");
    controls.className = "bloch-controls";

    const state = document.createElement("div");
    state.className = "bloch-state";

    function render(){ draw(ctx, 300, 300, norm(vec)); state.textContent = readout(norm(vec)); }

    function animate(axis, angle, after){
      if (busy) return; busy = true;
      const start = vec.slice(); const ax = norm(axis);
      const dur = 700; const t0 = performance.now();
      function step(t){
        const k = Math.min(1, (t-t0)/dur);
        const ease = 0.5 - 0.5*Math.cos(k*Math.PI);  // ease in-out
        vec = rotate(start, ax, angle*ease);
        render();
        if (k<1) requestAnimationFrame(step);
        else { vec = rotate(start, ax, angle); render(); busy=false; if (after) after(); }
      }
      requestAnimationFrame(step);
    }

    gates.forEach((g)=>{
      const def = GATES[g]; if (!def) return;
      const btn = document.createElement("button");
      btn.className = "bloch-btn"; btn.textContent = def.name;
      btn.addEventListener("click", ()=> animate(def.axis, def.angle));
      controls.appendChild(btn);
    });
    const reset = document.createElement("button");
    reset.className = "bloch-btn bloch-reset"; reset.textContent = "↺ |0⟩";
    reset.addEventListener("click", ()=>{ if(busy)return; vec=[0,0,1]; render(); });
    controls.appendChild(reset);

    widget.appendChild(canvas);
    widget.appendChild(controls);
    widget.appendChild(state);
    render();
  }

  const Bloch = {
    initAll() { document.querySelectorAll(".bloch-widget").forEach(setup); },
  };
  global.Bloch = Bloch;
  if (document.readyState !== "loading") Bloch.initAll();
  else document.addEventListener("DOMContentLoaded", Bloch.initAll);
})(window);
