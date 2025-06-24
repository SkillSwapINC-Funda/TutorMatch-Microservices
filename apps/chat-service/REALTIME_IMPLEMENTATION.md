# Chat Service - Implementación en Tiempo Real con Supabase

Este microservicio de chat utiliza Supabase Realtime para proporcionar mensajería instantánea. A continuación se explica cómo implementar el cliente y configurar las suscripciones en tiempo real.

## Funcionalidades Implementadas

### Gestión de Salas
- ✅ Crear salas de chat (directas, grupales, tutoría)
- ✅ Obtener salas del usuario
- ✅ Unirse/salir de salas
- ✅ Gestionar participantes

### Mensajería
- ✅ Enviar mensajes (texto, archivos, imágenes)
- ✅ Editar mensajes
- ✅ Eliminar mensajes (soft delete)
- ✅ Responder a mensajes
- ✅ Marcar mensajes como leídos
- ✅ Paginación de mensajes

### Tiempo Real
- ✅ Suscripción a cambios en tiempo real
- ✅ Notificaciones de nuevos mensajes
- ✅ Estado de presencia de usuarios

## API Endpoints

### Salas de Chat
```bash
# Crear sala
POST /api/v1/chat/rooms
{
  "name": "Sala de Matemáticas",
  "type": "tutoring",
  "tutoringSessionId": "uuid-opcional"
}

# Obtener salas del usuario
GET /api/v1/chat/rooms

# Unirse a sala
POST /api/v1/chat/rooms/join
{
  "roomId": "uuid-room",
  "isAdmin": false
}

# Salir de sala
DELETE /api/v1/chat/rooms/{roomId}/leave

# Obtener participantes
GET /api/v1/chat/rooms/{roomId}/participants
```

### Mensajes
```bash
# Enviar mensaje
POST /api/v1/chat/messages
{
  "content": "Hola mundo!",
  "roomId": "uuid-room",
  "messageType": "text",
  "replyTo": "uuid-mensaje-opcional"
}

# Obtener mensajes
GET /api/v1/chat/rooms/{roomId}/messages?page=1&limit=50

# Editar mensaje
PUT /api/v1/chat/messages/{messageId}
{
  "content": "Mensaje editado"
}

# Eliminar mensaje
DELETE /api/v1/chat/messages/{messageId}

# Marcar como leído
POST /api/v1/chat/rooms/{roomId}/mark-read
```

### Tiempo Real
```bash
# Configurar suscripción
GET /api/v1/chat/rooms/{roomId}/subscribe
```

## Implementación del Cliente (Frontend)

### 1. Configuración Inicial
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)
```

### 2. Suscripción a Mensajes en Tiempo Real
```typescript
// Suscribirse a cambios en mensajes de una sala
const subscribeToRoomMessages = (roomId: string) => {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('Nuevo mensaje:', payload.new)
        // Actualizar UI con el nuevo mensaje
        addMessageToUI(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('Mensaje actualizado:', payload.new)
        // Actualizar mensaje en UI
        updateMessageInUI(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('Mensaje eliminado:', payload.old)
        // Remover mensaje de UI
        removeMessageFromUI(payload.old.id)
      }
    )
    .subscribe()

  return channel
}
```

### 3. Presencia de Usuarios (Quién está en línea)
```typescript
// Configurar presencia para mostrar usuarios activos
const setupPresence = (roomId: string, userId: string) => {
  const channel = supabase.channel(`presence:${roomId}`)
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('Estado de presencia:', state)
      updateOnlineUsers(Object.keys(state))
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('Usuario conectado:', key, newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('Usuario desconectado:', key, leftPresences)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        })
      }
    })

  return channel
}
```

### 4. Funciones de Utilidad
```typescript
// Enviar mensaje
const sendMessage = async (content: string, roomId: string) => {
  const response = await fetch('/api/v1/chat/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content,
      roomId,
      messageType: 'text'
    })
  })
  
  return response.json()
}

// Marcar mensajes como leídos
const markAsRead = async (roomId: string) => {
  await fetch(`/api/v1/chat/rooms/${roomId}/mark-read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
}

// Obtener mensajes con paginación
const getMessages = async (roomId: string, page = 1) => {
  const response = await fetch(
    `/api/v1/chat/rooms/${roomId}/messages?page=${page}&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )
  
  return response.json()
}
```

### 5. Gestión de Estado (Ejemplo con React)
```typescript
const ChatRoom = ({ roomId }: { roomId: string }) => {
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    // Cargar mensajes iniciales
    loadMessages()
    
    // Configurar suscripciones
    const messageSubscription = subscribeToRoomMessages(roomId)
    const presenceSubscription = setupPresence(roomId, currentUserId)
    
    setSubscription(messageSubscription)

    return () => {
      // Limpiar suscripciones
      messageSubscription.unsubscribe()
      presenceSubscription.unsubscribe()
    }
  }, [roomId])

  const loadMessages = async () => {
    const data = await getMessages(roomId)
    setMessages(data.messages)
  }

  const addMessageToUI = (newMessage) => {
    setMessages(prev => [...prev, newMessage])
  }

  const updateMessageInUI = (updatedMessage) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      )
    )
  }

  const removeMessageFromUI = (messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }

  // ... resto del componente
}
```

## Consideraciones de Seguridad

### Row Level Security (RLS)
El servicio implementa verificaciones de acceso, pero también debes configurar RLS en Supabase:

```sql
-- Política para chat_messages
CREATE POLICY "Los usuarios solo pueden ver mensajes de salas donde participan" 
ON chat_messages FOR SELECT 
USING (
  room_id IN (
    SELECT room_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Política para chat_participants
CREATE POLICY "Los usuarios solo pueden ver participantes de sus salas" 
ON chat_participants FOR SELECT 
USING (
  room_id IN (
    SELECT room_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);
```

## Notificaciones Push
Para notificaciones cuando el usuario no está activo:

```typescript
// Suscribirse a notificaciones
const subscribeToNotifications = (userId: string) => {
  supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `!sender_id=eq.${userId}` // Excluir propios mensajes
      },
      async (payload) => {
        // Verificar si el usuario está en la sala
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('id')
          .eq('room_id', payload.new.room_id)
          .eq('user_id', userId)
          .single()

        if (participant) {
          // Mostrar notificación
          showNotification({
            title: 'Nuevo mensaje',
            body: payload.new.content,
            roomId: payload.new.room_id
          })
        }
      }
    )
    .subscribe()
}
```

## Testing

Para probar el servicio localmente:

```bash
# Iniciar el servicio de chat
npm run start:dev:chat

# El servicio estará disponible en http://localhost:3003
# Documentación: http://localhost:3003/api
```

## Estructura de Base de Datos

Las tablas necesarias ya están definidas en `database.types.ts`:
- `chat_rooms`: Salas de chat
- `chat_messages`: Mensajes
- `chat_participants`: Participantes de salas

El esquema incluye soporte para:
- Diferentes tipos de salas (directas, grupales, tutoría)
- Diferentes tipos de mensajes (texto, archivos, imágenes, sistema)
- Respuestas a mensajes
- Soft delete de mensajes
- Timestamps de última actividad
