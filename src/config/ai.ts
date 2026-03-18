export const AI_CONFIG = {
  provider: 'openrouter',
  model: 'qwen/qwen3-32b',
  modelName: 'Qwen 3.5',
  maxTokens: 1000,
} as const;

export type AIModel = typeof AI_CONFIG;
