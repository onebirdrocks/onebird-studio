import { BaseServiceConfig, Provider, ServiceConfigMap } from '../../types/api';

/**
 * 服务配置管理器
 * 管理所有 API 服务的配置
 */
export class ServiceConfigManager {
  private static instance: ServiceConfigManager;
  private configs: Partial<ServiceConfigMap>;
  private readonly STORAGE_KEY = 'api_service_configs';

  private constructor() {
    this.configs = {};
    this.loadConfigs();
  }

  /**
   * 获取配置管理器实例
   */
  public static getInstance(): ServiceConfigManager {
    if (!ServiceConfigManager.instance) {
      ServiceConfigManager.instance = new ServiceConfigManager();
    }
    return ServiceConfigManager.instance;
  }

  /**
   * 获取指定提供商的配置
   */
  public getConfig<T extends Provider>(provider: T): ServiceConfigMap[T] | undefined {
    return this.configs[provider] as ServiceConfigMap[T];
  }

  /**
   * 更新指定提供商的配置
   */
  public updateConfig<T extends Provider>(
    provider: T,
    config: Partial<ServiceConfigMap[T]>
  ): void {
    const newConfig = {
      ...this.configs[provider],
      ...config
    } as ServiceConfigMap[T];

    // 基本验证
    if (!this.validateConfig(newConfig)) {
      throw new Error('配置验证失败');
    }

    this.configs[provider] = newConfig;
    this.saveConfigs();
  }

  /**
   * 重置指定提供商的配置
   */
  public resetConfig(provider: Provider): void {
    delete this.configs[provider];
    this.saveConfigs();
  }

  /**
   * 重置所有配置
   */
  public resetAllConfigs(): void {
    this.configs = {};
    this.saveConfigs();
  }

  /**
   * 基本配置验证
   */
  private validateConfig(config: BaseServiceConfig): boolean {
    if (config.timeout && config.timeout <= 0) return false;
    if (config.maxRetries && config.maxRetries < 0) return false;
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * 从本地存储加载配置
   */
  private loadConfigs(): void {
    try {
      const savedConfigs = localStorage.getItem(this.STORAGE_KEY);
      if (savedConfigs) {
        this.configs = JSON.parse(savedConfigs);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveConfigs(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.configs));
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }
} 