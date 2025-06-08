# ADR-005: WebSocket Live Updates

**Status:** Accepted<br/>
**Data:** 2025-06-05<br/>
**Author:** Oleksandr Bazhyn

## Context
The project requires a mechanism for delivering real-time weather updates to users who have subscribed to weather notifications. Traditional polling methods are inefficient and can lead to increased server load and latency. Therefore, implementing a WebSocket solution is considered to provide a more efficient and responsive user experience.

## Decision
I have decided to implement WebSocket for live weather updates. The WebSocket server will be integrated with the existing Express application, allowing for bi-directional communication between the server and clients.

### Key Points:
- **WebSocket Server**: A WebSocket server will be set up using the `ws` library, which will handle incoming connections and manage subscriptions for live weather updates.
- **Client Subscription**: Clients can subscribe to weather updates for specific cities. The server will maintain a mapping of connected clients to their subscribed cities.
- **Periodic Updates**: The server will periodically fetch weather data for subscribed cities and push updates to the respective clients every 15 seconds.
- **Error Handling**: The WebSocket server will include error handling to manage connection issues and invalid messages from clients.

## Consequences
- **Performance**: Using WebSocket will reduce the overhead associated with HTTP requests for each weather update, leading to improved performance and lower latency.
- **Complexity**: Introducing WebSocket adds complexity to the application architecture, requiring careful management of connections and state.
- **Scalability**: The solution is scalable, as it allows multiple clients to receive updates simultaneously without significant additional load on the server.

## Alternatives Considered
- **Long Polling**: This method was considered but deemed inefficient due to the overhead of repeated HTTP requests.
- **Server-Sent Events (SSE)**: While SSE could provide one-way communication from server to client, it does not support bi-directional communication, which is necessary for our use case.

## Conclusion
The decision to implement WebSocket for live weather updates aligns with the project's goals of providing real-time notifications efficiently. This approach will enhance user experience while maintaining manageable server load.