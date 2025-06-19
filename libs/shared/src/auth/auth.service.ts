import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseClient } from '../supabase/supabase-client';
import { Database } from '../types/database.types';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  profile?: any;
}

export interface SignUpDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'tutor';
  gender: string;
  semesterNumber: number;
  academicYear?: string;
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface ResetPasswordDto {
  email: string;
}

export interface UpdatePasswordDto {
  password: string;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private supabase: SupabaseClient<Database>;
  private supabaseAdmin: SupabaseClient<Database>;

  constructor() {
    this.supabase = createSupabaseClient();
    this.supabaseAdmin = createSupabaseClient({ useServiceRole: true });
  }
  /**
   * Registrar un nuevo usuario
   */
  async signUp(signUpDto: SignUpDto) {
    const { email, password, firstName, lastName, role, gender, semesterNumber, academicYear } = signUpDto;

    try {
      // Verificar si el usuario ya existe
      const { data: existingUser } = await this.supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new ConflictException('El usuario con este email ya existe');
      }

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      });

      if (authError) {
        throw new UnauthorizedException(`Error al crear usuario: ${authError.message}`);
      }

      // Crear perfil de usuario en la base de datos
      const { error: profileError } = await this.supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          first_name: firstName,
          last_name: lastName,
          role: role,
          gender: gender,
          semester_number: semesterNumber,
          academic_year: academicYear || null,
          status: 'active',
        });

      if (profileError) {
        // Si falla la creación del perfil, eliminar el usuario de Auth
        await this.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new UnauthorizedException(`Error al crear perfil: ${profileError.message}`);
      }

      return {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: role,
        },
        message: 'Usuario registrado exitosamente',
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error interno del servidor durante el registro');
    }
  }
  /**
   * Iniciar sesión
   */
  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new UnauthorizedException('Credenciales inválidas');
        }
        throw new UnauthorizedException(`Error al iniciar sesión: ${error.message}`);
      }

      if (!data.session) {
        throw new UnauthorizedException('No se pudo crear la sesión');
      }

      // Obtener perfil del usuario
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        throw new NotFoundException('Perfil de usuario no encontrado');
      }

      // Verificar si el usuario está activo
      if (profile.status !== 'active') {
        throw new UnauthorizedException('Cuenta desactivada. Contacta al administrador.');
      }

      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: profile.role,
          profile: profile,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new UnauthorizedException('Error interno durante el inicio de sesión');
    }
  }

  /**
   * Cerrar sesión
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new UnauthorizedException(`Error al cerrar sesión: ${error.message}`);
    }
    return { message: 'Sesión cerrada exitosamente' };
  }

  /**
   * Renovar token
   */
  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException(`Error al renovar token: ${error.message}`);
    }

    if (!data.session) {
      throw new UnauthorizedException('No se pudo renovar la sesión');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    };
  }

  /**
   * Restablecer contraseña
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email } = resetPasswordDto;

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      throw new UnauthorizedException(`Error al enviar email: ${error.message}`);
    }

    return { message: 'Email de restablecimiento enviado' };
  }

  /**
   * Actualizar contraseña
   */
  async updatePassword(updatePasswordDto: UpdatePasswordDto) {
    const { password, accessToken } = updatePasswordDto;

    // Crear cliente con el token del usuario
    const userSupabase = createSupabaseClient();
    await userSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // No necesario para este caso
    });

    const { error } = await userSupabase.auth.updateUser({
      password: password,
    });

    if (error) {
      throw new UnauthorizedException(`Error al actualizar contraseña: ${error.message}`);
    }

    return { message: 'Contraseña actualizada exitosamente' };
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(accessToken: string): Promise<AuthUser> {
    const userSupabase = createSupabaseClient();
    
    const { data: { user }, error } = await userSupabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException('Token inválido');
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new UnauthorizedException('Error al obtener perfil del usuario');
    }

    return {
      id: user.id,
      email: user.email!,
      role: profile.role,
      profile: profile,
    };
  }

  /**
   * Verificar si el usuario tiene permisos específicos
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    // Verificar permisos por rol
    const rolePermissions = {
      admin: ['all'],
      tutor: ['create_session', 'manage_own_sessions', 'chat', 'video_call'],
      student: ['join_session', 'chat', 'book_session'],
    };

    const userPermissions = rolePermissions[profile.role as keyof typeof rolePermissions] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
  }

  /**
   * Validar token JWT
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }
}
