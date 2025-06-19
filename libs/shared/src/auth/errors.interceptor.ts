import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Log del error
        this.logger.error(
          `Error in ${context.getClass().name}.${context.getHandler().name}:`,
          error.stack,
        );

        // Si ya es una HttpException, la pasamos tal como está
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // Para errores de Supabase específicos
        if (error.code) {
          switch (error.code) {
            case 'PGRST116':
              return throwError(() => new HttpException('Recurso no encontrado', HttpStatus.NOT_FOUND));
            case '23505':
              return throwError(() => new HttpException('El recurso ya existe', HttpStatus.CONFLICT));
            case '23503':
              return throwError(() => new HttpException('Violación de restricción de clave foránea', HttpStatus.BAD_REQUEST));
            default:
              return throwError(() => new HttpException('Error de base de datos', HttpStatus.INTERNAL_SERVER_ERROR));
          }
        }

        // Error genérico del servidor
        return throwError(() => new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR));
      }),
    );
  }
}
