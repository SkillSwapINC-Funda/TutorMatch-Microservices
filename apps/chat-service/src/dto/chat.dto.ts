import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Database } from '@app/shared';

export type MessageType = Database['public']['Enums']['message_type'];
export type ChatRoomType = Database['public']['Enums']['chat_room_type'];

export class CreateRoomDto {
  @ApiProperty({ 
    description: 'Nombre de la sala de chat',
    example: 'Matemáticas - Sesión 1' 
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    description: 'Tipo de sala de chat',
    enum: ['direct', 'group', 'tutoring'],
    example: 'tutoring'
  })
  @IsEnum(['direct', 'group', 'tutoring'])
  type: ChatRoomType;

  @ApiPropertyOptional({ 
    description: 'ID de la sesión de tutoría (requerido para salas tipo tutoring)',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  tutoringSessionId?: string;
}

export class SendMessageDto {
  @ApiProperty({ 
    description: 'Contenido del mensaje',
    example: 'Hola, ¿puedes ayudarme con este problema?' 
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ 
    description: 'ID de la sala donde se enviará el mensaje',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de mensaje',
    enum: ['text', 'file', 'image', 'system'],
    default: 'text',
    example: 'text'
  })
  @IsOptional()
  @IsEnum(['text', 'file', 'image', 'system'])
  messageType?: MessageType;

  @ApiPropertyOptional({ 
    description: 'ID del mensaje al que se está respondiendo',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsOptional()
  @IsUUID()
  replyTo?: string;

  @ApiPropertyOptional({ 
    description: 'Nombre del archivo (para mensajes tipo file o image)',
    example: 'documento.pdf'
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ 
    description: 'URL del archivo (para mensajes tipo file o image)',
    example: 'https://storage.supabase.co/bucket/file.pdf'
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Tamaño del archivo en bytes',
    example: 1024000
  })
  @IsOptional()
  fileSize?: number;
}

export class JoinRoomDto {
  @ApiProperty({ 
    description: 'ID de la sala a la que se quiere unir',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({ 
    description: 'Indica si el usuario se une como administrador',
    default: false,
    example: false
  })
  @IsOptional()
  isAdmin?: boolean;
}

export class MarkMessagesAsReadDto {
  @ApiProperty({ 
    description: 'ID de la sala donde marcar mensajes como leídos',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  roomId: string;
}

export class EditMessageDto {
  @ApiProperty({ 
    description: 'ID del mensaje a editar',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  messageId: string;

  @ApiProperty({ 
    description: 'Nuevo contenido del mensaje',
    example: 'Mensaje editado'
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class DeleteMessageDto {
  @ApiProperty({ 
    description: 'ID del mensaje a eliminar',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  messageId: string;
}
