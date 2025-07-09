import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  Query 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody, 
  ApiBearerAuth,
  ApiQuery 
} from '@nestjs/swagger';
import { JitsiService } from './jitsi.service';
import { AuthGuard, GetUser } from '@app/shared';
import { 
  CreateVideoCallDto, 
  JoinVideoCallDto, 
  EndVideoCallDto, 
  UpdateVideoCallStatusDto 
} from './dto/jitsi.dto';

@ApiTags('video-calls')
@Controller('api/classroom/video-calls')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class JitsiController {
  constructor(private readonly jitsiService: JitsiService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear una nueva videollamada',
    description: 'Crea una nueva videollamada de Jitsi Meet con configuración personalizada'
  })
  @ApiBody({ type: CreateVideoCallDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Videollamada creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        jitsi_room_name: { type: 'string' },
        status: { type: 'string', enum: ['scheduled', 'active', 'ended', 'cancelled'] },
        created_at: { type: 'string', format: 'date-time' },
        jitsiConfig: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
            roomName: { type: 'string' },
            options: { type: 'object' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sala ya existe' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createVideoCall(@Body() createVideoCallDto: CreateVideoCallDto, @GetUser() user: any) {
    return this.jitsiService.createVideoCall(createVideoCallDto, user.id);
  }

  @Post('join')
  @ApiOperation({ 
    summary: 'Unirse a una videollamada',
    description: 'Permite al usuario unirse a una videollamada existente'
  })
  @ApiBody({ type: JoinVideoCallDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Se unió a la videollamada exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        jitsi_room_name: { type: 'string' },
        status: { type: 'string' },
        jitsiConfig: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Videollamada no encontrada' })
  @ApiResponse({ status: 403, description: 'Videollamada terminada o sin acceso' })
  @ApiResponse({ status: 400, description: 'Ya es participante' })
  async joinVideoCall(@Body() joinVideoCallDto: JoinVideoCallDto, @GetUser() user: any) {
    return this.jitsiService.joinVideoCall(joinVideoCallDto, user.id);
  }

  @Post(':callId/leave')
  @ApiOperation({ 
    summary: 'Salir de una videollamada',
    description: 'Permite al usuario salir de una videollamada activa'
  })
  @ApiParam({ name: 'callId', description: 'ID de la videollamada', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Salió de la videollamada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        durationMinutes: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'No es participante' })
  async leaveVideoCall(@Param('callId') callId: string, @GetUser() user: any) {
    return this.jitsiService.leaveVideoCall(callId, user.id);
  }

  @Post(':callId/end')
  @ApiOperation({ 
    summary: 'Finalizar una videollamada',
    description: 'Permite al creador finalizar una videollamada y guardar la grabación'
  })
  @ApiParam({ name: 'callId', description: 'ID de la videollamada', type: 'string', format: 'uuid' })
  @ApiBody({ type: EndVideoCallDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Videollamada finalizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string' },
        ended_at: { type: 'string', format: 'date-time' },
        recording_url: { type: 'string', nullable: true },
        duration_minutes: { type: 'number', nullable: true }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Solo el creador puede finalizar' })
  @ApiResponse({ status: 404, description: 'Videollamada no encontrada' })
  async endVideoCall(@Param('callId') callId: string, @Body() endVideoCallDto: EndVideoCallDto, @GetUser() user: any) {
    return this.jitsiService.endVideoCall({ ...endVideoCallDto, callId }, user.id);
  }

  @Get('my-calls')
  @ApiOperation({ 
    summary: 'Obtener mis videollamadas',
    description: 'Obtiene todas las videollamadas en las que ha participado el usuario'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de videollamadas del usuario',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          call_id: { type: 'string', format: 'uuid' },
          joined_at: { type: 'string', format: 'date-time' },
          left_at: { type: 'string', format: 'date-time', nullable: true },
          duration_minutes: { type: 'number', nullable: true },
          video_calls: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              jitsi_room_name: { type: 'string' },
              status: { type: 'string' },
              recording_url: { type: 'string', nullable: true }
            }
          }
        }
      }
    }
  })
  async getUserVideoCalls(@GetUser() user: any) {
    return this.jitsiService.getUserVideoCalls(user.id);
  }

  @Get('active')
  @ApiOperation({ 
    summary: 'Obtener videollamadas activas',
    description: 'Obtiene todas las videollamadas que están actualmente en curso'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de videollamadas activas',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          jitsi_room_name: { type: 'string' },
          status: { type: 'string' },
          started_at: { type: 'string', format: 'date-time' },
          participant_count: { type: 'number' }
        }
      }
    }
  })
  async getActiveVideoCalls() {
    return this.jitsiService.getActiveVideoCalls();
  }

  @Get(':callId')
  @ApiOperation({ 
    summary: 'Obtener detalles de una videollamada',
    description: 'Obtiene los detalles completos de una videollamada específica'
  })
  @ApiParam({ name: 'callId', description: 'ID de la videollamada', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detalles de la videollamada',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        jitsi_room_name: { type: 'string' },
        status: { type: 'string' },
        started_at: { type: 'string', format: 'date-time' },
        ended_at: { type: 'string', format: 'date-time', nullable: true },
        recording_url: { type: 'string', nullable: true },
        video_call_participants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid' },
              joined_at: { type: 'string', format: 'date-time' },
              left_at: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        },
        jitsiConfig: { type: 'object', nullable: true }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Sin acceso a esta videollamada' })
  @ApiResponse({ status: 404, description: 'Videollamada no encontrada' })
  async getVideoCallDetails(@Param('callId') callId: string, @GetUser() user: any) {
    return this.jitsiService.getVideoCallDetails(callId, user.id);
  }
}
