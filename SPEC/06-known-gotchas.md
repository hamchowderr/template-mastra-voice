# 06 — Known Gotchas

Pitfalls discovered during template scoping. Read before debugging anything weird.

## Inherited from base

All gotchas from `template-mastra-base/SPEC/06-known-gotchas.md` apply here. Re-read those if you haven't.

The high-impact ones for this template:

1. **Path aliases break inside `src/mastra/`**. Relative imports only.
2. **`PostgresStore` requires `id` field**. Don't omit it.
3. **DuckDB requires glibc**. Don't change Dockerfile to Alpine.
4. **PostHog telemetry leaks errors in restricted networks**. Set `MASTRA_TELEMETRY_DISABLED=1`.

## Voice-specific gotchas

### `GOOGLE_API_KEY` vs `GOOGLE_GENERATIVE_AI_API_KEY`

Two different env vars for the same Google account, used by different SDKs:

- **`GOOGLE_GENERATIVE_AI_API_KEY`** — what the AI SDK (`@ai-sdk/google`) reads. Inherited from base. Used for text-mode model calls.
- **`GOOGLE_API_KEY`** — what `@mastra/voice-google-gemini-live` reads. Specific to this template.

You can set them to the SAME value (one Google API key) — they're just two env-var names for the same secret. The schema treats them independently.

In the agent, pass `apiKey: env.GOOGLE_API_KEY` explicitly to `new GeminiLiveVoice({...})` to avoid confusion. Don't rely on the package's auto-read.

### Version 0.11.1 of `@mastra/voice-google-gemini-live` is broken

GitHub issue #11154: version 0.11.1 throws `TypeError: this.traced is not a function` at `connect()` time.

**Fix**: install latest. After `npm install`, verify with:
```bash
npm list @mastra/voice-google-gemini-live
```
If you get 0.11.1, run `npm install @mastra/voice-google-gemini-live@latest` and verify again.

### `@mastra/node-audio` doesn't work in Docker

The package wraps native audio device access (PortAudio under the hood). Docker containers don't have audio devices — there's no mic, no speaker, no PulseAudio/ALSA daemon. The voice CLI script will fail or hang in container.

This is by design. The voice CLI is a development tool for the owner's local machine. Production deploys use the agent via REST endpoint (text mode) or via WebSocket integration patterns that clients build on top.

If you accidentally try to run `npm run voice:cli` in Docker, expect mysterious "no devices found" errors.

### Voice cannot be tested under AIMock

AIMock intercepts text-based LLM calls (`/v1/messages`, `/v1/chat/completions`). Gemini Live uses WebSockets for bidirectional audio streaming. AIMock cannot intercept that.

Implications:
- CI eval runs in text-mode (treats voice agent as a regular agent for offline scoring)
- Voice integration is verified manually only (Phase 8 of build order)
- This is a known limitation, not something to fix at the template level

### Gemini Live operates over WebSockets

Production deploys must allow outbound WebSocket connections to `generativelanguage.googleapis.com`. Most cloud platforms (Vercel, Fly.io, Hetzner, DO, Railway) allow this by default. Locked-down corporate networks may block it.

If a client reports the voice CLI works locally but not in their deploy, check egress rules first.

### Voice instance attaches to the Agent, not the Mastra root

Don't try to register voice in the `Mastra({...})` constructor. It goes on the Agent:

```typescript
new Agent({
  // ...
  voice: new GeminiLiveVoice({...}),
});
```

This is different from how vectors and storage work (those are on Mastra root). The reason: each agent can have its own voice config (different speaker, different model) without leaking across.

### Tools auto-flow from Agent to Voice

When `GeminiLiveVoice` is attached to an Agent, the agent's `tools` are automatically registered with the voice instance via `voice.addTools()`. You don't need to call `addTools` manually.

This means: if you want a tool available in voice conversations, just put it on the Agent. If you want a tool that's text-mode only, you'd need to filter — but for v1, all tools flow to both.

