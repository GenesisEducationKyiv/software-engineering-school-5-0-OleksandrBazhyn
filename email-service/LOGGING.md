# Logging and Monitoring Development Guide

## Quick Start

1. **Run the service**:
   ```bash
   npm run dev
   ```

2. **Check logs**:
   ```bash
   # Real-time logs in console
   tail -f logs/dev.log
   
   # Error logs only
   tail -f logs/dev-error.log
   ```

3. **View metrics**:
   ```bash
   curl http://localhost:3000/metrics
   ```

4. **Health check**:
   ```bash
   curl http://localhost:3000/health
   ```

## Development Guidelines

### Adding New Logs

```typescript
import { createLogger } from '../logger/index.js';

const logger = createLogger('YourServiceName');

// Good logging practices
logger.info('Operation started', {
  email: 'user@example.com',
  operation: 'send_email',
  metadata: { template: 'welcome' }
});

logger.error('Operation failed', {
  email: 'user@example.com',
  operation: 'send_email',
  error: error.message,
  stack: error.stack,
  duration: Date.now() - startTime
});
```

### Adding New Metrics

```typescript
import { metrics } from '../metrics/index.js';

// Counter - for counting events
metrics.emailsSentTotal.inc({ type: 'welcome', template: 'welcome' });

// Histogram - for measuring durations
const timer = metrics.emailProcessingDuration.startTimer({ type: 'welcome' });
// ... do work ...
timer();

// Gauge - for current values
metrics.emailQueueSize.set(currentQueueSize);
```

### Log Levels

- **DEBUG**: Detailed diagnostic info (only in development)
- **INFO**: Normal operations, successful completions
- **WARN**: Potential issues, retries, 4xx responses
- **ERROR**: Failures, exceptions, 5xx responses

### Structured Logging Fields

Always include relevant context:
- `email`: User email (masked automatically)
- `requestId`: Request correlation ID
- `duration`: Operation duration in milliseconds
- `error`: Error message
- `stack`: Stack trace for errors
- `metadata`: Additional context

## Testing Logging

```bash
# Run the test suite
npm test

# Test specific logging functionality
npm run test:unit -- --testPathPattern=logging
```

## Production Considerations

1. **Log Sampling**: 10% sampling for INFO/DEBUG in production
2. **Error Logs**: Always logged at 100%
3. **PII Protection**: Email addresses are automatically masked
4. **Performance**: Structured JSON logging for better parsing
5. **Retention**: Follow the retention policy in README.md

## Troubleshooting

### High Log Volume
- Check sampling configuration in `prod-logger.ts`
- Review log levels in application code
- Consider increasing sampling rate for specific services

### Missing Metrics
- Verify metrics are properly registered in `metrics/index.ts`
- Check Prometheus endpoint: `/metrics`
- Ensure metric labels are consistent

### Log File Issues
- Check disk space: `df -h`
- Verify log rotation is working
- Check file permissions on logs directory
