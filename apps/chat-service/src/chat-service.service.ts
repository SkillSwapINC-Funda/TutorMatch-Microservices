import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { createSupabaseClient, Database } from '@app/shared';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  CreateRoomDto, 
  SendMessageDto, 
  JoinRoomDto, 
  MarkMessagesAsReadDto,
  EditMessageDto,
  DeleteMessageDto 
} from './dto/chat.dto';

@Injectable()
export class ChatServiceService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createSupabaseClient({ useServiceRole: true });
  }

  getHello(): string {
    return 'Chat Service is running with Supabase Realtime!';
  }

  /**
   * Crear una nueva sala de chat
   */
  async createRoom(createRoomDto: CreateRoomDto, userId: string) {
    const { name, type, tutoringSessionId } = createRoomDto;

    try {
      // Crear la sala
      const { data: room, error: roomError } = await this.supabase
        .from('chat_rooms')
        .insert({
          name,
          type,
          created_by: userId,
          tutoring_session_id: tutoringSessionId || null,
        })
        .select()
        .single();

      if (roomError) {
        throw new BadRequestException(`Error al crear sala: ${roomError.message}`);
      }

      // Agregar al creador como participante y admin
      const { error: participantError } = await this.supabase
        .from('chat_participants')
        .insert({
          room_id: room.id,
          user_id: userId,
          is_admin: true,
        });

      if (participantError) {
        throw new BadRequestException(`Error al agregar participante: ${participantError.message}`);
      }

      return room;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al crear sala');
    }
  }

  /**
   * Obtener salas de un usuario
   */
  async getUserRooms(userId: string) {
    try {
      const { data: rooms, error } = await this.supabase
        .from('chat_participants')
        .select(`
          room_id,
          is_admin,
          joined_at,
          last_seen,
          chat_rooms (
            id,
            name,
            type,
            created_at,
            is_active,
            tutoring_session_id,
            created_by,
            profiles!chat_rooms_created_by_fkey (
              first_name,
              last_name,
              avatar
            )
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw new BadRequestException(`Error al obtener salas: ${error.message}`);
      }

      return rooms;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener salas');
    }
  }

  /**
   * Unirse a una sala de chat
   */
  async joinRoom(joinRoomDto: JoinRoomDto, userId: string) {
    const { roomId, isAdmin = false } = joinRoomDto;

    try {
      // Verificar si la sala existe
      const { data: room, error: roomError } = await this.supabase
        .from('chat_rooms')
        .select('id, type, is_active')
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        throw new NotFoundException('Sala no encontrada');
      }

      if (!room.is_active) {
        throw new ForbiddenException('La sala no está activa');
      }

      // Verificar si ya es participante
      const { data: existingParticipant } = await this.supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (existingParticipant) {
        throw new BadRequestException('Ya eres participante de esta sala');
      }

      // Agregar como participante
      const { data: participant, error: participantError } = await this.supabase
        .from('chat_participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          is_admin: isAdmin,
        })
        .select()
        .single();

      if (participantError) {
        throw new BadRequestException(`Error al unirse a la sala: ${participantError.message}`);
      }

      // Enviar mensaje del sistema
      await this.sendSystemMessage(roomId, `Un usuario se ha unido a la sala`);

      return participant;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al unirse a la sala');
    }
  }

  /**
   * Enviar un mensaje
   */
  async sendMessage(sendMessageDto: SendMessageDto, userId: string) {
    const { content, roomId, messageType = 'text', replyTo, fileName, fileUrl, fileSize } = sendMessageDto;

    try {
      // Verificar si el usuario es participante de la sala
      const { data: participant, error: participantError } = await this.supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        throw new ForbiddenException('No tienes acceso a esta sala');
      }

      // Enviar mensaje
      const { data: message, error: messageError } = await this.supabase
        .from('chat_messages')
        .insert({
          content,
          room_id: roomId,
          sender_id: userId,
          message_type: messageType,
          reply_to: replyTo || null,
          file_name: fileName || null,
          file_url: fileUrl || null,
          file_size: fileSize || null,
        })
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey (
            first_name,
            last_name,
            avatar
          ),
          reply_message:chat_messages!chat_messages_reply_to_fkey (
            id,
            content,
            sender_id,
            profiles!chat_messages_sender_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .single();

      if (messageError) {
        throw new BadRequestException(`Error al enviar mensaje: ${messageError.message}`);
      }

      return message;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al enviar mensaje');
    }
  }

  /**
   * Obtener mensajes de una sala
   */
  async getRoomMessages(roomId: string, userId: string, page = 1, limit = 50) {
    try {
      // Verificar acceso a la sala
      const { data: participant, error: participantError } = await this.supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        throw new ForbiddenException('No tienes acceso a esta sala');
      }

      const offset = (page - 1) * limit;

      const { data: messages, error: messagesError } = await this.supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey (
            first_name,
            last_name,
            avatar
          ),
          reply_message:chat_messages!chat_messages_reply_to_fkey (
            id,
            content,
            sender_id,
            profiles!chat_messages_sender_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        throw new BadRequestException(`Error al obtener mensajes: ${messagesError.message}`);
      }

      return {
        messages: messages.reverse(), // Invertir para mostrar más antiguos primero
        page,
        limit,
        hasMore: messages.length === limit,
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener mensajes');
    }
  }

  /**
   * Editar un mensaje
   */
  async editMessage(editMessageDto: EditMessageDto, userId: string) {
    const { messageId, content } = editMessageDto;

    try {
      // Verificar que el mensaje existe y es del usuario
      const { data: message, error: messageError } = await this.supabase
        .from('chat_messages')
        .select('id, sender_id, room_id')
        .eq('id', messageId)
        .eq('sender_id', userId)
        .eq('is_deleted', false)
        .single();

      if (messageError || !message) {
        throw new NotFoundException('Mensaje no encontrado o no tienes permisos para editarlo');
      }

      // Actualizar mensaje
      const { data: updatedMessage, error: updateError } = await this.supabase
        .from('chat_messages')
        .update({
          content,
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey (
            first_name,
            last_name,
            avatar
          )
        `)
        .single();

      if (updateError) {
        throw new BadRequestException(`Error al editar mensaje: ${updateError.message}`);
      }

      return updatedMessage;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al editar mensaje');
    }
  }

  /**
   * Eliminar un mensaje
   */
  async deleteMessage(deleteMessageDto: DeleteMessageDto, userId: string) {
    const { messageId } = deleteMessageDto;

    try {
      // Verificar que el mensaje existe y es del usuario
      const { data: message, error: messageError } = await this.supabase
        .from('chat_messages')
        .select('id, sender_id, room_id')
        .eq('id', messageId)
        .eq('sender_id', userId)
        .eq('is_deleted', false)
        .single();

      if (messageError || !message) {
        throw new NotFoundException('Mensaje no encontrado o no tienes permisos para eliminarlo');
      }

      // Marcar como eliminado (soft delete)
      const { error: deleteError } = await this.supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          content: 'Mensaje eliminado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (deleteError) {
        throw new BadRequestException(`Error al eliminar mensaje: ${deleteError.message}`);
      }

      return { message: 'Mensaje eliminado exitosamente' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al eliminar mensaje');
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markMessagesAsRead(markAsReadDto: MarkMessagesAsReadDto, userId: string) {
    const { roomId } = markAsReadDto;

    try {
      // Actualizar last_seen del participante
      const { error } = await this.supabase
        .from('chat_participants')
        .update({
          last_seen: new Date().toISOString(),
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        throw new BadRequestException(`Error al marcar mensajes como leídos: ${error.message}`);
      }

      return { message: 'Mensajes marcados como leídos' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al marcar mensajes como leídos');
    }
  }

  /**
   * Obtener participantes de una sala
   */
  async getRoomParticipants(roomId: string, userId: string) {
    try {
      // Verificar acceso a la sala
      const { data: userParticipant, error: participantError } = await this.supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (participantError || !userParticipant) {
        throw new ForbiddenException('No tienes acceso a esta sala');
      }

      const { data: participants, error } = await this.supabase
        .from('chat_participants')
        .select(`
          id,
          is_admin,
          joined_at,
          last_seen,
          profiles!chat_participants_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar,
            role,
            status
          )
        `)
        .eq('room_id', roomId);

      if (error) {
        throw new BadRequestException(`Error al obtener participantes: ${error.message}`);
      }

      return participants;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener participantes');
    }
  }

  /**
   * Salir de una sala
   */
  async leaveRoom(roomId: string, userId: string) {
    try {
      // Verificar si es participante
      const { data: participant, error: participantError } = await this.supabase
        .from('chat_participants')
        .select('id, is_admin')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        throw new NotFoundException('No eres participante de esta sala');
      }

      // Eliminar participante
      const { error: deleteError } = await this.supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new BadRequestException(`Error al salir de la sala: ${deleteError.message}`);
      }

      // Enviar mensaje del sistema
      await this.sendSystemMessage(roomId, `Un usuario ha salido de la sala`);

      return { message: 'Has salido de la sala exitosamente' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al salir de la sala');
    }
  }

  /**
   * Configurar suscripción en tiempo real para una sala
   */
  async subscribeToRoom(roomId: string, userId: string) {
    try {
      // Verificar acceso a la sala
      const { data: participant, error: participantError } = await this.supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        throw new ForbiddenException('No tienes acceso a esta sala');
      }

      // Retornar información para configurar la suscripción
      return {
        roomId,
        channel: `room:${roomId}`,
        events: ['INSERT', 'UPDATE', 'DELETE'],
        table: 'chat_messages'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error al configurar suscripción');
    }
  }

  /**
   * Enviar mensaje del sistema
   */
  private async sendSystemMessage(roomId: string, content: string) {
    try {
      await this.supabase
        .from('chat_messages')
        .insert({
          content,
          room_id: roomId,
          sender_id: null, // Sistema
          message_type: 'system',
        });
    } catch (error) {
      // Log del error pero no interrumpir el flujo principal
      console.error('Error al enviar mensaje del sistema:', error);
    }
  }
}
