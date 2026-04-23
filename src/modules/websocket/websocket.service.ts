// import { Injectable, Inject, Logger } from '@nestjs/common';
// import * as admin from 'firebase-admin';
// import { Server } from 'socket.io';
// import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
// import * as schema from 'src/database/schema';
// import { eq } from 'drizzle-orm';
// import { FirebaseService } from '../firebase/firebase.service';

// type UserRow = typeof schema.usersSchema.$inferSelect;
// type ShopProfileRow = typeof schema.shopProfilesSchema.$inferSelect;

// type SenderWithShop = UserRow & {
//   shopProfile?: ShopProfileRow | null;
// };

// @Injectable()
// export class WebsocketService {
//   private readonly logger = new Logger(WebsocketService.name);
//   private connectedUsers = new Map<string, string>();

//   private cachedUuid: (() => string) | null = null;

//   constructor(
//     @Inject(DrizzleAsyncProvider)
//     private readonly db: NodePgDatabase<typeof schema>,
//     private readonly firebaseService: FirebaseService,
//   ) {}

//   createRoom(senderId: string, receiverId: string): string {
//     return [senderId, receiverId].sort().join('_');
//   }

//   mapUser(userId: string, socketId: string) {
//     this.connectedUsers.set(userId, socketId);
//   }

//   removeDisconnectedUser(socketId: string) {
//     for (const [userId, sId] of this.connectedUsers.entries()) {
//       if (sId === socketId) {
//         this.connectedUsers.delete(userId);
//         this.logger.log(`User ${userId} disconnected`);
//         break;
//       }
//     }
//   }

//   async handleMessageDelivery(server: Server, message: any) {
//     const receiverSocketId = this.connectedUsers.get(message.receiver_id.toString());
//     const isReceiverOnline =
//       receiverSocketId && server.sockets.sockets.get(receiverSocketId);

//     if (!isReceiverOnline) {
//       this.logger.log(`Receiver ${message.receiver_id} is offline. Sending FCM...`);
//       await this.sendFCMNotification(message);
//     } else {
//       this.logger.log(`Receiver ${message.receiver_id} is online, skipping FCM.`);
//     }
//   }

//   private async sendFCMNotification(message: any) {
//   try {
//     const receiver = await this.db.query.profilesSchema.findFirst({
//       where: eq(schema.profilesSchema.userId, message.receiver_id),
//       with: { user: true },
//     });

//     if (!receiver?.fcmToken) {
//       this.logger.warn(`No FCM token for user ${message.receiver_id}`);
//       return;
//     }

//     const senderRaw = await this.db.query.usersSchema.findFirst({
//       where: eq(schema.usersSchema.id, message.sender_id),
//       with: { shopProfile: true },
//     });

//     const sender = senderRaw as SenderWithShop | null;

//     const senderName =
//       sender?.shopProfile?.shopName ??
//       sender?.name ??
//       'Unknown User';

//     const messageBody = message.image_url
//       ? 'You received a photo'
//       : message.message || 'You have a new message';

//     const payload: admin.messaging.Message = {
//       token: receiver.fcmToken,
//       data: {
//         type: 'chat',
//         senderId: message.sender_id.toString(),
//         senderName,
//         receiverId: message.receiver_id.toString(),
//         title: `New message from ${senderName}`,
//         body: messageBody,
//         messageId: await this.generateUuid(),
//         imageUrl: message.image_url
//           ? `https://biztorg.uz/api${message.image_url}`
//           : '',
//       },
//       android: { priority: 'high' },
//       notification: {
//         title: `New message from ${senderName}`,
//         body: messageBody,
//       },
//     };

//     await this.firebaseService.messaging.send(payload);

//   } catch (error) {
//     this.logger.error('❌ Error sending FCM', {
//       message: error.message,
//       stack: error.stack,
//     });
//   }
// }

//   private async generateUuid(): Promise<string> {
//     if (!this.cachedUuid) {
//       const { v4: uuidv4 } = await import('uuid');
//       this.cachedUuid = uuidv4;
//     }
//     return this.cachedUuid();
//   }
// }
