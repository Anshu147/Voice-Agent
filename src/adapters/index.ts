import { Request } from 'express';
import { GenericVoiceAdapter } from './GenericVoiceAdapter';
import { RetellAdapter } from './RetellAdapter';
import { VoiceProviderAdapter } from './VoiceProviderAdapter';

const genericAdapter = new GenericVoiceAdapter();
const retellAdapter = new RetellAdapter();

export const adapters: Record<string, VoiceProviderAdapter> = {
  generic: genericAdapter,
  retell: retellAdapter
};

export function resolveAdapter(req: Request): VoiceProviderAdapter {
  // 1. Explicit query parameter ?provider=retell
  const queryProvider = req.query.provider as string;
  if (queryProvider && adapters[queryProvider.toLowerCase()]) {
    return adapters[queryProvider.toLowerCase()];
  }

  // 2. Header-based detection (x-retell-signature, x-provider: retell)
  if (
    req.headers['x-retell-signature'] ||
    req.headers['x-provider'] === 'retell'
  ) {
    return retellAdapter;
  }

  // 3. Payload inspection
  const body = req.body;
  if (body) {
    if (
      body.provider === 'retell' ||
      body.call?.call_id?.startsWith('call_') ||
      body.call?.agent_id ||
      body.event === 'call_started' ||
      body.event === 'call_ended' ||
      body.event === 'call_analyzed'
    ) {
      return retellAdapter;
    }
  }

  // Default fallback
  return genericAdapter;
}

export { GenericVoiceAdapter, RetellAdapter, VoiceProviderAdapter };
