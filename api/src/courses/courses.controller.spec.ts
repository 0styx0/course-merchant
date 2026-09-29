import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller.js';
import { beforeEach, describe, expect, it } from 'vitest';

describe('CoursesController', () => {
  let controller: CoursesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
