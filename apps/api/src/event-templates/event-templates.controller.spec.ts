import { Test, TestingModule } from '@nestjs/testing';
import { EventTemplatesController } from './event-templates.controller';
import { EventTemplatesService } from './event-templates.service';

describe('EventTemplatesController', () => {
  let controller: EventTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventTemplatesController],
      providers: [EventTemplatesService],
    }).compile();

    controller = module.get<EventTemplatesController>(EventTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
