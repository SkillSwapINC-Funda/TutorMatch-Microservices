import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBody, 
  ApiBearerAuth,
  ApiExcludeEndpoint 
} from '@nestjs/swagger';
import { ChatServiceService } from './chat-service.service';
import { AuthGuard, GetUser, Public } from '@app/shared';
import { 
  CreateRoomDto, 
  SendMessageDto, 
  JoinRoomDto, 
  MarkMessagesAsReadDto,
  EditMessageDto,
  DeleteMessageDto 
} from './dto/chat.dto';

@ApiTags('chat')
@Controller('api/chat')
export class ChatServiceController {
  constructor(private readonly chatServiceService: ChatServiceService) {}

  @Public()
  @Get()
  @ApiExcludeEndpoint()
  getHello(): string {
    return this.chatServiceService.getHello();
  }

  @Public()
  @Get('health')
  @ApiExcludeEndpoint()
  getHealth() {
    return {
      status: 'ok',
      service: 'chat-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    };
  }

  // ===== SALAS DE CHAT =====

  @Post('rooms')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('rooms')
  @ApiOperation({ 
    summary: 'Crear una nueva sala de chat',
    description: 'Crea una nueva sala de chat con el usuario autenticado como administrador'
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Sala de chat creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['direct', 'group', 'tutoring'] },
        created_at: { type: 'string', format: 'date-time' },
        created_by: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @GetUser() user: any) {
    return this.chatServiceService.createRoom(createRoomDto, user.id);
  }

  @Get('rooms')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('rooms')
  @ApiOperation({ 
    summary: 'Obtener salas del usuario',
    description: 'Obtiene todas las salas de chat en las que participa el usuario autenticado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de salas del usuario',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['direct', 'group', 'tutoring'] },
          last_message: { 
            type: 'object',
            properties: {
              content: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              sender_name: { type: 'string' }
            }
          },
          unread_count: { type: 'number' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getUserRooms(@GetUser() user: any) {
    return this.chatServiceService.getUserRooms(user.id);
  }

  @Post('rooms/join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('rooms')
  @ApiOperation({ 
    summary: 'Unirse a una sala',
    description: 'Permite al usuario autenticado unirse a una sala de chat existente'
  })
  @ApiBody({ type: JoinRoomDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Se unió a la sala exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        roomId: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  @ApiResponse({ status: 400, description: 'Ya es miembro de la sala' })
  async joinRoom(@Body() joinRoomDto: JoinRoomDto, @GetUser() user: any) {
    return this.chatServiceService.joinRoom(joinRoomDto, user.id);
  }

  @Delete('rooms/:roomId/leave')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('rooms')
  @ApiOperation({ 
    summary: 'Salir de una sala',
    description: 'Permite al usuario autenticado salir de una sala de chat'
  })
  @ApiParam({ name: 'roomId', description: 'ID de la sala de chat', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Salió de la sala exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        roomId: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  @ApiResponse({ status: 400, description: 'No es miembro de la sala' })
  async leaveRoom(@Param('roomId') roomId: string, @GetUser() user: any) {
    return this.chatServiceService.leaveRoom(roomId, user.id);
  }

  @Get('rooms/:roomId/participants')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('rooms')
  @ApiOperation({ 
    summary: 'Obtener participantes de una sala',
    description: 'Obtiene la lista de participantes de una sala de chat'
  })
  @ApiParam({ name: 'roomId', description: 'ID de la sala de chat', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de participantes',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          full_name: { type: 'string' },
          is_admin: { type: 'boolean' },
          joined_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  @ApiResponse({ status: 403, description: 'No es miembro de la sala' })
  async getRoomParticipants(@Param('roomId') roomId: string, @GetUser() user: any) {
    return this.chatServiceService.getRoomParticipants(roomId, user.id);
  }

  // ===== MENSAJES =====

  @Post('messages')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('messages')
  @ApiOperation({ 
    summary: 'Enviar un mensaje',
    description: 'Envía un nuevo mensaje a una sala de chat'
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Mensaje enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        content: { type: 'string' },
        message_type: { type: 'string', enum: ['text', 'file', 'image', 'system'] },
        created_at: { type: 'string', format: 'date-time' },
        sender_id: { type: 'string', format: 'uuid' },
        room_id: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No es miembro de la sala' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @GetUser() user: any) {
    return this.chatServiceService.sendMessage(sendMessageDto, user.id);
  }

  @Get('rooms/:roomId/messages')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('messages')
  @ApiOperation({ 
    summary: 'Obtener mensajes de una sala',
    description: 'Obtiene los mensajes de una sala de chat con paginación'
  })
  @ApiParam({ name: 'roomId', description: 'ID de la sala de chat', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', description: 'Número de página', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', description: 'Cantidad de mensajes por página', required: false, type: 'number', example: 50 })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de mensajes',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              content: { type: 'string' },
              message_type: { type: 'string', enum: ['text', 'file', 'image', 'system'] },
              created_at: { type: 'string', format: 'date-time' },
              sender: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  full_name: { type: 'string' },
                  email: { type: 'string' }
                }
              },
              reply_to: { type: 'string', format: 'uuid', nullable: true }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            hasMore: { type: 'boolean' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No es miembro de la sala' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @GetUser() user: any
  ) {
    return this.chatServiceService.getRoomMessages(
      roomId, 
      user.id, 
      parseInt(page), 
      parseInt(limit)
    );
  }

  @Patch('messages/:messageId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('messages')
  @ApiOperation({ 
    summary: 'Editar un mensaje',
    description: 'Permite al usuario editar uno de sus mensajes'
  })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje a editar', type: 'string', format: 'uuid' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Nuevo contenido del mensaje' }
      },
      required: ['content']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensaje editado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        content: { type: 'string' },
        updated_at: { type: 'string', format: 'date-time' },
        edited: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No puede editar este mensaje' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
    @GetUser() user: any
  ) {
    const editMessageDto: EditMessageDto = {
      messageId,
      content: body.content
    };
    return this.chatServiceService.editMessage(editMessageDto, user.id);
  }

  @Delete('messages/:messageId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('messages')
  @ApiOperation({ 
    summary: 'Eliminar un mensaje',
    description: 'Permite al usuario eliminar uno de sus mensajes'
  })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje a eliminar', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensaje eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        messageId: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No puede eliminar este mensaje' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  async deleteMessage(@Param('messageId') messageId: string, @GetUser() user: any) {
    const deleteMessageDto: DeleteMessageDto = { messageId };
    return this.chatServiceService.deleteMessage(deleteMessageDto, user.id);
  }

  @Post('rooms/:roomId/mark-read')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('messages')
  @ApiOperation({ 
    summary: 'Marcar mensajes como leídos',
    description: 'Marca todos los mensajes de una sala como leídos por el usuario'
  })
  @ApiParam({ name: 'roomId', description: 'ID de la sala de chat', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensajes marcados como leídos',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        roomId: { type: 'string', format: 'uuid' },
        readCount: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No es miembro de la sala' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async markMessagesAsRead(@Param('roomId') roomId: string, @GetUser() user: any) {
    const markAsReadDto: MarkMessagesAsReadDto = { roomId };
    return this.chatServiceService.markMessagesAsRead(markAsReadDto, user.id);
  }

  // ===== TIEMPO REAL =====

  @Get('rooms/:roomId/subscribe')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiTags('realtime')
  @ApiOperation({ 
    summary: 'Configurar suscripción para tiempo real',
    description: 'Obtiene la configuración necesaria para suscribirse a los eventos en tiempo real de una sala'
  })
  @ApiParam({ name: 'roomId', description: 'ID de la sala de chat', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración de suscripción',
    schema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', format: 'uuid' },
        supabaseUrl: { type: 'string' },
        realtimeConfig: {
          type: 'object',
          properties: {
            schema: { type: 'string' },
            table: { type: 'string' },
            filter: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No es miembro de la sala' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async subscribeToRoom(@Param('roomId') roomId: string, @GetUser() user: any) {
    return this.chatServiceService.subscribeToRoom(roomId, user.id);
  }
}
