import { config } from '@docsetuai/config';
import type { LLMAdapter } from './llm.interface';
import { MockLLMAdapter } from './mock.adapter';
import { GeminiAdapter } from './gemini.adapter';

let _adapter: LLMAdapter | null = null;

export function getLLMAdapter(): LLMAdapter {
  if (_adapter) return _adapter;

  if (config.runtime_mode === 'cloud' && config.google_api_key) {
    console.log('[LLM] Using Gemini adapter');
    _adapter = new GeminiAdapter();
  } else {
    console.log('[LLM] Using Mock adapter (demo mode)');
    _adapter = new MockLLMAdapter();
  }

  return _adapter;
}
