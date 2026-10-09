# About

Sell courses via an intuitive interface with minimal fees.


## Pages

### Homepage

- About: Describes the type of courses offered and introduces the person
- Course list: Each course leads to a course page

#### Course page

- Course description
- Checkout: Via credit card

When the course is bought, the user should get access to a google drive folder, or access to a zoom meeting via an email.


## Technical Details

### Communication

- A shared OpenAPI contract ensures reliable cross-stack communication.
   - The client and API form their logic using types generated directly from the contract.
- Git hooks ensure type correctness and perpetual test integrity.
- MSW and docker allow for speedy integration tests across the stack.

### Technologies

#### Frontend:
- Core: Next.JS, TypeScript
- Unit tests: MSW + Vitest
- Integration tests: PlayWright + MSW

#### Backend:
- Core: Nest.JS, TypeScript, Postgres, Prisma, Docker
- Unit tests: Vitest
- Integration tests: Vitest + separate Postgres docker container
- End-to-end tests: Vitest + SuperTest + Postgres docker
