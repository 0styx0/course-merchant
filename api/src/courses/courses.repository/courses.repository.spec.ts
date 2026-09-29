import { Test, TestingModule } from '@nestjs/testing';
import { CoursesRepository } from './courses.repository';

describe('CoursesRepository', () => {
  let provider: CoursesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesRepository],
    }).compile();

    provider = module.get<CoursesRepository>(CoursesRepository);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
