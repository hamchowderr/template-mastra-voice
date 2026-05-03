# 02 — Architecture

## Final file layout

```
template-mastra-voice/
├── .env.example                          # Inherits base + adds GOOGLE_API_KEY, GEMINI_LIVE_MODEL, GEMINI_LIVE_SPEAKER
├── .dockerignore                         # Inherited
├── .github/workflows/ci.yml              # Inherited; voice CLI excluded from CI
├── AGENTS.md                             # Inherits base + voice-specific conventions
├── CLAUDE.md                             # As in base
├── Dockerfile                            # Inherited
├── README.md                             # Rewritten for voice template
├── compose.dev.yml                       # Inherited
├── docker-compose.yml                    # Inherited
├── package.json                          # Adds voice deps + voice:cli script
├── prompts/
│   ├── README.md                         # Updated index
│   ├── build-agent.md                    # From base
│   └── build-voice-agent.md              # NEW
├── scripts/
│   ├── eval.ts                           # Inherited; dataset path updated
│   └── voice-cli.ts                      # NEW — local mic/speaker test for the voice agent
├── src/
│   ├── lib/
│   │   └── env.ts                        # Extended (no breaking changes)
│   └── mastra/
│       ├── agents/
│       │   └── _example.ts               # REPLACED — voice assistant agent
│       ├── index.ts                      # Inherited; agent registration updated
│       ├── lib/
│       │   ├── aimock.ts                 # From base, unchanged
│       │   └── supabase.ts               # From base, unchanged
│       ├── scorers/
│       │   ├── _example.scorers.ts       # REPLACED — tool-call + answer-relevancy
│       │   └── datasets/
│       │       └── _example.json         # REPLACED — voice agent eval dataset (text-mode)
│       ├── tools/
│       │   └── time-and-math.ts          # NEW — example tool: get current time, do math
│       └── workflows/                    # Empty
└── tsconfig.json                         # Inherited
```

## Files to delete from base

These are base's lead-intake assets:

- `src/mastra/agents/_example.ts`
- `src/mastra/scorers/_example.scorers.ts`
- `src/mastra/scorers/datasets/_example.json`

## Final dependency list

### Inherited from base
All base deps (see base's `02-architecture.md`).

### To add (production)
- `@mastra/voice-google-gemini-live` — Gemini Live STS provider. Use latest version (>0.11.1 to avoid the `this.traced` bug).
- `@mastra/node-audio` — Microphone capture and audio playback for local CLI testing.

### NOT to install
- `@mastra/voice-openai` / other voice providers (out of scope)
- `@mastra/voice-openai-realtime` (out of scope)
- `node-portaudio` or other low-level audio libs — `@mastra/node-audio` handles this
- `livekit-server-sdk` / VAPI SDKs — out of scope

## Final env vars (additions on top of base)

### Required to boot
- `GOOGLE_API_KEY` — Gemini API key. **Note**: this is a NEW required variable, NOT the same as `GOOGLE_GENERATIVE_AI_API_KEY` from base. They're for different SDKs and have different env-var naming conventions. The base's variable serves the AI SDK; this new one serves the voice package.

### Optional (voice-specific)
- `GEMINI_LIVE_MODEL` — Voice model identifier (default: `gemini-2.0-flash-exp`)
- `GEMINI_LIVE_SPEAKER` — Default voice (default: `Puck`; options: `Charon`, `Kore`, `Fenrir`, `Aoede`, `Leda`, `Orus`, `Zephyr`)

The agent's text-path model (when invoked via REST endpoint without voice) defaults to `gemini-2.0-flash-exp` — same as voice for consistency.

## Component map

| Component | File | Job |
|---|---|---|
| Env loader extension | `src/lib/env.ts` | Adds `GOOGLE_API_KEY` (required), `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_SPEAKER` |
| Voice agent | `src/mastra/agents/_example.ts` | Production voice assistant. Has `voice` prop using `GeminiLiveVoice`. Tools auto-flow to voice. |
| Example tool | `src/mastra/tools/time-and-math.ts` | Demonstrates tool calling in voice mode (get current time, evaluate simple math) |
| Voice CLI | `scripts/voice-cli.ts` | Local-only script. Connects to agent's voice, streams mic to it, plays response audio. |
| Eval dataset | `src/mastra/scorers/datasets/_example.json` | Text-mode eval cases for the voice agent (treats it as a regular agent) |
| Scorers | `src/mastra/scorers/_example.scorers.ts` | Tool-call accuracy + answer relevancy |

## Boot order in `src/mastra/index.ts`

Same as base — voice integration attaches to the agent, not the Mastra root. The Mastra entry doesn't need new top-level config.

```typescript
// 1. Env validation FIRST
import { env } from '../lib/env';

// 2. AIMock provider switch (still useful for text-mode CI eval)
import { configureAIMock } from './lib/aimock';
configureAIMock();

// 3. Mastra
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, DefaultExporter, SensitiveDataFilter } from '@mastra/observability';

import { voiceAssistantAgent } from './agents/_example';
import { toolCallAccuracyScorer, answerRelevancyScorer } from './scorers/_example.scorers';

export const mastra = new Mastra({
  agents: { voiceAssistant: voiceAssistantAgent },
  scorers: { toolCallAccuracyScorer, answerRelevancyScorer },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new PostgresStore({ id: 'mastra-storage', connectionString: env.SUPABASE_DB_URL }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  logger: new PinoLogger({ name: 'Mastra', level: env.LOG_LEVEL }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new DefaultExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
```

The voice instance is constructed inside the agent file and passed to the `Agent` constructor's `voice` prop. See `03-files.md` for details.
