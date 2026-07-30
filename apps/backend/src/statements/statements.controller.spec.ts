import { Test, TestingModule } from '@nestjs/testing';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

describe('StatementsController', () => {
  let controller: StatementsController;

  const mockStatementsService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatementsController],
      providers: [
        { provide: StatementsService, useValue: mockStatementsService },
      ],
    }).compile();

    controller = module.get<StatementsController>(StatementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
