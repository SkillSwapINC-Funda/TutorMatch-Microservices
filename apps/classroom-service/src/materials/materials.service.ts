import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { createSupabaseClient, Database } from '@app/shared';
import { SupabaseClient } from '@supabase/supabase-js';
import { UploadMaterialDto, UpdateMaterialDto, GetMaterialsDto } from './dto/materials.dto';

@Injectable()
export class MaterialsService {
  private supabase: SupabaseClient<Database>;
  private readonly BUCKET_NAME = 'materials';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = {
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
    presentation: ['ppt', 'pptx', 'odp'],
    other: ['zip', 'rar', '7z', 'tar', 'gz']
  };

  constructor() {
    this.supabase = createSupabaseClient({ useServiceRole: true });
    this.initializeBucket();
  }

  /**
   * Inicializar bucket de materiales si no existe
   */
  private async initializeBucket() {
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);

      if (!bucketExists) {
        const { error } = await this.supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false, // Los materiales son privados por defecto
          allowedMimeTypes: [
            // Documentos
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/rtf',
            'application/vnd.oasis.opendocument.text',
            
            // Imágenes
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp',
            'image/webp',
            'image/svg+xml',
            
            // Videos
            'video/mp4',
            'video/avi',
            'video/quicktime',
            'video/x-ms-wmv',
            'video/x-flv',
            'video/webm',
            'video/x-matroska',
            
            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/aac',
            'audio/flac',
            'audio/mp4',
            
            // Presentaciones
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.oasis.opendocument.presentation',
            
            // Archivos comprimidos
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip'
          ],
          fileSizeLimit: this.MAX_FILE_SIZE
        });

        if (error) {
          console.error('Error creando bucket de materiales:', error);
        } else {
          console.log('✅ Bucket de materiales creado exitosamente');
        }
      }
    } catch (error) {
      console.error('Error inicializando bucket:', error);
    }
  }

  /**
   * Subir material a la tutoría
   */
  async uploadMaterial(
    uploadMaterialDto: UploadMaterialDto,
    file: any,
    userId: string
  ) {
    const { title, description, tutoringId, type } = uploadMaterialDto;

    try {
      // Verificar que la sesión de tutoría existe y el usuario tiene acceso
      await this.verifyTutoringAccess(tutoringId, userId);

      // Validar archivo
      this.validateFile(file, type);

      // Generar nombre único para el archivo
      const fileExtension = this.getFileExtension(file.originalname);
      const fileName = `${tutoringId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      // Subir archivo al bucket
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw new BadRequestException(`Error al subir archivo: ${uploadError.message}`);
      }

      // Obtener URL del archivo
      const { data: urlData } = this.supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      // Guardar registro en la base de datos
      const { data: material, error: dbError } = await this.supabase
        .from('tutoring_materials')
        .insert({
          title,
          description: description || null,
          tutoring_id: tutoringId,
          type,
          url: urlData.publicUrl,
          size: file.size,
          uploaded_by: userId
        })
        .select()
        .single();

      if (dbError) {
        // Si hay error en la BD, eliminar el archivo subido
        await this.supabase.storage
          .from(this.BUCKET_NAME)
          .remove([fileName]);
        
        throw new BadRequestException(`Error al guardar material: ${dbError.message}`);
      }

      return {
        ...material,
        file_name: file.originalname,
        file_path: fileName
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al subir material');
    }
  }

  /**
   * Obtener materiales de una tutoría
   */
  async getTutoringMaterials(
    tutoringId: string,
    getMaterialsDto: GetMaterialsDto,
    userId: string
  ) {
    try {
      // Verificar acceso a la tutoría
      await this.verifyTutoringAccess(tutoringId, userId);

      const { type, page = 1, limit = 20 } = getMaterialsDto;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('tutoring_materials')
        .select('*')
        .eq('tutoring_id', tutoringId)
        .order('created_at', { ascending: false });

      // Filtrar por tipo si se especifica
      if (type) {
        query = query.eq('type', type);
      }

      // Aplicar paginación
      query = query.range(offset, offset + limit - 1);

      const { data: materials, error } = await query;

      if (error) {
        throw new BadRequestException(`Error al obtener materiales: ${error.message}`);
      }

      // Obtener conteo total para paginación
      let countQuery = this.supabase
        .from('tutoring_materials')
        .select('*', { count: 'exact', head: true })
        .eq('tutoring_id', tutoringId);

      if (type) {
        countQuery = countQuery.eq('type', type);
      }

      const { count } = await countQuery;

      return {
        materials,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: offset + limit < (count || 0)
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al obtener materiales');
    }
  }

  /**
   * Descargar material
   */
  async downloadMaterial(materialId: string, userId: string) {
    try {
      // Obtener información del material
      const { data: material, error } = await this.supabase
        .from('tutoring_materials')
        .select('*, tutoring_sessions(*)')
        .eq('id', materialId)
        .single();

      if (error || !material) {
        throw new NotFoundException('Material no encontrado');
      }

      // Verificar acceso a la tutoría
      await this.verifyTutoringAccess(material.tutoring_id, userId);

      // Extraer el path del archivo desde la URL
      const urlParts = material.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const tutoringPath = urlParts[urlParts.length - 2];
      const filePath = `${tutoringPath}/${fileName}`;

      // Generar URL firmada para descarga (válida por 1 hora)
      const { data: signedUrlData, error: urlError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 3600); // 1 hora

      if (urlError) {
        throw new BadRequestException(`Error al generar URL de descarga: ${urlError.message}`);
      }

      return {
        downloadUrl: signedUrlData.signedUrl,
        material: {
          id: material.id,
          title: material.title,
          type: material.type,
          size: material.size,
          created_at: material.created_at
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al descargar material');
    }
  }

  /**
   * Actualizar información del material
   */
  async updateMaterial(
    materialId: string,
    updateMaterialDto: UpdateMaterialDto,
    userId: string
  ) {
    try {
      // Verificar que el material existe y el usuario tiene acceso
      const { data: material, error: materialError } = await this.supabase
        .from('tutoring_materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (materialError || !material) {
        throw new NotFoundException('Material no encontrado');
      }

      // Verificar acceso a la tutoría
      await this.verifyTutoringAccess(material.tutoring_id, userId);

      // Solo el uploader o tutor puede editar
      const { data: session } = await this.supabase
        .from('tutoring_sessions')
        .select('tutor_id')
        .eq('id', material.tutoring_id)
        .single();

      if (material.uploaded_by !== userId && session?.tutor_id !== userId) {
        throw new ForbiddenException('No tienes permisos para editar este material');
      }

      // Actualizar material
      const { data: updatedMaterial, error: updateError } = await this.supabase
        .from('tutoring_materials')
        .update({
          ...updateMaterialDto,
          updated_at: new Date().toISOString()
        })
        .eq('id', materialId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(`Error al actualizar material: ${updateError.message}`);
      }

      return updatedMaterial;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al actualizar material');
    }
  }

  /**
   * Eliminar material
   */
  async deleteMaterial(materialId: string, userId: string) {
    try {
      // Verificar que el material existe y el usuario tiene acceso
      const { data: material, error: materialError } = await this.supabase
        .from('tutoring_materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (materialError || !material) {
        throw new NotFoundException('Material no encontrado');
      }

      // Verificar acceso a la tutoría
      await this.verifyTutoringAccess(material.tutoring_id, userId);

      // Solo el uploader o tutor puede eliminar
      const { data: session } = await this.supabase
        .from('tutoring_sessions')
        .select('tutor_id')
        .eq('id', material.tutoring_id)
        .single();

      if (material.uploaded_by !== userId && session?.tutor_id !== userId) {
        throw new ForbiddenException('No tienes permisos para eliminar este material');
      }

      // Extraer path del archivo
      const urlParts = material.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const tutoringPath = urlParts[urlParts.length - 2];
      const filePath = `${tutoringPath}/${fileName}`;

      // Eliminar archivo del storage
      const { error: storageError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (storageError) {
        console.error('Error al eliminar archivo del storage:', storageError);
        // Continuar con la eliminación del registro aunque falle el storage
      }

      // Eliminar registro de la base de datos
      const { error: deleteError } = await this.supabase
        .from('tutoring_materials')
        .delete()
        .eq('id', materialId);

      if (deleteError) {
        throw new BadRequestException(`Error al eliminar material: ${deleteError.message}`);
      }

      return { message: 'Material eliminado exitosamente' };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error interno al eliminar material');
    }
  }

  /**
   * Métodos privados de utilidad
   */
  private async verifyTutoringAccess(tutoringId: string, userId: string) {
    const { data: session, error } = await this.supabase
      .from('tutoring_sessions')
      .select('tutor_id')
      .eq('id', tutoringId)
      .single();

    if (error || !session) {
      throw new NotFoundException('Sesión de tutoría no encontrada');
    }

    // Por ahora solo verificamos que sea el tutor
    // TODO: Agregar verificación de estudiante cuando se implemente el sistema de inscripciones
    if (session.tutor_id !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sesión de tutoría');
    }
  }

  private validateFile(file: any, type: string) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`El archivo es demasiado grande. Máximo permitido: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const fileExtension = this.getFileExtension(file.originalname);
    const allowedExtensions = this.ALLOWED_TYPES[type] || [];

    if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
      throw new BadRequestException(`Tipo de archivo no permitido para la categoría ${type}. Extensiones permitidas: ${allowedExtensions.join(', ')}`);
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
}
