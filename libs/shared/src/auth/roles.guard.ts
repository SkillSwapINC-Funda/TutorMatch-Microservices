import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { AuthService } from './auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Obtener el perfil del usuario para verificar su rol
    try {
      const userProfile = await this.authService.getCurrentUser(
        request.headers.authorization?.split(' ')[1]
      );

      const hasRole = requiredRoles.some((role) => userProfile.role === role);
      
      if (!hasRole) {
        throw new ForbiddenException('No tienes permisos para acceder a este recurso');
      }

      return true;
    } catch (error) {
      throw new ForbiddenException('Error al verificar permisos');
    }
  }
}
