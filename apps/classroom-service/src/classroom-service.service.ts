import { Injectable } from '@nestjs/common';

@Injectable()
export class ClassroomServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
