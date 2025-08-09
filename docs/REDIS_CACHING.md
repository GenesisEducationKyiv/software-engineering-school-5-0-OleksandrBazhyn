# Redis Caching and Metrics

This document describes the Redis caching layer and metrics monitoring system added to the weather service.

## Features

### 1. Redis Caching
- **Purpose**: Cache weather API responses to reduce external API calls and improve response times
- **TTL**: 5 minutes default (configurable)
- **Cache Key Pattern**: `weather:{city_lowercase}`
- **Graceful Degradation**: Application works without Redis if connection fails

### 2. Metrics Monitoring
- **Prometheus-compatible metrics** exported at `/api/v1/metrics`
- **Cache Performance Tracking**:
  - Cache hits/misses
  - Cache errors  
  - Operation duration (get, set, delete)

### 3. Architecture Changes
- `WeatherProviderManager` now implements caching layer
- New `WeatherCacheService` handles Redis operations
- New `CacheMetrics` tracks performance statistics
- Dependency injection pattern maintained throughout

## Configuration

### Environment Variables
```bash
# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true  # Set to false to disable Redis

# Disable Redis for tests
NODE_ENV=test  # Automatically disables Redis
```

### Redis Setup
1. Install Redis locally or use Docker:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

2. Or install locally:
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   
   # macOS
   brew install redis
   
   # Windows
   # Use WSL or Docker
   ```

## API Endpoints

### Weather API (with caching)
```http
GET /api/v1/weather?city=London
```
- First call: Fetches from external API and caches result
- Subsequent calls (within 5 min): Returns cached data
- Response includes same format as before

### Metrics Endpoint
```http
GET /api/v1/metrics
```
Returns Prometheus-format metrics:
```
# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total{cache_type="redis",key_prefix="weather"} 5

# HELP cache_misses_total Total number of cache misses  
# TYPE cache_misses_total counter
cache_misses_total{cache_type="redis",key_prefix="weather"} 2

# HELP cache_operation_duration_seconds Duration of cache operations
# TYPE cache_operation_duration_seconds histogram
cache_operation_duration_seconds_bucket{cache_type="redis",operation="get",le="0.001"} 3
```

## Implementation Details

### Cache Flow
1. **Request** → `WeatherProviderManager.getWeatherData(city)`
2. **Cache Check** → `WeatherCacheService.get(city)`
3. **Cache Hit** → Return cached data + record metrics
4. **Cache Miss** → Fetch from providers → Cache result → Return data

### Error Handling
- Redis connection failures are logged but don't break the application
- Corrupted cache data is automatically cleaned up
- All cache operations have timeout protection

### Metrics Collection
- **Cache Hits**: Successful cache retrievals
- **Cache Misses**: Data not found in cache
- **Cache Errors**: Redis operation failures
- **Duration Histograms**: Performance timing for all operations

## Usage Examples

### Monitoring Cache Performance
```bash
# Get current metrics
curl http://localhost:3000/api/v1/metrics

# Monitor cache hit rate
watch -n 5 'curl -s http://localhost:3000/api/v1/metrics | grep cache_hits'
```

### Testing Cache Behavior
```bash
# First call (cache miss)
time curl "http://localhost:3000/api/v1/weather?city=London"

# Second call (cache hit - should be faster)
time curl "http://localhost:3000/api/v1/weather?city=London"

# Check metrics to see hit/miss counts
curl http://localhost:3000/api/v1/metrics | grep -E "(cache_hits|cache_misses)"
```

## Benefits

### Performance
- **Faster Response Times**: Cached responses avoid external API calls
- **Reduced API Costs**: Fewer calls to weather providers
- **Better User Experience**: Consistent sub-100ms responses for cached data

### Reliability  
- **Graceful Degradation**: Works without Redis
- **Error Resilience**: Cache failures don't affect core functionality
- **Circuit Breaker Pattern**: Automatic fallback to providers

### Observability
- **Prometheus Metrics**: Industry-standard monitoring format
- **Cache Performance Visibility**: Track hit rates and response times
- **Operational Insights**: Identify cache patterns and optimization opportunities

## Future Enhancements

1. **Cache Warming**: Pre-populate cache for popular cities
2. **Smart TTL**: Adjust cache duration based on usage patterns
3. **Distributed Caching**: Redis Cluster support for scaling
4. **Cache Policies**: LRU, LFU eviction strategies
5. **Alerting**: Prometheus alerts for low hit rates or high error rates
