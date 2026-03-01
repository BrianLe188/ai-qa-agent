// ============================================================
// AI Provider Registry — Factory Pattern
// ============================================================
import type { AIProvider } from "./provider";

class ProviderRegistryClass {
  private providers = new Map<string, AIProvider>();
  private activeProviderName: string | null = null;

  /** Register a new AI provider */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    // Auto-activate the first registered provider that is configured
    if (!this.activeProviderName && provider.isConfigured()) {
      this.activeProviderName = provider.name;
    }
  }

  /** Get a specific provider by name */
  get(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /** Get the currently active provider */
  getActive(): AIProvider {
    if (!this.activeProviderName) {
      // Try to find any configured provider
      for (const [name, provider] of this.providers) {
        if (provider.isConfigured()) {
          this.activeProviderName = name;
          return provider;
        }
      }
      throw new Error(
        "No AI provider configured. Please set an API key in Settings.",
      );
    }

    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
      throw new Error(`Provider "${this.activeProviderName}" not found.`);
    }
    if (!provider.isConfigured()) {
      throw new Error(
        `Provider "${provider.displayName}" is not configured. Please set an API key.`,
      );
    }
    return provider;
  }

  /** Set the active provider */
  setActive(name: string): void {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found.`);
    }
    if (!provider.isConfigured()) {
      throw new Error(
        `Provider "${provider.displayName}" is not configured. Please set an API key first.`,
      );
    }
    this.activeProviderName = name;
  }

  /** List all registered providers */
  listAll(): Array<{
    name: string;
    displayName: string;
    isConfigured: boolean;
    isActive: boolean;
    models: string[];
  }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      displayName: provider.displayName,
      isConfigured: provider.isConfigured(),
      isActive: name === this.activeProviderName,
      models: provider.getAvailableModels(),
    }));
  }
}

export const ProviderRegistry = new ProviderRegistryClass();
