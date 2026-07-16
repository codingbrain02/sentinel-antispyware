/* ------------------------------------------------------------------
   Sentinel Anti-Spyware
   Purely simulated. No files are read. No system is scanned.
   ------------------------------------------------------------------ */

(() => {
  'use strict';

  // ---------- Fake file/path corpus ------------------------------------
  const dirs = [
    'C:\\Windows\\System32', 'C:\\Windows\\SysWOW64', 'C:\\Program Files',
    'C:\\Users\\AppData\\Local', 'C:\\Users\\AppData\\Roaming',
    'C:\\Users\\Downloads', 'C:\\Users\\Documents',
    'C:\\ProgramData\\Microsoft', 'HKLM\\Software\\Microsoft\\Windows',
    'HKCU\\Software\\Classes', 'C:\\Windows\\Temp',
    'C:\\Users\\AppData\\Local\\Chrome\\Cookies',
  ];
  const files = [
    'msvcp140.dll', 'user32.dll', 'kernel32.dll', 'shell.exe', 'svchost.exe',
    'explorer.exe', 'chrome.exe', 'update.dat', 'cache.bin', 'index.log',
    'config.ini', 'preferences.json', 'CurrentVersion', 'Run', 'RunOnce',
    'msi.tmp', 'setup.log', 'crash.dmp', 'thumb.db',
  ];
  const defenderConflict = {
    name: 'WindowsDefender.ThirdPartyAVConflict',
    file: 'AntivirusProvider',
    dir: 'WMI\\root\\SecurityCenter2',
    sev: 'med',
    kind: 'Configuration',
  };
  const threatCatalog = [
    { name: 'Trojan.Generic.KDV', file: 'update_helper.exe', dir: 'C:\\Users\\AppData\\Local\\Temp', sev: 'high', kind: 'Trojan' },
    { name: 'Spyware.KeyLogger.MX', file: 'kbdservice.dll', dir: 'C:\\Windows\\System32', sev: 'high', kind: 'Spyware' },
    defenderConflict,
    { name: 'PUP.Optional.OpenCandy', file: 'oc_installer.exe', dir: 'C:\\Users\\Downloads', sev: 'low', kind: 'PUP' },
    { name: 'Trojan.Downloader.Zlob', file: 'dl_svc.exe', dir: 'C:\\ProgramData\\ZlobHelper', sev: 'high', kind: 'Trojan' },
    { name: 'TrackingCookie.DoubleClick', file: 'dclk.cookie', dir: 'C:\\Users\\AppData\\Local\\Chrome\\Cookies', sev: 'low', kind: 'Cookie' },
    { name: 'Rootkit.Boot.Cidox', file: 'mbr.sys', dir: 'C:\\Windows\\System32\\drivers', sev: 'high', kind: 'Rootkit' },
    { name: 'Worm.Autorun.Sohanad', file: 'autorun.inf', dir: 'E:\\', sev: 'med', kind: 'Worm' },
    { name: 'Backdoor.Bifrose', file: 'srvhost32.exe', dir: 'C:\\Windows\\SysWOW64', sev: 'high', kind: 'Backdoor' },
    { name: 'Hijacker.SearchProtect', file: 'sp_ie.dll', dir: 'HKCU\\Software\\Classes', sev: 'med', kind: 'Hijacker' },
    { name: 'Spyware.Zeus.Banker', file: 'bnk.dat', dir: 'C:\\Users\\AppData\\Roaming', sev: 'high', kind: 'Spyware' },
    { name: 'Adware.MindSpark', file: 'ms_ext.crx', dir: 'C:\\Users\\AppData\\Local\\Chrome\\Extensions', sev: 'low', kind: 'Adware' },
  ];
  const randomThreatCatalog = threatCatalog.filter((threat) => threat !== defenderConflict);

  function randPath() {
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    const f = files[Math.floor(Math.random() * files.length)];
    return `${d}\\${f}`;
  }

  // ---------- Elements -------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const startBtn = $('startBtn'), stopBtn = $('stopBtn');
  const bar = $('progressBar'), pct = $('progressPct'), phase = $('phaseLabel');
  const progressWrap = document.querySelector('.progress-wrap');
  const feed = document.querySelector('.feed');
  const log = $('log');
  const statusVal = $('statusValue');
  const scannedEl = $('scannedCount'), threatEl = $('threatCount');
  const elapsedEl = $('elapsed');
  const threatList = $('threatList');
  const threatBadge = $('threatBadge');
  const quarantineBtn = $('quarantineBtn'), ignoreBtn = $('ignoreBtn');
  const modal = $('modal'), modalReview = $('modalReview'), modalBody = $('modalBody'), modalTitle = $('modalTitle');
  const footerStatus = $('footerStatus');
  const clockEl = $('clock');

  // Voice variants: 'm' = Rasalgethi (male narrator), 'f' = Erinome (female narrator)
  let voiceVariant = 'm';
  const audio = {
    m: { intro: $('audioIntro_m'), scanning: $('audioScanning_m'), threat: $('audioThreat_m'), clean: $('audioClean_m') },
    f: { intro: $('audioIntro_f'), scanning: $('audioScanning_f'), threat: $('audioThreat_f'), clean: $('audioClean_f') },
  };
  const voiceOn = () => $('toggleVoice').checked;
  const sfxOn = () => $('toggleSfx').checked;

  // ---------- Web Audio SFX ------------------------------------------
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function beep({ freq = 880, dur = 0.08, type = 'sine', vol = 0.08, sweepTo = null } = {}) {
    if (!sfxOn()) return;
    const c = ctx();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  const sfx = {
    tick:   () => beep({ freq: 1400, dur: 0.02, type: 'square', vol: 0.02 }),
    click:  () => beep({ freq: 660, dur: 0.04, type: 'triangle', vol: 0.06 }),
    detect: () => { beep({ freq: 220, dur: 0.18, type: 'sawtooth', vol: 0.11, sweepTo: 90 }); setTimeout(() => beep({ freq: 180, dur: 0.14, type: 'sawtooth', vol: 0.09 }), 90); },
    alarm:  () => { beep({ freq: 880, dur: 0.18, type: 'square', vol: 0.12 }); setTimeout(() => beep({ freq: 660, dur: 0.22, type: 'square', vol: 0.12 }), 200); setTimeout(() => beep({ freq: 880, dur: 0.22, type: 'square', vol: 0.12 }), 440); },
    success:() => { beep({ freq: 660, dur: 0.1, type: 'sine', vol: 0.09 }); setTimeout(() => beep({ freq: 990, dur: 0.14, type: 'sine', vol: 0.09 }), 100); setTimeout(() => beep({ freq: 1320, dur: 0.22, type: 'sine', vol: 0.09 }), 240); },
    zap:    () => beep({ freq: 1600, dur: 0.12, type: 'sawtooth', vol: 0.08, sweepTo: 200 }),
  };

  // ---------- Voice playback ------------------------------------------
  let currentVoice = null;
  function playVoice(key) {
    if (!voiceOn()) return;
    if (currentVoice) { try { currentVoice.pause(); currentVoice.currentTime = 0; } catch (e) {} }
    const a = audio[voiceVariant] && audio[voiceVariant][key];
    if (!a) return;
    currentVoice = a;
    a.volume = 1.0;
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked; ignore */ });
  }

  // ---------- Scan state ---------------------------------------------
  const state = {
    running: false, progress: 0, scanned: 0, elapsedMs: 0, lastTs: 0,
    threats: [], phase: '', rafId: null, timers: [],
  };

  function reset() {
    state.progress = 0; state.scanned = 0; state.elapsedMs = 0;
    state.threats = []; state.phase = ''; state.running = false;
    bar.style.width = '0%'; pct.textContent = '0%';
    scannedEl.textContent = '0'; threatEl.textContent = '0';
    elapsedEl.textContent = '00:00'; phase.textContent = 'Awaiting start';
    statusVal.textContent = 'Idle · ready to scan';
    log.innerHTML = ''; threatList.innerHTML = emptyStateHtml();
    threatBadge.hidden = true;
    quarantineBtn.disabled = true; ignoreBtn.disabled = true;
    document.querySelectorAll('.radar-blip').forEach((b) => b.remove());
    progressWrap.classList.remove('scanning');
    feed.classList.remove('scanning');
    footerStatus.textContent = '● System protected';
    footerStatus.className = 'mono status-ok';
  }

  function emptyStateHtml() {
    return `<div class="empty-state">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.35">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
      </svg>
      <p>No threats detected yet.</p>
      <p class="empty-sub">Run a scan to inspect your system.</p>
    </div>`;
  }

  function tsNow() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  }

  function pushLog(kind, path, note = '') {
    const li = document.createElement('li');
    li.className = kind;
    li.innerHTML = `<span class="ts">${tsNow()}</span><span class="path">${path}</span>${note ? `<span class="ts">${note}</span>` : ''}`;
    log.appendChild(li);
    while (log.children.length > 80) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  function fmtElapsed(ms) {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---------- Radar blips --------------------------------------------
  function addBlip(danger = false) {
    const g = document.getElementById('radarBlips');
    const r = 20 + Math.random() * 120;
    const a = Math.random() * Math.PI * 2;
    const x = 150 + Math.cos(a) * r, y = 150 + Math.sin(a) * r;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3);
    c.setAttribute('fill', danger ? '#ff4d6d' : 'var(--color-primary)');
    c.setAttribute('class', 'radar-blip');
    if (danger) c.style.filter = 'drop-shadow(0 0 6px #ff4d6d)';
    else c.style.filter = 'drop-shadow(0 0 4px #00e6a4)';
    g.appendChild(c);
    setTimeout(() => c.remove(), danger ? 3000 : 1200);
  }

  // ---------- Phases --------------------------------------------------
  const phases = [
    { name: 'Loading definitions',       until: 5,   ms: 800 },
    { name: 'Scanning system memory',    until: 20,  ms: 2600 },
    { name: 'Inspecting registry',       until: 40,  ms: 3200 },
    { name: 'Scanning startup entries',  until: 55,  ms: 2400 },
    { name: 'Analyzing browser cookies', until: 68,  ms: 1800 },
    { name: 'Deep heuristic AI scan',    until: 92,  ms: 4400 },
    { name: 'Finalizing report',         until: 100, ms: 900 },
  ];
  const TOTAL_MS = phases.reduce((a, p) => a + p.ms, 0);

  function pickThreatCount() { return 4 + Math.floor(Math.random() * 4); } // 4–7

  // ---------- Threat item render -------------------------------------
  function renderThreat(t) {
    const el = document.createElement('div');
    el.className = 'threat-item';
    el.dataset.id = t.id;
    el.innerHTML = `
      <input type="checkbox" class="threat-check" checked aria-label="Select ${t.name}">
      <div class="threat-body">
        <div class="threat-name">${t.name}</div>
        <div class="threat-path">${t.dir}\\${t.file}</div>
        <div class="threat-meta">
          <span class="severity-${t.sev}">${t.sev.toUpperCase()}</span>
          <span>${t.kind}</span>
          <span>ID #${t.id}</span>
        </div>
      </div>`;
    el.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const cb = el.querySelector('input');
      cb.checked = !cb.checked;
      el.classList.toggle('selected', cb.checked);
      updateActionButtons();
      sfx.click();
    });
    el.querySelector('input').addEventListener('change', () => {
      el.classList.toggle('selected', el.querySelector('input').checked);
      updateActionButtons();
    });
    el.classList.add('selected');
    return el;
  }

  function updateActionButtons() {
    const anySelected = threatList.querySelectorAll('.threat-item input:checked').length > 0;
    quarantineBtn.disabled = !anySelected;
    ignoreBtn.disabled = !anySelected;
  }

  // ---------- Scan runner --------------------------------------------
  let plannedThreats = [];

  function scheduleThreat(atMs, plannedThreat = null) {
    const t = state.timers;
    t.push(setTimeout(() => {
      if (!state.running) return;
      const proto = plannedThreat || randomThreatCatalog[Math.floor(Math.random() * randomThreatCatalog.length)];
      const threat = { ...proto, id: 100000 + Math.floor(Math.random() * 899999) };
      state.threats.push(threat);
      threatEl.textContent = state.threats.length;
      threatBadge.hidden = false;
      if (threatList.querySelector('.empty-state')) threatList.innerHTML = '';
      threatList.appendChild(renderThreat(threat));
      updateActionButtons();
      pushLog('detected', `${threat.dir}\\${threat.file}`, `${threat.name}`);
      addBlip(true);
      sfx.detect();
    }, atMs));
  }

  function startScan() {
    reset();
    state.running = true;
    startBtn.disabled = true; stopBtn.disabled = false;
    progressWrap.classList.add('scanning');
    feed.classList.add('scanning');
    statusVal.textContent = 'Initializing scan engine…';
    phase.textContent = 'Initializing';
    footerStatus.textContent = '● Scanning in progress';

    beep({ freq: 660, dur: 0.06, type: 'sine', vol: 0.08 });
    setTimeout(() => beep({ freq: 990, dur: 0.1, type: 'sine', vol: 0.08 }), 100);

    // Voice: intro then scanning
    playVoice('intro');
    state.timers.push(setTimeout(() => { if (state.running) playVoice('scanning'); }, 9000));

    // Plan threats: schedule 4–7 detections uniformly across scanning phases (15% → 92%)
    const count = pickThreatCount();
    plannedThreats = [];
    for (let i = 0; i < count; i++) {
      const p = 0.15 + (0.92 - 0.15) * ((i + 0.5) / count) + (Math.random() - 0.5) * 0.05;
      scheduleThreat(Math.floor(TOTAL_MS * p), i === 0 ? defenderConflict : null);
    }

    // Tick file paths in log
    const fileTicker = setInterval(() => {
      if (!state.running) return;
      state.scanned += 12 + Math.floor(Math.random() * 30);
      scannedEl.textContent = state.scanned.toLocaleString();
      pushLog('clean', randPath());
      addBlip(false);
      if (Math.random() < 0.3) sfx.tick();
    }, 220);
    state.timers.push({ interval: fileTicker });

    // Progress driver
    let phaseIdx = 0, phaseStart = performance.now(), phaseFrom = 0;
    state.lastTs = performance.now();

    function loop(ts) {
      if (!state.running) return;
      const now = ts;
      state.elapsedMs += now - state.lastTs;
      state.lastTs = now;
      elapsedEl.textContent = fmtElapsed(state.elapsedMs);

      const cur = phases[phaseIdx];
      const t = Math.min(1, (now - phaseStart) / cur.ms);
      const p = phaseFrom + (cur.until - phaseFrom) * t;
      state.progress = p;
      bar.style.width = p + '%';
      pct.textContent = Math.floor(p) + '%';
      phase.textContent = cur.name;
      statusVal.textContent = cur.name + '…';

      if (t >= 1) {
        phaseFrom = cur.until;
        phaseIdx++;
        phaseStart = now;
        if (phaseIdx >= phases.length) {
          finishScan();
          return;
        }
      }
      state.rafId = requestAnimationFrame(loop);
    }
    state.rafId = requestAnimationFrame(loop);
  }

  function stopTimers() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.timers.forEach((t) => {
      if (t && t.interval) clearInterval(t.interval);
      else clearTimeout(t);
    });
    state.timers = [];
  }

  function stopScan() {
    if (!state.running) return;
    state.running = false;
    stopTimers();
    startBtn.disabled = false; stopBtn.disabled = true;
    progressWrap.classList.remove('scanning');
    feed.classList.remove('scanning');
    statusVal.textContent = 'Scan cancelled';
    phase.textContent = 'Cancelled';
    footerStatus.textContent = '● Scan cancelled';
    footerStatus.className = 'mono';
    if (currentVoice) { try { currentVoice.pause(); } catch(e){} }
    sfx.click();
  }

  function finishScan() {
    state.running = false;
    stopTimers();
    startBtn.disabled = false; stopBtn.disabled = true;
    progressWrap.classList.remove('scanning');
    feed.classList.remove('scanning');
    bar.style.width = '100%'; pct.textContent = '100%';
    phase.textContent = 'Scan complete';

    if (state.threats.length > 0) {
      statusVal.textContent = `Scan complete · ${state.threats.length} threats found`;
      footerStatus.textContent = `● ${state.threats.length} threats require action`;
      footerStatus.className = 'mono status-danger';
      sfx.alarm();
      setTimeout(() => playVoice('threat'), 400);
      modalTitle.textContent = `${state.threats.length} threats detected`;
      modalBody.textContent = 'Review and quarantine the detected items to keep your system safe.';
      modal.hidden = false;
    } else {
      statusVal.textContent = 'Scan complete · no threats found';
      footerStatus.textContent = '● System clean';
      footerStatus.className = 'mono status-ok';
      sfx.success();
      playVoice('clean');
    }
  }

  // ---------- Quarantine ---------------------------------------------
  function quarantineSelected() {
    const items = Array.from(threatList.querySelectorAll('.threat-item')).filter((el) => el.querySelector('input').checked);
    if (!items.length) return;
    quarantineBtn.disabled = true; ignoreBtn.disabled = true;
    statusVal.textContent = `Quarantining ${items.length} threats…`;

    items.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('cleaning');
        sfx.zap();
        setTimeout(() => {
          el.classList.add('cleaned');
          setTimeout(() => {
            el.remove();
            const id = parseInt(el.dataset.id, 10);
            state.threats = state.threats.filter((t) => t.id !== id);
            threatEl.textContent = state.threats.length;
            if (state.threats.length === 0) {
              threatList.innerHTML = emptyStateHtml();
              threatBadge.hidden = true;
              statusVal.textContent = 'System clean · quarantine complete';
              footerStatus.textContent = '● System clean';
              footerStatus.className = 'mono status-ok';
              sfx.success();
              setTimeout(() => playVoice('clean'), 200);
            }
          }, 500);
        }, 500);
      }, i * 500);
    });
  }

  function ignoreSelected() {
    const items = Array.from(threatList.querySelectorAll('.threat-item input:checked'));
    items.forEach((cb) => { cb.checked = false; cb.closest('.threat-item').classList.remove('selected'); });
    updateActionButtons();
    sfx.click();
  }

  // ---------- Mode select --------------------------------------------
  document.querySelectorAll('input[name="mode"]').forEach((r) => {
    r.addEventListener('change', () => {
      document.querySelectorAll('.mode').forEach((m) => m.classList.remove('selected'));
      r.closest('.mode').classList.add('selected');
      const label = { quick: 'Quick', enhanced: 'Enhanced', full: 'Full System', custom: 'Custom' }[r.value];
      startBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg> Start ${label} Scan`;
      sfx.click();
    });
  });

  // ---------- Tabs (visual only) -------------------------------------
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      sfx.click();
    });
  });

  // ---------- Toggles feedback --------------------------------------
  $('toggleVoice').addEventListener('change', (e) => {
    if (!e.target.checked && currentVoice) { try { currentVoice.pause(); } catch(_){} }
  });

  // Voice variant segmented selector
  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.voice;
      if (v === voiceVariant) return;
      voiceVariant = v;
      document.querySelectorAll('.seg-btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      // Stop any current playback so the new voice takes over next cue
      if (currentVoice) { try { currentVoice.pause(); currentVoice.currentTime = 0; } catch(_){} }
      sfx.click();
      // Preview: play the intro line in the newly selected voice
      if (voiceOn()) playVoice('intro');
    });
  });

  // ---------- Clock --------------------------------------------------
  function tickClock() {
    const d = new Date();
    clockEl.textContent = d.toTimeString().slice(0, 8);
  }
  setInterval(tickClock, 1000); tickClock();

  // ---------- Wire buttons -------------------------------------------
  startBtn.addEventListener('click', () => { ctx(); startScan(); });
  stopBtn.addEventListener('click', stopScan);
  quarantineBtn.addEventListener('click', quarantineSelected);
  ignoreBtn.addEventListener('click', ignoreSelected);
  modalReview.addEventListener('click', () => { modal.hidden = true; sfx.click(); });
})();
