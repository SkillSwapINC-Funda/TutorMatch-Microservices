import { Injectable, NotFoundException } from '@nestjs/common';
import { createSupabaseClient } from '@app/shared';

@Injectable()
export class UserServiceService {
  private supabase = createSupabaseClient({ useServiceRole: true });

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
}
