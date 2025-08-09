# Weather Service - Monitoring and Logging

## Overview

Weather Service is a microservice that provides weather data through REST API and gRPC interfaces. This document describes the monitoring, logging, alerting, and log retention strategies implemented in the service.

## Logging Implementation

### Log Levels

The service implements comprehensive logging with the following levels:

- **ERROR**: Critical errors that require immediate attention
- **WARN**: Warning conditions that may require monitoring
- **INFO**: General operational messages and successful operations
- **DEBUG**: Detailed diagnostic information (development only)

### Structured Logging

All logs are structured using JSON format in production with the following fields:

```json
{
  "timestamp": "2024-08-05T10:30:00.000Z",
  "level": "info",
  "message": "Weather data retrieved successfully",
  "service": "WeatherProviderManager",
  "requestId": "req_1722856200_abc123",
  "city": "London",
  "duration": 245,
  "provider": "WeatherAPIProvider",
  "environment": "production"
}
```

### Log Sampling

The service implements intelligent log sampling to reduce log volume while maintaining observability:

- **Development**: 100% sampling (all logs)
- **Production**: 
  - ERROR and WARN: 100% sampling (never sampled out)
  - INFO and DEBUG: 10% sampling for high-volume operations
  - Critical operations: Always logged regardless of sampling

### Context Enrichment

Each log entry includes contextual information:
- Request ID for tracing
- Service name
- Duration for performance tracking
- User context (masked for privacy)
- Error stack traces
- Metadata specific to the operation

## Metrics Implementation

### HTTP Metrics

- `weather_service_http_requests_total`: Total HTTP requests by method, route, and status code
- `weather_service_http_request_duration_seconds`: HTTP request duration histogram
- `weather_service_active_connections`: Current active HTTP connections

### Weather Provider Metrics

- `weather_service_provider_requests_total`: Total requests to weather providers by provider and status
- `weather_service_provider_response_time_seconds`: Provider response time histogram
- `weather_service_requests_by_city_total`: Weather requests grouped by city

### Cache Metrics

- `weather_service_cache_operations_total`: Cache operations (hit, miss, set, invalidate) by status
- `weather_service_cache_response_time_seconds`: Cache operation response times

### gRPC Metrics

- `weather_service_grpc_requests_total`: Total gRPC requests by method and status
- `weather_service_grpc_request_duration_seconds`: gRPC request duration histogram

### System Metrics

- `weather_service_errors_total`: Total errors by type and service
- `weather_service_health_status`: Health status of service components (1 = healthy, 0 = unhealthy)
- `weather_service_memory_usage_bytes`: Memory usage by type (RSS, heap, external)

## Alerting Strategy

### Critical Alerts (Immediate Response Required)

#### 1. Service Availability
**Alert**: Service Down
- **Condition**: `weather_service_health_status{component="service"} == 0`
- **Duration**: 30 seconds
- **Severity**: Critical
- **Why**: Complete service unavailability affects all users and requires immediate intervention

#### 2. High Error Rate
**Alert**: High Error Rate
- **Condition**: `rate(weather_service_errors_total[5m]) > 10`
- **Duration**: 2 minutes
- **Severity**: Critical
- **Why**: High error rates indicate system instability and poor user experience

#### 3. Memory Exhaustion
**Alert**: High Memory Usage
- **Condition**: `weather_service_memory_usage_bytes{type="rss"} > 1GB`
- **Duration**: 5 minutes
- **Severity**: Critical
- **Why**: Memory exhaustion can lead to service crashes and instability

#### 4. Provider Failures
**Alert**: All Weather Providers Down
- **Condition**: `rate(weather_service_provider_requests_total{status="success"}[10m]) == 0`
- **Duration**: 5 minutes
- **Severity**: Critical
- **Why**: No successful provider responses means core functionality is broken

### Warning Alerts (Monitor and Plan Response)

#### 5. Cache Service Degradation
**Alert**: Cache Service Unhealthy
- **Condition**: `weather_service_health_status{component="redis"} == 0`
- **Duration**: 5 minutes
- **Severity**: Warning
- **Why**: Cache unavailability increases response times and provider load but service remains functional

#### 6. High Response Times
**Alert**: High Response Times
- **Condition**: `histogram_quantile(0.95, rate(weather_service_http_request_duration_seconds_bucket[5m])) > 2`
- **Duration**: 10 minutes
- **Severity**: Warning
- **Why**: Slow responses indicate performance degradation affecting user experience

#### 7. High Cache Miss Rate
**Alert**: High Cache Miss Rate
- **Condition**: `rate(weather_service_cache_operations_total{operation="miss"}[15m]) / rate(weather_service_cache_operations_total{operation="hit,miss"}[15m]) > 0.8`
- **Duration**: 15 minutes
- **Severity**: Warning
- **Why**: High miss rates indicate inefficient caching, leading to increased provider load

#### 8. gRPC Service Degradation
**Alert**: gRPC High Error Rate
- **Condition**: `rate(weather_service_grpc_requests_total{status="error"}[10m]) / rate(weather_service_grpc_requests_total[10m]) > 0.1`
- **Duration**: 10 minutes
- **Severity**: Warning
- **Why**: gRPC errors affect API consumers and may indicate integration issues

#### 9. Provider Response Time Degradation
**Alert**: Slow Provider Response
- **Condition**: `histogram_quantile(0.95, rate(weather_service_provider_response_time_seconds_bucket[10m])) > 5`
- **Duration**: 15 minutes
- **Severity**: Warning
- **Why**: Slow provider responses increase overall service latency

