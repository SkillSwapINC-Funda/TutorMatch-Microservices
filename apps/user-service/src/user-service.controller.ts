import { Controller, Get, Post, Put, UseGuards, Param, Body, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserServiceService } from './user-service.service';
import { AuthGuard, GetUser, Roles, RolesGuard, Public } from '@app/shared';

interface ValidateTokenDto {
  token: string;
}

interface IframeAuthDto {
  token: string;
}

@ApiTags('user-service')
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

  // ===== ENDPOINTS PARA IFRAME AUTHENTICATION =====

  /**
   * Validar token JWT y obtener información del usuario
   * Este endpoint es público pero valida internamente el token
   */
  @Post('validate-session')
  @Public()
  @ApiOperation({ summary: 'Validar sesión de usuario' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Sesión validada exitosamente' })
  async validateSession(@Body() { token }: ValidateTokenDto) {
    try {
      const result = await this.userServiceService.validateUserToken(token);
      
      if (!result.valid || !result.user) {
        return { valid: false, error: 'Token inválido o expirado' };
      }

      return {
        valid: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          profile: result.user.profile
        }
      };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message || 'Error al validar sesión' 
      };
    }
  }

  /**
   * Autenticación específica para iframe
   * Valida token y verifica permisos para classroom
   */
  @Post('iframe-auth')
  @Public()
  @ApiOperation({ summary: 'Autenticación para iframe del classroom' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Autenticación autorizada para classroom' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  @ApiResponse({ status: 403, description: 'Sin permisos para classroom' })
  async iframeAuth(@Body() { token }: IframeAuthDto) {
    const validation = await this.validateSession({ token });
    
    if (!validation.valid || !validation.user) {
      throw new UnauthorizedException('Token inválido para classroom');
    }

    const { user } = validation;
    
    // Verificar que el usuario tiene permisos para classroom
    if (!['student', 'tutor', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Sin permisos para acceder al classroom');
    }

    // Verificar que el perfil esté activo
    if (user.profile?.status !== 'active') {
      throw new ForbiddenException('Cuenta desactivada. Contacta al administrador.');
    }

    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.first_name,
        lastName: user.profile?.last_name,
        avatar: user.profile?.avatar || null,
        semesterNumber: user.profile?.semester_number,
        academicYear: user.profile?.academic_year
      },
      permissions: this.getClassroomPermissions(user.role),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 horas
    };
  }

  /**
   * Verificar estado actual de autenticación
   * Para cuando el iframe se recarga y necesita verificar si aún está autenticado
   */
  @Get('auth-status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener estado de autenticación actual' })
  @ApiResponse({ status: 200, description: 'Estado de autenticación obtenido' })
  async getAuthStatus(@GetUser() user: any) {
    const profile = await this.userServiceService.getProfile(user.id);
    
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        avatar: profile?.avatar || null
      },
      permissions: this.getClassroomPermissions(user.role),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Endpoint para refrescar sesión desde iframe
   */
  @Post('refresh-iframe-session')
  @Public()
  @ApiOperation({ summary: 'Refrescar sesión desde iframe' })
  @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Sesión refrescada exitosamente' })
  async refreshIframeSession(
    @Body() { refreshToken }: { refreshToken: string },
    @Headers('authorization') authHeader?: string
  ) {
    try {
      const result = await this.userServiceService.refreshUserSession(refreshToken);
      
      if (!result.success) {
        throw new UnauthorizedException('No se pudo refrescar la sesión');
      }

      return {
        success: true,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: result.expires_at,
        user: result.user
      };
    } catch (error) {
      throw new UnauthorizedException(`Error al refrescar sesión: ${error.message}`);
    }
  }

  /**
   * Logout específico para iframe
   */
  @Post('iframe-logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión desde iframe' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async iframeLogout(@GetUser() user: any) {
    try {
      await this.userServiceService.logoutUser();
      
      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al cerrar sesión',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Obtener permisos específicos para classroom según el rol
   */
  private getClassroomPermissions(role: string): string[] {
    const permissions = {
      student: [
        'view_materials',
        'download_materials', 
        'join_sessions',
        'chat_in_sessions',
        'view_schedule',
        'book_sessions'
      ],
      tutor: [
        'view_materials',
        'upload_materials',
        'edit_materials',
        'delete_own_materials',
        'create_sessions',
        'manage_own_sessions',
        'chat_in_sessions',
        'video_call',
        'view_student_progress',
        'grade_assignments'
      ],
      admin: [
        'all_permissions',
        'manage_users',
        'manage_all_sessions',
        'manage_all_materials',
        'view_analytics',
        'system_settings'
      ]
    };

    return permissions[role as keyof typeof permissions] || [];
  }
}
