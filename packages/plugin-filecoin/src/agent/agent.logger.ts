// agent.logger.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, type Tracer, type Span, context, Context } from '@opentelemetry/api';

// Initialize the tracer provider
const exporter = new OTLPTraceExporter();
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'filecoin-plugin',
  }),
  traceExporter: exporter,
  spanProcessor: new SimpleSpanProcessor(exporter),
});
// No changes needed here.
// Initialize the SDK
sdk.start();

// Get the tracer
const tracer: Tracer = trace.getTracer('filecoin-daw-agent', '0.1.0');

// Logger class with tracing support
export class Logger {
  private tracer: Tracer;

  constructor() {
    this.tracer = tracer;
  }

  // Generic method to start a span and execute a callback
  private withSpan<T>(name: string, fn: (span: Span) => T): T {
    return this.tracer.startActiveSpan(name, (span) => {
      try {
        const result = fn(span);
        span.end();
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message }); // Error status
        span.end();
        throw error;
      }
    });
  }

  // Info log with tracing
  info(message: string, ...meta: any[]): void {
    this.withSpan('info-log', (span) => {
      span.setAttribute('log.level', 'info');
      span.setAttribute('log.message', message);
      if (meta.length) span.setAttribute('log.meta', JSON.stringify(meta));
      console.log('[INFO]', message, ...meta);
    });
  }

  // Error log with tracing
  error(message: string, error?: Error | string, ...meta: any[]): void {
    this.withSpan('error-log', (span) => {
      span.setAttribute('log.level', 'error');
      span.setAttribute('log.message', message);
      if (error) {
        const errorStr = typeof error === 'string' ? error : error.message;
        span.recordException(typeof error === 'string' ? new Error(error) : error);
        span.setAttribute('error.message', errorStr);
      }
      if (meta.length) span.setAttribute('log.meta', JSON.stringify(meta));
      console.error('[ERROR]', message, error, ...meta);
    });
  }

  // Warn log with tracing
  warn(message: string, ...meta: any[]): void {
    this.withSpan('warn-log', (span) => {
      span.setAttribute('log.level', 'warn');
      span.setAttribute('log.message', message);
      if (meta.length) span.setAttribute('log.meta', JSON.stringify(meta));
      console.warn('[WARN]', message, ...meta);
    });
  }

  // Execute a function within a traced span
  trace<T>(operationName: string, fn: (span: Span) => Promise<T> | T): Promise<T> {
    return this.withSpan(operationName, async (span) => {
      const result = await Promise.resolve(fn(span));
      return result;
    });
  }

  // Shutdown the tracer
  async shutdown(): Promise<void> {
    await sdk.shutdown();
  }
}

// Singleton logger instance
export const logger = new Logger();

// Example usage
if (require.main === module) {
  logger.info('Starting agent logger');
  logger.trace('test-operation', async (span) => {
    span.setAttribute('test.key', 'value');
    logger.info('Inside traced operation');
    throw new Error('Test error');
  }).catch((err) => logger.error('Operation failed', err));
  logger.shutdown();
}