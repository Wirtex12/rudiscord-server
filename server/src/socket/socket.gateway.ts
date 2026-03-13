import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    client.join(userId);
    console.log(`👤 User ${userId} joined room`);
  }

  @SubscribeMessage('call-user')
  handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; offer: any; from: string; fromUsername: string }
  ) {
    client.to(data.to).emit('incoming-call', {
      from: data.from,
      fromUsername: data.fromUsername,
      offer: data.offer,
    });
  }

  @SubscribeMessage('accept-call')
  handleAcceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; answer: any; from: string }
  ) {
    client.to(data.from).emit('call-accepted', {
      from: data.to,
      answer: data.answer,
    });
  }

  @SubscribeMessage('reject-call')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; from: string }
  ) {
    client.to(data.to).emit('call-rejected', {
      from: data.from,
    });
  }

  @SubscribeMessage('end-call')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; from: string }
  ) {
    client.to(data.to).emit('call-ended', {
      from: data.from,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: any; from: string }
  ) {
    client.to(data.to).emit('ice-candidate', {
      from: data.from,
      candidate: data.candidate,
    });
  }
}