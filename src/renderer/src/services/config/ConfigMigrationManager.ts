import { ServiceConfigMap } from '../../types/api';
import {
  ConfigVersion,
  VersionedConfig,
  MigrationResult,
  MigrationRule
} from '../../types/config';

/**
 * 配置迁移管理器
 */
export class ConfigMigrationManager {
  private static instance: ConfigMigrationManager;
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly VERSION_KEY = 'api_service_config_version';
  private migrationRules: MigrationRule[] = [];

  private constructor() {
    this.initializeMigrationRules();
  }

  /**
   * 获取迁移管理器实例
   */
  public static getInstance(): ConfigMigrationManager {
    if (!ConfigMigrationManager.instance) {
      ConfigMigrationManager.instance = new ConfigMigrationManager();
    }
    return ConfigMigrationManager.instance;
  }

  /**
   * 初始化迁移规则
   */
  private initializeMigrationRules(): void {
    // 添加迁移规则示例
    this.addMigrationRule({
      fromVersion: '0.0.0',
      toVersion: '1.0.0',
      migrate: this.migrateFromLegacy
    });
  }

  /**
   * 添加迁移规则
   */
  public addMigrationRule(rule: MigrationRule): void {
    this.migrationRules.push(rule);
  }

  /**
   * 获取当前配置版本
   */
  public getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * 检查并迁移配置
   * @param savedData 保存的配置数据
   * @returns 迁移结果和迁移后的配置
   */
  public async checkAndMigrate(savedData: string): Promise<{
    result: MigrationResult;
    config: Partial<ServiceConfigMap>;
  }> {
    try {
      let config: any;
      let currentVersion = '0.0.0';

      try {
        const versionedConfig = JSON.parse(savedData) as VersionedConfig;
        currentVersion = versionedConfig.version;
        config = versionedConfig.configs;
      } catch {
        // 如果解析失败，假设是旧版本配置
        config = JSON.parse(savedData);
      }

      if (currentVersion === this.CURRENT_VERSION) {
        return {
          result: {
            success: true,
            migrated: false,
            fromVersion: currentVersion,
            toVersion: currentVersion
          },
          config
        };
      }

      const migrationPath = this.findMigrationPath(currentVersion, this.CURRENT_VERSION);
      if (!migrationPath.length) {
        throw new Error(`无法找到从版本 ${currentVersion} 到 ${this.CURRENT_VERSION} 的迁移路径`);
      }

      let migratedConfig = config;
      for (const rule of migrationPath) {
        migratedConfig = await rule.migrate(migratedConfig);
      }

      this.saveVersion();

      return {
        result: {
          success: true,
          migrated: true,
          fromVersion: currentVersion,
          toVersion: this.CURRENT_VERSION
        },
        config: migratedConfig
      };
    } catch (error) {
      return {
        result: {
          success: false,
          error: (error as Error).message,
          migrated: false,
          fromVersion: '0.0.0',
          toVersion: this.CURRENT_VERSION
        },
        config: {}
      };
    }
  }

  /**
   * 保存当前配置版本
   */
  private saveVersion(): void {
    const versionInfo: ConfigVersion = {
      version: this.CURRENT_VERSION,
      timestamp: Date.now()
    };
    localStorage.setItem(this.VERSION_KEY, JSON.stringify(versionInfo));
  }

  /**
   * 查找迁移路径
   */
  private findMigrationPath(fromVersion: string, toVersion: string): MigrationRule[] {
    const path: MigrationRule[] = [];
    let current = fromVersion;

    while (current !== toVersion) {
      const nextRule = this.migrationRules.find(rule => rule.fromVersion === current);
      if (!nextRule) break;

      path.push(nextRule);
      current = nextRule.toVersion;
    }

    return path;
  }

  /**
   * 从旧版本迁移配置的示例
   */
  private async migrateFromLegacy(oldConfig: any): Promise<Partial<ServiceConfigMap>> {
    const newConfig: Partial<ServiceConfigMap> = {};

    // 处理 OpenAI 配置
    if (oldConfig.openai) {
      newConfig.openai = {
        apiKey: oldConfig.openai.apiKey,
        baseUrl: oldConfig.openai.baseUrl || 'https://api.openai.com/v1',
        organization: oldConfig.openai.orgId, // 字段名变更示例
        timeout: oldConfig.openai.timeout || 30000,
        maxRetries: oldConfig.openai.retries || 3 // 字段名变更示例
      };
    }

    // 处理 Ollama 配置
    if (oldConfig.ollama) {
      newConfig.ollama = {
        baseUrl: oldConfig.ollama.url || 'http://localhost:11434', // 字段名变更示例
        localPort: oldConfig.ollama.port || 11434,
        timeout: oldConfig.ollama.timeout || 30000
      };
    }

    return newConfig;
  }
} 