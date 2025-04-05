import {
  ConfigEventType,
  ConfigEventData,
  ConfigEventHandler,
  ConfigEventSubscription,
  EventFilter,
  EventFilterConfig
} from '../../types/config';
import { Provider } from '../../types/api';
import { EventFilterFactory } from './EventFilter';

/**
 * 配置事件管理器
 * 管理配置变更事件的发布和订阅
 */
export class ConfigEventManager {
  private static instance: ConfigEventManager;
  private subscribers: Map<string, Set<{
    handler: ConfigEventHandler;
    filter?: EventFilter;
  }>>;

  private constructor() {
    this.subscribers = new Map();
  }

  /**
   * 获取事件管理器实例
   */
  public static getInstance(): ConfigEventManager {
    if (!ConfigEventManager.instance) {
      ConfigEventManager.instance = new ConfigEventManager();
    }
    return ConfigEventManager.instance;
  }

  /**
   * 订阅配置事件
   * @param handler 事件处理器
   * @param options 订阅选项
   * @returns 取消订阅的函数
   */
  public subscribe(
    handler: ConfigEventHandler,
    options: ConfigEventSubscription = {}
  ): () => void {
    const key = this.getSubscriptionKey(options);
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    // 创建过滤器
    let filter: EventFilter | undefined;
    if (options.filter) {
      filter = options.filter instanceof Object && 'apply' in options.filter
        ? options.filter
        : EventFilterFactory.createFilter(options.filter as EventFilterConfig);
    }

    const subscriber = { handler, filter };
    this.subscribers.get(key)!.add(subscriber);

    // 返回取消订阅函数
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(subscriber);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * 发布配置事件
   * @param event 事件数据
   */
  public publish(event: ConfigEventData): void {
    const timestamp = Date.now();
    const eventWithTimestamp = { ...event, timestamp };

    // 获取所有匹配的订阅键
    const keys = this.getMatchingKeys(event);

    // 通知所有匹配的订阅者
    keys.forEach(key => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.forEach(({ handler, filter }) => {
          try {
            // 应用过滤器
            if (!filter || filter.apply(eventWithTimestamp)) {
              handler(eventWithTimestamp);
            }
          } catch (error) {
            console.error('配置事件处理器执行失败:', error);
          }
        });
      }
    });
  }

  /**
   * 获取订阅键
   * @param options 订阅选项
   * @returns 订阅键
   */
  private getSubscriptionKey(options: ConfigEventSubscription): string {
    const { provider, eventTypes } = options;
    const parts: string[] = [];

    if (provider) {
      parts.push(`provider:${provider}`);
    }

    if (eventTypes && eventTypes.length > 0) {
      parts.push(`events:${eventTypes.sort().join(',')}`);
    }

    return parts.length > 0 ? parts.join('|') : '*';
  }

  /**
   * 获取匹配的订阅键
   * @param event 事件数据
   * @returns 匹配的订阅键数组
   */
  private getMatchingKeys(event: ConfigEventData): string[] {
    const keys: string[] = ['*']; // 通配符订阅

    if (event.provider) {
      keys.push(`provider:${event.provider}`);
    }

    const eventKey = `events:${event.eventType}`;
    keys.push(eventKey);

    if (event.provider) {
      keys.push(`provider:${event.provider}|${eventKey}`);
    }

    return keys;
  }

  /**
   * 清除所有订阅
   */
  public clear(): void {
    this.subscribers.clear();
  }

  /**
   * 获取当前订阅数量
   */
  public getSubscriberCount(): number {
    let count = 0;
    for (const subscribers of this.subscribers.values()) {
      count += subscribers.size;
    }
    return count;
  }
} 