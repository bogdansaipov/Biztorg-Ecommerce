// import {
//   Injectable,
//   Inject,
//   UnauthorizedException,
//   NotFoundException,
//   BadRequestException,
//   ForbiddenException,
// } from '@nestjs/common';
// import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import { eq, desc, and, sql } from 'drizzle-orm';
// import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
// import * as schema from 'src/database/schema';
// import { AddShopRatingResponseDto, CreateShopProfileRequestDto, GetShopProfileResponseDto, ShopProfileResponseDto, ToggleSubscriptionResponseDto, UpdateShopProfileRequestDto } from './dto/shopProfile.dto';
// import { promises as fs } from "fs";
// import { join } from "path";
// import { ProductsArrayResponseDto } from '../product/dto/product.dto';

// @Injectable()
// export class ShopProfileService {
//   constructor(
//     @Inject(DrizzleAsyncProvider)
//     private readonly db: NodePgDatabase<typeof schema>,
//   ) {}

//   // async createShopProfile(userId: string, input: CreateShopProfileRequestDto): Promise<ShopProfileResponseDto> {
//   //   const user = await this.db.query.usersSchema.findFirst({
//   //     where: eq(schema.usersSchema.id, userId),
//   //   });

//   //   if (!user) {
//   //       throw new UnauthorizedException('Unauthenticated user');
//   //   }

//   //   const existingProfile = await this.db.query.shopProfilesSchema.findFirst({
//   //     where: eq(schema.shopProfilesSchema.userId, userId),
//   //   });

//   //   if (existingProfile) {
//   //     throw new BadRequestException('You already have a shop profile');
//   //   }

//   //   const [shopProfile] = await this.db
//   //     .insert(schema.shopProfilesSchema)
//   //     .values({
//   //       userId,
//   //       shopName: input.shopName,
//   //       description: input.description,
//   //       taxIdNumber: input.taxIdNumber,
//   //       contactName: input.contactName,
//   //       address: input.address,
//   //       phone: input.phone,
//   //       facebookLink: input.facebookLink,
//   //       telegramLink: input.telegramLink,
//   //       instagramLink: input.instagramLink,
//   //       website: input.website,
//   //       latitude: input.latitude ?? null,
//   //       longitude: input.longitude ?? null,
//   //       verified: false,
//   //       rating: 0,
//   //       subscribers: 0,
//   //       totalReviews: 0,
//   //       views: 0,
//   //       isOnline: false,
//   //     })
//   //     .returning();

//   //   return {
//   //     ...shopProfile,
//   //     createdAt: shopProfile.createdAt.toISOString(),
//   //     updatedAt: shopProfile.updatedAt.toISOString(),
//   //     deletedAt: shopProfile.deletedAt ? shopProfile.deletedAt.toISOString() : null,
//   //   };
//   // }

//   async updateShopProfile(userId: string, dto: UpdateShopProfileRequestDto): Promise<ShopProfileResponseDto> {
//     const shopProfile = await this.db.query.shopProfilesSchema.findFirst({
//       where: eq(schema.shopProfilesSchema.userId, userId),
//     });

//     if (!shopProfile) {
//       throw new NotFoundException('Shop profile not found');
//     }

//     if (userId !== shopProfile?.userId) {
//         throw new ForbiddenException('You can not update this shop profile')
//     }

//     const [updatedProfile] = await this.db
//       .update(schema.shopProfilesSchema)
//       .set({
//         shopName: dto.shopName,
//         description: dto.description,
//         taxIdNumber: dto.taxIdNumber,
//         contactName: dto.contactName,
//         address: dto.address,
//         phone: dto.phone,
//         facebookLink: dto.facebookLink,
//         telegramLink: dto.telegramLink,
//         instagramLink: dto.instagramLink,
//         website: dto.website,
//         latitude: dto.latitude ?? null,
//         longitude: dto.longitude ?? null,
//       })
//       .where(eq(schema.shopProfilesSchema.userId, userId))
//       .returning();

//         return {
//       ...updatedProfile,
//       createdAt: updatedProfile.createdAt.toISOString(),
//       updatedAt: updatedProfile.updatedAt.toISOString(),
//       deletedAt: updatedProfile.deletedAt ? updatedProfile.deletedAt.toISOString() : null,
//     };
//   }

