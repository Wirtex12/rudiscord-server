import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';

@Module({})
export class SocketModule implements OnModuleInit, OnModuleDestroy {
  private io: Server;

  onModuleInit() {
   const port = parseInt(process.env.PORT || '3001', 10);

this.io = new Server(port, {  // ← Теперь port всегда number!
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // User joins with their userId
      socket.on('join', (userId: string) => {
        socket.join(userId);
        console.log(`👤 User ${userId} joined with socket ${socket.id}`);
      });

      // Call signaling
      socket.on('call-user', (data: { to: string; offer: any; from: string; fromUsername: string }) => {
        this.io.to(data.to).emit('incoming-call', {
          from: data.from,
          fromUsername: data.fromUsername,
          offer: data.offer,
        });
      });

      socket.on('accept-call', (data: { to: string; answer: any; from: string }) => {
        this.io.to(data.from).emit('call-accepted', {
          from: data.to,
          answer: data.answer,
        });
      });

      socket.on('reject-call', (data: { to: string; from: string }) => {
        this.io.to(data.to).emit('call-rejected', {
          from: data.from,
        });
      });

      socket.on('end-call', (data: { to: string; from: string }) => {
        this.io.to(data.to).emit('call-ended', {
          from: data.from,
        });
      });

      // ICE candidate exchange
      socket.on('ice-candidate', (data: { to: string; candidate: any; from: string }) => {
        this.io.to(data.to).emit('ice-candidate', {
          from: data.from,
          candidate: data.candidate,
        });
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
      });
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('📡 Socket.io server is running!');
    console.log(`📡 Port: ${port}`);
    console.log(`🌐 CORS: ${process.env.SOCKET_CORS_ORIGIN || '*'}`);
    console.log('═══════════════════════════════════════════════════');
  }

  onModuleDestroy() {
    this.io.close();
  }

  getIo(): Server {
    return this.io;
  }
}
