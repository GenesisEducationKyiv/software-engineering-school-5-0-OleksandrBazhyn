# ADR-002: Technology Stack

**Status:** Accepted<br/>
**Data:** 2025-06-05<br/>
**Author:** Oleksandr Bazhyn

## Context
The technology stack for the Weather API App needs to be defined to ensure that the project is built on a solid foundation of reliable and efficient tools and frameworks. The selection of technologies will impact the development process, performance, and maintainability of the application.

## Decision
The following technology stack has been selected for the Weather API App:

1. **Backend Framework & Language**: 
   - **Express.js + TypeScript**: Chosen for its minimalistic and flexible nature, allowing for quick development of RESTful APIs. TypeScript adds static typing, improves maintainability, and reduces runtime errors. Express has a large ecosystem of middleware and is widely adopted in the Node.js community.

2. **Database**: 
   - **PostgreSQL**: Selected for its robustness and strong community support. It is well-suited for handling relational data, which is essential for managing user subscriptions and weather data.

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

## Comparison with Alternatives

1. **Backend Framework & Language**:  
   - **Express.js + TypeScript** was chosen for its simplicity, flexibility, and the added benefits of static typing. Alternatives considered included **Koa.js** (more modern but with a smaller ecosystem) and **Fastify** (faster performance but less middleware support). Express.js has the largest community and the most extensive documentation, making it easier to maintain and extend.

2. **Database**:  
   - **PostgreSQL** was selected over **MySQL** (less advanced support for complex queries) and **MongoDB** (NoSQL, which does not fit the relational data needs of the project). PostgreSQL offers advanced features and strong reliability.

3. **ORM/Query Builder**:  
   - **Knex.js** was chosen for its flexibility and ease of integration with PostgreSQL. Alternatives like **Sequelize** (full-featured ORM but more complex) and **TypeORM** (better for TypeScript projects) were considered, but Knex.js provides a simpler approach suitable for this project.

4. **Email Service**:  
   - **Nodemailer** was selected for its ease of use and popularity. Alternatives such as **SendGrid** (better for large-scale email delivery but requires external service setup) and **Mailgun** were also considered.

5. **WebSocket Library**:  
   - **ws** was chosen for its lightweight and efficient implementation. **Socket.io** was considered for its richer feature set, but it introduces more complexity and overhead.

6. **Testing Framework**:  
   - **Jest** was selected for its simplicity and powerful features. Alternatives like **Mocha** and **AVA** were considered, but Jest offers better integration and developer experience.

7. **API Testing**:  
   - **Supertest** was chosen for its seamless integration with Jest. **Chai HTTP** was considered as an alternative.

8. **Task Scheduling**:  
   - **node-cron** was selected for its simple syntax and ease of use. **Agenda** was considered for more advanced scheduling needs, but node-cron is sufficient for the current requirements.

## Consequences
The chosen technology stack will facilitate rapid development and deployment of the Weather API App. It ensures that the application is built on reliable and well-supported technologies, which will help in maintaining the codebase and scaling the application in the future. However, the team must ensure that they are familiar with these technologies to avoid potential pitfalls during development.