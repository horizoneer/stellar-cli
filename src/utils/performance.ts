/**
 * Performance monitoring for API calls
 */

interface PerformanceMetric {
  endpoint: string;
  duration: number;
  timestamp: number;
  success: boolean;
  statusCode?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get average response time for an endpoint
   */
  getAverageResponseTime(endpoint: string): number {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint && m.success);
    if (endpointMetrics.length === 0) return 0;
    
    const total = endpointMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / endpointMetrics.length;
  }

  /**
   * Get success rate for an endpoint
   */
  getSuccessRate(endpoint: string): number {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    if (endpointMetrics.length === 0) return 1;
    
    const successful = endpointMetrics.filter(m => m.success).length;
    return successful / endpointMetrics.length;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.endpoint === endpoint);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get performance summary Statistics
   */
  getSummary(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    slowestEndpoint: { endpoint: string; avgTime: number } | null;
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    
    const avgResponseTime = total > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;

    // Find slowest endpoint
    const endpointTimes = new Map<string, { total: number; count: number }>();
    this.metrics.forEach(m => {
      const current = endpointTimes.get(m.endpoint) || { total: 0, count: 0 };
      endpointTimes.set(m.endpoint, {
        total: current.total + m.duration,
        count: current.count + 1
      });
    });

    let slowestEndpoint: { endpoint: string; avgTime: number } | null = null;
    let maxAvgTime = 0;

    endpointTimes.forEach((data, endpoint) => {
      const avgTime = data.total / data.count;
      if (avgTime > maxAvgTime) {
        maxAvgTime = avgTime;
        slowestEndpoint = { endpoint, avgTime };
      }
    });

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: avgResponseTime,
      slowestEndpoint
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator to measure function performance
 */
export function measurePerformance(endpoint: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = false;
      let statusCode: number | undefined;

      try {
        const result = await originalMethod.apply(this, args);
        success = true;
        return result;
      } catch (error: any) {
        statusCode = error.response?.status;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        performanceMonitor.recordMetric({
          endpoint,
          duration,
          timestamp: Date.now(),
          success,
          statusCode
        });
      }
    };

    return descriptor;
  };
}