// async updateShopImages(
//     userId: string,
//     shopId: string,
//     files: { bannerUrl?: Express.Multer.File; profileUrl?: Express.Multer.File },
//   ): Promise<ShopProfileResponseDto> {
//     const shopProfile = await this.db.query.shopProfilesSchema.findFirst({
//       where: eq(schema.shopProfilesSchema.id, shopId),
//     });

//     if (!shopProfile) {
//       throw new NotFoundException('Shop not found');
//     }

//     if (shopProfile.userId !== userId) {
//       throw new ForbiddenException('Unauthorized to modify this shop');
//     }

//     let bannerUrl = shopProfile.bannerUrl;
//     let profileUrl = shopProfile.profileUrl;

//     if (files.bannerUrl) {
   
//       if (shopProfile.bannerUrl) {
//         const oldBannerPath = join(
//           process.cwd(),
//           'public',
//           shopProfile.bannerUrl.replace(/^\/+/, ''),
//         );

//         try {
//           await fs.unlink(oldBannerPath);
//         } catch (err: any) {
//           if (err.code !== 'ENOENT') throw err;
//         }
//       }

//       bannerUrl = `/uploads/banners/${files.bannerUrl.filename}`;
//     }

//     if (files.profileUrl) {

//       if (shopProfile.profileUrl) {
//         const oldProfilePath = join(
//           process.cwd(),
//           'public',
//           shopProfile.profileUrl.replace(/^\/+/, ''),
//         );

//         try {
//           await fs.unlink(oldProfilePath);
//         } catch (err: any) {
//           if (err.code !== 'ENOENT') throw err;
//         }
//       }

//       profileUrl = `/uploads/avatars/${files.profileUrl.filename}`;
//     }

//     const [updated] = await this.db
//       .update(schema.shopProfilesSchema)
//       .set({
//         bannerUrl: bannerUrl,
//         profileUrl: profileUrl,
//       }
//       )
//       .where(eq(schema.shopProfilesSchema.id, shopId))
//       .returning();

//     return {
//         ...updated,
//         createdAt: updated.createdAt.toISOString(),
//         updatedAt: updated.updatedAt.toISOString(),
//         deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
//     };
//   }

//   // async getShopProfile(userId: string, shopId: string): Promise<GetShopProfileResponseDto> {

//   //   const user = await this.db.query.usersSchema.findFirst({
//   //     where: eq(schema.usersSchema.id, userId),
//   //   });

//   //   if (!user) {
//   //       throw new UnauthorizedException('Unauthorized access');
//   //   } 

//   //   const shopProfile = await this.db.query.shopProfilesSchema.findFirst({
//   //     where: eq(schema.shopProfilesSchema.id, shopId),
//   //   });

//   //   if (!shopProfile) {
//   //       throw new NotFoundException('Shop not found');
//   //   }

//   //   if (shopProfile.userId !== user.id) {
//   //       throw new ForbiddenException('Access denied to this shop');
//   //   }

//   //   const subscriber = await this.db.query.shopSubscriptionsSchema.findFirst({
//   //     where: and(
//   //       eq(schema.shopSubscriptionsSchema.userId, user.id),
//   //       eq(schema.shopSubscriptionsSchema.shopId, shopProfile.id),
//   //     ),
//   //   });

//   //   const rating = await this.db.query.shopRatingsSchema.findFirst({
//   //     where: and(
//   //       eq(schema.shopRatingsSchema.userId, user.id),
//   //       eq(schema.shopRatingsSchema.shopProfileId, shopProfile.id),
//   //     ),
//   //   });

//   //   return {
//   //     ...shopProfile,
//   //     createdAt: shopProfile.createdAt.toISOString(),
//   //     updatedAt: shopProfile.updatedAt.toISOString(),
//   //     deletedAt: shopProfile.deletedAt ? shopProfile.deletedAt.toISOString() : null,
//   //     isAlreadySubscriber: !!subscriber,
//   //     hasAlreadyRated: !!rating,
//   //   };
//   // }

// // async addRating(userId: string, shopId: string, rating: number): Promise<AddShopRatingResponseDto> {

