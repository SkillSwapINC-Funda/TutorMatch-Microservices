import { Controller, Get, UseGuards, Param, Put, Body } from '@nestjs/common';
import { UserServiceService } from './user-service.service';
import { AuthGuard, GetUser, Roles, RolesGuard, Public } from '@app/shared';

@Controller()
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.userServiceService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@GetUser() user: any) {
    return this.userServiceService.getProfile(user.id);
  }

  @Get('profile/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'tutor')
  async getProfileById(@Param('id') id: string) {
    return this.userServiceService.getProfile(id);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@GetUser() user: any, @Body() updateData: any) {
    return this.userServiceService.updateProfile(user.id, updateData);
  }

  @Get('tutors')
  @UseGuards(AuthGuard)
  async getTutors(@GetUser() user: any) {
    return this.userServiceService.getTutors();
  }

  @Get('students')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'tutor')
  async getStudents() {
    return this.userServiceService.getStudents();
  }
}
