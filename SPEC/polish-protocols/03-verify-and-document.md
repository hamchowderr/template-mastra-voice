# Voice Polish 03 — Verify Reachability + Document

Same as base's Polish 03, with voice-specific examples.

## Step 1: Verify all four endpoints

With `npm run dev` running:

### REST endpoint
```bash
curl -X POST http://localhost:4111/api/agents/voiceAssistant/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What time is it?"}]}'
```

**Pass**: HTTP 200, response includes current date/time. Tool call (`getCurrentTime`) visible in trace.

### A2A endpoint
```bash
curl http://localhost:4111/a2a/voiceAssistant
```

**Pass**: HTTP 200, JSON agent card.

### MCP endpoint
```bash
curl -X POST http://localhost:4111/api/mcp/voiceMcp/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**Pass**: HTTP 200, JSON-RPC response listing tools. The `ask_voiceAssistant` tool must be in the list.

### Studio + Editor
- `http://localhost:4111` loads
- voiceAssistant visible in agent list
- Editor tab present
- Can edit instructions and save a draft

### Voice CLI (regression check)
The voice CLI is voice-specific functionality. Verify the polish didn't break it:

```bash
npm run voice:cli
```

**Pass**: voice CLI connects to Gemini Live as before. Brief test conversation works. Ctrl+C exits cleanly.

If voice CLI is broken now, the polish has interfered with the gemini-live-patch. STOP and report.

## Step 2: Document in README

Add a "Reachability" section. Use the base template's text as a starting point but adapt for voice. Specifically the cURL examples should use `voiceAssistant` and the MCP server key `voiceMcp`.

Also add a Voice CLI section as a fifth integration path:

```markdown
### Voice CLI (local development)

For local testing with mic + speakers, run:

\`\`\`bash
npm run voice:cli
\`\`\`

This connects to Gemini Live STS and lets you have a real-time voice conversation with the agent. **Local-only** — won't work in Docker (no audio devices) or in headless production deploys. For voice in production, integrate via VAPI, LiveKit, or a custom WebSocket bridge calling the REST endpoints above.
```

## Step 3: Update AGENTS.md

Same "Reachability conventions" section as base. Plus voice-specific:

```markdown
## Voice template specifics

The `gemini-live-patch.ts` file in `src/mastra/lib/` is critical infrastructure that bridges three library/API mismatches. Do not refactor or remove without testing voice end-to-end. See README's "Voice library patch" section.

The voice CLI script is local-only — it requires audio devices and cannot run in Docker. For production voice integrations, use the REST endpoint as the source of truth and bridge audio at the application layer.
```

## What to capture in PROGRESS.md

```
## Voice Polish 03: Verify + Document Reachability
- Status: complete
- Endpoints verified:
  - REST: <pass | fail>
  - A2A: <pass | fail>
  - MCP: <pass | fail>
  - Studio + Editor: <pass | fail>
  - Voice CLI (regression check): <pass | fail>
- README updated with "Reachability" section (5 paths including voice CLI)
- AGENTS.md updated with conventions + voice specifics
- Notes: <anything unexpected, especially around the gemini-live-patch>
```

Move on to Polish 04.
