import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Delete,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductService } from './product.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { createBaseResponseDto } from 'src/helpers/create-base-response.helper';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  ProductsArrayResponseSchema,
  ProductSingleResponseSchema,
  ProductSinglePostResponseSchema,
  ProductsCreateRequestSchema,
  ProductsSingleRequestSchema,
  ProductsCreateRequestDto,
  ProductsSingleRequestDto,
  ProductUpdateRequestDto,
  ProductsArrayResponseDto,
  ProductSinglePostResponseDto,
  ProductSingleResponseDto,
  AllProductsQueryDto,
  UserProductsArrayResponseDto,
  UserProductsArrayResponseSchema,
  RecommendationProductsResponseSchema,
  RecommendationProductsResponseDto,
  ProductsFilterResponseSchema,
  ProductFilterQueryDto,
  ProductsFilterResponseDto,
} from './dto/product.dto';
import type { AuthenticatedRequest } from 'src/shared/request-with-user-type';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create product with multiple image uploads' })
  @ApiBody({
  schema: {
    type: 'object',
    properties: {
      categoryId: { type: 'string', format: 'uuid' },
      regionId: { type: 'string', format: 'uuid' },

      name: { type: 'string', example: 'iPhone 15 Pro Max' },
      description: { type: 'string' },
      price: { type: 'string', example: '1500' },
      currency: { type: 'string', enum: ['USD', 'UZS'] },

      latitude: { type: 'number', nullable: true },
      longitude: { type: 'number', nullable: true },

      isUrgent: { type: 'boolean', example: false },
      contactName: { type: 'string', nullable: true },
      contactPhone: { type: 'string', nullable: true },
      enableTelegram: { type: 'boolean', example: true },

      attributeValueIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' }
      },

      images: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
      }
    },
    required: [
      'categoryId',
      'regionId',
      'name',
      'description',
      'latitude',
      'longitude',
      'isUrgent',
      'contactName',
      'contactPhone',
      'enableTelegram',
      'attributeValueIds',
      'images'
    ],
  },
})
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: diskStorage({
        destination: './public/uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
          return cb(
            new BadRequestException(
              'Only image files are allowed (jpeg, png, jpg, webp)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiCreatedResponse({
    type: createBaseResponseDto(
      ProductSinglePostResponseSchema,
      'ProductSinglePostResponseSchema',
    ),
  })
  @ZodSerializerDto(ProductSinglePostResponseSchema)
  async createProduct(
    @Body() input: ProductsCreateRequestDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<ProductSinglePostResponseDto> {

    if (!images || images.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }
    return this.productService.createProduct(req.user.id, input, images);
  }

  @Get('filter')
@ApiOperation({ summary: 'Filter products with search, category, region, price, attributes' })
@ApiQuery({ name: 'attributeValueIds', isArray: true, required: false })
@ApiOkResponse({
  type: createBaseResponseDto(
    ProductsFilterResponseSchema,
    'ProductsFilterResponseSchema',
  ),
})
@ZodSerializerDto(ProductsFilterResponseSchema)
async filterProducts(
  @Query() query: ProductFilterQueryDto,
): Promise<ProductsFilterResponseDto> {
  return this.productService.filterProducts(query);
}


  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiOkResponse({
    type: createBaseResponseDto(
      ProductsArrayResponseSchema,
      'ProductsArrayResponseSchema',
    ),
  })
  @ZodSerializerDto(ProductsArrayResponseSchema)
  async getAllProducts(@Query() query: AllProductsQueryDto): Promise<ProductsArrayResponseDto> {
    return this.productService.getAllProducts(query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all products for a user' })
  @ApiParam({ name: 'userId', type: 'string', example: 'uuid-v4' })
  @ZodSerializerDto(UserProductsArrayResponseSchema)
  @ApiOkResponse({
   type: createBaseResponseDto(
    UserProductsArrayResponseSchema,
    'UserProductsArrayResponseSchema',
   )
  })
  async getUserProducts(@Param('userId') userId: string, @Query() query: AllProductsQueryDto): Promise<UserProductsArrayResponseDto> {
    return this.productService.getUserProducts(userId, query);
  }

  @Get('recommendations/:productId')
  @ApiOperation({ summary: 'Get userProducts and relatedProducts' })
  @ApiParam({ name: 'productId', type: 'string', example: 'uuid-v4' })
  @ZodSerializerDto(RecommendationProductsResponseSchema)
  @ApiOkResponse({
    type: createBaseResponseDto(
      RecommendationProductsResponseSchema,
      'RecommendationProductsResponseSchema',
    ),
  })
  async getRecommendationProducts(
    @Param('productId') productId: string,
  ): Promise<RecommendationProductsResponseDto> {
    return this.productService.getRecommendations(productId);
  }

    

  @Get('single')
  @ApiOperation({ summary: 'Get single product by ID or slug' })
  @ApiOkResponse({
    type: createBaseResponseDto(
      ProductSingleResponseSchema,
      'ProductSingleResponseSchema',
    ),
  })
  @ZodSerializerDto(ProductSingleResponseSchema)
  async getSingleProduct(@Query() query: ProductsSingleRequestDto): Promise<ProductSingleResponseDto> {
    return this.productService.getSingleProduct(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update product and optionally upload new images' })
  @UseInterceptors(
    FilesInterceptor('images', 4, {
      storage: diskStorage({
        destination: './public/uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
          return cb(
            new BadRequestException(
              'Only image files are allowed (jpeg, png, jpg, webp)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOkResponse({
    type: createBaseResponseDto(
      ProductSinglePostResponseSchema,
      'ProductSinglePostResponseSchema',
    ),
  })
  @ZodSerializerDto(ProductSinglePostResponseSchema)
  async updateProduct(
    @Param('id') productId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: ProductUpdateRequestDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<ProductSinglePostResponseDto> {
    return this.productService.updateProduct(req.user.id, productId, input, images);
  }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product and all related images/social posts' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid-v4' })
  async deleteProduct(
    @Param('id') productId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productService.deleteProduct(req.user.id, productId);
  }

  @Delete('image/:imageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a specific product image' })
  @ApiParam({ name: 'imageId', type: 'string', example: 'uuid-v4' })
  async deleteImage(
    @Param('imageId') imageId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productService.deleteImage(req.user.id, imageId);
  }
}