// //   const shopProfile = await this.db.query.shopProfilesSchema.findFirst({
// //     where: eq(schema.shopProfilesSchema.id, shopId),
// //   });

// //   if (!shopProfile) {
// //     throw new NotFoundException('Shop profile not found');
// //   }

// //   const existingRating = await this.db.query.shopRatingsSchema.findFirst({
// //     where: and(
// //       eq(schema.shopRatingsSchema.userId, userId),
// //       eq(schema.shopRatingsSchema.shopProfileId, shopId)
// //     ),
// //   });

// //   if (existingRating) {
// //     await this.db
// //       .update(schema.shopRatingsSchema)
// //       .set({ rating })
// //       .where(eq(schema.shopRatingsSchema.id, existingRating.id));
// //   } else {
// //     await this.db.insert(schema.shopRatingsSchema).values({
// //       userId,
// //       shopProfileId: shopId,
// //       rating,
// //     });
// //   }

// //   await this.db.execute(sql`
// //     UPDATE ${schema.shopProfilesSchema}
// //     SET
// //       rating = (
// //         SELECT ROUND(AVG(${schema.shopRatingsSchema.rating})::numeric, 2)
// //         FROM ${schema.shopRatingsSchema}
// //         WHERE ${schema.shopRatingsSchema.shopProfileId} = ${shopId}
// //       ),
// //       total_reviews = (
// //         SELECT COUNT(*)
// //         FROM ${schema.shopRatingsSchema}
// //         WHERE ${schema.shopRatingsSchema.shopProfileId} = ${shopId}
// //       )
// //     WHERE ${schema.shopProfilesSchema.id} = ${shopId};
// //   `);

// //   const updatedShop = await this.db.query.shopProfilesSchema.findFirst({
// //     where: eq(schema.shopProfilesSchema.id, shopId),
// //   });

// //   if (!updatedShop) {
// //     throw new NotFoundException('Shop not found after update');
// //   }

// //   return {
// //     message: existingRating
// //       ? 'Rating updated successfully'
// //       : 'Rating added successfully',
// //     rating: updatedShop.rating,
// //     totalReviews: updatedShop.totalReviews,
// //   };
// // }

// // async toggleSubscription(userId: string, shopId: string): Promise<ToggleSubscriptionResponseDto> {
// //   const shop = await this.db.query.shopProfilesSchema.findFirst({
// //     where: eq(schema.shopProfilesSchema.id, shopId),
// //   });

// //   if (!shop) {
// //     throw new NotFoundException('Shop not found');
// //   }

// //   const existing = await this.db.query.shopSubscriptionsSchema.findFirst({
// //     where: and(
// //       eq(schema.shopSubscriptionsSchema.userId, userId),
// //       eq(schema.shopSubscriptionsSchema.shopId, shopId)
// //     ),
// //   });

// //   let message = '';
// //   let updatedCount = shop.subscribers;

// //   if (existing) {

// //     await this.db
// //       .delete(schema.shopSubscriptionsSchema)
// //       .where(
// //         and(
// //           eq(schema.shopSubscriptionsSchema.userId, userId),
// //           eq(schema.shopSubscriptionsSchema.shopId, shopId)
// //         )
// //       );

// //     await this.db
// //       .update(schema.shopProfilesSchema)
// //       .set({ subscribers: sql`${schema.shopProfilesSchema.subscribers} - 1` })
// //       .where(eq(schema.shopProfilesSchema.id, shopId));

// //     updatedCount--;
// //     message = 'Unsubscribed successfully';
// //   } else {

// //     await this.db.insert(schema.shopSubscriptionsSchema).values({
// //       userId,
// //       shopId
// //     });

// //     await this.db
// //       .update(schema.shopProfilesSchema)
// //       .set({ subscribers: sql`${schema.shopProfilesSchema.subscribers} + 1` })
// //       .where(eq(schema.shopProfilesSchema.id, shopId));

// //     updatedCount++;
// //     message = 'Subscribed successfully';
// //   }

// //   return {
// //     message,
// //     subscribers: updatedCount,
// //     isSubscribed: !existing,
// //   };
// // }

// }