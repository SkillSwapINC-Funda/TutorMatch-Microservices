import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Database } from '@app/shared';

export type MessageType = Database['public']['Enums']['message_type'];
export type ChatRoomType = Database['public']['Enums']['chat_room_type'];

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['direct', 'group', 'tutoring'])
  type: ChatRoomType;

  @IsOptional()
  @IsUUID()
  tutoringSessionId?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsEnum(['text', 'file', 'image', 'system'])
  messageType?: MessageType;

  @IsOptional()
  @IsUUID()
  replyTo?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  fileSize?: number;
}

export class JoinRoomDto {
  @IsUUID()
  roomId: string;

  @IsOptional()
  isAdmin?: boolean;
}

export class MarkMessagesAsReadDto {
  @IsUUID()
  roomId: string;
}

export class EditMessageDto {
  @IsUUID()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class DeleteMessageDto {
  @IsUUID()
  messageId: string;
}
