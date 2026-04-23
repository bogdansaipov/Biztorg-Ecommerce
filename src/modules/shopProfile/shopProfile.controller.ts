// import {
//   Controller,
//   Post,
//   Put,
//   Get,
//   Param,
//   Body,
//   UploadedFiles,
//   UseInterceptors,
//   BadRequestException,
//   HttpCode,
//   HttpStatus,
//   Req,
//   UseGuards,
// } from '@nestjs/common';
// import {
//     ApiBearerAuth,
//   ApiBody,
//   ApiConsumes,
//   ApiCreatedResponse,
//   ApiOkResponse,
//   ApiOperation,
//   ApiParam,
//   ApiTags,
// } from '@nestjs/swagger';
// import { FileFieldsInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { ZodSerializerDto } from 'nestjs-zod';
// import { createBaseResponseDto } from 'src/helpers/create-base-response.helper';
// import { ShopProfileService } from './shopProfile.service';
// import {
//   CreateShopProfileRequestDto,
//   UpdateShopProfileRequestDto,
//   ShopProfileResponseSchema,
//   GetShopProfileResponseDto,
//   ShopProfileResponseDto,
//   AddShopRatingRequestDto,
//   AddShopRatingResponseSchema,
//   ToggleSubscriptionResponseSchema,
//   ToggleSubscriptionResponseDto,
//   AddShopRatingResponseDto,
// } from './dto/shopProfile.dto';
// import type { AuthenticatedRequest } from 'src/shared/request-with-user-type';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { ProductsArrayResponseDto, ProductsArrayResponseSchema } from '../product/dto/product.dto';
// import { join, extname } from 'path';
// import { existsSync, mkdirSync } from 'fs';

// @ApiBearerAuth()
// @ApiTags('Shop Profile')
// @Controller('shop-profiles')
// @UseGuards(JwtAuthGuard)
// export class ShopProfileController {
//   constructor(private readonly shopProfileService: ShopProfileService) {}

// @Post()
// @HttpCode(HttpStatus.CREATED)
// @ApiBody({type: CreateShopProfileRequestDto})
// @ApiOperation({ summary: 'Create a new shop profile' })
// @ApiCreatedResponse({
//   type: createBaseResponseDto(ShopProfileResponseSchema, 'ShopProfileResponseSchema'),
// })
// @ZodSerializerDto(ShopProfileResponseSchema)
// async createShopProfile(
//   @Body() input: CreateShopProfileRequestDto,
//   @Req() req: AuthenticatedRequest,
// ): Promise<ShopProfileResponseDto> {
//   return this.shopProfileService.createShopProfile(req.user.id, input);
// }

//   @Put()
//   @ApiBody({type: UpdateShopProfileRequestDto})
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Update shop profile information' })
//   @ApiOkResponse({
//     type: createBaseResponseDto(
//       ShopProfileResponseSchema,
//       'ShopProfileResponseSchema',
//     ),
//   })
//   @ZodSerializerDto(ShopProfileResponseSchema)
//   async updateShopProfile(
//     @Body() input: UpdateShopProfileRequestDto,
//     @Req() req: AuthenticatedRequest,
//   ): Promise<ShopProfileResponseDto> {
//     return this.shopProfileService.updateShopProfile(req.user.id, input);
//   }

//  @Put(':shopId/images')
// @HttpCode(HttpStatus.OK)
// @ApiConsumes('multipart/form-data')
// @ApiOperation({ summary: 'Update shop profile images (banner + avatar)' })
// @ApiParam({ name: 'shopId', type: 'string', example: 'uuid-v4' })
// @ApiBody({
//   schema: {
//     type: 'object',
//     properties: {
//       bannerUrl: {
//         type: 'string',
//         format: 'binary',
//         description: 'Banner image file',
//       },
//       profileUrl: {
//         type: 'string',
//         format: 'binary',
//         description: 'Profile image file',
//       },
//     },
//   },
// })
// @ApiOkResponse({
//   type: createBaseResponseDto(
//     ShopProfileResponseSchema,
//     'ShopProfileResponseSchema',
//   ),
// })
// @UseInterceptors(
//   FileFieldsInterceptor(
//     [
//       { name: 'bannerUrl', maxCount: 1 },
//       { name: 'profileUrl', maxCount: 1 },
//     ],
//     {
//       storage: diskStorage({
//         destination: (req, file, cb) => {

