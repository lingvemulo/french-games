// Reusable spinning wheel. Used by each single-spinner page now,
// and designed so the multi-spinner page can put several on one screen later.
//
//   FG.createSpinner(rootEl, { items, storageKey, onResult })

(function () {
  const COLORS = [
    "#ffd43b", "#74c0fc", "#ff8787", "#8ce99a",
    "#b197fc", "#ffa94d", "#63e6be", "#f783ac"
  ];

  // ---------- small helpers ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  // ---------- sound ----------
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, start, dur, vol, type) {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  const sounds = {
    tick() { tone(1400, 0, 0.04, 0.08, "triangle"); },
    ding() {
      tone(784, 0, 0.35, 0.15);
      tone(1047, 0.1, 0.5, 0.15);
      tone(1568, 0.1, 0.5, 0.04);
    }
  };

  // ---------- French voice ----------
  let frVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang));
    const score = v =>
      (/natural/i.test(v.name) ? 50 : 0) +
      (/google/i.test(v.name) ? 40 : 0) +
      (/enhanced|premium/i.test(v.name) ? 30 : 0) +
      (/amélie|amelie|thomas|audrey|marie/i.test(v.name) ? 10 : 0) +
      (/fr-FR/i.test(v.lang) ? 5 : 0);
    voices.sort((a, b) => score(b) - score(a));
    frVoice = voices[0] || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.addEventListener("voiceschanged", pickVoice);
  }
  function say(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    if (frVoice) u.voice = frVoice;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  // ---------- settings shared across all pages ----------
  const prefs = {
    get sound() { return store.get("fg:sound", true); },
    set sound(v) { store.set("fg:sound", v); },
    get voice() { return store.get("fg:voice", true); },
    set voice(v) { store.set("fg:voice", v); }
  };

  function wireToggles() {
    document.querySelectorAll("[data-toggle]").forEach(btn => {
      const key = btn.dataset.toggle;
      const icons = { sound: ["🔊", "🔇"], voice: ["🗣️", "🤐"] }[key];
      const paint = () => {
        btn.setAttribute("aria-pressed", String(prefs[key]));
        btn.textContent = prefs[key] ? icons[0] : icons[1];
      };
      paint();
      btn.addEventListener("click", () => { prefs[key] = !prefs[key]; paint(); });
    });
  }

  // ---------- the wheel ----------
  function createSpinner(root, opts) {
    const all = opts.items;
    const key = "fg:enabled:" + opts.storageKey;
    let enabled = new Set(store.get(key, all.map(i => i.fr)).filter(fr => all.some(i => i.fr === fr)));
    if (enabled.size === 0) enabled = new Set(all.map(i => i.fr));

    // "single": wheel + result card + spin button (one-wheel pages)
    // "wheel-only": just the wheel; the page shows results and spins it
    const single = (opts.layout || "single") === "single";
    const tickOn = opts.tick !== false;
    const chooserHTML = `
        <details class="choose">
          <summary><span class="choose-label"></span></summary>
          <div class="choose-actions">
            <button type="button" data-all>All</button>
            <button type="button" data-none>None</button>
          </div>
          <div class="chips"></div>
        </details>`;

    root.innerHTML = `
      <div class="wheel-box">
        <div class="pointer" aria-hidden="true"></div>
        <canvas aria-label="Spinning wheel"></canvas>
      </div>
      ${single ? `
      <div class="side">
        <div class="result" aria-live="polite">
          <div class="result-hint">Spin the wheel!</div>
        </div>
        <button class="spin-btn" type="button">Tourne ! 🎡</button>
        <div class="kbd-hint">or press the space bar</div>
        ${chooserHTML}
      </div>` : ""}`;

    let chooserRoot = root;
    if (!single && opts.chooserEl) {
      opts.chooserEl.innerHTML = chooserHTML;
      chooserRoot = opts.chooserEl;
    }
    const hasChooser = single || !!opts.chooserEl;

    const canvas = root.querySelector("canvas");
    const g = canvas.getContext("2d");
    const resultEl = root.querySelector(".result");
    const spinBtn = root.querySelector(".spin-btn");
    const chipsEl = chooserRoot.querySelector(".chips");
    const chooseLabel = chooserRoot.querySelector(".choose-label");
    const chooseTitle = opts.chooserTitle || "On the wheel";

    let rot = 0;          // wheel rotation in radians
    let spinning = false;
    let size = 0;

    const active = () => all.filter(i => enabled.has(i.fr));

    function resize() {
      const box = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size = box.width;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      const items = active();
      const n = items.length;
      const c = size / 2;
      const r = c - 6;
      const slice = (Math.PI * 2) / n;
      g.clearRect(0, 0, size, size);

      // rim
      g.beginPath();
      g.arc(c, c, r + 4, 0, Math.PI * 2);
      g.fillStyle = "#1f2a44";
      g.fill();

      items.forEach((item, i) => {
        const start = i * slice + rot - Math.PI / 2;
        g.beginPath();
        g.moveTo(c, c);
        g.arc(c, c, r, start, start + slice);
        g.closePath();
        g.fillStyle = COLORS[i % COLORS.length];
        // avoid two neighbours sharing a colour when the count wraps round
        if (n > 1 && i === n - 1 && (n - 1) % COLORS.length === 0) g.fillStyle = COLORS[3];
        g.fill();
        if (n > 1) {
          g.strokeStyle = "rgba(255,255,255,0.7)";
          g.lineWidth = 1.5;
          g.stroke();
        }

        // label, reading from the rim towards the centre
        // (skipped when slices are too thin to read, e.g. 50 verbs on a small wheel)
        if (r * Math.min(slice, 1.2) < 16) return;
        g.save();
        g.translate(c, c);
        g.rotate(start + slice / 2);
        g.textAlign = "right";
        g.textBaseline = "middle";
        g.fillStyle = "#1f2a44";
        const maxLen = r * 0.72;
        let fs = Math.min(30, Math.max(10, r * Math.min(slice, 1.2) * 0.5));
        g.font = `600 ${fs}px Fredoka, Nunito, sans-serif`;
        while (g.measureText(item.fr).width > maxLen && fs > 9) {
          fs -= 1;
          g.font = `600 ${fs}px Fredoka, Nunito, sans-serif`;
        }
        g.fillText(item.fr, r - 12, 0);
        g.restore();
      });

      // hub
      g.beginPath();
      g.arc(c, c, r * 0.11, 0, Math.PI * 2);
      g.fillStyle = "#fff";
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = "#1f2a44";
      g.stroke();
    }

    // which slice is under the pointer (at the top)
    function indexAt(angle, n) {
      const slice = (Math.PI * 2) / n;
      const a = ((-angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(a / slice) % n;
    }

    function showResult(item) {
      resultEl.classList.remove("pop");
      void resultEl.offsetWidth;
      resultEl.classList.add("pop");
      resultEl.innerHTML = `
        <div class="result-fr" lang="fr"></div>
        <div class="result-en"></div>
        ${"speechSynthesis" in window ? '<button class="say-btn" type="button">🔊 Écoute</button>' : ""}`;
      resultEl.querySelector(".result-fr").textContent = item.fr;
      resultEl.querySelector(".result-en").textContent = item.en;
      const sb = resultEl.querySelector(".say-btn");
      if (sb) sb.addEventListener("click", () => say(item.fr));
    }

    // spin(targetFr?) -> Promise<item>. Pass a target to land on a chosen item.
    function spin(targetFr) {
      const items = active();
      if (spinning || items.length === 0) return Promise.resolve(null);
      spinning = true;
      if (spinBtn) spinBtn.disabled = true;
      ctx();
      let done;
      const finished = new Promise(res => { done = res; });

      const n = items.length;
      const slice = (Math.PI * 2) / n;
      let target = items.findIndex(i => i.fr === targetFr);
      if (target < 0) target = Math.floor(Math.random() * n);
      const jitter = (Math.random() - 0.5) * slice * 0.7;
      const want = -((target + 0.5) * slice) + jitter;
      let delta = ((want - rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const turns = 5 + Math.floor(Math.random() * 3);
      const from = rot;
      const to = rot + delta + turns * Math.PI * 2;
      const duration = opts.duration || 4200 + Math.random() * 900;
      const t0 = performance.now();
      let lastIdx = indexAt(rot, n);

      if (resultEl) {
        resultEl.innerHTML = '<div class="result-hint">…</div>';
        resultEl.classList.remove("pop");
      }

      function frame(now) {
        const t = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - t, 4); // ease-out
        rot = from + (to - from) * e;
        draw();
        const idx = indexAt(rot, n);
        if (idx !== lastIdx) {
          lastIdx = idx;
          if (prefs.sound && tickOn) sounds.tick();
        }
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          rot = rot % (Math.PI * 2);
          spinning = false;
          if (spinBtn) spinBtn.disabled = false;
          const item = items[indexAt(rot, n)];
          if (single) {
            showResult(item);
            if (prefs.sound) sounds.ding();
            if (prefs.voice) setTimeout(() => say(item.fr), 350);
          }
          if (opts.onResult) opts.onResult(item);
          done(item);
        }
      }
      requestAnimationFrame(frame);
      return finished;
    }

    function renderChips() {
      chipsEl.innerHTML = "";
      all.forEach(item => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.lang = "fr";
        b.textContent = item.fr;
        b.title = item.en;
        b.setAttribute("aria-pressed", String(enabled.has(item.fr)));
        b.addEventListener("click", () => {
          if (spinning) return;
          if (enabled.has(item.fr)) {
            if (enabled.size === 1) return; // keep at least one on the wheel
            enabled.delete(item.fr);
          } else {
            enabled.add(item.fr);
          }
          changed();
        });
        chipsEl.appendChild(b);
      });
      chooseLabel.textContent = `${chooseTitle}: ${enabled.size} of ${all.length}`;
    }

    function changed() {
      store.set(key, [...enabled]);
      renderChips();
      draw();
      if (opts.onChange) opts.onChange();
    }

    if (hasChooser) {
      chooserRoot.querySelector("[data-all]").addEventListener("click", () => {
        if (spinning) return;
        enabled = new Set(all.map(i => i.fr));
        changed();
      });
      chooserRoot.querySelector("[data-none]").addEventListener("click", () => {
        if (spinning) return;
        enabled = new Set([all[0].fr]); // a wheel needs at least one
        changed();
      });
      renderChips();
    }

    if (single) {
      spinBtn.addEventListener("click", () => spin());
      canvas.addEventListener("click", () => spin());
    } else if (opts.onWheelClick) {
      canvas.addEventListener("click", opts.onWheelClick);
    }

    new ResizeObserver(resize).observe(canvas.parentElement);
    resize();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

    return { spin, isSpinning: () => spinning, active };
  }

  // space bar spins every wheel on the page
  function bindSpaceBar(spinners) {
    document.addEventListener("keydown", e => {
      if (e.code !== "Space") return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button" || tag === "summary") return;
      e.preventDefault();
      if (typeof spinners === "function") spinners();
      else spinners.forEach(s => s.spin());
    });
  }

  window.FG = { createSpinner, bindSpaceBar, wireToggles, say, sounds, prefs };
})();
