# Prompt: Build a New Mastra Voice Agent

Use this prompt to add a complete, production-ready voice agent to this template.

---

## Inputs (fill these in before using the prompt)

```
AGENT_NAME:        <kebab-case name, e.g. "booking-assistant">
AGENT_ID:          <camelCase id used in API routes, e.g. "bookingAssistant">
PURPOSE:           <one sentence: what the agent does and what calls it>
TOOLS:             <list tools the agent needs, or "none" — describe inputs/outputs>
VOICE_STYLE:       <conversational tone: casual / professional / friendly-formal>
SPEAKER:           <Gemini voice: Puck / Charon / Kore / Fenrir / Aoede / Leda / Orus / Zephyr>
EVAL_CASES:        <describe 4-5 test cases: tool-call cases, no-tool cases, edge cases>
```

---

## Prompt

You are adding a new voice agent to the `template-mastra-voice` Mastra project. Follow every convention in `AGENTS.md` exactly.

**Agent to build**: `{AGENT_NAME}` (`{AGENT_ID}`)

**Purpose**: {PURPOSE}

**Tools needed**: {TOOLS}

**Voice style**: {VOICE_STYLE}

**Speaker voice**: {SPEAKER}

---

### Deliverables

Produce these files and changes in order:

1. **`src/mastra/tools/{AGENT_NAME}.ts`** (skip if tools are "none" or already exist)
   - Export each tool using `createTool` from `@mastra/core/tools`
   - Each tool has `id`, `description`, `inputSchema` (Zod), `outputSchema` (Zod), and `execute`
   - Tool descriptions must be written for an LLM to understand when to call them
   - No side effects in `execute` that can't be undone — voice agents can trigger tools by mishearing

2. **`src/mastra/scorers/{AGENT_NAME}.scorers.ts`**
   - Export `answerRelevancyScorer` using `createAnswerRelevancyScorer` from `@mastra/evals/scorers/prebuilt`
   - Use `model: 'openai/gpt-4o-mini'` for the scorer (scorer calls are skipped under AIMock — OpenAI is fine here)

3. **`src/mastra/scorers/datasets/{AGENT_NAME}.json`**
   - `agentId`: `{AGENT_ID}`
   - `thresholds`: `{ "answerRelevancy": 0.3 }` — voice responses are terse and often spell out numbers; 0.3 is correct, not 0.7
   - `cases`: minimum 5 — include both tool-call cases (`expectedTool: "toolName"`) and no-tool cases (`expectedTool: null`)
   - `expectedKeywords`: string array — case-insensitive substring checks on the response text

4. **`src/mastra/agents/{AGENT_NAME}.ts`**
   - Import `GeminiLiveVoice` from `@mastra/voice-google-gemini-live`
   - Import `patchGeminiLiveForAudio` from `../lib/gemini-live-patch` — REQUIRED
   - Construct the voice instance with an IIFE and call `patchGeminiLiveForAudio` immediately:
     ```typescript
     voice: (() => {
       const v = new GeminiLiveVoice({
         apiKey: env.GOOGLE_API_KEY,
         model: env.GEMINI_LIVE_MODEL as any,
         speaker: '{SPEAKER}' as any,
       });
       patchGeminiLiveForAudio(v);
       return v;
     })(),
     ```
   - `instructions` must:
     - Open with the agent's role in one sentence
     - Explicitly state: "Keep responses conversational and concise — these are spoken aloud."
     - For each tool: "When asked about X, ALWAYS call toolName. Don't guess."
     - Explicitly state: "Avoid lists, bullet points, or anything that would sound awkward when spoken."
   - `model`: `'anthropic/claude-haiku-4-5'` (text mode routing; voice mode uses the Live model from env — Anthropic is required here for AIMock eval compatibility: Mastra's `google/` routing hardcodes the base URL, and Mastra's `openai/` routing uses the Responses API which AIMock cannot match fixtures against)
   - `scorers`:
     ```typescript
     scorers: {
       answerRelevancy: {
         scorer: answerRelevancyScorer,
         // Disable under AIMock — scorer uses openai/gpt-4o-mini via Responses API, no fixture.
         sampling: { type: 'ratio', rate: env.USE_AIMOCK ? 0 : 1 },
       },
     }
     ```
   - Include a JSDoc block: what it does, who calls it, env vars required

5. **`src/mastra/index.ts`** — register the new agent:
   ```typescript
   import { {camelCase}Agent } from './agents/{AGENT_NAME}';
   // add to mastra({ agents: { ..., {AGENT_ID}: {camelCase}Agent } })
   ```

---

### Constraints

- Never read `process.env` directly — use `env` from `../../lib/env`
- Never remove `patchGeminiLiveForAudio()` — it fixes three known library bugs; without it the session disconnects immediately
- Never use markdown, bullet points, numbered lists, or headers in `instructions` — they are spoken aloud
- Never set `answerRelevancy` threshold above 0.4 for voice agents — brief spoken responses, spelled-out numbers, and farewell cases all score near 0.0
- Use `env.GEMINI_LIVE_MODEL as any` and `env.GEMINI_LIVE_SPEAKER as any` — the library types are behind the runtime values
- Scorer imports: `createAnswerRelevancyScorer` comes from `@mastra/evals/scorers/prebuilt`
- Use relative imports only — no path aliases

---

### Implementation Order

1. Write tools file (if needed) → `npm run typecheck`
2. Write scorers file → `npm run typecheck`
3. Write dataset JSON
4. Write agent file → `npm run typecheck`
5. Register in `index.ts` → `npm run typecheck`
6. `npm run dev` → verify agent appears in Studio
7. Send one text message in Studio to confirm tools are called correctly
8. `npm run eval` using the new dataset → confirm all cases pass and exit 0
9. `npm run voice:cli` — manual spot check (mic + speakers required; document result in PROGRESS.md)

---

### Eval Cases Guidance

```
{EVAL_CASES}
```

Include at least:
- One case per tool that asserts `expectedTool: "toolName"` is called
- One casual conversational case with `expectedTool: null`
- One farewell/goodbye case with `expectedTool: null` and `expectedKeywords: ["bye"]` (or similar)
- One edge case where the user's phrasing is indirect but the tool should still be called

The eval runs in text mode — no mic required. `expectedTool: null` cases assert that NO tool was called (the agent responded conversationally without invoking anything).
