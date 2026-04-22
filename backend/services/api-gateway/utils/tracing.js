import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

export const initTracing = () => {
    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter(),
        instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
    });

    sdk.start();
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        sdk.shutdown().then(() => console.log('Tracing shut down'));
    });
};