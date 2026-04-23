// import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
// import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import { eq, or, desc } from 'drizzle-orm';
// import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
// import * as schema from 'src/database/schema';
// import { ProfileService } from '../profile/profile.service';
// import { ConversationItemsArrayResponseDto } from './dto/coversation.dto';
// import { UserRoleEnum } from 'src/utils/zod.schema';

// type UserRow = {
//   id: string;
//   email: string | null;
//   name: string | null;
//   phone: string | null;
//   role: UserRoleEnum;
//   emailVerified: boolean;
//   isSuspended: boolean;
//   createdAt: Date;
//   updatedAt: Date;
//   deletedAt: Date | null;
// };

// type ProductRow = {
//   id: string;
//   userId: string;
// };

// type ConversationUser = UserRow;

// type ShopProfileRow = {
//   id: string;
//   shopName: string;
//   profileUrl: string | null;
//   subscriptions: {
//     user: {
//       id: string;
//       profile?: {
//         fcmToken?: string | null;
//       } | null;
//     };
//   }[];
// };

// @Injectable()
// export class ConversationService {
//   constructor(
//     @Inject(DrizzleAsyncProvider)
//     private readonly db: NodePgDatabase<typeof schema>,
//   ) {}

//  async getChats(userId: string): Promise<ConversationItemsArrayResponseDto> {
//   const user = await this.db.query.usersSchema.findFirst({
//     where: eq(schema.usersSchema.id, userId),
//   });

//   if (!user) {
//     throw new UnauthorizedException('Unauthenticated');
//   }

//   const conversations = await this.db.query.conversationsSchema.findMany({
//     where: or(
//       eq(schema.conversationsSchema.userOneId, user.id),
//       eq(schema.conversationsSchema.userTwoId, user.id),
//     ),
//     with: {
//       userOne: {
//         columns: {
//           id: true,
//           email: true,
//           name: true,
//           phone: true,
//           role: true,
//           emailVerified: true,
//           isSuspended: true,
//           createdAt: true,
//           updatedAt: true,
//           deletedAt: true,
//         },
//       },
//       userTwo: {
//         columns: {
//           id: true,
//           email: true,
//           name: true,
//           phone: true,
//           role: true,
//           emailVerified: true,
//           isSuspended: true,
//           createdAt: true,
//           updatedAt: true,
//           deletedAt: true,
//         },
//       },
//       messages: {
//         orderBy: desc(schema.messagesSchema.createdAt),
//         limit: 1,
//       },
//     },
//   });

//   const mapped = await Promise.all(
//     conversations.map(async (conv) => {

//       const userOne = conv.userOne as UserRow;
//       const userTwo = conv.userTwo as UserRow;

//       const otherUser =
//         conv.userOneId === user.id ? userTwo : userOne;

//       if (!otherUser) {
//         throw new NotFoundException('Other user not found');
//       }

//       const profile = await this.db.query.profilesSchema.findFirst({
//         where: eq(schema.profilesSchema.userId, otherUser.id),
//       });

//       const phoneNumber = otherUser.phone ?? 'Не указан';

//       const lastMessage = conv.messages[0];
//       const lastMessageContent = lastMessage?.message ?? 'Нет сообщений';

//       let lastMessageDate = '';
//       if (lastMessage?.createdAt) {
//         const date = new Date(lastMessage.createdAt);
//         const dayMap: Record<string, string> = {
//           Mon: 'Пн',
//           Tue: 'Вт',
//           Wed: 'Ср',
//           Thu: 'Чт',
//           Fri: 'Пт',
//           Sat: 'Сб',
//           Sun: 'Вс',
//         };

//         const day = date.toDateString().split(' ')[0];
//         lastMessageDate = `${dayMap[day] ?? day} ${date.toLocaleDateString('ru-RU')}`;
//       }

//       const shopProfile = await this.db.query.shopProfilesSchema.findFirst({
//         where: eq(schema.shopProfilesSchema.userId, otherUser.id),
//       });

//       const isShop = Boolean(shopProfile);
//       let isAlreadySubscriber = false;
//       let hasAlreadyRated = false;

//       if (isShop && shopProfile) {
//         const subscriber = await this.db.query.shopSubscriptionsSchema.findFirst({
//           where: eq(schema.shopSubscriptionsSchema.userId, user.id),
//         });

//         const rating = await this.db.query.shopRatingsSchema.findFirst({
//           where: eq(schema.shopRatingsSchema.userId, user.id),
//         });

//         isAlreadySubscriber = Boolean(subscriber);
//         hasAlreadyRated = Boolean(rating);
//       }

//       return {
//         id: conv.id,
//         userOneId: conv.userOneId,
//         userTwoId: conv.userTwoId,
//         createdAt: conv.createdAt.toISOString(),
//         updatedAt: conv.updatedAt.toISOString(),
//         deletedAt: conv.deletedAt ? conv.deletedAt.toISOString() : null,

//         userOne: {
//           ...userOne,
//           createdAt: userOne.createdAt.toISOString(),
//           updatedAt: userOne.updatedAt.toISOString(),
//           deletedAt: userOne.deletedAt
//             ? userOne.deletedAt.toISOString()
//             : null,
//         },

//         userTwo: {
//           ...userTwo,
//           createdAt: userTwo.createdAt.toISOString(),
//           updatedAt: userTwo.updatedAt.toISOString(),
//           deletedAt: userTwo.deletedAt
//             ? userTwo.deletedAt.toISOString()
//             : null,
//         },

//         phoneNumber,
//         lastMessage: lastMessageContent,
//         lastMessageDate,

//         isShop,

//         shopProfile: shopProfile
//           ? {
//               ...shopProfile,
//               createdAt: shopProfile.createdAt.toISOString(),
//               updatedAt: shopProfile.updatedAt.toISOString(),
//               deletedAt: shopProfile.deletedAt
//                 ? shopProfile.deletedAt.toISOString()
//                 : null,
//             }
//           : null,

//         userProfile: profile
//           ? {
//               ...profile,
//               createdAt: profile.createdAt.toISOString(),
//               updatedAt: profile.updatedAt.toISOString(),
//               deletedAt: profile.deletedAt
//                 ? profile.deletedAt.toISOString()
//                 : null,
//             }
//           : null,

//         isAlreadySubscriber,
//         hasAlreadyRated,
//       };
//     }),
//   );

//   return mapped;
// }

// }