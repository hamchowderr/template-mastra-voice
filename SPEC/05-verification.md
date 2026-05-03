# 05 — Verification

End-to-end test plan. Run after the build is complete.

## Setup

- Real Supabase project (or local Supabase via `npx supabase start`)
- Real `GOOGLE_API_KEY` from https://aistudio.google.com/app/apikey
- Real `OPENAI_API_KEY` (for scorer judges; AIMock uses OpenAI)
- Working microphone and speakers/headphones (for manual phase)
- Docker installed (for Phase 10)

Create `.env`:
```bash
cp .env.example .env
# Fill in: APP_SECRET, SUPABASE_*, GOOGLE_API_KEY, OPENAI_API_KEY, MASTRA_TELEMETRY_DISABLED=1
```

## Tests in order

### 1. Typecheck

```bash
npm run typecheck
```

**Pass**: zero errors.

### 2. Voice connect smoke test

If you skipped this during build, run a quick connect test now using a temporary script (see Phase 5 of build order). Alternatively, the manual test in step 7 will surface any connect issues.

### 3. Dev boot

```bash
npm run dev
```

**Pass**:
- Studio loads at localhost:4111
- `voiceAssistant` agent appears in agent list
- No errors

### 4. Text-mode smoke test (Studio)

In Studio chat:

> What time is it?

**Pass**:
- Agent calls `getCurrentTime` (visible in trace)
- Response includes today's date and a current time
- Response is conversational, not list-formatted

### 5. Math tool smoke test

> What is 47 times 23?

**Pass**:
- Agent calls `evaluateMath`
- Response mentions 1081
- Cost: ~$0.005

### 6. cURL text-mode test

```bash
curl -X POST http://localhost:4111/api/agents/voiceAssistant/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 100 divided by 4?"}]}'
```

**Pass**:
- HTTP 200
- Response mentions 25
- Tool was called

### 7. Manual mic+speaker test (CRITICAL)

This is the headline feature of this template. Without this passing, the template doesn't deliver on its purpose.

```bash
npm run voice:cli
```

You should see:
```
Connecting...
[session] connecting
[session] connected
Connected. Speak now. Ctrl+C to quit.
```

**Try a conversation:**

1. Say: "Hi there!"
   - **Pass**: console shows `[user] hi there!` and `[model] hello! how can I help you?` (or similar). Audio plays through speakers.

2. Say: "What time is it?"
   - **Pass**: console shows `[tool] getCurrentTime({...})`. Audio response includes the current date/time.

3. Say: "What is twenty-three times eight?"
   - **Pass**: console shows `[tool] evaluateMath({...})`. Audio response includes 184.

4. Say: "Thanks, goodbye!"
   - **Pass**: brief farewell from agent. Then Ctrl+C exits cleanly.

5. Press Ctrl+C
   - **Pass**: `Disconnecting...` printed, process exits with code 0, no zombie connections.

**If any step fails**, capture:
- Console output
- Whether you can hear yourself (mic working at OS level — test with another app)
- Whether you can hear test audio (speakers working at OS level)
- Any error stack traces

Common issues and fixes are in `06-known-gotchas.md`.

**Cost**: ~$0.10 for a 2-minute conversation.

### 8. Eval gate (live)

```bash
npm run eval
```

**Pass**:
- All 5 cases run
- Tool-call assertions pass (cases 1-3 invoke correct tools, cases 4-5 don't invoke tools)
- Scorers ≥ thresholds
- Exit 0

**Cost**: ~$0.05

### 9. Eval gate (AIMock)

In one terminal:
```bash
npx @copilotkit/aimock --port 4010
```

In another:
```bash
USE_AIMOCK=true AIMOCK_URL=http://localhost:4010 npm run eval
```

**Pass**:
- Runs without real API calls
- Tool/keyword assertions evaluated
- Scorers skipped
- Exit 0

Note: AIMock can't drive realistic tool-call decisions. Tool-call assertions may fail under AIMock — document in PROGRESS.md if so.

### 10. Mastra build

```bash
npm run build
```

**Pass**: `.mastra/output/index.mjs` produced, exit 0.

### 11. Docker build & run

```bash
docker build -t template-mastra-voice:test .
docker compose up -d
sleep 15
curl http://localhost:4111/health
docker compose logs --tail=50 mastra
docker compose down
```

**Pass**:
- Build succeeds
- Container runs healthily
- /health returns 200
- Voice CLI is NOT expected to work in container (no audio devices) — don't test it

### 12. Onboarding

Open README. Pretend you're a new dev. Follow the quickstart end-to-end.

**Pass**: from clone to working voice CLI session in under 10 minutes.

## Reporting

Standard PROGRESS.md format. Be especially detailed on the manual voice test results — that's the highest-value validation in this template.
