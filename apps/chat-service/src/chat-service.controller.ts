import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
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

@Controller('chat')
export class ChatServiceController {
  constructor(private readonly chatServiceService: ChatServiceService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.chatServiceService.getHello();
  }

  // ===== SALAS DE CHAT =====

  /**
   * Crear una nueva sala de chat
   */
  @Post('rooms')
  @UseGuards(AuthGuard)
  async createRoom(@Body() createRoomDto: CreateRoomDto, @GetUser() user: any) {
    return this.chatServiceService.createRoom(createRoomDto, user.id);
  }

  /**
   * Obtener salas del usuario
   */
  @Get('rooms')
  @UseGuards(AuthGuard)
  async getUserRooms(@GetUser() user: any) {
    return this.chatServiceService.getUserRooms(user.id);
  }

  /**
   * Unirse a una sala
   */
  @Post('rooms/join')
  @UseGuards(AuthGuard)
  async joinRoom(@Body() joinRoomDto: JoinRoomDto, @GetUser() user: any) {
    return this.chatServiceService.joinRoom(joinRoomDto, user.id);
  }

  /**
   * Salir de una sala
   */
  @Delete('rooms/:roomId/leave')
  @UseGuards(AuthGuard)
  async leaveRoom(@Param('roomId') roomId: string, @GetUser() user: any) {
    return this.chatServiceService.leaveRoom(roomId, user.id);
  }

  /**
   * Obtener participantes de una sala
   */
  @Get('rooms/:roomId/participants')
  @UseGuards(AuthGuard)
  async getRoomParticipants(@Param('roomId') roomId: string, @GetUser() user: any) {
    return this.chatServiceService.getRoomParticipants(roomId, user.id);
  }

  // ===== MENSAJES =====

  /**
   * Enviar un mensaje
   */
  @Post('messages')
  @UseGuards(AuthGuard)
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @GetUser() user: any) {
    return this.chatServiceService.sendMessage(sendMessageDto, user.id);
  }

  /**
   * Obtener mensajes de una sala
   */
  @Get('rooms/:roomId/messages')
  @UseGuards(AuthGuard)
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

  /**
   * Editar un mensaje
   */
  @Put('messages/:messageId')
  @UseGuards(AuthGuard)
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

  /**
   * Eliminar un mensaje
   */
  @Delete('messages/:messageId')
  @UseGuards(AuthGuard)
  async deleteMessage(@Param('messageId') messageId: string, @GetUser() user: any) {
    const deleteMessageDto: DeleteMessageDto = { messageId };
    return this.chatServiceService.deleteMessage(deleteMessageDto, user.id);
  }

  /**
   * Marcar mensajes como leídos
   */
  @Post('rooms/:roomId/mark-read')
  @UseGuards(AuthGuard)
  async markMessagesAsRead(@Param('roomId') roomId: string, @GetUser() user: any) {
    const markAsReadDto: MarkMessagesAsReadDto = { roomId };
    return this.chatServiceService.markMessagesAsRead(markAsReadDto, user.id);
  }

  // ===== TIEMPO REAL =====

  /**
   * Configurar suscripción para tiempo real
   */
  @Get('rooms/:roomId/subscribe')
  @UseGuards(AuthGuard)
  async subscribeToRoom(@Param('roomId') roomId: string, @GetUser() user: any) {
    return this.chatServiceService.subscribeToRoom(roomId, user.id);
  }
}
