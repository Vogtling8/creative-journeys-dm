# Creative Journeys — AI Dungeon Master
### Built on Matt Mercer + Brennan Lee Mulligan storytelling principles · D&D 5e · Netlify

---

## What This Is

A full AI-powered Dungeon Master web app deployable to Netlify. It runs campaigns from Session Zero through the finale, with NPC voice generation, ambient audio, dice rolling, quest/artifact creation, campaign persistence, Character Mirror integration, and a NEDS wellness HUD.

---

## Quick Deploy (5 minutes)

### Step 1 — Get the code on GitHub
1. Create a new GitHub repo (e.g. `creative-journeys-dm`)
2. Upload all files from this folder maintaining the structure:
   ```
   netlify.toml
   package.json
   public/
     index.html
     css/dm.css
     js/dm-engine.js
     js/dm-ui.js
   netlify/
     functions/
       dm.js
       campaign.js
       tts.js
   ```

### Step 2 — Deploy to Netlify
1. Go to [netlify.com](https://netlify.com) → New site → Import from GitHub
2. Select your repo
3. Build settings are auto-detected from `netlify.toml`
4. Click **Deploy**

### Step 3 — Set Environment Variables
In Netlify Dashboard → Site Settings → Environment Variables, add:

| Variable | Required | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | **YES** | Your key from console.anthropic.com |
| `ELEVENLABS_API_KEY` | Optional | For premium NPC voices — leave blank for browser TTS |

### Step 4 — Custom Domain (optional)
In Netlify → Domain Management → Add custom domain
Example: `dm.creativejourneys.com`

---

## Features

### Play Panel
- Full AI DM powered by Claude Sonnet 4.6
- Typewriter output effect with live streaming
- Quick action buttons (look around, options, talk, rest, recap, twist)
- Ambient audio presets (tavern, dungeon, forest, combat, mystery)
- Voice narration (browser TTS free / ElevenLabs premium)

### Session Zero
- Campaign name, tone, world flavor, length, party setup
- 4 DM tones: Mercer / Brennan / Blend / Dark
- Character Mirror import (paste JSON export from Mirror app)
- Content limit settings for table safety

### NPC Panel
- 3 starter NPCs with secrets, wants, fears
- Click any NPC to hear them speak in character
- Generate villain / ally / mystery / shopkeeper NPCs
- Full stat block view (voice, secret, want, fear)
- Direct NPC conversation input

### Dice
- d4, d6, d8, d10, d12, d20, d100
- Multi-dice + modifier support
- Advantage / Disadvantage
- Critical hit / fail visual feedback
- Full roll history

### Quests & Artifacts
- Generate main quests, side quests, personal quests, mystery quests
- Generate magic artifacts with lore, properties, hidden powers, curses
- All items tracked with session stamp

### Tracker
- Session counter + progress bar
- AI-generated session log entries (story / loot / quest)
- Manual log entries
- Campaign save/load via Netlify Blobs
- Advance session button (triggers new session opening scene)

### NEDS HUD
- Fixed upper-right corner
- 8 wellness domains: Mind, Body, Spirit, Social, Creative, Purpose, Environment, Finance
- Color-coded bars + overall baseline percentage
- Click any domain chip to update the value
- Collapsible with one click

---

## Voice Options

### Free (Browser TTS — always works)
No setup. Automatically uses your device's text-to-speech. Sounds robotic but functional.

### Premium (ElevenLabs)
1. Create account at [elevenlabs.io](https://elevenlabs.io)
2. Get your API key
3. Add `ELEVENLABS_API_KEY` to Netlify env vars
4. Different NPCs can have different voice IDs (see `netlify/functions/tts.js` to customize)

---

## Character Mirror Integration

When players have used the Character Mirror app:
1. They export their character as JSON from the Mirror app
2. In Session Zero → click **Import character**
3. Paste the JSON
4. Their psychological profile, character class, and backstory inform DM responses automatically

---

## Cost Estimate

| Usage | Monthly Cost |
|---|---|
| 1 campaign (8 sessions, 30 exchanges each) | ~$1.00–3.00 |
| 5 simultaneous Creative Journeys groups | ~$8.00–15.00 |
| ElevenLabs voice (optional) | ~$0.50–2.00/session |
| Netlify hosting | Free (Starter tier) |

---

## File Structure

```
dm-app/
├── netlify.toml              # Netlify config + redirects
├── package.json              # Dependencies
├── netlify/
│   └── functions/
│       ├── dm.js             # Anthropic API secure proxy
│       ├── campaign.js       # Campaign save/load (Netlify Blobs)
│       └── tts.js            # TTS proxy (ElevenLabs or browser fallback)
└── public/
    ├── index.html            # Full app HTML
    ├── css/
    │   └── dm.css            # Dark parchment aesthetic stylesheet
    └── js/
        ├── dm-engine.js      # DM AI engine, state, storytelling system
        └── dm-ui.js          # UI controller, all interaction logic
```

---

## Customization

### Change the DM tone prompts
Edit the `DM.tones` object in `public/js/dm-engine.js`

### Add more NPC types
Add entries to the `typeDesc` object in `DM.generateNPC()`

### Add more ambient presets
Add entries to `DM.ambientPresets` and buttons in `index.html`

### Connect to your own NEDS app
If you have a NEDS dashboard with an API, replace the `DM.state.neds` fetch in `dm-engine.js`

---

## Built For

**Creative Journeys** — Michael Vogt's roleplay, crafting, and executive function coaching program in Tyler, Texas.

Storytelling framework: Hero's Journey · Challenge · Origin Story · Epiphany formats baked into every DM system prompt.

DM style research: Matt Mercer (Critical Role C1–C3) + Brennan Lee Mulligan (Dimension 20).