### Instructions tuned for voice are different from text-mode instructions

Voice agents speak responses aloud. Bullet points, markdown formatting, and code blocks sound terrible. The example agent's instructions explicitly forbid them. If you adapt this agent for a different domain, update the instructions accordingly.

Rule of thumb: if you read the response out loud and it sounds wrong, the instructions need work.

### Memory works the same in voice and text mode

Memory is on the Agent (inherited from base's `Memory()` setup). Both voice and text invocations of the same agent share the same memory threads. Useful: a user can start a conversation by voice, switch to text, and the agent has context.

### CI eval is partial for tool-calling cases

AIMock can't realistically mock Anthropic tool-call responses without per-case fixtures. Cases involving tool calls error out under AIMock with "No fixture matched."

This is accepted as a v1 limitation. Live eval (`npm run eval` with real keys) catches all regressions during development. CI catches typecheck, build, and basic agent invocation regressions.

If full CI eval coverage is needed, build AIMock fixtures matching Anthropic's tool-call response format. See `@copilotkit/aimock` docs for fixture format reference.

### The `gemini-live-patch.ts` file is critical infrastructure

The patch is what makes voice work at all. Without it, the voice agent will fail to connect to Gemini Live (the library's hardcoded v1alpha endpoint is no longer supported, and the setup message is missing required fields).

If you're debugging a voice issue and your first instinct is "let me clean up that patch file" — don't. Read the comments in the file first, then run `npm run voice:cli` to see current behavior, then make the smallest possible change.

The patch will eventually become unnecessary when the library natively supports the current API. Until then, treat it as load-bearing.

### `playAudio` and `getMicrophoneStream` may need configuration

`@mastra/node-audio`'s defaults work on most setups. If they don't, options include:
- `getMicrophoneStream({ sampleRate: 16000 })` — Gemini Live expects 16kHz audio
- `playAudio(stream, { sampleRate: 24000 })` — Gemini Live outputs at 24kHz

If you hear chipmunk audio (too fast) or slow-mo (too slow), it's a sample rate mismatch.

### Native audio dependencies on Windows

`@mastra/node-audio` may pull in build tools at install time on Windows. If `npm install` fails with native build errors:

1. Install build tools: `npm install --global windows-build-tools` (legacy) or follow https://github.com/nodejs/node-gyp#on-windows
2. Or install Visual Studio with the C++ workload

This is an install-time issue, not a runtime one. Once installed successfully, no further setup needed.

### Gemini Live model availability

Mastra's voice docs list multiple model options. Some are preview/experimental:
- `gemini-2.0-flash-exp` (default, stable)
- `gemini-2.0-flash-live-001` (alternative stable)
- `gemini-live-2.5-flash-preview-native-audio` (preview — may have different feature set)
- `gemini-2.5-flash-exp-native-audio-thinking-dialog` (preview)

For v1, stick with `gemini-2.0-flash-exp`. Newer models may have better quality but introduce stability risk.

### Speaker voices are gendered/regional

The available voices (Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr) are pre-defined by Google. They don't all support the same languages or styles. If a client wants a specific accent or gender, they'll need to test the voices manually.

There's no way to clone or upload a custom voice in Gemini Live (yet). Clients with that requirement need a different provider (ElevenLabs, etc.) — out of scope for this template.

### Connection drops mid-conversation

Network interruptions can drop the WebSocket. Gemini Live supports session resumption via `sessionHandle` event:

```typescript
voice.on('sessionHandle', ({ handle, expiresAt }) => {
  // Save handle for resumption
});
```

The example CLI script doesn't implement resumption — it disconnects on errors. Clients with reliability requirements (e.g., long support calls) need to add resumption logic.

### Anthropic / OpenAI as fallback?

Some clients ask if voice can fall back to text-only when Gemini is down. Mastra doesn't have built-in fallback — the agent's voice prop is set or unset. If you need fallback, build it at the application layer (catch connect errors, switch to a text-only agent variant).

Out of scope for v1.
