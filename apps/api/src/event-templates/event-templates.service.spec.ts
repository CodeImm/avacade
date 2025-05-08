import { Test, TestingModule } from '@nestjs/testing';
import { EventTemplatesService } from './event-templates.service';

describe('EventTemplatesService', () => {
  let service: EventTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventTemplatesService],
    }).compile();

    service = module.get<EventTemplatesService>(EventTemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
