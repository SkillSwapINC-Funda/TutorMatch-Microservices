import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { createSupabaseClient, Database } from '@app/shared';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  CreateVideoCallDto, 
  JoinVideoCallDto, 
  EndVideoCallDto, 
  UpdateVideoCallStatusDto 
} from './dto/jitsi.dto';

@Injectable()
export class JitsiService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createSupabaseClient({ useServiceRole: true });
  }

  /**
   * Crear una nueva videollamada
   */
  async createVideoCall(createVideoCallDto: CreateVideoCallDto, userId: string) {
    const { jitsiRoomName, roomId, tutoringSessionId, scheduledFor } = createVideoCallDto;

    try {
      // Verificar que no existe otra videollamada activa con el mismo nombre
      const { data: existingCall } = await this.supabase
        .from('video_calls')
        .select('id, status')
        .eq('jitsi_room_name', jitsiRoomName)
        .in('status', ['scheduled', 'active'])
        .single();

      if (existingCall) {
        throw new BadRequestException('Ya existe una videollamada activa con este nombre de sala');
      }

      // Crear la videollamada - si no hay scheduledFor, crear como activa
      const status = scheduledFor ? 'scheduled' : 'active';
      const startedAt = scheduledFor ? null : new Date().toISOString();

      const { data: videoCall, error: callError } = await this.supabase
        .from('video_calls')
        .insert({
          jitsi_room_name: jitsiRoomName,
          room_id: roomId || null,
          tutoring_session_id: tutoringSessionId || null,
          scheduled_for: scheduledFor || null,
          started_by: userId,
          status: status,
          started_at: startedAt
        })
        .select()
        .single();

      if (callError) {
        throw new BadRequestException(`Error al crear videollamada: ${callError.message}`);
      }

      // Agregar al creador como participante
      await this.addParticipant(videoCall.id, userId);

      return {
        ...videoCall,
        jitsiConfig: this.generateJitsiConfig(jitsiRoomName, userId)
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al crear videollamada');
    }
  }

  /**
   * Unirse a una videollamada
   */
  async joinVideoCall(joinVideoCallDto: JoinVideoCallDto, userId: string) {
    const { callId } = joinVideoCallDto;

    try {
      // Verificar que la videollamada existe
      const { data: videoCall, error: callError } = await this.supabase
        .from('video_calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError || !videoCall) {
        throw new NotFoundException('Videollamada no encontrada');
      }

      if (videoCall.status === 'ended' || videoCall.status === 'cancelled') {
        throw new ForbiddenException('La videollamada ha terminado o fue cancelada');
      }

      // Verificar si ya es participante
      const { data: existingParticipant } = await this.supabase
        .from('video_call_participants')
        .select('id, left_at')
        .eq('call_id', callId)
        .eq('user_id', userId)
        .single();

      if (existingParticipant && !existingParticipant.left_at) {
        throw new BadRequestException('Ya eres participante de esta videollamada');
      }

      // Si había salido antes, actualizar registro
      if (existingParticipant && existingParticipant.left_at) {
        const { error: updateError } = await this.supabase
          .from('video_call_participants')
          .update({
            joined_at: new Date().toISOString(),
            left_at: null
          })
          .eq('id', existingParticipant.id);

        if (updateError) {
          throw new BadRequestException(`Error al reincorporar participante: ${updateError.message}`);
        }
      } else {
        // Agregar como nuevo participante
        await this.addParticipant(callId, userId);
      }

      // Si es la primera vez que alguien se une, marcar como activa
      if (videoCall.status === 'scheduled') {
        await this.updateVideoCallStatus(callId, 'active', userId);
      }

      return {
        ...videoCall,
        jitsiConfig: this.generateJitsiConfig(videoCall.jitsi_room_name, userId)
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al unirse a videollamada');
    }
  }

  /**
   * Salir de una videollamada
   */
  async leaveVideoCall(callId: string, userId: string) {
    try {
      // Verificar que es participante
      const { data: participant, error: participantError } = await this.supabase
        .from('video_call_participants')
        .select('id, joined_at')
        .eq('call_id', callId)
        .eq('user_id', userId)
        .is('left_at', null)
        .single();

      if (participantError || !participant) {
        // Si no es participante, simplemente retornar un mensaje exitoso
        // Esto evita errores cuando el usuario sale sin estar oficialmente registrado
        return { 
          message: 'No estabas registrado como participante de esta videollamada',
          durationMinutes: 0 
        };
      }

      // Calcular duración de participación
      const joinedAt = new Date(participant.joined_at!);
      const leftAt = new Date();
      const durationMinutes = Math.round((leftAt.getTime() - joinedAt.getTime()) / (1000 * 60));

      // Marcar como salido
      const { error: updateError } = await this.supabase
        .from('video_call_participants')
        .update({
          left_at: leftAt.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', participant.id);

      if (updateError) {
        throw new BadRequestException(`Error al salir de videollamada: ${updateError.message}`);
      }

      return { 
        message: 'Has salido de la videollamada exitosamente',
        durationMinutes 
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Para cualquier otro error, retornar un mensaje exitoso suave
      return { 
        message: 'Videollamada finalizada',
        durationMinutes: 0 
      };
    }
  }

  /**
   * Finalizar una videollamada
   */
  async endVideoCall(endVideoCallDto: EndVideoCallDto, userId: string) {
    const { callId, recordingUrl, durationMinutes } = endVideoCallDto;

    try {
      // Verificar que la videollamada existe y está activa
      const { data: videoCall, error: callError } = await this.supabase
        .from('video_calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError || !videoCall) {
        throw new NotFoundException('Videollamada no encontrada');
      }

      if (videoCall.status !== 'active' && videoCall.status !== 'scheduled') {
        throw new BadRequestException('La videollamada ya ha terminado');
      }

      // Solo el creador puede finalizar la videollamada
      if (videoCall.started_by !== userId) {
        throw new ForbiddenException('Solo el creador puede finalizar la videollamada');
      }

      // Marcar todos los participantes activos como salidos
      const { error: participantsError } = await this.supabase
        .from('video_call_participants')
        .update({
          left_at: new Date().toISOString()
        })
        .eq('call_id', callId)
        .is('left_at', null);

      if (participantsError) {
        console.error('Error al marcar participantes como salidos:', participantsError);
      }

      // Finalizar la videollamada
      const { data: updatedCall, error: updateError } = await this.supabase
        .from('video_calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          recording_url: recordingUrl || null,
          duration_minutes: durationMinutes || null
        })
        .eq('id', callId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(`Error al finalizar videollamada: ${updateError.message}`);
      }

      return updatedCall;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al finalizar videollamada');
    }
  }

  /**
   * Obtener videollamadas del usuario
   */
  async getUserVideoCalls(userId: string) {
    try {
      const { data: calls, error } = await this.supabase
        .from('video_call_participants')
        .select(`
          call_id,
          joined_at,
          left_at,
          duration_minutes,
          video_calls (
            id,
            jitsi_room_name,
            status,
            scheduled_for,
            started_at,
            ended_at,
            recording_url,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (error) {
        throw new BadRequestException(`Error al obtener videollamadas: ${error.message}`);
      }

      return calls;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener videollamadas');
    }
  }

  /**
   * Obtener detalles de una videollamada
   */
  async getVideoCallDetails(callId: string, userId: string) {
    try {
      // Verificar que es participante o creador
      const { data: participant } = await this.supabase
        .from('video_call_participants')
        .select('id')
        .eq('call_id', callId)
        .eq('user_id', userId)
        .single();

      const { data: videoCall } = await this.supabase
        .from('video_calls')
        .select('started_by')
        .eq('id', callId)
        .single();

      if (!participant && videoCall?.started_by !== userId) {
        throw new ForbiddenException('No tienes acceso a esta videollamada');
      }

      // Obtener detalles completos
      const { data: callDetails, error } = await this.supabase
        .from('video_calls')
        .select(`
          *,
          video_call_participants (
            user_id,
            joined_at,
            left_at,
            duration_minutes
          )
        `)
        .eq('id', callId)
        .single();

      if (error) {
        throw new BadRequestException(`Error al obtener detalles: ${error.message}`);
      }

      return {
        ...callDetails,
        jitsiConfig: callDetails.status === 'active' || callDetails.status === 'scheduled' 
          ? this.generateJitsiConfig(callDetails.jitsi_room_name, userId)
          : null
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener detalles de videollamada');
    }
  }

  /**
   * Obtener videollamadas activas
   */
  async getActiveVideoCalls() {
    try {
      const { data: activeCalls, error } = await this.supabase
        .from('video_calls')
        .select(`
          *,
          video_call_participants!inner (
            user_id
          )
        `)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) {
        throw new BadRequestException(`Error al obtener videollamadas activas: ${error.message}`);
      }

      return activeCalls;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener videollamadas activas');
    }
  }

  /**
   * Métodos privados
   */
  private async addParticipant(callId: string, userId: string) {
    const { error } = await this.supabase
      .from('video_call_participants')
      .insert({
        call_id: callId,
        user_id: userId,
        joined_at: new Date().toISOString()
      });

    if (error) {
      throw new BadRequestException(`Error al agregar participante: ${error.message}`);
    }
  }

  private async updateVideoCallStatus(callId: string, status: string, userId?: string) {
    const updateData: any = { status };
    
    if (status === 'active' && userId) {
      updateData.started_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('video_calls')
      .update(updateData)
      .eq('id', callId);

    if (error) {
      throw new BadRequestException(`Error al actualizar estado: ${error.message}`);
    }
  }

  private generateJitsiConfig(roomName: string, userId: string) {
    return {
      domain: 'meet.jit.si',
      roomName,
      options: {
        width: '100%',
        height: 500,
        configOverwrite: {
          // ¡CLAVE! Estas configuraciones evitan páginas intermedias
          prejoinPageEnabled: false,        // No mostrar página de pre-unión
          enableWelcomePage: false,         // No mostrar página de bienvenida
          enableClosePage: false,           // No mostrar página de cierre
          disableInitialGUM: false,         // Permitir acceso a medios
          autoJoinDisabled: false,          // Habilitar auto-join
          
          // Configuración de medios
          startWithAudioMuted: false,       // Audio activado por defecto
          startWithVideoMuted: false,       // Video activado por defecto
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false,
          
          // Configuración de calidad
          resolution: 720,
          constraints: {
            video: {
              aspectRatio: 16 / 9,
              height: {
                ideal: 720,
                max: 1080,
                min: 240
              }
            }
          },
          
          // Configuración de red
          p2p: {
            enabled: true,
            preferH264: true
          },
          
          // Configuración adicional para mejor UX
          disableThirdPartyRequests: false,
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
          startAudioOnly: false,
          enableLipSync: true
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'chat', 'raisehand', 'videoquality', 'filmstrip',
            'feedback', 'stats', 'shortcuts', 'tileview',
            'videobackgroundblur', 'help'
          ],
          SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
          
          // Branding mejorado
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: 'https://tutormatch.com',
          SHOW_POWERED_BY: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          
          // UX mejorado
          LANG_DETECTION: true,
          CONNECTION_INDICATOR_DISABLED: false,
          VIDEO_QUALITY_LABEL_DISABLED: false,
          RECENT_LIST_ENABLED: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          MOBILE_APP_PROMO: false,
          ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: 5000,
          
          // Configuración adicional para auto-join
          APP_NAME: 'TutorMatch',
          NATIVE_APP_NAME: 'TutorMatch',
          DEFAULT_BACKGROUND: '#007bff'
        },
        userInfo: {
          displayName: `Usuario TutorMatch`,
          email: `${userId}@tutormatch.com`
        }
      }
    };
  }
}
