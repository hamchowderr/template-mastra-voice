import { mastra } from '../src/mastra';
import { getMicrophoneStream, playAudio } from '@mastra/node-audio';

async function main() {
  console.log('Connecting to voice agent...');

  const agent = mastra.getAgent('voiceAssistant');
  if (!agent.voice) {
    throw new Error('Agent does not have a voice instance attached');
  }

  agent.voice.on('session', (data: { state: string }) => {
    console.log(`[session] ${data.state}`);
  });

  agent.voice.on('writing', (data: { text: string; role: string }) => {
    process.stdout.write(`[${data.role ?? 'model'}] ${data.text}`);
  });

  agent.voice.on('speaker', (audioStream: NodeJS.ReadableStream) => {
    // Gemini Live outputs 24000 Hz 16-bit mono PCM; node-audio defaults to 24100 Hz
    playAudio(audioStream, { sampleRate: 24000, channels: 1, bitDepth: 16 });
  });

  agent.voice.on('toolCall', (data: { name: string; args: unknown }) => {
    console.log(`\n[tool] ${data.name}(${JSON.stringify(data.args)})`);
  });

  agent.voice.on('turnComplete', () => {
    process.stdout.write('\n');
  });

  agent.voice.on('error', (err: unknown) => {
    console.error('[voice error]', err);
  });

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

  await agent.voice.connect();
  console.log('Connected. Speak now. Ctrl+C to quit.');

  // 16kHz raw PCM (no WAV header) — matches Gemini Live inputSampleRate=16000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const micStream = getMicrophoneStream({ rate: 16000, fileType: 'raw' } as any);
  await agent.voice.send(micStream);

  // Keep alive until Ctrl+C
  await new Promise<never>(() => {});
}

main().catch((err) => {
  console.error('Voice CLI error:', err);
  process.exit(1);
});
