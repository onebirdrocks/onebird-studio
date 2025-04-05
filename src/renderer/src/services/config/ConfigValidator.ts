import {
  BaseServiceConfig,
  OpenAIServiceConfig,
  OllamaServiceConfig,
  DeepSeekServiceConfig,
  Provider
} from '../../types/api';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 配置验证器
 */
export class ConfigValidator {
  /**
   * 验证基础配置
   */
  private static validateBaseConfig(config: BaseServiceConfig): ValidationResult {
    const errors: string[] = [];

    if (config.timeout !== undefined && config.timeout <= 0) {
      errors.push('超时时间必须大于 0');
    }

    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      errors.push('最大重试次数不能为负数');
    }

    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('基础 URL 格式无效');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 OpenAI 配置
   */
  private static validateOpenAIConfig(config: OpenAIServiceConfig): ValidationResult {
    const baseResult = this.validateBaseConfig(config);
    const errors = [...baseResult.errors];

    if (config.apiKey && config.apiKey.trim().length < 32) {
      errors.push('OpenAI API 密钥长度不足');
    }

    if (config.organization && !/^org-[a-zA-Z0-9]{24}$/.test(config.organization)) {
      errors.push('组织 ID 格式无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 Ollama 配置
   */
  private static validateOllamaConfig(config: OllamaServiceConfig): ValidationResult {
    const baseResult = this.validateBaseConfig(config);
    const errors = [...baseResult.errors];

    if (config.localPort !== undefined) {
      if (!Number.isInteger(config.localPort)) {
        errors.push('端口号必须是整数');
      } else if (config.localPort <= 0 || config.localPort > 65535) {
        errors.push('端口号必须在 1-65535 之间');
      }
    }

    // 如果没有指定 baseUrl，检查是否指定了 localPort
    if (!config.baseUrl && !config.localPort) {
      errors.push('必须指定 baseUrl 或 localPort');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 DeepSeek 配置
   */
  private static validateDeepSeekConfig(config: DeepSeekServiceConfig): ValidationResult {
    const baseResult = this.validateBaseConfig(config);
    const errors = [...baseResult.errors];

    if (config.apiKey && config.apiKey.trim().length < 32) {
      errors.push('DeepSeek API 密钥长度不足');
    }

    if (config.apiVersion && !/^v\d+(\.\d+)*$/.test(config.apiVersion)) {
      errors.push('API 版本格式无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证配置
   * @param provider API 提供商
   * @param config 配置对象
   * @returns 验证结果
   */
  public static validate(provider: Provider, config: BaseServiceConfig): ValidationResult {
    switch (provider) {
      case 'openai':
        return this.validateOpenAIConfig(config as OpenAIServiceConfig);
      case 'ollama':
        return this.validateOllamaConfig(config as OllamaServiceConfig);
      case 'deepseek':
        return this.validateDeepSeekConfig(config as DeepSeekServiceConfig);
      default:
        return this.validateBaseConfig(config);
    }
  }
} 