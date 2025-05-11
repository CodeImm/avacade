import { Test, TestingModule } from '@nestjs/testing';
import { EventRequestsController } from './event-requests.controller';
import { EventRequestsService } from './event-requests.service';

describe('EventRequestsController', () => {
  let controller: EventRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRequestsController],
      providers: [EventRequestsService],
    }).compile();

    controller = module.get<EventRequestsController>(EventRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
