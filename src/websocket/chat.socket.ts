import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server, type Socket } from 'socket.io';
import { env, prisma } from '../config';
import type { UserPayload } from '../modules/auth/auth.types';
import { socketLogger } from '../utils';

interface AuthenticatedSocket extends Socket {
  user?: UserPayload;
}

let io: Server;

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /** Verify JWT token before allowing socket connections. */
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.jwt.secret) as UserPayload;
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  /** Handle new socket connections and register event listeners. */
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    socketLogger.info({ email: user.email, socketId: socket.id }, 'Socket connected');

    /** Join a chat room, receive history, and notify other participants. */
    socket.on('join_room', async (roomId: string) => {
      socket.join(roomId);
      socketLogger.info({ email: user.email, roomId }, 'User joined room');

      // Send recent messages
      const recentMessages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      socket.emit('room_history', {
        roomId,
        messages: recentMessages.reverse(),
      });

      // Notify room
      socket.to(roomId).emit('user_joined', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
    });

    /** Persist a chat message and broadcast it to the room. */
    socket.on('send_message', async (data: { roomId: string; content: string }) => {
      try {
        if (!data.content || data.content.trim().length === 0) return;
        if (data.content.length > 1000) return;

        const message = await prisma.chatMessage.create({
          data: {
            userId: user.id,
            roomId: data.roomId,
            content: data.content.trim(),
          },
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        });

        io.to(data.roomId).emit('new_message', message);
      } catch (error) {
        socketLogger.error({ err: error }, 'Failed to save chat message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /** Leave a chat room and notify remaining participants. */
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user_left', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
      socketLogger.info({ email: user.email, roomId }, 'User left room');
    });

    /** Broadcast typing indicators to the room. */
    socket.on('typing_start', (roomId: string) => {
      socket.to(roomId).emit('user_typing', {
        userId: user.id,
        email: user.email,
      });
    });

    socket.on('typing_stop', (roomId: string) => {
      socket.to(roomId).emit('user_stopped_typing', {
        userId: user.id,
      });
    });

    /** Log socket disconnection. */
    socket.on('disconnect', (reason) => {
      socketLogger.info({ email: user.email, reason }, 'Socket disconnected');
    });
  });

  socketLogger.info('Socket.io initialized');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
