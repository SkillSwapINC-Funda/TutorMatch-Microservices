import { Injectable, Logger } from '@nestjs/common';

export interface EnvironmentValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

@Injectable()
export class EnvironmentValidationService {
  private readonly logger = new Logger(EnvironmentValidationService.name);

  private readonly requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  private readonly optionalVars = [
    'API_GATEWAY_PORT',
    'USER_SERVICE_PORT',
    'CLASSROOM_SERVICE_PORT',
    'CHAT_SERVICE_PORT',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
  ];

  validateEnvironment(): EnvironmentValidationResult {
    const missingVars: string[] = [];
    const warnings: string[] = [];

    // Verificar variables requeridas
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    // Verificar variables opcionales y dar warnings
    for (const varName of this.optionalVars) {
      if (!process.env[varName]) {
        warnings.push(`${varName} no está configurada, se usará el valor por defecto`);
      }
    }

    // Validaciones específicas
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
      warnings.push('SUPABASE_URL debería comenzar con https://');
    }

    const result: EnvironmentValidationResult = {
      isValid: missingVars.length === 0,
      missingVars,
      warnings,
    };

    this.logValidationResults(result);
    return result;
  }

  private logValidationResults(result: EnvironmentValidationResult): void {
    if (!result.isValid) {
      this.logger.error('❌ Validación de variables de entorno falló:');
      result.missingVars.forEach((varName) => {
        this.logger.error(`   - ${varName} es requerida pero no está definida`);
      });
      throw new Error('Variables de entorno faltantes');
    }

    if (result.warnings.length > 0) {
      this.logger.warn('⚠️  Advertencias de configuración:');
      result.warnings.forEach((warning) => {
        this.logger.warn(`   - ${warning}`);
      });
    }

    this.logger.log('✅ Validación de variables de entorno exitosa');
  }

  getConfig() {
    return {
      supabase: {
        url: process.env.SUPABASE_URL!,
        anonKey: process.env.SUPABASE_ANON_KEY!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      ports: {
        apiGateway: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
        userService: parseInt(process.env.USER_SERVICE_PORT || '3001', 10),
        classroomService: parseInt(process.env.CLASSROOM_SERVICE_PORT || '3002', 10),
        chatService: parseInt(process.env.CHAT_SERVICE_PORT || '3003', 10),
      },
      app: {
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
        seedDatabase: process.env.SEED_DATABASE === 'true',
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
      },
    };
  }
}
