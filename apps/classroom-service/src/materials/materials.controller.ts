import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody, 
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery
} from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { AuthGuard, GetUser } from '@app/shared';
import { UploadMaterialDto, UpdateMaterialDto, GetMaterialsDto } from './dto/materials.dto';

@ApiTags('materials')
@Controller('materials')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Subir material de tutoría',
    description: 'Sube un archivo (documento, imagen, video, etc.) como material de una sesión de tutoría'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir'
        },
        title: {
          type: 'string',
          description: 'Título del material',
          example: 'Ejercicios de Álgebra - Capítulo 1'
        },
        description: {
          type: 'string',
          description: 'Descripción del material',
          example: 'Ejercicios prácticos sobre ecuaciones lineales'
        },
        tutoringId: {
          type: 'string',
          format: 'uuid',
          description: 'ID de la sesión de tutoría'
        },
        type: {
          type: 'string',
          enum: ['document', 'image', 'video', 'audio', 'presentation', 'other'],
          description: 'Tipo de material'
        }
      },
      required: ['file', 'title', 'tutoringId', 'type']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Material subido exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        type: { type: 'string' },
        url: { type: 'string' },
        size: { type: 'number' },
        file_name: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido o datos incorrectos' })
  @ApiResponse({ status: 403, description: 'Sin acceso a la sesión de tutoría' })
  @ApiResponse({ status: 404, description: 'Sesión de tutoría no encontrada' })
  async uploadMaterial(
    @UploadedFile() file: any,
    @Body() uploadMaterialDto: UploadMaterialDto,
    @GetUser() user: any
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo');
    }

    return this.materialsService.uploadMaterial(uploadMaterialDto, file, user.id);
  }

  @Get('tutoring/:tutoringId')
  @ApiOperation({ 
    summary: 'Obtener materiales de una tutoría',
    description: 'Obtiene todos los materiales asociados a una sesión de tutoría específica'
  })
  @ApiParam({ 
    name: 'tutoringId', 
    description: 'ID de la sesión de tutoría', 
    type: 'string', 
    format: 'uuid' 
  })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: ['document', 'image', 'video', 'audio', 'presentation', 'other'],
    description: 'Filtrar por tipo de material' 
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: 'number', 
    description: 'Número de página',
    example: 1 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: 'number', 
    description: 'Elementos por página',
    example: 20 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de materiales de la tutoría',
    schema: {
      type: 'object',
      properties: {
        materials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              type: { type: 'string' },
              url: { type: 'string' },
              size: { type: 'number' },
              created_at: { type: 'string', format: 'date-time' },
              uploaded_by: { type: 'string', format: 'uuid' }
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
  @ApiResponse({ status: 403, description: 'Sin acceso a la sesión de tutoría' })
  @ApiResponse({ status: 404, description: 'Sesión de tutoría no encontrada' })
  async getTutoringMaterials(
    @Param('tutoringId') tutoringId: string,
    @Query() getMaterialsDto: GetMaterialsDto,
    @GetUser() user: any
  ) {
    return this.materialsService.getTutoringMaterials(tutoringId, getMaterialsDto, user.id);
  }

  @Get(':materialId/download')
  @ApiOperation({ 
    summary: 'Descargar material',
    description: 'Genera una URL firmada para descargar un material específico'
  })
  @ApiParam({ 
    name: 'materialId', 
    description: 'ID del material', 
    type: 'string', 
    format: 'uuid' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'URL de descarga generada',
    schema: {
      type: 'object',
      properties: {
        downloadUrl: { type: 'string', description: 'URL firmada para descarga' },
        material: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            type: { type: 'string' },
            size: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Sin acceso al material' })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async downloadMaterial(
    @Param('materialId') materialId: string,
    @GetUser() user: any
  ) {
    return this.materialsService.downloadMaterial(materialId, user.id);
  }

  @Patch(':materialId')
  @ApiOperation({ 
    summary: 'Actualizar información del material',
    description: 'Actualiza el título y/o descripción de un material existente'
  })
  @ApiParam({ 
    name: 'materialId', 
    description: 'ID del material', 
    type: 'string', 
    format: 'uuid' 
  })
  @ApiBody({ type: UpdateMaterialDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Material actualizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        type: { type: 'string' },
        url: { type: 'string' },
        size: { type: 'number' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar este material' })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async updateMaterial(
    @Param('materialId') materialId: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
    @GetUser() user: any
  ) {
    return this.materialsService.updateMaterial(materialId, updateMaterialDto, user.id);
  }

  @Delete(':materialId')
  @ApiOperation({ 
    summary: 'Eliminar material',
    description: 'Elimina un material y su archivo asociado del almacenamiento'
  })
  @ApiParam({ 
    name: 'materialId', 
    description: 'ID del material', 
    type: 'string', 
    format: 'uuid' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Material eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar este material' })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async deleteMaterial(
    @Param('materialId') materialId: string,
    @GetUser() user: any
  ) {
    return this.materialsService.deleteMaterial(materialId, user.id);
  }
}
