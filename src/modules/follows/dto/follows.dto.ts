import { createZodDto } from 'nestjs-zod/dto';
import {
  UserProductsArrayResponseSchema,
} from 'src/modules/product/dto/product.dto';
import {
  ShopProfileSchema,
  UserSchema,
} from 'src/utils/zod.schema';
import { z } from 'zod';

export const FollowedUserItemSchema = z.object({
  followedAt: z.iso.datetime().describe('When the follow was created'),
  user: UserSchema.pick({ id: true, name: true, phone: true }),
  products: UserProductsArrayResponseSchema.describe('First 12 products from this user'),
});

export class FollowedUserItemDto extends createZodDto(FollowedUserItemSchema) {}

export const FollowedShopItemSchema = z.object({
  followedAt: z.iso.datetime().describe('When the follow was created'),
  shop: ShopProfileSchema.pick({
    id: true,
    shopName: true,
    profileUrl: true,
    bannerUrl: true,
    verified: true,
  }),
  products: UserProductsArrayResponseSchema.describe('First 12 products from this shop'),
});

export class FollowedShopItemDto extends createZodDto(FollowedShopItemSchema) {}

export const UserFollowingResponseSchema = z.object({
  users: z.array(FollowedUserItemSchema).describe('Users the current user follows'),
  shops: z.array(FollowedShopItemSchema).describe('Shops the current user follows'),
}).describe('Followed users and shops');

export class UserFollowingResponseDto extends createZodDto(UserFollowingResponseSchema) {}