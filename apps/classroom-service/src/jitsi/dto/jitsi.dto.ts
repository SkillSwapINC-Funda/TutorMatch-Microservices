import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export class CreateVideoCallDto {
  @ApiProperty({ 
    description: 'Nombre de la sala Jitsi',
    example: 'tutoring-session-math-123'
  })
  @IsString()
  jitsiRoomName: string;

  @ApiPropertyOptional({ 
    description: 'ID de la sala de chat asociada',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ 
    description: 'ID de la sesión de tutoría asociada',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  tutoringSessionId?: string;

  @ApiPropertyOptional({ 
    description: 'Fecha y hora programada para la videollamada',
    example: '2024-07-05T10:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class JoinVideoCallDto {
  @ApiProperty({ 
    description: 'ID de la videollamada',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  callId: string;
}

export class EndVideoCallDto {
  @ApiProperty({ 
    description: 'ID de la videollamada',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  callId: string;

  @ApiPropertyOptional({ 
    description: 'URL de la grabación si existe',
    example: 'https://recordings.jitsi.net/recording-123.mp4'
  })
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Duración en minutos de la videollamada',
    example: 45
  })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;
}

export class UpdateVideoCallStatusDto {
  @ApiProperty({ 
    description: 'Nuevo estado de la videollamada',
    enum: ['scheduled', 'active', 'ended', 'cancelled'],
    example: 'active'
  })
  @IsEnum(['scheduled', 'active', 'ended', 'cancelled'])
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
}
