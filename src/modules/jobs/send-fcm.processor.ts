// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { Job } from 'bullmq';
// import { FirebaseService } from '../firebase/firebase.service';
// import * as schema from 'src/database/schema';
// import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import { Inject } from '@nestjs/common';
// import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
// import { eq } from 'drizzle-orm';
// import { PriorityType } from 'src/utils/zod.schema';
// import { RedisService } from '../redis/redis.service';

// @Processor('notificationQueue')
// export class SendFcmNotificationProcessor extends WorkerHost {
//   constructor(
//     private readonly firebaseService: FirebaseService,
//     @Inject(DrizzleAsyncProvider)
//     private db: NodePgDatabase<typeof schema>,
//     private readonly redisService: RedisService,
//   ) {
//     super();
//   }

//   async process(job: Job<any>) {
//     const {
//       productId,
//       notificationTitle,
//       notificationBody,
//       fcmToken,
//       productImageUrl,
//       senderId,
//       shopName,
//       productName,
//       productDescription,
//       subscriberId,
//       shopImage,
//     } = job.data;

//     if (!fcmToken) {
//       return;
//     }

//     const messageId = 'info_' + Date.now();

//     const messageData = {
//       title: notificationTitle,
//       type: 'product-info',
//       body: notificationBody,
//       messageId,
//       imageUrl: productImageUrl || '',
//       productId: String(productId),
//     };

//     try {

//       const result = await this.firebaseService.sendNotification(
//         fcmToken,
//         notificationTitle,
//         notificationBody,
//         messageData,
//       );

//       await this.db.insert(schema.notificationsSchema).values({
//         receiverId: subscriberId,
//         senderId: senderId,
//         type: 'product-ad',
//         content: notificationBody,
//         hasBeenSeen: false,
//         isGlobal: false,
//         referenceId: messageId,
//         priority: PriorityType.MEDIUM,
//         metadata: {
//           product_name: productName,
//           product_description: productDescription,
//           product_id: productId,
//           product_image_url: productImageUrl || '',
//           shop_title: shopName,
//           shop_image: shopImage,
//         },
//         date: new Date(),
//       });

//       const cacheKey = `notifications:user:${subscriberId}`;
//       await this.redisService.delete(cacheKey);
//     } catch (err) {
//       console.error('❌ Error sending notification or saving to DB:', err);
//     }
//   }
// }