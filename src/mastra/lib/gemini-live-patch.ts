import { WebSocket } from 'ws';
import type { GeminiLiveVoice } from '@mastra/voice-google-gemini-live';

// Workaround for @mastra/voice-google-gemini-live ≤0.11.x incompatibility with the
// current Gemini Live API (v1beta, May 2026):
//
// Bug 1 — Wrong API version: library hardcodes v1alpha with x-goog-api-key header.
//   Current API requires v1beta with the key as a query param (?key=...).
//   Fix: wrap connect() to create the WebSocket with the correct URL before
//   the library's internal createWebSocket fires.
//
// Bug 2 — Missing generationConfig: library omits responseModalities from the
//   setup message; all live models require responseModalities:['AUDIO'].
//   Fix: intercept sendEvent('setup', ...) and inject generationConfig.
//
// Remove both patches when the library is updated for v1beta.
export function patchGeminiLiveForAudio(voice: GeminiLiveVoice): void {
  const v = voice as unknown as {
    options: { apiKey?: string };
    ws: WebSocket | undefined;
    connectionManager: { setWebSocket: (ws: WebSocket) => void; waitForOpen: () => Promise<void> };
    setupEventListeners: () => void;
    isResuming: boolean;
    sessionHandle: string | undefined;
    sendSessionResumption: () => Promise<void>;
    sendInitialConfig: () => void;
    sessionStartTime: number;
    sessionId: string;
    waitForSessionCreated: () => Promise<void>;
    state: string;
    emit: (event: string, data: unknown) => void;
    log: (msg: string, ...args: unknown[]) => void;
    sendEvent: (type: string, data: unknown) => void;
    connect: (opts?: { requestContext?: unknown }) => Promise<void>;
  };

  // --- Patch 1: fix URL (v1alpha → v1beta, header auth → query param) ---
  const origConnect = v.connect.bind(v);
  v.connect = async function (opts?: { requestContext?: unknown }) {
    if (v.state === 'connected') return;
    v.state = 'connecting' as typeof v.state;
    v.emit('session', { state: 'connecting' });
    try {
      const apiKey = v.options.apiKey ?? '';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      v.log('Patched connect — using v1beta URL');
      v.ws = new WebSocket(wsUrl);
      v.connectionManager.setWebSocket(v.ws);
      v.setupEventListeners();
      await v.connectionManager.waitForOpen();
      if (v.isResuming && v.sessionHandle) {
        await v.sendSessionResumption();
      } else {
        v.sendInitialConfig();
        v.sessionStartTime = Date.now();
        v.sessionId = crypto.randomUUID();
      }
      await v.waitForSessionCreated();
      v.state = 'connected' as typeof v.state;
      v.emit('session', { state: 'connected', config: { sessionId: v.sessionId, isResuming: v.isResuming } });
    } catch (error) {
      v.state = 'disconnected' as typeof v.state;
      throw error;
    }
  };

  // --- Patch 2: inject generationConfig into setup message ---
  // --- Patch 3: fix deprecated realtime_input.media_chunks → realtime_input.audio ---
  //   API dropped media_chunks (1007: deprecated). New format: { audio: { data, mimeType } }
  const origSendEvent = v.sendEvent.bind(v);
  v.sendEvent = function (type: string, data: unknown) {
    if (type === 'setup' && data !== null && typeof data === 'object') {
      const msg = data as { setup?: { generationConfig?: unknown } };
      if (msg.setup) {
        msg.setup.generationConfig = { responseModalities: ['AUDIO'] };
      }
    }
    if (type === 'realtime_input' && data !== null && typeof data === 'object') {
      const msg = data as { realtime_input?: { media_chunks?: Array<{ mime_type?: string; data?: string }> } };
      if (msg.realtime_input?.media_chunks?.length) {
        const chunk = msg.realtime_input.media_chunks[0];
        msg.realtime_input = {
          audio: {
            data: chunk.data ?? '',
            mimeType: 'audio/pcm;rate=16000',
          },
        } as typeof msg.realtime_input;
      }
    }
    return origSendEvent(type, data);
  };
}
