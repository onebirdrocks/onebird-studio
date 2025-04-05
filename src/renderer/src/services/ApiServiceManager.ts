import type { Message } from '../types/chat';
import type { ApiModel, ChatCallbacks, Provider, ServiceConfigMap } from '../types/api';
import type { ServiceConstructor } from './factory/ApiServiceFactory';
import type { ValidationResult } from './config/ConfigValidator';
import { ApiServiceFactory } from './factory/ApiServiceFactory';
import { initializeDefaultServices } from './factory/ServiceRegistry';
import { ServiceConfigManager } from './config/ServiceConfigManager';

/**
 * API 服务管理器
 * 提供简单的接口来使用各种 API 服务
 */
export class ApiServiceManager {
  private static instance: ApiServiceManager;
  private factory: ApiServiceFactory;
  private configManager: ServiceConfigManager;

  private constructor() {
    this.factory = ApiServiceFactory.getInstance();
    this.configManager = ServiceConfigManager.getInstance();
    // 初始化默认服务
    initializeDefaultServices();
  }

  /**
   * 获取管理器实例
   */
  public static getInstance(): ApiServiceManager {
    if (!ApiServiceManager.instance) {
      ApiServiceManager.instance = new ApiServiceManager();
    }
    return ApiServiceManager.instance;
  }

  /**
   * 注册新的服务提供商
   * @param provider API 提供商
   * @param ServiceClass 服务类构造器
   */
  public registerService(provider: Provider, ServiceClass: ServiceConstructor): void {
    this.factory.registerService(provider, ServiceClass);
  }

  /**
   * 取消注册服务提供商
   * @param provider API 提供商
   */
  public unregisterService(provider: Provider): void {
    this.factory.unregisterService(provider);
  }

  /**
   * 获取所有已注册的服务提供商
   * @returns 提供商列表
   */
  public getRegisteredProviders(): Provider[] {
    return this.factory.getRegisteredProviders();
  }

  /**
   * 检查提供商是否已注册
   * @param provider API 提供商
   * @returns 是否已注册
   */
  public isServiceRegistered(provider: Provider): boolean {
    return this.factory.isRegistered(provider);
  }

  /**
   * 获取指定提供商的模型列表
   * @param provider API 提供商
   * @returns 模型列表
   * @throws Error 如果提供商未注册
   */
  public async getModels(provider: Provider): Promise<ApiModel[]> {
    const service = this.factory.getService(provider);
    return service.getModels();
  }

  /**
   * 检查指定提供商的服务是否可用
   * @param provider API 提供商
   * @returns 服务是否可用
   * @throws Error 如果提供商未注册
   */
  public async checkAvailable(provider: Provider): Promise<boolean> {
    const service = this.factory.getService(provider);
    return service.checkAvailable();
  }

  /**
   * 检查指定提供商的 API 密钥是否有效
   * @param provider API 提供商
   * @param apiKey API 密钥
   * @returns API 密钥是否有效
   * @throws Error 如果提供商未注册
   */
  public async checkApiKey(provider: Provider, apiKey: string): Promise<boolean> {
    const service = this.factory.getService(provider);
    if (service.checkApiKey) {
      return service.checkApiKey(apiKey);
    }
    return false;
  }

  /**
   * 发送聊天消息
   * @param provider API 提供商
   * @param modelId 模型 ID
   * @param messages 消息列表
   * @param callbacks 回调函数
   * @param signal 取消信号
   * @throws Error 如果提供商未注册
   */
  public async chat(
    provider: Provider,
    modelId: string,
    messages: Message[],
    callbacks: ChatCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const service = this.factory.getService(provider);
    await service.chat(modelId, messages, callbacks, signal);
  }

  /**
   * 重置指定提供商的服务实例
   * @param provider API 提供商
   */
  public resetService(provider: Provider): void {
    this.factory.resetService(provider);
  }

  /**
   * 重置所有服务实例
   */
  public resetAllServices(): void {
    this.factory.resetAllServices();
  }

  /**
   * 获取指定提供商的配置
   * @param provider API 提供商
   * @returns 服务配置
   */
  public getServiceConfig<T extends Provider>(provider: T): ServiceConfigMap[T] | undefined {
    return this.configManager.getConfig(provider);
  }

  /**
   * 验证服务配置
   * @param provider API 提供商
   * @param config 配置对象
   * @returns 验证结果
   */
  public validateServiceConfig<T extends Provider>(
    provider: T,
    config: Partial<ServiceConfigMap[T]>
  ): ValidationResult {
    const currentConfig = this.configManager.getConfig(provider);
    const fullConfig = {
      ...currentConfig,
      ...config
    } as ServiceConfigMap[T];
    return this.configManager.validateConfig(provider, fullConfig);
  }

  /**
   * 更新指定提供商的配置
   * @param provider API 提供商
   * @param config 新的配置
   * @throws Error 如果配置验证失败
   */
  public updateServiceConfig<T extends Provider>(
    provider: T,
    config: Partial<ServiceConfigMap[T]>
  ): void {
    try {
      this.configManager.updateConfig(provider, config);
      // 重置服务实例以应用新配置
      this.resetService(provider);
    } catch (error) {
      throw new Error(`更新服务配置失败: ${(error as Error).message}`);
    }
  }

  /**
   * 重置指定提供商的配置
   * @param provider API 提供商
   */
  public resetServiceConfig(provider: Provider): void {
    this.configManager.resetConfig(provider);
    this.resetService(provider);
  }

  /**
   * 重置所有服务配置
   */
  public resetAllServiceConfigs(): void {
    this.configManager.resetAllConfigs();
    this.resetAllServices();
  }
} 