//           const folder = join(
//             process.cwd(),
//             'public',
//             'uploads',
//             file.fieldname === 'bannerUrl' ? 'banners' : 'avatars'
//           );

//           if (!existsSync(folder)) {
//             mkdirSync(folder, { recursive: true });
//           }

//           cb(null, folder);
//         },
//         filename: (req, file, cb) => {

//           const uniqueSuffix =
//             Date.now() + '-' + Math.round(Math.random() * 1e9);
//           cb(null, uniqueSuffix + extname(file.originalname));
//         },
//       }),
//       limits: { fileSize: 3 * 1024 * 1024 },
//       fileFilter: (req, file, cb) => {
//         if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
//           return cb(
//             new BadRequestException(
//               'Only image files are allowed (jpeg, png, jpg, webp)',
//             ),
//             false,
//           );
//         }
//         cb(null, true);
//       },
//     },
//   ),
// )
// @ZodSerializerDto(ShopProfileResponseSchema)
// async updateShopImages(
//   @Param('shopId') shopId: string,
//   @UploadedFiles()
//   files: {
//     bannerUrl?: Express.Multer.File[];
//     profileUrl?: Express.Multer.File[];
//   },
//   @Req() req: AuthenticatedRequest,
// ) {
//   return this.shopProfileService.updateShopImages(req.user.id, shopId, {
//     bannerUrl: files.bannerUrl?.[0],
//     profileUrl: files.profileUrl?.[0],
//   });
// }

//   @Get(':shopId/')
//   @ApiOperation({ summary: 'Get shop profile by ID' })
//   @ApiParam({ name: 'shopId', type: 'string', example: 'uuid-v4' })
//   @ApiOkResponse({
//     type: createBaseResponseDto(
//       ShopProfileResponseSchema,
//       'ShopProfileResponseSchema',
//     ),
//   })
//   @ZodSerializerDto(ShopProfileResponseSchema)
//   async getShopProfile(@Param('shopId') shopId: string, @Req() req: AuthenticatedRequest,): Promise<ShopProfileResponseDto> {
//     return this.shopProfileService.getShopProfile(req.user.id, shopId);
//   }

// @Post(':shopId/rate')
// @HttpCode(HttpStatus.OK)
// @ApiOperation({ summary: 'Add or update a rating for a shop' })
// @ApiParam({ name: 'shopId', type: 'string', example: 'uuid-v4' })
// @ApiBody({ type: AddShopRatingRequestDto })
// @ApiOkResponse({
//   type: createBaseResponseDto(AddShopRatingResponseSchema, 'AddShopRatingResponseSchema'),
// })
// @ZodSerializerDto(AddShopRatingResponseSchema)
// async addShopRating(
//   @Param('shopId') shopId: string,
//   @Body() input: AddShopRatingRequestDto,
//   @Req() req: AuthenticatedRequest,
// ): Promise<AddShopRatingResponseDto> {
//   return this.shopProfileService.addRating(req.user.id, shopId, input.rating);
// }

// @Post(':shopId/toggle-subscription')
// @HttpCode(HttpStatus.OK)
// @ApiOperation({ summary: 'Subscribe or Unsubscribe from a shop' })
// @ApiParam({ name: 'shopId', type: 'string', example: 'uuid-v4' })
// @ApiOkResponse({
//   type: createBaseResponseDto(ToggleSubscriptionResponseSchema, 'ToggleSubscriptionResponseSchema'),
// })
// @ZodSerializerDto(ToggleSubscriptionResponseSchema)
// async toggleSubscription(
//   @Param('shopId') shopId: string,
//   @Req() req: AuthenticatedRequest,
// ): Promise<ToggleSubscriptionResponseDto> {
//   return this.shopProfileService.toggleSubscription(req.user.id, shopId);
// }
// }