import {
  ConfigEventData,
  ConfigEventType,
  EventFilter,
  EventFilterConfig,
  EventFilterPredicate
} from '../../types/config';
import { Provider } from '../../types/api';

/**
 * 基础事件过滤器实现
 */
export class BaseEventFilter implements EventFilter {
  constructor(private predicate: EventFilterPredicate) {}

  public apply(event: ConfigEventData): boolean {
    return this.predicate(event);
  }

  public and(other: EventFilter): EventFilter {
    return new BaseEventFilter(event => this.apply(event) && other.apply(event));
  }

  public or(other: EventFilter): EventFilter {
    return new BaseEventFilter(event => this.apply(event) || other.apply(event));
  }

  public not(): EventFilter {
    return new BaseEventFilter(event => !this.apply(event));
  }
}

/**
 * 事件过滤器工厂
 */
export class EventFilterFactory {
  /**
   * 创建事件过滤器
   * @param config 过滤器配置
   * @returns 事件过滤器
   */
  public static createFilter(config: EventFilterConfig): EventFilter {
    const predicates: EventFilterPredicate[] = [];

    // 提供商过滤
    if (config.provider) {
      const providers = Array.isArray(config.provider) ? config.provider : [config.provider];
      predicates.push(event => !event.provider || providers.includes(event.provider));
    }

    // 事件类型过滤
    if (config.eventTypes && config.eventTypes.length > 0) {
      predicates.push(event => config.eventTypes!.includes(event.eventType));
    }

    // 时间范围过滤
    if (config.timeRange) {
      const { start, end } = config.timeRange;
      if (start !== undefined) {
        predicates.push(event => event.timestamp >= start);
      }
      if (end !== undefined) {
        predicates.push(event => event.timestamp <= end);
      }
    }

    // 值变更过滤
    if (config.valueChanged) {
      predicates.push(event => {
        if (!event.oldValue || !event.newValue) return false;
        return JSON.stringify(event.oldValue) !== JSON.stringify(event.newValue);
      });
    }

    // 自定义过滤条件
    if (config.customPredicate) {
      predicates.push(config.customPredicate);
    }

    // 组合所有过滤条件
    return new BaseEventFilter(event => predicates.every(predicate => predicate(event)));
  }

  /**
   * 创建提供商过滤器
   * @param provider 提供商
   * @returns 事件过滤器
   */
  public static byProvider(provider: Provider | Provider[]): EventFilter {
    return this.createFilter({ provider });
  }

  /**
   * 创建事件类型过滤器
   * @param eventTypes 事件类型
   * @returns 事件过滤器
   */
  public static byEventTypes(eventTypes: ConfigEventType[]): EventFilter {
    return this.createFilter({ eventTypes });
  }

  /**
   * 创建时间范围过滤器
   * @param start 开始时间
   * @param end 结束时间
   * @returns 事件过滤器
   */
  public static byTimeRange(start?: number, end?: number): EventFilter {
    return this.createFilter({ timeRange: { start, end } });
  }

  /**
   * 创建值变更过滤器
   * @returns 事件过滤器
   */
  public static byValueChanged(): EventFilter {
    return this.createFilter({ valueChanged: true });
  }

  /**
   * 创建自定义过滤器
   * @param predicate 过滤条件
   * @returns 事件过滤器
   */
  public static custom(predicate: EventFilterPredicate): EventFilter {
    return this.createFilter({ customPredicate: predicate });
  }
} 