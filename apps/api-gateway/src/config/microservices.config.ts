export interface MicroserviceConfig {
  name: string;
  url: string;
  prefix: string;
  description: string;
}

export const MICROSERVICES_CONFIG: MicroserviceConfig[] = [
  {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/api/users',
    description: 'Gestión de usuarios y perfiles'
  },
  {
    name: 'classroom-service', 
    url: process.env.CLASSROOM_SERVICE_URL || 'http://localhost:3002',
    prefix: '/api/classroom',
    description: 'Gestión de aulas virtuales, materiales y videollamadas'
  },
  {
    name: 'chat-service',
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:3003', 
    prefix: '/api/chat',
    description: 'Servicio de chat en tiempo real'
  }
];

export const getServiceForPath = (path: string): MicroserviceConfig | null => {
  return MICROSERVICES_CONFIG.find(service => 
    path.startsWith(service.prefix)
  ) || null;
};

export const removeServicePrefix = (path: string, service: MicroserviceConfig): string => {
  return path.replace(service.prefix, '');
};
