// import { z } from 'zod';
// import { createZodDto } from 'nestjs-zod/dto';
// import { ShopProfileSchema } from 'src/utils/zod.schema';

// // -------------------- SCHEMAS --------------------

// const CreateShopProfileRequestSchema = ShopProfileSchema.omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
//   deletedAt: true,
//   bannerUrl: true,
//   profileUrl: true,
//   isOnline: true,
//   verified: true,
//   rating: true,
//   subscribers: true,
//   totalReviews: true,
//   views: true,
// }).describe('CreateShopProfileRequest');

// const UpdateShopProfileRequestSchema = ShopProfileSchema.omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
//   deletedAt: true,
//   bannerUrl: true,
//   profileUrl: true,
//   isOnline: true,
//   verified: true,
//   rating: true,
//   subscribers: true,
//   totalReviews: true,
//   views: true,
// }).describe('UpdateShopProfileRequest');

// const ShopProfileResponseSchema = ShopProfileSchema.omit({
//   taxIdNumber: true,
// }).describe('ShopProfileResponse');

// const ShopProfileArrayResponseSchema = ShopProfileSchema.array().describe('ShopProfileArrayResponse');

// const GetShopProfileResponseSchema = ShopProfileSchema.omit({
//   taxIdNumber: true,
// }).extend({
//   isAlreadySubscriber: z.boolean(),
//   hasAlreadyRated: z.boolean(),
// }).describe('GetShopProfileResponse');

// const AddShopRatingRequestSchema = ShopProfileSchema.pick({rating: true}).describe('Rating number request input');

// const AddShopRatingResponseSchema  = ShopProfileSchema.pick({rating: true, totalReviews: true}).extend({message: z.string()}) .describe('Shop Rating response schema');

// const ToggleSubscriptionResponseSchema = ShopProfileSchema.pick({subscribers: true}).extend({isSubscribed: z.boolean(), message: z.string()}).describe('Toggle subscription response schema')
// // -------------------- DTOS --------------------

// class CreateShopProfileRequestDto extends createZodDto(
//   CreateShopProfileRequestSchema,
// ) {}

// class UpdateShopProfileRequestDto extends createZodDto(
//   UpdateShopProfileRequestSchema,
// ) {}

// class ShopProfileResponseDto extends createZodDto(
//   ShopProfileResponseSchema,
// ) {}

// class ShopProfileArrayResponseDto extends createZodDto(
//   ShopProfileArrayResponseSchema,
// ) {}

// class GetShopProfileResponseDto extends createZodDto(
//   GetShopProfileResponseSchema,
// ) {}

// class AddShopRatingRequestDto extends createZodDto(
//   AddShopRatingRequestSchema,
// ) {}

// class AddShopRatingResponseDto extends createZodDto(
//   AddShopRatingResponseSchema,
// ) {}

// class ToggleSubscriptionResponseDto extends createZodDto(
//   ToggleSubscriptionResponseSchema,
// ) {}

// // -------------------- EXPORTS --------------------

// export {
//   CreateShopProfileRequestSchema,
//   UpdateShopProfileRequestSchema,
//   ShopProfileResponseSchema,
//   ShopProfileArrayResponseSchema,
//   GetShopProfileResponseSchema,
//   AddShopRatingRequestSchema,
//   AddShopRatingResponseSchema,
//   ToggleSubscriptionResponseSchema,
//   CreateShopProfileRequestDto,
//   UpdateShopProfileRequestDto,
//   ShopProfileResponseDto,
//   ShopProfileArrayResponseDto,
//   GetShopProfileResponseDto,
//   AddShopRatingResponseDto,
//   AddShopRatingRequestDto,
//   ToggleSubscriptionResponseDto,
// };