import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomServiceController } from './classroom-service.controller';
import { ClassroomServiceService } from './classroom-service.service';

describe('ClassroomServiceController', () => {
  let classroomServiceController: ClassroomServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ClassroomServiceController],
      providers: [ClassroomServiceService],
    }).compile();

    classroomServiceController = app.get<ClassroomServiceController>(ClassroomServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(classroomServiceController.getHello()).toBe('Hello World!');
    });
  });
});
