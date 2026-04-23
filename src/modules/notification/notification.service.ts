// import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
// import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
// import * as schema from 'src/database/schema';
// import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import { eq, desc, and, sql, or } from 'drizzle-orm';
// import { NotificationArrayResponseDto } from './dto/notification.dto';
// import { RedisService } from '../redis/redis.service';
// import { ConfigService } from '@nestjs/config';
// import { EnvType } from 'src/config/env/env-validation';

// // type SenderUser = {
// //   id: string;
// //   name: string | null;
// //   phone?: string | null;
// //   shopProfile?: {
// //     shopName: string;
// //     createdAt: Date;
// //     updatedAt: Date;
// //     deletedAt: Date | null;
// //   } | null;
// //   profile?: {
// //     createdAt: Date;
// //     updatedAt: Date;
// //     deletedAt: Date | null;
// //   } | null;
// // };

// type ShopProfileRow = typeof schema.shopProfilesSchema.$inferSelect;
// type ProfileRow = typeof schema.profilesSchema.$inferSelect;
// type SenderUser = typeof schema.usersSchema.$inferSelect & {
//   shopProfile?: ShopProfileRow | null;
//   profile?: ProfileRow | null;
// };

// @Injectable()
// export class NotificationsService {
//   private readonly logger = new Logger(NotificationsService.name);
//   protected cacheTTL: number;
//   constructor(@Inject(DrizzleAsyncProvider)
//       private readonly db: NodePgDatabase<typeof schema>,
//       private readonly redisService: RedisService,
//       protected configService: ConfigService,) {
//         this.cacheTTL = this.configService.getOrThrow<EnvType['REDIS_TTL']>('REDIS_TTL');
//       }

// async getUserNotifications(userId: string): Promise<NotificationArrayResponseDto> {
//   const cacheKey = `notifications:user:${userId}`;

//   const cached = await this.redisService.get(cacheKey);
//   if (cached) {
//     return JSON.parse(cached);
//   }

//   const notifications = await this.db.query.notificationsSchema.findMany({
//     where: and(
//       or(
//         eq(schema.notificationsSchema.receiverId, userId),
//         eq(schema.notificationsSchema.isGlobal, true),
//       ),
//       eq(schema.notificationsSchema.hasBeenSeen, false),
//     ),
//     orderBy: desc(schema.notificationsSchema.createdAt),
//     with: {
//       sender: {
//         with: {
//           shopProfile: true,
//           profile: true,
//         },
//       },
//     },
//   });

//   const result = notifications.map((notification) => {
//     const metadata =
//       typeof notification.metadata === 'string'
//         ? JSON.parse(notification.metadata)
//         : notification.metadata ?? {};

//     const sender = notification.sender as SenderUser | null;

//     const shopProfile = sender?.shopProfile ?? null;
//     const userProfile = sender?.profile ?? null;

//     const isShop = !!shopProfile;

//     const senderName =
//       (isShop ? shopProfile?.shopName : sender?.name) ??
//       metadata.sender_name ??
//       'Unknown';

//     return {
//       ...notification,

//       createdAt: notification.createdAt.toISOString(),
//       updatedAt: notification.updatedAt.toISOString(),
//       deletedAt: notification.deletedAt
//         ? notification.deletedAt.toISOString()
//         : null,
//       expiresAt: notification.expiresAt?.toISOString(),
//       date: notification.date.toISOString(),

//       metadata,
//       isShop,
//       senderName,

//       shopProfile: shopProfile
//         ? {
//             ...shopProfile,
//             createdAt: shopProfile.createdAt.toISOString(),
//             updatedAt: shopProfile.updatedAt.toISOString(),
//             deletedAt: shopProfile.deletedAt
//               ? shopProfile.deletedAt.toISOString()
//               : null,
//           }
//         : null,

//       userProfile: userProfile
//         ? {
//             ...userProfile,
//             createdAt: userProfile.createdAt.toISOString(),
//             updatedAt: userProfile.updatedAt.toISOString(),
//             deletedAt: userProfile.deletedAt
//               ? userProfile.deletedAt.toISOString()
//               : null,
//           }
//         : null,
//     };
//   });

//   await this.redisService.setWithExpiry(
//     cacheKey,
//     JSON.stringify(result),
//     this.cacheTTL,
//   );

//   return result;
// }

//   async markAllAsSeen(userId: string) {
//     await this.db
//       .update(schema.notificationsSchema)
//       .set({ hasBeenSeen: true })
//       .where(eq(schema.notificationsSchema.receiverId, userId));

//     await this.redisService.delete(`notifications:user:${userId}`);

//     return { message: 'All notifications marked as seen' };
//   }

//   async markChatNotificationsAsSeen(userId: string, otherUserId: string) {
//     if (!otherUserId) {
//         throw new NotFoundException('Other user ID is required');
//     } 

//     await this.db
//       .update(schema.notificationsSchema)
//       .set({ hasBeenSeen: true })
//       .where(
//         and(
//           eq(schema.notificationsSchema.receiverId, userId),
//           eq(schema.notificationsSchema.senderId, otherUserId),
//           eq(schema.notificationsSchema.type, 'message'),
//           eq(schema.notificationsSchema.hasBeenSeen, false),
//         ),
//       );

//     return { message: 'Notifications marked as seen for this chat' };
//   }
// }