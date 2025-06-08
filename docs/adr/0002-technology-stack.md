# ADR-002: Technology Stack

**Status:** Accepted<br/>
**Data:** 2025-06-05<br/>
**Author:** Oleksandr Bazhyn

## Context
The technology stack for the Weather API App needs to be defined to ensure that the project is built on a solid foundation of reliable and efficient tools and frameworks. The selection of technologies will impact the development process, performance, and maintainability of the application.

## Decision
The following technology stack has been selected for the Weather API App:

1. **Backend Framework**: 
   - **Express.js**: Chosen for its minimalistic and flexible nature, allowing for quick development of RESTful APIs. It has a large ecosystem of middleware and is widely adopted in the Node.js community.

2. **Database**: 
   - **PostgreSQL**: Selected for its robustness, support for complex queries, and strong community support. It is well-suited for handling relational data, which is essential for managing user subscriptions and weather data.

3. **ORM**: 
   - **Knex.js**: Used as a SQL query builder for Node.js, providing a flexible and powerful way to interact with the PostgreSQL database. It allows for migrations and schema management, which is crucial for maintaining the database structure.

4. **Email Service**: 
   - **Nodemailer**: Chosen for sending emails, including subscription confirmations and weather updates. It is easy to set up and integrates well with various email services.

5. **WebSocket Library**: 
   - **ws**: Selected for implementing WebSocket communication for live weather updates. It is lightweight and efficient, making it suitable for real-time applications.

6. **Testing Framework**: 
   - **Jest**: Used for unit and integration testing due to its simplicity and powerful features, including mocking and snapshot testing.

7. **API Testing**: 
   - **Supertest**: Utilized for testing HTTP endpoints, allowing for easy integration with Jest for end-to-end testing of the API.

8. **Task Scheduling**: 
   - **node-cron**: Used for scheduling tasks such as sending weather emails at specified intervals. It provides a simple syntax for defining cron jobs.

## Consequences
The chosen technology stack will facilitate rapid development and deployment of the Weather API App. It ensures that the application is built on reliable and well-supported technologies, which will help in maintaining the codebase and scaling the application in the future. However, the team must ensure that they are familiar with these technologies to avoid potential pitfalls during development.