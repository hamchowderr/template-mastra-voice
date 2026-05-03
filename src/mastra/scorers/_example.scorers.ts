import { createAnswerRelevancyScorer } from '@mastra/evals/scorers/prebuilt';

// LLM-judged relevancy — runs on every agent invocation as an agent-level scorer.
// Uses OpenAI for AIMock compatibility.
export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: 'openai/gpt-4o-mini',
});

// createToolCallAccuracyScorerCode requires expectedTool at construction time
// (per-case), so it's used in scripts/eval.ts per case rather than here.
export { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/prebuilt';
