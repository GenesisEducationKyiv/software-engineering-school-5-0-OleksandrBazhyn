# ADR-001: Record Architecture Decisions

**Status:** Accepted<br/>
**Data:** 2025-06-05<br/>
**Author:** Oleksandr Bazhyn

## Context
This document outlines the initial architectural decisions made for the Weather API App project. The goal is to provide a clear understanding of the rationale behind the chosen technologies, design patterns, and overall architecture.

## Decision
1. **Microservices Architecture**: The application will follow a microservices architecture to separate concerns and allow for independent scaling of components. This will facilitate easier maintenance and deployment.

2. **RESTful API**: The application will expose a RESTful API for client interactions. This decision is based on the need for a stateless communication protocol that is widely understood and easy to consume by various clients.

3. **WebSocket for Live Updates**: To provide real-time weather updates, a WebSocket server will be implemented. This allows for persistent connections and efficient data transmission to subscribed clients.

4. **Database Choice**: PostgreSQL will be used as the relational database management system (RDBMS) due to its robustness, support for complex queries, and strong community support.

5. **Email Notifications**: The application will utilize Nodemailer for sending email notifications. This library is chosen for its simplicity and flexibility in handling various email transport methods.

6. **Weather Data Source**: The application will integrate with a third-party weather API to fetch weather data. The choice of API will be based on reliability, data accuracy, and ease of integration.

7. **Testing Framework**: Jest will be used as the testing framework for unit and integration tests. Its popularity and extensive documentation make it a suitable choice for ensuring code quality.

8. **Containerization**: Docker will be used for containerization to ensure consistent environments across development, testing, and production. This will simplify deployment and scaling processes.

## Rationale
The decisions made are aimed at creating a scalable, maintainable, and efficient application. By adopting a microservices architecture and RESTful API design, the application can evolve over time without significant refactoring. The use of WebSocket for live updates enhances user experience by providing real-time information. The choice of PostgreSQL and Nodemailer aligns with the project's requirements for data integrity and communication reliability.

## Consequences
These architectural decisions will guide the development process and influence future decisions regarding technology choices, design patterns, and implementation strategies. It is essential to revisit and update this document as the project evolves and new insights are gained.