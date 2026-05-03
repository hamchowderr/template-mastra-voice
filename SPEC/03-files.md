# 03 — File Specifications

Each section specifies one file. Implement in the order given by `04-build-order.md`. Base template's specs apply where this file says "inherited."

---

## `src/lib/env.ts` (extended from base)

**Purpose**: Same as base, with new voice-related vars added.

**What to add to the existing schema**:

```typescript
// In the .object({...}) block, add these fields:
GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY required for voice integration'),
GEMINI_LIVE_MODEL: z.string().min(1).default('gemini-2.0-flash-exp'),
GEMINI_LIVE_SPEAKER: z
  .enum(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'])
  .default('Puck'),
```

`GOOGLE_API_KEY` is required (no `.optional()`). The voice template doesn't function without it.

**Important**: do NOT remove or modify `GOOGLE_GENERATIVE_AI_API_KEY` from the base schema. They're separate variables for separate SDKs. Update the `.refine()` for at-least-one-LLM-key if needed — `GOOGLE_API_KEY` does NOT count toward that check because it's for voice, not text.

**Acceptance criteria**:
- `npm run typecheck` passes
- Booting without `GOOGLE_API_KEY` fails with a clear Zod error
- Invalid speaker name produces a clear error

---

## `.env.example` (extended from base)

**What to add**:

```bash
# ──────────────────────────────────────────────
# Voice (Gemini Live)
# ──────────────────────────────────────────────
# NOTE: This is a SEPARATE variable from GOOGLE_GENERATIVE_AI_API_KEY (above).
# @mastra/voice-google-gemini-live reads GOOGLE_API_KEY by convention; the AI SDK
# reads GOOGLE_GENERATIVE_AI_API_KEY. You can set both to the same value.
# Get a key from https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=

# Voice model. Default works for most use cases.
GEMINI_LIVE_MODEL=gemini-2.0-flash-exp

# Speaker voice. Options: Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr
GEMINI_LIVE_SPEAKER=Puck
```

---

## `src/mastra/tools/time-and-math.ts`

**Purpose**: Example tool the voice agent can call. Demonstrates that tool calling works in voice mode.

**Implementation**:

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const getCurrentTime = createTool({
  id: 'getCurrentTime',
  description: 'Get the current date and time in the user\'s local timezone',
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe('IANA timezone (e.g. "America/Los_Angeles"). Optional; defaults to system timezone.'),
  }),
  outputSchema: z.object({
    iso: z.string(),
    formatted: z.string(),
    timezone: z.string(),
  }),
  execute: async ({ timezone }) => {
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    return {
      iso: now.toISOString(),
      formatted: now.toLocaleString('en-US', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'long',
      }),
      timezone: tz,
    };
  },
});

