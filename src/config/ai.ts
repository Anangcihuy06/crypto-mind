export const AI_CONFIG = {
  provider: 'openrouter',
  model: 'anthropic/claude-opus-4-20250514',
  modelName: 'Claude Opus 4.6',
  maxTokens: 1500,
} as const;

export type AIModel = typeof AI_CONFIG;
