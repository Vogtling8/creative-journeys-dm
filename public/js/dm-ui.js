// dm-ui.js — UI controller for Creative Journeys AI Dungeon Master

const UI = {

  // ── Tab Navigation ─────────────────────────────────────────────────────────
  switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`panel-${tab}`)?.classList.add('active');
    document.getElementById(`nav-${tab}`)?.classList.add('active');
  },

  // ── Play Panel ─────────────────────────────────────────────────────────────
  async sendPlay() {
    const input = document.getElementById('play-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    const outEl = document.getElementById('play-output');
    const textEl = document.getElementById('play-text');
    const btn = document.getElementById('play-send');

    btn.disabled = true;
    this.setSpeaker('The Dungeon Master');
    textEl.innerHTML = '<span class="cursor-blink"></span>';

    DM.state.history.push(`PLAYER: ${msg}`);

    try {
      const reply = await DM.call(msg);
      DM.state.history.push(`DM: ${reply}`);
      await DM.typeOut(reply, textEl);

      // Auto-speak if voice is on
      if (document.getElementById('voice-toggle')?.classList.contains('active')) {
        DM.speak(reply.slice(0, 400));
      }
    } catch (e) {
      textEl.textContent = `The mists swirl... (${e.message}. Check your API configuration.)`;
    }
    btn.disabled = false;
  },

  async quickAction(msg) {
    this.switchTab('play');
    document.getElementById('play-input').value = '';
    document.getElementById('play-send').disabled = true;

    const textEl = document.getElementById('play-text');
    this.setSpeaker('The Dungeon Master');
    textEl.innerHTML = '<span class="cursor-blink"></span>';

    DM.state.history.push(`PLAYER: ${msg}`);
    try {
      const reply = await DM.call(msg);
      DM.state.history.push(`DM: ${reply}`);
      await DM.typeOut(reply, textEl);
    } catch (e) {
      textEl.textContent = `Connection lost: ${e.message}`;
    }
    document.getElementById('play-send').disabled = false;
  },

  setSpeaker(name) {
    const el = document.getElementById('play-speaker');
    if (el) el.textContent = name;
  },

  // ── Session Zero ────────────────────────────────────────────────────────────
  selectTone(el, tone) {
    document.querySelectorAll('.tone-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    DM.state.tone = tone;
  },

  launchCampaign() {
    const name = document.getElementById('s0-campaign-name').value.trim() || 'The Ember Contract';
    const length = document.getElementById('s0-length').value;
    const flavor = document.getElementById('s0-flavor').value;
    const partyRaw = document.getElementById('s0-party').value;
    const limits = document.getElementById('s0-limits').value.trim();
    const sessionMap = { oneshot: 1, short: 4, medium: 8, epic: 20 };

    DM.state.campaignName = name;
    DM.state.length = length;
    DM.state.flavor = flavor;
    DM.state.limits = limits;
    DM.state.totalSessions = sessionMap[length] || 8;
    DM.state.party = partyRaw.split('\n').filter(Boolean).map(line => {
      const parts = line.split(/[—\-–,]/);
      return { name: (parts[0] || line).trim(), class: (parts[1] || 'Adventurer').trim() };
    });

    this.updateSessionBadge();
    this.switchTab('play');

    const partyIntro = DM.state.party.length
      ? `Our party: ${DM.state.party.map(p => `${p.name} the ${p.class}`).join(', ')}.`
      : 'Our party is still forming their identities.';

    const launchMsg = `Begin Session Zero for "${name}". ${partyIntro} ${limits ? `Content limits: ${limits}.` : ''}

Run a proper Critical Role-style Session Zero opening:
1. Paint the world in 3-4 vivid sentences — what does this world smell like, sound like, feel like politically?
2. Ask each party member one pointed question about their character's past that will matter later
3. Establish the inciting tension — what is wrong in this world right now?
4. End with the party's first collective moment together — how does this story begin?`;

    this.quickAction(launchMsg);
    DM.addLog('story', `Campaign "${name}" launched — Session Zero`);
  },

  // ── NPC Panel ──────────────────────────────────────────────────────────────
  renderNPCChips() {
    const container = document.getElementById('npc-chips');
    if (!container) return;
    container.innerHTML = DM.state.npcs.map((npc, i) => {
      const initials = npc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const colors = ['#1a5a8a', '#3a1a5a', '#1a5a3a', '#5a3a1a', '#5a1a1a'];
      const bg = colors[i % colors.length];
      return `<span class="npc-chip" onclick="UI.talkToNPC(${i})">
        <span class="npc-avatar" style="background:${bg}22;border-color:${bg}88;color:${bg};">${initials}</span>
        ${npc.name}
      </span>`;
    }).join('');
    document.getElementById('stat-npcs').textContent = DM.state.npcs.length;
  },

  async talkToNPC(index) {
    const npc = DM.state.npcs[index];
    if (!npc) return;

    const textEl = document.getElementById('npc-text');
    document.getElementById('npc-speaker').textContent = npc.name;
    textEl.innerHTML = '<span class="cursor-blink"></span>';

    const system = DM.buildSystem(`You are now voicing ${npc.name} (${npc.role}). Voice pattern: ${npc.voice || 'distinctive'}. Their secret: "${npc.secret}". They want: "${npc.want}". They fear: "${npc.fear}". Speak entirely in first person as this character. If you have a first line prepared, deliver it naturally — not robotically. Make the party feel this person's full humanity.`);

    try {
      const reply = await DM.call(
        `${npc.name} meets the party for what may be the first time. Deliver your opening — then reveal something about what you want from them.`,
        system, 500
      );
      await DM.typeOut(reply, textEl);

      if (document.getElementById('voice-toggle')?.classList.contains('active')) {
        DM.speak(reply.slice(0, 300), npc.name);
      }

      this.showNPCStatBlock(npc);
    } catch (e) {
      textEl.textContent = `${npc.name} stares at you in silence.`;
    }
  },

  showNPCStatBlock(npc) {
    const el = document.getElementById('npc-stat-block');
    if (!el) return;
    document.getElementById('npc-detail')?.removeAttribute('style');
    el.innerHTML = `
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <div>
          <div style="font-size:14px;color:var(--gold-light);margin-bottom:2px;">${npc.name}</div>
          <div class="label" style="margin-bottom:8px;">${npc.role}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${npc.voice ? `<div><span class="label">Voice</span><div style="font-size:12px;color:var(--text-muted);font-style:italic;">"${npc.voice}"</div></div>` : ''}
            ${npc.want ? `<div><span class="label">Wants</span><div style="font-size:12px;color:var(--text-muted);">${npc.want}</div></div>` : ''}
            ${npc.fear ? `<div><span class="label">Fears</span><div style="font-size:12px;color:var(--text-muted);">${npc.fear}</div></div>` : ''}
            ${npc.secret ? `<div><span class="label">Secret ⚠</span><div style="font-size:12px;color:#e57373;">${npc.secret}</div></div>` : ''}
          </div>
        </div>
      </div>`;
  },

  async generateAndAddNPC(type) {
    const textEl = document.getElementById('npc-text');
    document.getElementById('npc-speaker').textContent = 'Generating...';
    textEl.innerHTML = '<span class="cursor-blink"></span>';

    try {
      const { npc, raw } = await DM.generateNPC(type);
      if (npc) {
        this.renderNPCChips();
        document.getElementById('npc-speaker').textContent = npc.name;
        await DM.typeOut(raw, textEl);
        this.showNPCStatBlock(npc);
      } else {
        textEl.textContent = raw;
      }
    } catch (e) {
      textEl.textContent = `A figure emerges from shadow... (Error: ${e.message})`;
    }
  },

  // ── Dice Panel ─────────────────────────────────────────────────────────────
  showRoll(result) {
    const el = document.getElementById('roll-display');
    const numEl = document.getElementById('roll-number');
    const labelEl = document.getElementById('roll-die-name');
    const detailEl = document.getElementById('roll-detail');

    el.style.display = 'block';
    const isCrit = result.total === 20 && result.sides === 20 && result.count === 1;
    const isFail = result.total === 1 && result.sides === 20 && result.count === 1;

    numEl.textContent = result.total;
    numEl.className = `roll-number ${isCrit ? 'crit' : isFail ? 'fail' : ''}`;

    const typeLabel = result.type === 'advantage' ? 'Advantage (2d20 — high)'
      : result.type === 'disadvantage' ? 'Disadvantage (2d20 — low)'
      : `${result.count}d${result.sides}${result.mod > 0 ? '+' + result.mod : result.mod < 0 ? result.mod : ''}`;
    labelEl.textContent = typeLabel;

    const detail = result.type
      ? `Rolled ${result.rolls.join(' and ')} — kept ${result.total}`
      : result.rolls.length > 1 ? `Rolls: [${result.rolls.join(', ')}]${result.mod ? ' + ' + result.mod : ''}` : '';
    detailEl.textContent = isCrit ? '✦ Critical Hit!' : isFail ? '✧ Critical Failure' : detail;

    // History
    const hist = document.getElementById('roll-history');
    const empty = hist.querySelector('.empty');
    if (empty) empty.remove();
    const item = document.createElement('div');
    item.className = 'roll-hist-item';
    item.innerHTML = `<span>${typeLabel}</span><span class="roll-hist-val">${result.total}${isCrit ? ' ✦' : isFail ? ' ✧' : ''}</span>`;
    hist.insertBefore(item, hist.firstChild);
    if (hist.children.length > 25) hist.removeChild(hist.lastChild);

    DM.state.rollHistory.unshift(result);
    if (DM.state.rollHistory.length > 50) DM.state.rollHistory.pop();
  },

  rollDie(sides) {
    const count = parseInt(document.getElementById('dice-count')?.value) || 1;
    const mod = parseInt(document.getElementById('dice-mod')?.value) || 0;
    this.showRoll(Dice.roll(sides, count, mod));
  },

  // ── Quests Panel ───────────────────────────────────────────────────────────
  renderQuests() {
    const el = document.getElementById('quest-list');
    if (!el) return;
    if (DM.state.quests.length === 0) {
      el.innerHTML = '<div class="empty"><i class="ti ti-map"></i><p>No quests yet. Generate one or discover it through play.</p></div>';
      return;
    }
    el.innerHTML = DM.state.quests.map(q => `
      <div class="artifact-item ${q.type === 'main' ? 'quest' : q.type === 'personal' ? 'magic' : 'sidequest'}">
        <div class="artifact-name">
          <i class="ti ti-${q.type === 'main' ? 'crown' : q.type === 'personal' ? 'heart' : 'map-pin'}"></i>
          ${q.title}
          <span class="log-badge badge-${q.type === 'main' ? 'story' : q.type === 'personal' ? 'npc' : 'quest'}" style="margin-left:auto">${q.type}</span>
        </div>
        <div class="artifact-desc">Session ${q.createdSession} · ${q.status}</div>
      </div>`).join('');
    document.getElementById('stat-quests').textContent = DM.state.quests.filter(q => q.status === 'active').length;
  },

  renderArtifacts() {
    const el = document.getElementById('artifact-list');
    if (!el) return;
    if (DM.state.artifacts.length === 0) {
      el.innerHTML = '<div class="empty"><i class="ti ti-diamond"></i><p>No artifacts yet. Generate one or find it in the world.</p></div>';
      return;
    }
    el.innerHTML = DM.state.artifacts.map(a => `
      <div class="artifact-item magic">
        <div class="artifact-name"><i class="ti ti-diamond"></i> ${a.name}</div>
        <div class="artifact-desc">Discovered Session ${a.session}</div>
      </div>`).join('');
  },

  async generateQuest(type) {
    const outEl = document.getElementById('quest-output');
    const textEl = document.getElementById('quest-text');
    outEl.style.display = 'block';
    document.getElementById('quest-speaker').textContent = 'Quest Lore';
    textEl.innerHTML = '<span class="cursor-blink"></span>';

    try {
      const quest = await DM.generateQuest(type);
      await DM.typeOut(quest.text, textEl);
      this.renderQuests();
    } catch (e) {
      textEl.textContent = `A new path opens... (Error: ${e.message})`;
    }
  },

  async generateArtifact() {
    const outEl = document.getElementById('quest-output');
    const textEl = document.getElementById('quest-text');
    outEl.style.display = 'block';
    document.getElementById('quest-speaker').textContent = 'Artifact Lore';
    textEl.innerHTML = '<span class="cursor-blink"></span>';

    try {
      const artifact = await DM.generateArtifact();
      await DM.typeOut(artifact.text, textEl);
      this.renderArtifacts();
    } catch (e) {
      textEl.textContent = `Something ancient stirs... (Error: ${e.message})`;
    }
  },

  // ── Tracker Panel ──────────────────────────────────────────────────────────
  renderLog() {
    const el = document.getElementById('session-log');
    if (!el) return;
    if (DM.state.log.length === 0) {
      el.innerHTML = '<div class="empty"><i class="ti ti-notebook"></i><p>No log entries yet.</p></div>';
      return;
    }
    const badgeMap = { story: 'badge-story', loot: 'badge-loot', quest: 'badge-quest', npc: 'badge-npc', manual: 'badge-manual' };
    el.innerHTML = DM.state.log.map(e => `
      <div class="log-entry">
        <div class="log-meta">Session ${e.session}<span class="log-badge ${badgeMap[e.type] || 'badge-manual'}">${e.type}</span></div>
        ${e.text}
      </div>`).join('');
  },

  async aiLogEntry(type) {
    const prompts = {
      story: `Write a single vivid sentence (past tense, present-tense style) summarizing the most dramatic story beat of Session ${DM.state.session} of "${DM.state.campaignName}". Make it feel like a campaign history book entry.`,
      loot: `Generate one interesting loot item appropriate for Session ${DM.state.session} of a ${DM.state.flavor} campaign. Format: "[Item Name] — [one-line D&D 5e property]."`,
      quest: `Write a one-sentence quest log update for Session ${DM.state.session}. It should read like a chapter heading from an adventure module.`
    };

    try {
      const text = await DM.call(prompts[type], DM.buildSystem(), 300);
      DM.addLog(type, text.trim());
      this.renderLog();
    } catch (e) {
      DM.addLog(type, `[Auto-log failed: ${e.message}]`);
      this.renderLog();
    }
  },

  addManualLog() {
    const input = document.getElementById('manual-log');
    const text = input.value.trim();
    if (!text) return;
    DM.addLog('manual', text);
    this.renderLog();
    input.value = '';
  },

  updateProgress() {
    const pct = Math.round((DM.state.session / DM.state.totalSessions) * 100);
    document.getElementById('progress-fill')?.style.setProperty('width', `${pct}%`);
    document.getElementById('progress-label').textContent = `Session ${DM.state.session} of ${DM.state.totalSessions}`;
    document.getElementById('stat-session').textContent = DM.state.session;
  },

  advanceSession() {
    if (DM.state.session < DM.state.totalSessions) {
      DM.state.session++;
      this.updateProgress();
      this.updateSessionBadge();
      DM.addLog('story', `Session ${DM.state.session} began.`);
      this.renderLog();
      this.quickAction(`Open Session ${DM.state.session} of our campaign. Recap the previous session's ending in 2 vivid sentences, then paint the opening scene using the Goal/Dream Journey format: where are we, what is at stake, and what choice does the party face right now?`);
    }
  },

  // ── NEDS HUD ───────────────────────────────────────────────────────────────
  renderNEDS() {
    const domains = {
      mind: { label: 'Mind', color: '#5aaae8' },
      body: { label: 'Body', color: '#4caf50' },
      spirit: { label: 'Spirit', color: '#aa74da' },
      social: { label: 'Social', color: '#e8885a' },
      creative: { label: 'Create', color: '#e8c95a' },
      purpose: { label: 'Purpose', color: '#e85a8a' },
      environment: { label: 'Environ', color: '#4acac0' },
      finance: { label: 'Finance', color: '#8ae85a' }
    };

    const el = document.getElementById('neds-domains');
    if (!el) return;
    el.innerHTML = Object.entries(domains).map(([key, { label, color }]) => {
      const val = DM.state.neds[key] || 0;
      return `<div class="neds-domain">
        <span class="neds-domain-name">${label}</span>
        <div class="neds-bar-track"><div class="neds-bar-fill" style="width:${val}%;background:${color}22;border-right:2px solid ${color};"></div></div>
        <span class="neds-val" style="color:${color}">${val}</span>
      </div>`;
    }).join('');

    const total = DM.nedsTotal();
    document.getElementById('neds-total').textContent = `${total}%`;
    const totalEl = document.getElementById('neds-total');
    if (totalEl) totalEl.style.color = total >= 70 ? '#4caf50' : total >= 50 ? '#ffc107' : '#e57373';
  },

  toggleNEDS() {
    const hud = document.getElementById('neds-hud');
    hud?.classList.toggle('collapsed');
  },

  updateNEDSDomain(domain) {
    const val = parseInt(prompt(`Update ${domain} (0–100):`, DM.state.neds[domain]));
    if (!isNaN(val)) { DM.updateNEDS(domain, val); }
  },

  // ── Mirror Import ──────────────────────────────────────────────────────────
  importMirrorCharacter() {
    const raw = prompt('Paste your Character Mirror JSON export here:');
    if (!raw) return;
    try {
      const char = JSON.parse(raw);
      const partyMember = {
        name: char.name || char.characterName || 'Unknown',
        class: char.class || char.characterClass || 'Adventurer',
        mirrorData: char
      };
      DM.state.party.push(partyMember);
      DM.state.mirrorCharacters.push(char);
      this.toast(`${partyMember.name} imported from Character Mirror ✦`);
      this.renderPartyList();
    } catch {
      this.toast('Invalid JSON — check your Character Mirror export format');
    }
  },

  renderPartyList() {
    const el = document.getElementById('party-list');
    if (!el) return;
    el.innerHTML = DM.state.party.length === 0
      ? '<span style="font-family:system-ui;font-size:12px;color:var(--text-muted);">No party members yet</span>'
      : DM.state.party.map((p, i) => `
        <span class="npc-chip" title="${p.mirrorData ? 'From Character Mirror' : 'Manual entry'}">
          <span class="npc-avatar" style="${p.mirrorData ? 'background:rgba(122,74,170,0.2);border-color:rgba(122,74,170,0.5);color:#aa74da;' : ''}">
            ${p.name.slice(0, 2).toUpperCase()}
          </span>
          ${p.name} · ${p.class}
        </span>`).join('');
  },

  // ── Session Badge ──────────────────────────────────────────────────────────
  updateSessionBadge() {
    const badge = document.getElementById('session-badge');
    if (badge) badge.textContent = `${DM.state.campaignName} · Session ${DM.state.session}`;
  },

  // ── Voice Toggle ──────────────────────────────────────────────────────────
  toggleVoice() {
    const btn = document.getElementById('voice-toggle');
    btn?.classList.toggle('active');
  },

  updateVoiceIndicator(state) {
    const dot = document.getElementById('voice-dot');
    if (!dot) return;
    dot.className = `voice-indicator ${state === 'speaking' ? 'elevenlabs' : state === 'browser' ? 'browser' : ''}`;
  },

  updateAmbientBtn(playing) {
    const btn = document.getElementById('ambient-btn');
    if (btn) btn.classList.toggle('active', playing);
  },

  // ── Rebuild All UI ─────────────────────────────────────────────────────────
  rebuildAll() {
    this.renderNPCChips();
    this.renderQuests();
    this.renderArtifacts();
    this.renderLog();
    this.renderNEDS();
    this.updateProgress();
    this.updateSessionBadge();
    this.renderPartyList();
  },

  // ── Toast Notification ─────────────────────────────────────────────────────
  toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      background:var(--surface-3); border:0.5px solid var(--border-strong);
      border-radius:20px; padding:8px 20px;
      font-family:system-ui,sans-serif; font-size:13px; color:var(--gold);
      z-index:9999; pointer-events:none; opacity:0;
      transition:opacity 0.2s;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 2500);
  }
};

// ── Keyboard Shortcuts ─────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.id === 'play-input') {
    e.preventDefault();
    UI.sendPlay();
  }
});
