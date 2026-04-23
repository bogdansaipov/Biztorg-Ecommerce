// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   MessageBody,
//   ConnectedSocket,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { WebsocketService } from './websocket.service';
// import { Logger } from '@nestjs/common';

// @WebSocketGateway({
//     cors: {origin: '*'},
//     transports: 'websocket',
// })
// export class WebsocketGateway {
//     @WebSocketServer()
//     server: Server;

//     // private readonly logger = new Logger(WebsocketGateway.name);

//     constructor(private readonly wsService: WebsocketService) {}

//     handleConnection(socket: Socket) {
//         // this.logger.log(`Client connected: ${socket.id}`);
//     }

//     handleDisconnect(socket: Socket) {
//     this.wsService.removeDisconnectedUser(socket.id);
//     // this.logger.log(`Client disconnected: ${socket.id}`);
//   }

//   @SubscribeMessage('joinChat')
//   handleJoinChat (
//     @ConnectedSocket() socket: Socket,
//     @MessageBody() payload: { senderId: string; receiverId: string },
//   ) {
//     const { senderId, receiverId } = payload;
//     const roomName = this.wsService.createRoom(senderId, receiverId);
//     socket.join(roomName);
//     this.wsService.mapUser(senderId, socket.id);
//     // this.logger.log(`User ${senderId} joined room ${roomName}`);
//   }

//   @SubscribeMessage('message')
//   async handleMessage(
//    @ConnectedSocket() socket: Socket,
//    @MessageBody() data: string,
//   ) {
//     try {

//         const message = JSON.parse(data);

//         const roomName = this.wsService.createRoom(
//         message.sender_id,
//         message.receiver_id,
//       );

//       this.server.to(roomName).emit('message', data)
//       await this.wsService.handleMessageDelivery(this.server, message);
//     } catch(err) {
//         // this.logger.error('Error handling message', err);
//     }
//   }

// }