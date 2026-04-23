// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
//   Inject,
//   Logger,
//   ForbiddenException,
// } from '@nestjs/common';
// import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
// import * as schema from 'src/database/schema';
// import { eq, or, and, desc, asc } from 'drizzle-orm';
// import { CreateMessageRequestDto, MessageArrayResponseDto, MessageSingleResponseDto, UpdateMessageRequestDto } from './dto/message.dto';
// import { PriorityType } from 'src/utils/zod.schema';
// import { TEMP_UPLOAD_TTL_MS } from 'src/utils/constants';

// const temporaryUploads = new Map<string, {userId: string; timestamp: number}> ();
// @Injectable()
// export class MessageService {
//   private readonly logger = new Logger(MessageService.name);

//   constructor(
//     @Inject(DrizzleAsyncProvider)
//     private readonly db: NodePgDatabase<typeof schema>,
//   ) {}

//   async sendMessage(senderId: string, input: CreateMessageRequestDto): Promise<MessageSingleResponseDto> {
//     const { receiverId, message, imageUrl } = input;

//     if (!receiverId)
//       throw new BadRequestException('receiverId is required');
//     if (!message && !imageUrl)
//       throw new BadRequestException('Message or image is required');

//     const [receiver] = await this.db
//       .select()
//       .from(schema.usersSchema)
//       .where(eq(schema.usersSchema.id, receiverId));

//     if (!receiver) {
//       throw new NotFoundException('Receiver not found');
//     }

//     const [sender] = await this.db
//       .select()
//       .from(schema.usersSchema)
//       .where(eq(schema.usersSchema.id, senderId));

//     this.logger.log(`Checking conversation between ${senderId} and ${receiverId}`);

//     let [conversation] = await this.db
//       .select()
//       .from(schema.conversationsSchema)
//       .where(
//         or(
//           and(
//             eq(schema.conversationsSchema.userOneId, senderId),
//             eq(schema.conversationsSchema.userTwoId, receiverId),
//           ),
//           and(
//             eq(schema.conversationsSchema.userOneId, receiverId),
//             eq(schema.conversationsSchema.userTwoId, senderId),
//           ),
//         ),
//       );

//     if (!conversation) {
//       [conversation] = await this.db
//         .insert(schema.conversationsSchema)
//         .values({
//           userOneId: senderId,
//           userTwoId: receiverId,
//         })
//         .returning();
//     }

//     const [newMessage] = await this.db
//       .insert(schema.messagesSchema)
//       .values({
//         conversationId: conversation.id,
//         senderId: senderId,
//         message: message || null,
//         imageUrl: imageUrl || null,
//       })
//       .returning();

//     await this.db.insert(schema.notificationsSchema).values({
//       receiverId,
//       senderId,
//       type: 'message',
//       content: `У вас новое сообщение от: ${sender.name}`,
//       hasBeenSeen: false,
//       isGlobal: false,
//       referenceId: newMessage.id,
//       priority: PriorityType.MEDIUM,
//       metadata: JSON.stringify({
//         conversationId: conversation.id,
//         messagePreview: message || '',
//         senderName: sender.name,
//     }),
//     })

//     return { 
//       ...newMessage,
//       readAt: newMessage.readAt?.toISOString(),
//       createdAt: newMessage.createdAt.toISOString(),
//       updatedAt: newMessage.updatedAt.toISOString(),
//       deletedAt: newMessage.deletedAt ? newMessage.deletedAt.toISOString() : null,
//     };
//   }

//   async getMessages(senderId: string, receiverId: string): Promise<MessageArrayResponseDto> {
//     const [conversation] = await this.db
//       .select()
//       .from(schema.conversationsSchema)
//       .where(
//         or(
//           and(
//             eq(schema.conversationsSchema.userOneId, senderId),
//             eq(schema.conversationsSchema.userTwoId, receiverId),
//           ),
//           and(
//             eq(schema.conversationsSchema.userOneId, receiverId),
//             eq(schema.conversationsSchema.userTwoId, senderId),
//           ),
//         ),
//       );

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     const messages = await this.db.query.messagesSchema.findMany({
//       where: eq(schema.messagesSchema.conversationId, conversation.id),
//       orderBy: desc(schema.messagesSchema.createdAt),
//     });

//     return messages.map((message) => ({
//       ...message,
//        createdAt: message.createdAt.toISOString(),
//       updatedAt: message.updatedAt.toISOString(),
//       deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
//       readAt: message.readAt?.toISOString(),
//     }))
//   }

// async editMessage(userId: string, input: UpdateMessageRequestDto): Promise<MessageSingleResponseDto> {
//   const { id, message } = input;

//   const foundMessage = await this.db.query.messagesSchema.findFirst({
//     where: eq(schema.messagesSchema.id, id),
//   });

//   if (!foundMessage) {
//     throw new NotFoundException('Message not found');
//   }

//   if (foundMessage.senderId !== userId) {
//     throw new ForbiddenException('You are not allowed to edit this message');
//   }

//   if (!message?.trim()) {
//     throw new BadRequestException('Message cannot be empty');
//   }

//   const [updatedMessage] = await this.db
//     .update(schema.messagesSchema)
//     .set({
//       message,
//       updatedAt: new Date(),
//     })
//     .where(eq(schema.messagesSchema.id, id))
//     .returning();

//   return {
//     ...updatedMessage,
//     createdAt: updatedMessage.createdAt.toISOString(),
//     readAt: updatedMessage.readAt?.toISOString(),
//     updatedAt: updatedMessage.updatedAt.toISOString(),
//     deletedAt: updatedMessage.deletedAt ? updatedMessage.deletedAt.toISOString() : null,
//   };
// }

//    async canAccessImage(userId: string, filename: string): Promise<boolean> {

//   const tempImage = temporaryUploads.get(filename); 

//   if (tempImage && tempImage.userId === userId && Date.now() - tempImage.timestamp < TEMP_UPLOAD_TTL_MS) {
//   return true;
// }
  
//   const message = await this.db.query.messagesSchema.findFirst({
//     where: eq(schema.messagesSchema.imageUrl, `/messages/image/${filename}`),
//   });

//   if (!message) {
//     return false;
//   }

//   const conversation = await this.db.query.conversationsSchema.findFirst({
//     where: eq(schema.conversationsSchema.id, message.conversationId),
//   });

//   if (!conversation) {
//     return false;
//   }

//   return (
//     conversation.userOneId === userId || conversation.userTwoId === userId
//   );
// }

//   async registerTempUpload(filename: string, userId: string,  ) {
//     temporaryUploads.set(filename, {userId, timestamp: Date.now()});

//     setTimeout(() => temporaryUploads.delete(filename), TEMP_UPLOAD_TTL_MS);
//   }
// }