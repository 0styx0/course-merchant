import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListCoursesResponse } from 'types.js';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  findAll(): Promise<ListCoursesResponse> {
    //return this.prisma.db.orm.public.Course.all();
  }
}
