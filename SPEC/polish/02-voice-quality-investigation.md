# Polish 02 — Voice Quality Investigation

The Phase 8 manual mic+speaker test verified the pipeline works end-to-end (audio captured, sent to Gemini Live, response received, played back). But the conversation quality was poor: weak mic pickup, high latency, did not feel like a real-time conversation. This is the headline feature of the template — it has to feel right before we publish.

## What this step is and isn't

**Is**: investigate root cause, attempt fixes, decide whether the issue is fixable at the template level or is a fundamental Gemini Live limitation.

**Isn't**: a guarantee we can fix it. Some real-time voice quality issues are unfixable without WebRTC infrastructure, custom audio processing, or moving to a different provider.

The deliverable is either:
1. **Fix found and applied** — voice quality is acceptable, document the fix
2. **Fix not found, root cause documented** — limitation is honestly disclosed in README, owner decides whether to ship anyway

Don't pretend to fix it if you can't.

## Likely candidates

In order of how likely they are to be the actual cause:

### A. Mic gain / format mismatch

**Symptom**: agent says "I didn't quite catch that" or transcribes very short fragments.

The Phase 8 fix (`getMicrophoneStream({ rate: 16000, fileType: 'raw' })`) confirmed Gemini Live wants 16kHz raw PCM. But other parameters might still be wrong:

- Channel count (mono vs stereo) — Gemini Live wants mono
- Bit depth — should be 16-bit signed integers
- Mic input gain at the OS level — Windows and macOS often default to low gain

**To investigate**:
```bash
# Read the actual options the script passes
grep -A 5 "getMicrophoneStream" scripts/voice-cli.ts
```

If `getMicrophoneStream({ rate: 16000, fileType: 'raw' })` is all that's set, try adding:
```typescript
getMicrophoneStream({
  rate: 16000,
  channels: 1,
  fileType: 'raw',
})
```

(Verify these are valid options by reading `node_modules/@mastra/node-audio/dist/...` types.)

For OS-level mic gain on Windows: Settings → System → Sound → Input → Device properties → Levels. Owner can manually verify mic isn't muted or set to 5%.

### B. Speaker buffering

**Symptom**: agent's response feels delayed or chopped.

`@mastra/node-speaker` (added in Phase 8) buffers audio for playback. If the buffer is too large, you hear silence followed by the full response — feels like high latency. If too small, audio chops.

**To investigate**:
- Check `node_modules/@mastra/node-speaker/dist/...` for buffer/chunk size options
- Try playing audio with a smaller buffer and see if perceived latency improves

The voice CLI script uses `playAudio(audioStream)` from `@mastra/node-audio`. If that wraps `@mastra/node-speaker` with default buffer settings, the defaults might not be optimized for real-time.

### C. Network latency to Gemini Live

**Symptom**: 2-3 second pause between user finishing speaking and agent starting to respond.

This is largely outside our control. Gemini Live's servers are in specific regions; if the owner is far from those regions, round-trip latency adds up. The patched WebSocket connection (`v1beta` URL we patched in `gemini-live-patch.ts`) is direct to Google.

**To investigate**:
```bash
# Measure RTT to Google's voice endpoint
ping generativelanguage.googleapis.com
```

If RTT is > 100ms, that's a meaningful chunk of perceived latency. Not fixable at template level.

### D. Gemini 3.1 Flash Live Preview-specific issues

`gemini-3.1-flash-live-preview` is a preview model. The `06-known-gotchas.md` voice file noted that newer models may have stability issues. If quality is poor on this model, try the v1beta-compatible alternatives:
- `gemini-live-2.5-flash-preview` (also preview, slightly older)
- `gemini-live-2.5-flash-preview-native-audio` (native audio path, may be lower latency)

Worth swapping the model for one test conversation each and noting which feels best.

### E. Voice activity detection (VAD)

**Symptom**: agent interrupts the user, or doesn't respond when user finishes.

Gemini Live has VAD that determines when a turn is over. The library may not be configuring VAD correctly for the patched setup. If turns feel "stuck," VAD config is likely.

**To investigate**:
Look at the library's setup message construction (`gemini-live-patch.ts` already intercepts `setup` events). Check if `realtimeInputConfig.automaticActivityDetection` is being sent. If not, that's a feature gap.

This is harder to fix without library cooperation.

## How to investigate

Time-box this to 60 minutes total. Within that time:

1. **Reproduce the issue** — owner runs `npm run voice:cli`, has a 30-second conversation, captures observations: "mic pickup felt X, latency felt Y, response quality felt Z"
2. **Form a hypothesis** — pick one of A–E above based on the symptom
3. **Try the fix** — make the smallest change that addresses the hypothesis
4. **Re-test** — owner runs voice CLI again, reports if the issue improved

If the first hypothesis doesn't help, try the next most likely. Stop at 3 attempts maximum within the time box.

## Fixes that DON'T require code changes

Worth checking before changing code:

1. **OS mic permissions** — does Node have permission to access the mic? On macOS this requires explicit grant in System Settings → Privacy & Security → Microphone.
2. **OS audio device selection** — is the right mic selected? Bluetooth headsets often default to low-quality "hands-free" profile instead of higher-quality bidirectional profiles.
3. **Background noise** — VAD may be picking up keyboard/fan noise as speech. Try a quieter environment.
4. **Internet connection** — wired Ethernet vs WiFi; high jitter degrades real-time audio quality.

If the issue resolves with one of these, **document in README** under "Voice quality troubleshooting" — clients will hit the same things.

## Decision point after investigation

After your time-boxed investigation, write to PROGRESS.md:

```
## Polish 02: Voice Quality Investigation
- Status: complete
- Time spent: <minutes>
- Hypothesis tested: <A | B | C | D | E | none>
- Outcome: <fixed | improved but not perfect | unchanged>
- Final assessment: <
    "Quality acceptable, ship it" |
    "Quality is a known limitation of Gemini Live preview models, document and ship" |
    "Quality is unacceptable, escalate to owner before publishing"
  >
- Files changed: <list>
- Updates to README: <link or describe what was added under troubleshooting>
```

If the assessment is "escalate," stop and wait for owner. Otherwise, continue.

## What to add to README regardless of fix outcome

Even if quality is fixed, future-you and future clients will hit voice issues. Add a "Voice quality troubleshooting" section to README with whatever you learned:

- Mic permissions setup per OS
- Audio device selection guidance (avoid Bluetooth hands-free profile)
- Network requirements (wired Ethernet recommended)
- Gemini Live model alternatives if one feels worse than another
- Link to `gemini-live-patch.ts` for "if voice stops working entirely, check the patch is still compatible"

## Stop after this step

Wait for owner approval before Polish 03. Voice quality is the headline feature; owner needs to confirm the assessment.
