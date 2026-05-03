# 01 — Context

## What this template is

`template-mastra-voice` is the voice child template in Otaku Solutions' Mastra template family. It forks from `template-mastra-base` and adds:

- `@mastra/voice-google-gemini-live` for real-time speech-to-speech (STS)
- `@mastra/node-audio` for local mic/speaker testing
- A voice agent example demonstrating bidirectional conversation with tool calling
- A CLI script (`scripts/voice-cli.ts`) for testing the agent end-to-end with the owner's actual hardware

## Relationship to base

| Layer | Source |
|---|---|
| Env loader (`src/lib/env.ts`) | Inherited, extended with new voice vars |
| AIMock provider switch (`src/mastra/lib/aimock.ts`) | Inherited, unchanged (does NOT cover voice) |
| Supabase client factory (`src/mastra/lib/supabase.ts`) | Inherited, unchanged |
| Mastra entry (`src/mastra/index.ts`) | Inherited, unchanged structure (voice attaches to agent, not Mastra root) |
| Composite store, memory, observability | Inherited, unchanged |
| Docker, CI | Inherited, voice integration excluded from CI by design |
| Lead-intake agent | **Removed** — replaced by voice assistant agent |
| Lead-intake scorers | **Removed** — replaced by voice-relevant scorers |
| Voice agent | **New** |
| Voice CLI test script | **New** |

## Scope decisions (do not relitigate)

| Decision | Choice | Why |
|---|---|---|
| Voice provider | `@mastra/voice-google-gemini-live` (STS only) | Owner's chosen provider; uses owner's existing Google API key; mature in Mastra |
| Authentication | Gemini API (API key) | Simpler than Vertex AI; clients can swap later if they have GCP infrastructure |
| Voice model | `gemini-2.0-flash-exp` (default) | Mastra's documented default; stable; supports tool calling |
| Default speaker | `Puck` | Friendly conversational voice; clients can change |
| Local audio I/O | `@mastra/node-audio` (`getMicrophoneStream`, `playAudio`) | Mastra's first-party helper; matches their docs exactly |
| Agent default model | `gemini-2.0-flash-exp` (text path through agent) | Match the voice model; reduces latency vs cross-provider |
| Memory | Inherited from base (PostgresStore via composite) | Voice conversations persist same as text |
| Scorers | One custom + one prebuilt: tool-call accuracy + answer relevancy | Specific to voice agent's purpose |
| Voice in CI | **Excluded** — manual testing only | WebSocket + audio devices can't be reliably mocked or tested headlessly |
| Voice in Docker | **Excluded** from primary deploy story | No audio devices in container; voice agent's text/tool-call layer still works in container, but mic/speaker requires local CLI |
| Vertex AI | **Out of scope for v1** | Adds GCP project/IAM complexity; defer to client-specific forks |
| Multimodal (video) | **Out of scope** | Voice-only for v1 |

## What this template ships with that clients keep

- `GeminiLiveVoice` integration on the example agent (working production voice)
- The CLI test script (always useful for development; clients use it to sanity-check their own voice agents)
- A pattern for attaching tools to a voice agent (Mastra auto-flows agent tools into the voice instance)
- Standard scorers tuned for voice agent quality

## Quality bar

Same as base, plus:

- **Mic + speaker test passes** — running `npm run voice:cli` from the project root opens a connection to Gemini Live, captures mic input, plays back synthesized response, ends cleanly when user says goodbye or hits Ctrl+C
- **Tool calls work in voice mode** — when the user says "what's 2+2", the example tool is invoked and the agent verbally confirms the answer
- **Eval gate passes** — text-mode evaluation of the voice agent (treating it as a regular Mastra agent for offline scoring) passes thresholds
- **Live smoke test (text mode in Studio)** — voice agents are still callable via the auto-generated REST endpoint as text agents; that path works for testing without audio
