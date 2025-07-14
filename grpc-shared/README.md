# gRPC Shared Resources

This directory contains shared gRPC resources for the Weather Service microservices architecture.

## Structure

```
grpc-shared/
├── proto/
│   └── weather.proto        # Weather service protobuf definitions
├── clients/
│   ├── node/               # Node.js client implementations
│   └── examples/           # Example client usage
└── README.md
```

## Usage

### Proto Files
- `weather.proto` - Main weather service definitions

### Clients
Reference implementations for different languages and frameworks.

### Integration
Update your service imports to use the centralized proto files:

```javascript
// Before
const PROTO_PATH = './proto/weather.proto';

// After  
const PROTO_PATH = '../../grpc-shared/proto/weather.proto';
```

## Services Using This

- `weather-service/` - Main weather microservice
- `weather-benchmark/` - Performance testing suite
- `server/` - Main server (for integration)
