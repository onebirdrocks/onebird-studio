import type { Provider } from '../../types/api';
import type { ApiService } from '../../types/api';

/**
 * 服务构造器类型
 */
export type ServiceConstructor = new () => ApiService;

/**
 * API 服务工厂类
 * 使用单例模式管理服务实例
 */
export class ApiServiceFactory {
  private static instance: ApiServiceFactory;
  private serviceInstances: Map<Provider, ApiService>;
  private serviceRegistry: Map<Provider, ServiceConstructor>;

  private constructor() {
    this.serviceInstances = new Map();
    this.serviceRegistry = new Map();
  }

  /**
   * 获取工厂实例
   */
  public static getInstance(): ApiServiceFactory {
    if (!ApiServiceFactory.instance) {
      ApiServiceFactory.instance = new ApiServiceFactory();
    }
    return ApiServiceFactory.instance;
  }

  /**
   * 注册服务提供商
   * @param provider API 提供商
   * @param ServiceClass 服务类构造器
   * @throws Error 如果提供商已注册
   */
  public registerService(provider: Provider, ServiceClass: ServiceConstructor): void {
    if (this.serviceRegistry.has(provider)) {
      throw new Error(`Provider ${provider} is already registered`);
    }
    this.serviceRegistry.set(provider, ServiceClass);
  }

  /**
   * 取消注册服务提供商
   * @param provider API 提供商
   * @throws Error 如果提供商未注册
   */
  public unregisterService(provider: Provider): void {
    if (!this.serviceRegistry.has(provider)) {
      throw new Error(`Provider ${provider} is not registered`);
    }
    this.serviceRegistry.delete(provider);
    this.serviceInstances.delete(provider);
  }

  /**
   * 获取指定提供商的服务实例
   * @param provider API 提供商
   * @returns API 服务实例
   * @throws Error 如果提供商未注册
   */
  public getService(provider: Provider): ApiService {
    let service = this.serviceInstances.get(provider);

    if (!service) {
      service = this.createService(provider);
      this.serviceInstances.set(provider, service);
    }

    return service;
  }

  /**
   * 创建服务实例
   * @param provider API 提供商
   * @returns 新的服务实例
   * @throws Error 如果提供商未注册
   */
  private createService(provider: Provider): ApiService {
    const ServiceClass = this.serviceRegistry.get(provider);
    if (!ServiceClass) {
      throw new Error(`Provider ${provider} is not registered`);
    }
    return new ServiceClass();
  }

  /**
   * 重置指定提供商的服务实例
   * @param provider API 提供商
   */
  public resetService(provider: Provider): void {
    this.serviceInstances.delete(provider);
  }

  /**
   * 重置所有服务实例
   */
  public resetAllServices(): void {
    this.serviceInstances.clear();
  }

  /**
   * 检查提供商是否已注册
   * @param provider API 提供商
   * @returns 是否已注册
   */
  public isRegistered(provider: Provider): boolean {
    return this.serviceRegistry.has(provider);
  }

  /**
   * 检查提供商是否已初始化
   * @param provider API 提供商
   * @returns 是否已初始化
   */
  public hasService(provider: Provider): boolean {
    return this.serviceInstances.has(provider);
  }

  /**
   * 获取所有已初始化的服务实例
   * @returns 服务实例映射
   */
  public getAllServices(): Map<Provider, ApiService> {
    return new Map(this.serviceInstances);
  }

  /**
   * 获取所有已注册的服务提供商
   * @returns 提供商列表
   */
  public getRegisteredProviders(): Provider[] {
    return Array.from(this.serviceRegistry.keys());
  }
} 