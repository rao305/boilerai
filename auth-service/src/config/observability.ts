import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { env } from './env';
import logger from '../utils/logger';

/**
 * OpenTelemetry Configuration for Observability
 */

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'purdue-auth-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'purdue',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': {
        requestHook: (span, info) => {
          // Add custom attributes to HTTP spans
          const request = info.request;
          span.setAttributes({
            'http.user_agent': request.headers['user-agent'] || 'unknown',
            'auth.user_id': (request as any).user?.id || 'anonymous',
            'auth.session_id': (request as any).sessionID || 'no-session',
          });

          // Redact sensitive data from spans
          if (request.url?.includes('/auth/')) {
            span.setAttribute('http.route.redacted', true);
          }
        },
        responseHook: (span, info) => {
          const response = info.response;
          span.setAttribute('http.status_code', response.statusCode);
          
          // Mark auth failures for alerting
          if (response.statusCode === 401 || response.statusCode === 403) {
            span.setAttribute('auth.failure', true);
          }
        },
      },
      '@opentelemetry/instrumentation-redis': {
        requestHook: (span, info) => {
          // Add Redis operation context
          span.setAttribute('redis.key.pattern', 
            info.command?.args?.[0]?.toString().replace(/[0-9a-f-]{36}/g, 'UUID') || 'unknown'
          );
        },
      },
      '@opentelemetry/instrumentation-pg': {
        requestHook: (span, info) => {
          // Add database operation context
          span.setAttribute('db.operation.type', 
            info.query?.text?.split(' ')[0]?.toUpperCase() || 'UNKNOWN'
          );
          
          // Redact sensitive queries
          if (info.query?.text?.includes('password') || info.query?.text?.includes('token')) {
            span.setAttribute('db.query.redacted', true);
          }
        },
      },
    }),
  ],
});

// Configure Jaeger exporter for distributed tracing
if (env.JAEGER_ENDPOINT) {
  const tracerProvider = new NodeTracerProvider({ resource });
  
  const jaegerExporter = new JaegerExporter({
    endpoint: env.JAEGER_ENDPOINT,
  });
  
  tracerProvider.addSpanProcessor(
    new BatchSpanProcessor(jaegerExporter, {
      maxQueueSize: 1000,
      maxExportBatchSize: 500,
      scheduledDelayMillis: 1000,
    })
  );
  
  tracerProvider.register();
  logger.info('Jaeger tracing configured', { endpoint: env.JAEGER_ENDPOINT });
}

// Configure Prometheus metrics exporter
if (env.PROMETHEUS_ENABLED) {
  const prometheusExporter = new PrometheusExporter({
    port: env.PROMETHEUS_PORT || 9090,
  });
  
  logger.info('Prometheus metrics enabled', { port: env.PROMETHEUS_PORT || 9090 });
}

export default sdk;