export const evaluateMath = createTool({
  id: 'evaluateMath',
  description: 'Safely evaluate a simple math expression. Supports +, -, *, /, parentheses.',
  inputSchema: z.object({
    expression: z.string().describe('Math expression to evaluate (e.g. "2 + 2 * 5")'),
  }),
  outputSchema: z.object({
    expression: z.string(),
    result: z.number(),
  }),
  execute: async ({ expression }) => {
    const safe = /^[0-9+\-*/().\s]+$/.test(expression);
    if (!safe) {
      throw new Error(`Unsafe math expression: ${expression}`);
    }
    const result = new Function(`return (${expression})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error(`Expression did not evaluate to a finite number: ${expression}`);
    }
    return { expression, result };
  },
});
```

**Acceptance criteria**:
- Typecheck passes
- Both tools exportable
- Manual test in Studio confirms each tool can be called

---

## `src/mastra/agents/_example.ts`

**Purpose**: Production voice assistant agent. Replaces base's lead-intake. Demonstrates voice setup, tool calling in voice mode, and the inherited memory pattern.

**Implementation**:

```typescript
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { GeminiLiveVoice } from '@mastra/voice-google-gemini-live';

import { env } from '../../lib/env';
import { getCurrentTime, evaluateMath } from '../tools/time-and-math';
import {
  toolCallAccuracyScorer,
  answerRelevancyScorer,
} from '../scorers/_example.scorers';

/**
 * # Voice Assistant (canonical example for the voice template)
 *
 * What it does:
 *   Real-time voice conversation via Gemini Live STS. Can tell time and do math.
 *   Tools attached to this agent automatically flow to the voice instance.
 *
 * Who calls it:
 *   - Local CLI: `npm run voice:cli` (uses mic + speakers)
 *   - REST endpoint (text mode): POST /api/agents/voiceAssistant/generate
 *
 * Env vars required:
 *   - GOOGLE_API_KEY (Gemini Live)
 *
 * How to test:
 *   Local voice: npm run voice:cli
 *   Text mode:
 *     curl -X POST http://localhost:4111/api/agents/voiceAssistant/generate \
 *       -H "Content-Type: application/json" \
 *       -d '{"messages":[{"role":"user","content":"What time is it?"}]}'
 *
 * Copy this file, swap tools, adjust instructions for new voice agents.
 */

export const voiceAssistantAgent = new Agent({
  id: 'voiceAssistant',
  name: 'Voice Assistant',
  instructions: `You are a friendly real-time voice assistant.

Rules:
- Keep responses conversational and concise — these are spoken aloud.
- When asked about time, ALWAYS call getCurrentTime. Don't guess.
- When asked to do math, ALWAYS call evaluateMath. Don't compute in your head.
- Acknowledge the user briefly before calling tools (e.g. "Sure, let me check.")
- If the user says "goodbye" or similar, say a brief farewell and stop.
- Avoid lists, bullet points, or anything that would sound awkward when spoken.`,
  model: env.GEMINI_LIVE_MODEL,
  tools: { getCurrentTime, evaluateMath },
  memory: new Memory(),
  voice: new GeminiLiveVoice({
    apiKey: env.GOOGLE_API_KEY,
    model: env.GEMINI_LIVE_MODEL,
    speaker: env.GEMINI_LIVE_SPEAKER,
  }),
  scorers: {
    toolCallAccuracy: {
      scorer: toolCallAccuracyScorer,
      sampling: { type: 'ratio', rate: 1 },
    },
    answerRelevancy: {
      scorer: answerRelevancyScorer,
      sampling: { type: 'ratio', rate: 1 },
    },
  },
});
```

**Note on the model field**: `model: env.GEMINI_LIVE_MODEL` is a string and Mastra's model router resolves it. For Gemini Live models, this should be in the form the router understands. If the router doesn't resolve `gemini-2.0-flash-exp` directly, you may need to prefix with `google/` or use the AI SDK's google provider. Verify by reading `node_modules/@mastra/core/dist/...` model router types before finalizing.

**Acceptance criteria**:
- Agent registers without errors
- Studio shows the agent
- Text-mode invocation works (cURL test)
- Voice CLI script can connect, capture mic, play response
- Tools invoked correctly in both modes (verify in trace)

---

## `src/mastra/scorers/_example.scorers.ts`

**Purpose**: Two scorers for the voice agent. Both prebuilt.

**Implementation guidance**:
- `createToolCallAccuracyScorerCode` from `@mastra/evals/scorers/prebuilt` — code-based, fast, no LLM cost
- `createAnswerRelevancyScorerLLM` (or whatever the exact prebuilt name is) — LLM-judged. Use OpenAI for AIMock compatibility.
- Verify the exact export names by reading `node_modules/@mastra/evals/dist/scorers/prebuilt/index.d.ts`

**Sketch** (verify exact API before finalizing):

```typescript
import {
  createToolCallAccuracyScorerCode,
  createAnswerRelevancyScorerLLM,
} from '@mastra/evals/scorers/prebuilt';

// Asserts the agent calls a specific tool when it should.
// We pass `expectedTool` per case via the dataset rather than hardcoding.
export const toolCallAccuracyScorer = createToolCallAccuracyScorerCode({
  // strictMode false: also accept cases where the agent calls the tool when not strictly expected
  strictMode: false,
});

// Standard answer relevancy LLM judge.
// Use OpenAI for AIMock compatibility.
export const answerRelevancyScorer = createAnswerRelevancyScorerLLM({
  model: 'openai/gpt-5-mini',
});
```

**Acceptance criteria**:
- Typecheck passes
- Both scorers exportable
- Scorer threshold tuning happens during eval gate phase

---

## `src/mastra/scorers/datasets/_example.json`

**Purpose**: Text-mode eval cases for the voice agent. The voice agent IS callable as a regular text agent via the REST endpoint, so we eval it that way for offline CI.

**Schema**:

```json
{
  "agentId": "voiceAssistant",
  "thresholds": {
    "toolCallAccuracy": 0.8,
    "answerRelevancy": 0.7
  },
  "cases": [
    {
      "name": "calls getCurrentTime when asked about time",
      "input": "What time is it right now?",
      "expectedTool": "getCurrentTime",
      "expectedKeywords": []
    },
    {
      "name": "calls evaluateMath when asked to compute",
      "input": "What is 47 times 23?",
      "expectedTool": "evaluateMath",
      "expectedKeywords": ["1081"]
    },
    {
      "name": "calls evaluateMath for word-form math",
      "input": "Add fifteen and twenty-seven for me.",
      "expectedTool": "evaluateMath",
      "expectedKeywords": ["42"]
    },
    {
      "name": "no tool needed for casual hello",
      "input": "Hi, how are you?",
      "expectedTool": null,
      "expectedKeywords": []
    },
    {
      "name": "graceful exit on goodbye",
      "input": "Thanks, that's all I needed. Goodbye!",
      "expectedTool": null,
      "expectedKeywords": ["bye"]
    }
  ]
}
```

The schema differs slightly from base/RAG. Fields:
- `expectedTool`: name of the tool that should be called, or `null` for cases where no tool should be called
- `expectedKeywords`: substring matches in the response (case-insensitive)

The eval runner enforces these.

**Acceptance criteria**:
- Valid JSON, lints clean
- 5 cases including positive tool-call cases AND negative (no-tool-needed) cases
- Eval runner consumes without schema errors

---

## `scripts/voice-cli.ts`

**Purpose**: Local-only CLI script that opens a real voice conversation with the agent. Uses mic input and speaker output via `@mastra/node-audio`. The owner runs this on their own machine to verify voice works end-to-end.

**Behavior**:
- Imports `mastra` from `src/mastra/index.ts`
- Gets the voice assistant agent
- Calls `agent.voice.connect()` to open the WebSocket session
- Captures mic via `getMicrophoneStream()` and pipes to `agent.voice.send(stream)`
- Listens for `speaker` events and plays audio via `playAudio()`
- Listens for `writing` events and prints transcript to console
- Handles graceful shutdown on Ctrl+C (calls `agent.voice.disconnect()`)
- Prints "Listening..." when ready

**Implementation**:

```typescript
import { mastra } from '../src/mastra';
import { getMicrophoneStream, playAudio } from '@mastra/node-audio';

async function main() {
  console.log('Connecting to voice agent...');

  const agent = mastra.getAgent('voiceAssistant');
  if (!agent.voice) {
    throw new Error('Agent does not have a voice instance attached');
  }

  // Lifecycle and event hooks
  agent.voice.on('session', (data: any) => {
    console.log(`[session] ${data.state}`);
  });

  agent.voice.on('writing', (data: any) => {
    const role = data.role ?? '?';
    const text = data.text ?? '';
    console.log(`[${role}] ${text}`);
  });

  agent.voice.on('speaker', (audioStream: NodeJS.ReadableStream) => {
    playAudio(audioStream);
  });

  agent.voice.on('toolCall', (data: any) => {
    console.log(`[tool] ${data.name}(${JSON.stringify(data.args)})`);
  });

  // Graceful shutdown
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nDisconnecting...');
    try {
      await agent.voice!.disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Connect and start streaming mic
  await agent.voice.connect();
  console.log('Connected. Speak now. Ctrl+C to quit.');

  const micStream = getMicrophoneStream();
  await agent.voice.send(micStream);

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Voice CLI error:', err);
  process.exit(1);
});
```

**Caveats**:
- The exact event names and signatures (`session`, `writing`, `speaker`, `toolCall`) come from Mastra's docs. Verify against `node_modules/@mastra/voice-google-gemini-live/dist/...` types before running.
- `getMicrophoneStream()` may take options. Default behavior works for most setups; if mic isn't picked up, check sample rate / channel options.
- `playAudio()` accepts either an `Int16Array` or a stream. Using stream form here for continuous playback.

**Acceptance criteria**:
- File at `scripts/voice-cli.ts`
- Added to `package.json` as `"voice:cli": "tsx scripts/voice-cli.ts"`
- Can be run by the owner with mic + speakers attached and produces a working conversation
- Ctrl+C exits cleanly without leaving zombie connections
- This script is NOT verified in CI (manual checkpoint only)

---

## `scripts/eval.ts` (extended from base)

**Purpose**: Same as base. Schema differs slightly because voice template uses `expectedTool` and `expectedKeywords` (no structured output, no source citation).

**Implementation guidance**:
- Start from base's `scripts/eval.ts`
- For `expectedTool`: inspect the agent's run output for tool calls; assert the named tool was invoked (or that NO tools were invoked when `expectedTool: null`)
- For `expectedKeywords`: case-insensitive substring check on the response text
- Same AIMock pattern: when `USE_AIMOCK=true`, skip scorer assertions, only check tool/keyword assertions

**Acceptance criteria**:
- `npm run eval` exits 0 with real env values + tool-call-able agent
- Each case prints case name, scorer scores, pass/fail
- Exit 1 with clear reasons on failure
- Works under AIMock with assertion-only mode

---

## `src/mastra/index.ts`

**Purpose**: Same as base; just register the voice agent and the new scorers.

The Mastra entry doesn't need voice-specific config at the top level — voice is attached to the agent. So this file is essentially identical to base except for the agent + scorer imports.

**Acceptance criteria**:
- `npm run dev` boots Studio without errors
- `voiceAssistant` agent appears in Studio's agent list

---

## `package.json` updates

Scripts to add/modify:

```json
{
  "scripts": {
    "dev": "mastra dev",
    "build": "mastra build",
    "start": "mastra start",
    "typecheck": "tsc --noEmit",
    "voice:cli": "tsx scripts/voice-cli.ts",
    "eval": "tsx scripts/eval.ts",
    "score:list": "mastra scorers list"
  }
}
```

Add to dependencies:

```json
"@mastra/voice-google-gemini-live": "<latest>",
"@mastra/node-audio": "<latest>"
```

Run `npm install` and let npm resolve. Verify the installed `@mastra/voice-google-gemini-live` is >0.11.1 (the `this.traced` bug fix).

---

## `.github/workflows/ci.yml`

**Purpose**: Same as base. Voice-specific changes:

- Voice CLI is NOT run in CI (no audio devices, can't be tested headlessly)
- Eval job runs in text-mode against AIMock — no voice involvement
- Add `GOOGLE_API_KEY: stub-key` to the env stubs in CI jobs (since env loader requires it)

**Acceptance criteria** (verified post-publish):
- All four CI jobs green: typecheck, build, eval, docker
- No voice-related jobs added or expected to run

---

## `prompts/build-voice-agent.md`

**Purpose**: Parameterized prompt for adding new voice agents to a forked project.

**Implementation**: Adapt from base's `prompts/build-agent.md`. Add voice-specific sections:

- **Inputs**: voice provider (default: gemini-live), speaker, voice instructions style (formal/casual/etc.)
- **Conventions**: voice attached to Agent's `voice` prop, tools auto-flow, instructions tuned for spoken output
- **Constraints**: avoid lists/bullets in instructions (sound awkward when spoken), keep responses concise

Don't write the full prompt verbatim here — adapt from base. Keep it under 200 lines.

**Acceptance criteria**:
- File exists in prompts/
- Owner can paste it into Claude Code to scaffold a new voice agent

---

## `README.md`, `AGENTS.md`, `prompts/README.md`

Adapt from base. Key additions:

- **README.md**: Add a "Pre-flight: try the voice CLI" step in quickstart. Add troubleshooting for common voice issues (mic permissions, audio device selection, WebSocket connection failures).
- **AGENTS.md**: Add "Voice conventions" section: voice is attached to agents not Mastra root, tools auto-flow, instructions must be tuned for spoken output (no lists/markdown).
- **prompts/README.md**: Add `build-voice-agent.md` to the index.

**Acceptance criteria**:
- Owner can run quickstart end-to-end (clone → install → env → dev → voice:cli) from README alone
- A contractor reading AGENTS.md understands the voice philosophy