#### 10. Rate Limit Hits
**Alert**: High Rate Limit Hits
- **Condition**: `rate(weather_service_rate_limit_hits_total[5m]) > 5`
- **Duration**: 5 minutes
- **Severity**: Warning
- **Why**: Rate limit hits may indicate abuse or need for quota increases

### Informational Alerts (Long-term Monitoring)

#### 11. Resource Usage Trends
**Alert**: Increasing Memory Usage Trend
- **Condition**: `increase(weather_service_memory_usage_bytes{type="rss"}[1h]) > 100MB`
- **Duration**: 1 hour
- **Severity**: Info
- **Why**: Gradual memory increases may indicate memory leaks

#### 12. Traffic Pattern Changes
**Alert**: Unusual Traffic Pattern
- **Condition**: `rate(weather_service_http_requests_total[1h]) > 2 * rate(weather_service_http_requests_total[24h] offset 24h)`
- **Duration**: 1 hour
- **Severity**: Info
- **Why**: Unusual traffic spikes may indicate viral usage or potential abuse

## Log Retention Policy

### Retention Periods

#### ERROR Logs
- **Local Storage**: 90 days
- **Cold Storage**: 2 years
- **Rationale**: Error logs are critical for debugging, incident investigation, and compliance. Extended retention helps with pattern analysis and forensic investigation.

#### WARN Logs
- **Local Storage**: 60 days
- **Cold Storage**: 1 year
- **Rationale**: Warning logs help identify trends and potential issues. Medium-term retention is sufficient for analysis while managing storage costs.

#### INFO Logs
- **Local Storage**: 30 days
- **Cold Storage**: 6 months
- **Rationale**: Info logs provide operational visibility. Short-term local retention with medium-term cold storage balances accessibility and cost.

#### DEBUG Logs
- **Local Storage**: 7 days
- **Cold Storage**: 30 days
- **Rationale**: Debug logs are primarily used for immediate troubleshooting. Short retention periods are sufficient and help manage storage costs.

### Storage Strategy

#### Hot Storage (NVMe SSD)
- **Duration**: As specified above per log level
- **Purpose**: Fast access for real-time monitoring, alerting, and immediate incident response
- **Indexing**: Full-text search enabled
- **Compression**: None (optimized for speed)

#### Cold Storage (Object Storage)
- **Duration**: Extended retention as specified above
- **Purpose**: Compliance, audit, historical analysis, and forensic investigation
- **Compression**: Gzip compression (70-80% space savings)
- **Indexing**: Metadata only
- **Access**: On-demand restoration (minutes to hours)

### Archival and Deletion Process

#### Automated Archival
- **Schedule**: Daily at 02:00 UTC during low-traffic hours
- **Process**: 
  1. Compress logs older than hot storage period
  2. Transfer to cold storage with verification
  3. Update metadata index
  4. Delete from hot storage after successful transfer

#### Compliance Deletion
- **Schedule**: Monthly review and deletion
- **Process**:
  1. Identify logs exceeding cold storage retention
  2. Generate deletion report for audit
  3. Secure deletion with verification
  4. Update compliance logs

#### Emergency Retention Extension
- **Trigger**: Legal hold, incident investigation, audit requirements
- **Process**: Automated tagging to prevent deletion
- **Duration**: Configurable based on requirements
- **Notification**: Automatic alerts to stakeholders

### Privacy and Compliance Considerations

#### Data Masking
- **PII Elements**: Email addresses, IP addresses, user identifiers
- **Method**: Partial masking (e.g., `user***@domain.com`, `192.168.***.***`)
- **Consistency**: Same user always gets same masked value for correlation

#### Compliance Standards
- **GDPR**: 
  - Right to erasure implemented
  - Data minimization applied
  - Lawful basis documented
- **SOC 2**: Log integrity and access controls implemented
- **HIPAA**: (If applicable) Additional encryption and access restrictions

#### Geographic Considerations
- **EU Data**: Stored in EU regions only
- **Cross-border**: Transfer restrictions implemented
- **Sovereignty**: Compliance with local data residency requirements

### Monitoring and Alerting for Log Management

#### Storage Alerts
- **High Disk Usage**: >80% of log storage capacity
- **Archival Failures**: Failed transfers to cold storage
- **Deletion Failures**: Failed compliance deletions

#### Performance Alerts
- **Slow Log Ingestion**: >1 second lag in log processing
- **Search Performance**: >5 seconds for log queries
- **Index Corruption**: Integrity check failures

### Cost Management

#### Storage Optimization
- **Compression**: Automatic compression for cold storage
- **Deduplication**: Duplicate log entry removal
- **Sampling**: Intelligent sampling for high-volume, low-value logs

#### Budget Controls
- **Monthly Review**: Storage costs and retention optimization
- **Automated Scaling**: Storage scaling based on usage patterns
- **Cost Alerts**: Budget threshold notifications

### Disaster Recovery

#### Backup Strategy
- **Frequency**: Real-time replication for ERROR/WARN logs, daily for INFO/DEBUG
- **Geographic**: Multi-region backup for critical logs
- **Verification**: Regular restore testing

#### Recovery Objectives
- **RTO (Recovery Time Objective)**: 4 hours for full log system restoration
- **RPO (Recovery Point Objective)**: 15 minutes for critical logs, 4 hours for others

This comprehensive logging and monitoring strategy ensures high observability while maintaining cost efficiency, compliance, and performance. Regular reviews and updates of these policies ensure they remain aligned with business needs and industry best practices.
