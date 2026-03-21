import { InferenceContext, InferenceProvider } from './contracts.js';

export class ProviderRegistry {
  private readonly providers: InferenceProvider[] = [];

  register(provider: InferenceProvider): this {
    const existingIndex = this.providers.findIndex((item) => item.id === provider.id);
    if (existingIndex >= 0) {
      this.providers[existingIndex] = provider;
    } else {
      this.providers.push(provider);
    }

    this.providers.sort(compareProviders);
    return this;
  }

  list(): InferenceProvider[] {
    return [...this.providers];
  }

  resolve(context: InferenceContext): InferenceProvider[] {
    return this.providers.filter((provider) => provider.apply(context));
  }
}

function compareProviders(a: InferenceProvider, b: InferenceProvider): number {
  const leftPriority = a.priority ?? 100;
  const rightPriority = b.priority ?? 100;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return a.id.localeCompare(b.id);
}