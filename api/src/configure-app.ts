
import { INestApplication, VersioningType } from '@nestjs/common';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter.js';

// config shared between prod and with e2e tests
export function configureApp(app: INestApplication) {
  return app.enableVersioning({
    type: VersioningType.URI,
  })
  .useGlobalFilters(new ProblemDetailsFilter());
}

