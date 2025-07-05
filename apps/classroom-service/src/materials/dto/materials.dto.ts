import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNotEmpty, IsEnum, IsNumber } from 'class-validator';

export class UploadMaterialDto {
  @ApiProperty({ 
    description: 'Título del material',
    example: 'Ejercicios de Álgebra - Capítulo 1'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ 
    description: 'Descripción del material',
    example: 'Ejercicios prácticos sobre ecuaciones lineales y cuadráticas'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'ID de la sesión de tutoría',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  tutoringId: string;

  @ApiProperty({ 
    description: 'Tipo de material',
    enum: ['document', 'image', 'video', 'audio', 'presentation', 'other'],
    example: 'document'
  })
  @IsEnum(['document', 'image', 'video', 'audio', 'presentation', 'other'])
  type: string;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional({ 
    description: 'Nuevo título del material',
    example: 'Ejercicios de Álgebra - Capítulo 1 (Actualizado)'
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ 
    description: 'Nueva descripción del material',
    example: 'Ejercicios prácticos actualizados con soluciones detalladas'
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class GetMaterialsDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar por tipo de material',
    enum: ['document', 'image', 'video', 'audio', 'presentation', 'other']
  })
  @IsOptional()
  @IsEnum(['document', 'image', 'video', 'audio', 'presentation', 'other'])
  type?: string;

  @ApiPropertyOptional({ 
    description: 'Número de página',
    example: 1,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ 
    description: 'Elementos por página',
    example: 20,
    default: 20
  })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
