export const AI_CONFIG = {
  provider: 'openrouter',
  model: 'openai/gpt-4o-mini',
  modelName: 'GPT-4o Mini',
  maxTokens: 1500,
} as const;

export type AIModel = typeof AI_CONFIG;
