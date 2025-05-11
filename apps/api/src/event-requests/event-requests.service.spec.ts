import { Test, TestingModule } from '@nestjs/testing';
import { EventRequestsService } from './event-requests.service';

describe('EventRequestsService', () => {
  let service: EventRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventRequestsService],
    }).compile();

    service = module.get<EventRequestsService>(EventRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
