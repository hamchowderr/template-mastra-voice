import { mastra } from '../src/mastra';

async function main() {
  const agent = mastra.getAgent('voiceAssistant');
  if (!agent.voice) throw new Error('No voice instance on agent');

  console.log('Connecting...');
  await agent.voice.connect();
  console.log('Connected ✓');
  await agent.voice.disconnect();
  console.log('Disconnected ✓');
}

main().catch((err) => {
  console.error('Connect test failed:', err);
  process.exit(1);
});
