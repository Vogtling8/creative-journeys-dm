// dm-engine.js — Creative Journeys AI Dungeon Master Core Engine
// Storytelling framework: Hero's Journey + Challenge format baked into DM prompts

const DM = {

  // ── State ──────────────────────────────────────────────────────────────────
  state: {
    campaignId: null,
    campaignName: 'Untitled Campaign',
    tone: 'blend',
    flavor: 'high-fantasy',
    length: 'medium',
    party: [],
    limits: '',
    session: 1,
    totalSessions: 8,
    npcs: [
      { name: 'Elara Voss', role: 'Innkeeper', disposition: 'warm', secret: 'hiding a fugitive' },
      { name: 'Commander Drest', role: 'City Guard Captain', disposition: 'stern', secret: 'on the villain\'s payroll' },
      { name: 'The Whispering Merchant', role: 'Information Broker', disposition: 'mysterious', secret: 'an immortal in disguise' }
    ],
    quests: [],
    artifacts: [],
    log: [],
    history: [],
    rollHistory: [],
    mirrorCharacters: [],
    neds: { mind: 70, body: 65, spirit: 80, social: 75, creative: 85, purpose: 90, environment: 60, finance: 55 },
    voice: { engine: 'browser', speaking: false, npcVoices: {} },
    audio: { ambient: null, ambientPlaying: false, volume: 0.25 },
    saved: false
  },

  // ── Tone System Prompts (Mercer + Brennan research) ────────────────────────
  tones: {
    mercer: `You are a Dungeon Master in the style of Matt Mercer. Your hallmarks:
- Deep, layered worldbuilding where every location has history and every faction has motivation
- Distinct, fully realized NPC voices — each character has a cadence, vocabulary, and physical presence
- Dramatic weight: you pause before consequences land, you let silence do work
- Emotional investment: you remember what players care about and use it
- Signature phrases: "And how do you do that?", "As you reach out your hand...", "Roll for it."
- You never rush. You let players live inside the moment before moving forward.
- NPCs are not obstacles — they are people who want things and fear things.
- Apply the Hero's Journey: establish the character in the problem first, let them fail, then earn the win.`,

    brennan: `You are a Dungeon Master in the style of Brennan Lee Mulligan. Your hallmarks:
- Electric, momentum-driven narration — you build pressure fast and release it in unexpected ways
- Comedy that emerges from logic and commitment, never from breaking the fiction
- Devastating narrative twists that feel inevitable in retrospect
- Deep love for player chaos: you say yes to everything and make it more complicated
- You think about your NPCs as deeply as any method actor — they have full inner lives
- "YES AND" is your law. Players surprise you? Good. BUILD on it.
- Cliffhangers that make people actually gasp
- The Challenge storytelling format: clear stakes, real rules, real complications, explosive resolution`,

    blend: `You are a Dungeon Master who channels both Matt Mercer and Brennan Lee Mulligan at their best:
- Mercer's depth: every NPC has a true voice, every location has lived-in history
- Brennan's momentum: scenes have electric energy, twists feel earned not arbitrary
- Emotional gravitas balanced with sharp wit and perfect comedic timing
- You honor player agency completely while building toward narrative inevitability
- When players do something unexpected, you do what Brennan would: say yes, escalate, and make it matter
- When the scene calls for silence and weight, you do what Mercer would: slow down and let it breathe
- Apply Hero's Journey structure: open in the problem, make the struggle real, earn every victory`,

    dark: `You are a Dungeon Master running a morally serious, consequences-driven campaign:
- Every action has weight. Victories cost something. Defeats leave marks.
- NPCs are fully human — flawed, self-interested, sometimes redeemable, sometimes not
- Horror lives in implication, not description. The worst things happen just off-screen.
- Mercer's NPC depth, but with shadows: everyone has something to hide
- Apply Mentor Story + Hero's Journey: the party inherits a broken world and has to choose what to build
- Never let the darkness become nihilistic — there must always be something worth fighting for`
  },

  // ── System Prompt Builder ──────────────────────────────────────────────────
  buildSystem(context = '') {
    const s = this.state;
    const toneText = this.tones[s.tone] || this.tones.blend;
    const partyText = s.party.length
      ? `The party consists of: ${s.party.map(p => `${p.name} (${p.class})`).join(', ')}.`
      : 'The party has not yet been fully established.';
    const limitsText = s.limits ? `Content limits at this table: ${s.limits}. Respect these absolutely.` : '';
    const historyText = s.history.length > 0
      ? `Recent story context:\n${s.history.slice(-6).join('\n')}`
      : 'This is the opening of the campaign.';
    const npcList = s.npcs.map(n => `${n.name} (${n.role}): disposition=${n.disposition}, secret="${n.secret}"`).join('\n');
    const sessionMap = { oneshot: 1, short: 4, medium: 8, epic: 20 };

    return `${toneText}

CAMPAIGN: "${s.campaignName}"
SETTING: ${s.flavor}
SESSION: ${s.session} of ${s.totalSessions}
${partyText}
${limitsText}

ACTIVE NPCs:
${npcList}

ACTIVE QUESTS: ${s.quests.map(q => q.title).join(', ') || 'None yet established'}

${historyText}

${context}

STORYTELLING STRUCTURE RULES:
- Session openings use the Goal/Dream Journey format: establish the world's dream, show its disruption, invite the party into action
- Encounters use the Challenge format: clear stakes → real complications → earned resolution or cliffhanger
- NPC introductions use the Origin Story format: who they were, what changed, what they want now
- Revelations use the Epiphany format: show the result first, then reveal how we got here
- Every response ends with a question or choice that demands player action
- Keep responses 3-6 sentences for actions; expand to 8-12 for scene openings or major reveals
- Maintain immersion absolutely — speak as the narrator/world, not as a tool`;
  },

  // ── API Call ───────────────────────────────────────────────────────────────
  async call(userMsg, systemOverride = null, maxTokens = 1000) {
    const messages = [{ role: 'user', content: userMsg }];

    // Build conversation context (last 6 exchanges)
    if (this.state.history.length > 1) {
      const h = this.state.history.slice(-8);
      const ctx = [];
      for (const entry of h) {
        if (entry.startsWith('PLAYER:')) ctx.push({ role: 'user', content: entry.replace('PLAYER: ', '') });
        else if (entry.startsWith('DM:')) ctx.push({ role: 'assistant', content: entry.replace('DM: ', '') });
      }
      if (ctx.length > 0) messages.unshift(...ctx.slice(-6));
    }

    const response = await fetch('/api/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemOverride || this.buildSystem(),
        messages,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text || 'The DM pauses, lost in thought...';
  },

  // ── Typewriter Output ──────────────────────────────────────────────────────
  async typeOut(text, targetEl, speed = 14) {
    targetEl.textContent = '';
    return new Promise(resolve => {
      let i = 0;
      const tick = () => {
        if (i < text.length) {
          targetEl.textContent += text[i++];
          const parent = targetEl.closest('.dm-output');
          if (parent) parent.scrollTop = parent.scrollHeight;
          setTimeout(tick, speed);
        } else { resolve(); }
      };
      tick();
    });
  },

  // ── TTS ─────────────────────────────────────────────────────────────────────
  async speak(text, voiceHint = 'narrator') {
    if (!text || this.state.voice.speaking) return;
    this.state.voice.speaking = true;
    UI.updateVoiceIndicator('speaking');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), voice: voiceHint })
      });
      const data = await res.json();

      if (data.useBrowserTTS || data.error) {
        this.browserSpeak(text);
      } else if (data.audio) {
        const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`);
        audio.volume = 0.85;
        audio.onended = () => { this.state.voice.speaking = false; UI.updateVoiceIndicator('idle'); };
        audio.onerror = () => { this.state.voice.speaking = false; UI.updateVoiceIndicator('idle'); };
        await audio.play().catch(() => this.browserSpeak(text));
      }
    } catch {
      this.browserSpeak(text);
    }
  },

  browserSpeak(text) {
    if (!window.speechSynthesis) { this.state.voice.speaking = false; return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 300));
    utter.rate = 0.88; utter.pitch = 0.95; utter.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const pref = voices.find(v => v.lang === 'en-GB' || v.name.includes('Daniel') || v.name.includes('Google UK'));
    if (pref) utter.voice = pref;
    utter.onend = () => { this.state.voice.speaking = false; UI.updateVoiceIndicator('idle'); };
    window.speechSynthesis.speak(utter);
  },

  // ── Ambient Audio ──────────────────────────────────────────────────────────
  ambientPresets: {
    tavern: { freq: 200, noiseType: 'brown', description: 'Warm tavern murmur' },
    dungeon: { freq: 80, noiseType: 'white', description: 'Dungeon drip echo' },
    forest: { freq: 350, noiseType: 'pink', description: 'Forest wind rustle' },
    combat: { freq: 120, noiseType: 'white', description: 'Battle tension' },
    mystery: { freq: 60, noiseType: 'brown', description: 'Eerie silence' }
  },

  startAmbient(preset = 'tavern') {
    this.stopAmbient();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;

      const source = ctx.createBufferSource();
      source.buffer = buffer; source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.ambientPresets[preset]?.freq || 200;

      const gain = ctx.createGain();
      gain.gain.value = this.state.audio.volume;

      source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      source.start();

      this.state.audio.ambient = { ctx, source, gain };
      this.state.audio.ambientPlaying = true;
      UI.updateAmbientBtn(true);
    } catch (e) { console.warn('Web Audio not available:', e); }
  },

  stopAmbient() {
    if (this.state.audio.ambient) {
      try {
        this.state.audio.ambient.source.stop();
        this.state.audio.ambient.ctx.close();
      } catch {}
      this.state.audio.ambient = null;
    }
    this.state.audio.ambientPlaying = false;
    UI.updateAmbientBtn(false);
  },

  toggleAmbient(preset) {
    if (this.state.audio.ambientPlaying) this.stopAmbient();
    else this.startAmbient(preset || 'tavern');
  },

  // ── Campaign Persistence ───────────────────────────────────────────────────
  async saveCampaign() {
    const payload = {
      id: this.state.campaignId,
      ...this.state,
      audio: null, // don't serialize audio context
    };
    try {
      const res = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) { this.state.campaignId = data.id; this.state.saved = true; }
      UI.toast('Campaign saved ✦');
    } catch { UI.toast('Save failed — check connection'); }
  },

  async loadCampaign(id) {
    try {
      const res = await fetch(`/api/campaign?id=${id}`);
      const data = await res.json();
      if (data.error) { UI.toast('Campaign not found'); return; }
      Object.assign(this.state, data);
      UI.rebuildAll();
      UI.toast(`"${this.state.campaignName}" loaded ✦`);
    } catch { UI.toast('Load failed'); }
  },

  async listCampaigns() {
    try {
      const res = await fetch('/api/campaign');
      return await res.json();
    } catch { return []; }
  },

  // ── NPC Generator ─────────────────────────────────────────────────────────
  async generateNPC(type = 'original') {
    const typeDesc = {
      villain: 'a compelling villain with genuinely understandable motivations — they believe they are right',
      ally: 'a quirky, lovable ally who will become deeply important to the party',
      mysterious: 'a deeply ambiguous figure whose true allegiance and nature are unclear even to themselves',
      shopkeeper: 'a memorable shopkeeper or service NPC with strong opinions and unexpected depth',
      original: 'a vivid, fully realized NPC who feels like they existed before the party arrived'
    };

    const system = this.buildSystem(`Generate an NPC. Respond in this exact format:
NAME: [full name and title]
ROLE: [their function in the world]
VOICE: [2-3 words describing their speech pattern — e.g., "clipped, formal, dry wit"]
SECRET: [one thing they are hiding]
WANT: [what they actively desire right now]
FEAR: [what they dread above all]
FIRST LINE: [their opening line of dialogue when they meet the party — in character, in quotes]`);

    const text = await this.call(`Generate ${typeDesc[type] || typeDesc.original} for our ${this.state.flavor} campaign "${this.state.campaignName}".`, system, 600);
    const npc = this.parseNPC(text);
    if (npc) {
      this.state.npcs.push(npc);
      this.addLog('npc', `New ${type} NPC introduced: ${npc.name}`);
    }
    return { npc, raw: text };
  },

  parseNPC(text) {
    const get = (key) => {
      const match = text.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
      return match ? match[1].trim() : '';
    };
    const name = get('NAME');
    if (!name) return null;
    return {
      name, role: get('ROLE'), voice: get('VOICE'),
      secret: get('SECRET'), want: get('WANT'), fear: get('FEAR'),
      firstLine: get('FIRST LINE').replace(/^["']|["']$/g, ''),
      disposition: 'unknown'
    };
  },

  // ── Quest Generator ────────────────────────────────────────────────────────
  async generateQuest(type = 'side') {
    const typeMap = {
      side: 'a compelling side quest that illuminates the campaign\'s themes',
      main: 'a main story arc quest beat that raises the stakes significantly',
      personal: 'a personal quest tied directly to one party member\'s backstory',
      mystery: 'a mystery quest where the true nature of the problem is hidden until the end'
    };

    const text = await this.call(
      `Generate ${typeMap[type]} for our ${this.state.flavor} campaign. Use the Challenge storytelling format: clear stakes, real constraints, genuine complications, and a resolution or cliffhanger. Include: TITLE, HOOK (how party discovers it), COMPLICATION (the twist), RESOLUTION (possible outcomes), REWARD.`,
      this.buildSystem(),
      700
    );

    const titleMatch = text.match(/TITLE:\s*(.+)/i);
    const quest = {
      id: Date.now(),
      title: titleMatch ? titleMatch[1].trim() : 'Unknown Quest',
      type,
      text,
      status: 'active',
      createdSession: this.state.session
    };
    this.state.quests.push(quest);
    this.addLog('quest', `Quest discovered: ${quest.title}`);
    return quest;
  },

  // ── Artifact Generator ─────────────────────────────────────────────────────
  async generateArtifact() {
    const text = await this.call(
      `Create a unique D&D 5e magic artifact for session ${this.state.session} of our ${this.state.flavor} campaign. Respond with: NAME, APPEARANCE (2 sentences), LORE (the history, 2-3 sentences using Epiphany format — reveal what it does first, then explain why), PROPERTY (D&D 5e mechanical effect, specific), HIDDEN POWER (revealed only under special conditions), SECRET (a dark truth or curse).`,
      this.buildSystem(),
      700
    );

    const nameMatch = text.match(/NAME:\s*(.+)/i);
    const artifact = {
      id: Date.now(),
      name: nameMatch ? nameMatch[1].trim() : 'Mysterious Artifact',
      text,
      session: this.state.session,
      discovered: true
    };
    this.state.artifacts.push(artifact);
    this.addLog('loot', `Artifact discovered: ${artifact.name}`);
    return artifact;
  },

  // ── Log Entry ──────────────────────────────────────────────────────────────
  addLog(type, text) {
    this.state.log.unshift({ type, text, session: this.state.session, timestamp: new Date().toISOString() });
  },

  // ── NEDS ───────────────────────────────────────────────────────────────────
  updateNEDS(domain, value) {
    this.state.neds[domain] = Math.max(0, Math.min(100, value));
    UI.renderNEDS();
  },

  nedsTotal() {
    const vals = Object.values(this.state.neds);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
};

// ── Roll Engine ────────────────────────────────────────────────────────────────
const Dice = {
  roll(sides, count = 1, mod = 0) {
    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    return { total, rolls, sides, count, mod };
  },
  advantage() {
    const [r1, r2] = [Math.ceil(Math.random() * 20), Math.ceil(Math.random() * 20)];
    return { total: Math.max(r1, r2), rolls: [r1, r2], type: 'advantage' };
  },
  disadvantage() {
    const [r1, r2] = [Math.ceil(Math.random() * 20), Math.ceil(Math.random() * 20)];
    return { total: Math.min(r1, r2), rolls: [r1, r2], type: 'disadvantage' };
  }
};
