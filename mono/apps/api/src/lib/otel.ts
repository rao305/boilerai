import { NodeSDK } from '@opentelemetry/sdk-node'
import { auto } from '@opentelemetry/auto-instrumentations-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { metrics, trace } from '@opentelemetry/api'

let sdk: NodeSDK | undefined

export function initOtel() {
  if (sdk || process.env.NODE_ENV !== 'production') {
    return
  }

  const prometheusExporter = new PrometheusExporter({
    port: 9464,
  })

  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  })

  sdk = new NodeSDK({
    instrumentations: [auto()],
    traceExporter: jaegerExporter,
    metricReader: prometheusExporter,
    serviceName: 'boiler-ai-api',
    serviceVersion: '1.0.0',
  })

  try {
    sdk.start()
    console.log('🔍 OpenTelemetry initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry', error)
  }
}

export function getTracer(name: string) {
  return trace.getTracer(name, '1.0.0')
}

export function getMeter(name: string) {
  return metrics.getMeter(name, '1.0.0')
}

export const observability = {
  initOtel,
  getTracer,
  getMeter,
}