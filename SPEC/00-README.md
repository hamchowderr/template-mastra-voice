# template-mastra-voice — Build Spec

You (the AI coding agent) are building the voice child template by forking from `template-mastra-base` and adding Mastra's Gemini Live voice integration.

## Read these spec files in order

1. **`01-context.md`** — What this template is, what it inherits, what's new
2. **`02-architecture.md`** — File layout, dependencies, env vars added on top of base
3. **`03-files.md`** — Per-file specs with code targets and acceptance criteria
4. **`04-build-order.md`** — Strict phase order with verification checkpoints
5. **`05-verification.md`** — End-to-end test plan including manual mic+speaker test
6. **`06-known-gotchas.md`** — Pitfalls inherited from base + voice-specific

## Operating mode

Same as base and RAG:

- **Stay in scope.** This is a voice-via-Gemini-Live template. Do not add VAPI/LiveKit, multiple voice providers, or telephony.
- **Use Mastra's voice primitives.** `GeminiLiveVoice` from `@mastra/voice-google-gemini-live`, `getMicrophoneStream` and `playAudio` from `@mastra/node-audio`. Do not reinvent audio I/O.
- **Verify as you go.** Each phase has a checkpoint. The voice template has a manual checkpoint (Phase 8) that requires the owner present at the keyboard with a mic and speaker.
- **Ask before installing packages outside the deps list.**
- **Stop after each phase**, write to `SPEC/PROGRESS.md`, wait for owner's "continue."

## Owner context

This template forks from `template-mastra-base` (already published at `https://github.com/hamchowderr/template-mastra-base`). The base provides: env loader, AIMock support, observability, Postgres memory adapter, Docker, scorers, CI workflow.

This template adds: Gemini Live STS (speech-to-speech) voice integration, a voice agent example, and a local CLI script for testing the agent with the owner's actual microphone and speakers.

Out of scope:
- VAPI / LiveKit (those are external platforms; they call Mastra's auto-generated REST endpoint, no template needed)
- Telephony (Twilio, etc. — same reason)
- Other voice providers (OpenAI Realtime, ElevenLabs, Deepgram) — keep template lean; clients can swap later
- Vertex AI authentication (defer to clients; API key auth is sufficient for v1)
- Multimodal input (video/images) — defer; voice-only for v1

## Reporting

Same `PROGRESS.md` format as base and RAG.

If you get stuck, write the blocker into `PROGRESS.md` and stop. Don't paper over with workarounds.

## Critical: gotchas inherited from base

Re-read those if you haven't. The high-impact ones for this template:

1. **Path aliases break inside `src/mastra/`** — relative imports only.
2. **`PostgresStore` requires `id` field** on construction.
3. **Provisioning uses `npx degit <org>/<repo>`**, NOT `npx create-mastra --template`.
4. **DuckDB requires glibc** — Docker uses `node:22-slim`, not Alpine.
5. **PostHog telemetry leaks errors in restricted networks** — set `MASTRA_TELEMETRY_DISABLED=1`.

## Critical: voice-specific gotchas

Discovered during scoping. Full list in `06-known-gotchas.md`. Highlights:

1. **`@mastra/voice-google-gemini-live` reads `GOOGLE_API_KEY`, NOT `GOOGLE_GENERATIVE_AI_API_KEY`.** The AI SDK uses one; Mastra's voice package uses the other. Pass the key explicitly to `new GeminiLiveVoice({ apiKey })` to avoid duplicating env vars.
2. **Version 0.11.1 of `@mastra/voice-google-gemini-live` has a known `this.traced is not a function` bug.** Install latest (>0.11.1) and verify in Phase 5 connect smoke test. If you must use an older version for some reason, the bug is in `GeminiLiveVoice.connect()`.
3. **`@mastra/node-audio` ships native binaries.** Works on macOS / Windows / Linux desktop, but does NOT work in Docker (no audio devices in container). The CLI test script using node-audio is local-only — never expected to run in CI or in production deploys.
4. **Voice cannot be tested under AIMock.** AIMock intercepts text-based LLM calls but cannot mock a WebSocket-based real-time audio API. CI for this template skips voice integration tests; voice is verified manually only.
5. **Gemini Live operates over WebSockets.** Long-lived connections, not simple HTTP. Production deploys must allow outbound WebSocket connections.

Begin with `01-context.md`.
