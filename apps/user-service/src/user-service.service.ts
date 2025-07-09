import { Injectable, NotFoundException } from '@nestjs/common';
import { createSupabaseClient, AuthService } from '@app/shared';

@Injectable()
export class UserServiceService {
  private supabase = createSupabaseClient({ useServiceRole: true });
  private authService = new AuthService();

  getHello(): string {
    return 'User Service is running!';
  }

  async getProfile(userId: string) {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundException('Perfil de usuario no encontrado');
    }

    return profile;
  }

  async updateProfile(userId: string, updateData: any) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar perfil: ${error.message}`);
    }

    return data;
  }

  async getTutors() {
    const { data: tutors, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'tutor')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Error al obtener tutores: ${error.message}`);
    }

    return tutors;
  }

  async getStudents() {
    const { data: students, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Error al obtener estudiantes: ${error.message}`);
    }

    return students;
  }

  // ===== MÉTODOS PARA IFRAME AUTHENTICATION =====

  /**
   * Validar token JWT y obtener información completa del usuario
   */
  async validateUserToken(token: string) {
    try {
      // Usar el AuthService para validar el token
      const user = await this.authService.validateToken(token);
      
      if (!user) {
        return { valid: false, error: 'Token inválido' };
      }

      // Obtener perfil completo del usuario
      const profile = await this.getProfile(user.id);

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email!,
          role: profile.role,
          profile: profile
        }
      };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message || 'Error al validar token' 
      };
    }
  }

  /**
   * Refrescar sesión del usuario
   */
  async refreshUserSession(refreshToken: string) {
    try {
      const result = await this.authService.refreshToken(refreshToken);
      
      // Obtener información del usuario con el nuevo token
      const userInfo = await this.authService.getCurrentUser(result.access_token);

      return {
        success: true,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: result.expires_at,
        user: {
          id: userInfo.id,
          email: userInfo.email,
          role: userInfo.role,
          profile: userInfo.profile
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al refrescar sesión'
      };
    }
  }

  /**
   * Cerrar sesión del usuario
   */
  async logoutUser() {
    try {
      await this.authService.signOut();
      return { success: true };
    } catch (error) {
      throw new Error(`Error al cerrar sesión: ${error.message}`);
    }
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  async userHasPermission(userId: string, permission: string): Promise<boolean> {
    return await this.authService.hasPermission(userId, permission);
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email: string) {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (error || !profile) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return profile;
  }

  /**
   * Verificar si el usuario puede acceder al classroom
   */
  async canAccessClassroom(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId);
      
      // Verificar que el usuario esté activo y tenga un rol válido
      return profile.status === 'active' && 
             ['student', 'tutor', 'admin'].includes(profile.role);
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener estadísticas del usuario para el dashboard
   */
  async getUserStats(userId: string) {
    try {
      const profile = await this.getProfile(userId);
      
      // Básico por ahora, se puede expandir con más datos
      return {
        role: profile.role,
        joinedAt: profile.created_at,
        status: profile.status,
        semesterNumber: profile.semester_number,
        academicYear: profile.academic_year,
        lastActivity: profile.updated_at
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas del usuario: ${error.message}`);
    }
  }
}
