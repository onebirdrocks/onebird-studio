import { ServiceConfigMap, Provider } from './api';

/**
 * 配置版本信息
 */
export interface ConfigVersion {
  version: string;
  timestamp: number;
}

/**
 * 带版本的配置数据
 */
export interface VersionedConfig {
  version: string;
  configs: Partial<ServiceConfigMap>;
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  error?: string;
  migrated: boolean;
  fromVersion: string;
  toVersion: string;
}

/**
 * 迁移函数类型
 */
export type MigrationFn = (config: any) => Promise<Partial<ServiceConfigMap>>;

/**
 * 迁移规则
 */
export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  migrate: MigrationFn;
}

/**
 * 配置变更事件类型
 */
export enum ConfigEventType {
  Updated = 'updated',
  Reset = 'reset',
  Imported = 'imported',
  Migrated = 'migrated'
}

/**
 * 配置变更事件数据
 */
export interface ConfigEventData<T = any> {
  provider?: Provider;
  eventType: ConfigEventType;
  oldValue?: T;
  newValue?: T;
  timestamp: number;
}

/**
 * 配置事件处理器
 */
export type ConfigEventHandler = (event: ConfigEventData) => void;

/**
 * 事件过滤条件类型
 */
export type EventFilterPredicate = (event: ConfigEventData) => boolean;

/**
 * 事件过滤器配置
 */
export interface EventFilterConfig {
  provider?: Provider | Provider[];
  eventTypes?: ConfigEventType[];
  timeRange?: {
    start?: number;
    end?: number;
  };
  valueChanged?: boolean;
  customPredicate?: EventFilterPredicate;
}

/**
 * 事件过滤器接口
 */
export interface EventFilter {
  apply(event: ConfigEventData): boolean;
  and(other: EventFilter): EventFilter;
  or(other: EventFilter): EventFilter;
  not(): EventFilter;
}

/**
 * 配置事件订阅选项（扩展）
 */
export interface ConfigEventSubscription {
  provider?: Provider;
  eventTypes?: ConfigEventType[];
  filter?: EventFilterConfig | EventFilter;
} 