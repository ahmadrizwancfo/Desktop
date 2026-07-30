import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { BaseProviderAdapter, INTEGRATION_PROVIDER_TOKEN } from '../interfaces/base-provider-adapter.interface';
import { ProviderCapabilities } from '../interfaces/provider-capabilities.interface';

@Injectable()
export class IntegrationRegistryService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationRegistryService.name);
  private readonly registry = new Map<string, BaseProviderAdapter>();

  constructor(
    @Optional() @Inject(INTEGRATION_PROVIDER_TOKEN) private readonly injectedProviders: BaseProviderAdapter[] = [],
  ) {}

  onModuleInit() {
    if (this.injectedProviders && Array.isArray(this.injectedProviders)) {
      for (const provider of this.injectedProviders) {
        this.registerProvider(provider);
      }
    }
    this.logger.log(`⚡ Integration Registry Initialized with ${this.registry.size} registered provider adapters.`);
  }

  /**
   * Register a provider adapter instance dynamically into the registry.
   */
  registerProvider(provider: BaseProviderAdapter): void {
    if (!provider || !provider.providerName) {
      this.logger.warn('Attempted to register invalid provider adapter.');
      return;
    }

    const nameKey = provider.providerName.toUpperCase();
    this.registry.set(nameKey, provider);
    
    const caps = provider.getCapabilities();
    this.logger.log(
      `Registered Integration Provider Adapter: [${caps.providerName} v${caps.providerVersion}] | Capabilities: [${caps.capabilities.join(', ')}]`
    );
  }

  /**
   * Retrieve a specific provider adapter by name.
   */
  getProvider(providerName: string): BaseProviderAdapter | undefined {
    return this.registry.get(providerName.toUpperCase());
  }

  /**
   * Check if a provider is registered.
   */
  hasProvider(providerName: string): boolean {
    return this.registry.has(providerName.toUpperCase());
  }

  /**
   * Return metadata and capabilities of all registered providers.
   */
  getAllCapabilities(): ProviderCapabilities[] {
    const list: ProviderCapabilities[] = [];
    for (const provider of this.registry.values()) {
      list.push(provider.getCapabilities());
    }
    return list;
  }

  /**
   * List names of all registered providers.
   */
  getRegisteredProviderNames(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check health status of all registered providers.
   */
  async checkAllHealth(organizationId: string): Promise<Record<string, { active: boolean; latencyMs: number }>> {
    const results: Record<string, { active: boolean; latencyMs: number }> = {};
    for (const [name, provider] of this.registry.entries()) {
      try {
        results[name] = await provider.testConnection(organizationId);
      } catch (err: any) {
        results[name] = { active: false, latencyMs: -1 };
      }
    }
    return results;
  }
}
