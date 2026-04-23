import { createZodDto } from 'nestjs-zod/dto';
import { CurrencyEnum, PaginationQuerySchema, PaginationResponseSchema, ProductSchema } from 'src/utils/zod.schema';
import { z } from 'zod';

const ProductSingleResponseSchema = ProductSchema.extend({
  region: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),

  images: z.array(
    z.object({
      imageUrl: z.string(),
      isMain: z.boolean(),
    }),
  ),

  user: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
  }),

  category: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
  }),

  attributes: z.array(
    z.object({
      attributeId: z.string().nullable(),
      attributeName: z.string().nullable(),
      attributeSlug: z.string().nullable(),
      valueId: z.string().nullable(),
      value: z.string().nullable(),
      valueSlug: z.string().nullable(),
    }),
  ),
});


const ProductSinglePostResponseSchema = ProductSchema;

const ProductsArrayResponseSchema = z.object({
  products: ProductSchema.extend({
    region: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
    images: z.array(
    z.object({
      imageUrl: z.string(),
      isMain: z.boolean(),
    })
  ),
}).array().describe('Products results'),
pagination: PaginationResponseSchema.describe('Pagination metadata')
}).describe('Array of products schema');

const ProductWithRelationsSchema = ProductSchema.extend({
  region: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  images: z.array(
    z.object({
      imageUrl: z.string(),
      isMain: z.boolean(),
    })
  ),
});

export const ProductsFilterResponseSchema = z.object({
  products: z.array(ProductWithRelationsSchema)
    .describe("Filtered products"),

  pagination: PaginationResponseSchema
    .describe("Pagination metadata"),
});

export const RecommendationProductsResponseSchema = z.object({
  userProducts: ProductWithRelationsSchema.array(),
  similarProducts: ProductWithRelationsSchema.array()
})

export const UserProductsArrayResponseSchema = z
  .array(ProductWithRelationsSchema)
  .describe('Array of products');

const ProductsSingleRequestSchema = z
  .object({
    productId: z.uuid().optional(),
    productSlug: z.string().optional(),
  })
  .refine((data) => data.productId || data.productSlug, {
    message: "Either productId or productSlug must be provided",
    path: ["productId"],
  });

const ProductsCreateRequestSchema = ProductSchema
  .omit({
    id: true,
    slug: true,
    userId: true,
    facebookPostId: true,
    instagramPostId: true,
    telegramPostId: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    attributeValueIds: z
      .array(z.uuid())
      .optional()
      .default([]),
  });

// const FeedbackQuerySchema = z
//   .object({
//     sentiment: z
//       .union([SentimentEnum, z.array(SentimentEnum)])
//       .optional()
//       .transform((val) =>
//         val ? (Array.isArray(val) ? val : [val]) : undefined,
//       )
//       .describe('Filter feedback by one or more sentiments'),
//   })
//   .extend(PaginationQuerySchema)
//   .describe('Feedback query parameters with sentiment filter and pagination');

const AllProductsQuerySchema = PaginationQuerySchema.describe('Products query parameters with pagination')

const ProductUpdateRequestSchema = ProductsCreateRequestSchema;

export const ProductFilterQuerySchema = PaginationQuerySchema.extend({
  query: z.string().optional(),
  categoryId: z.uuid().optional(),
  parentCategoryId: z.uuid().optional(),
  regionId: z.uuid().optional(),
  parentRegionId: z.uuid().optional(),
  priceFrom: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().optional()
  ),

  priceTo: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().optional()
  ),
  currency: z.enum([CurrencyEnum.USD, CurrencyEnum.UZS]).optional(),

  attributeValueIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v?.split(','))),

  sorting: z.enum(['NEW', 'CHEAP', 'EXPENSIVE']).optional(),
  isUrgent: z.preprocess(
  (v) => {
    if (v === '' || v == null) return undefined;
    if (v === 'true' || v === true) return true;
    if (v === 'false' || v === false) return false;
    return v;
  },
  z.boolean().optional()
),

isFree: z.preprocess(
  (v) => {
    if (v === '' || v == null) return undefined;
    if (v === 'true' || v === true) return true;
    if (v === 'false' || v === false) return false;
    return v;
  },
  z.boolean().optional()
),
}).describe('Product filter query parameters with pagination');

export class ProductFilterQueryDto extends createZodDto(ProductFilterQuerySchema) {}

class ProductSingleResponseDto extends createZodDto(ProductSingleResponseSchema) {}

class ProductsArrayResponseDto extends createZodDto(ProductsArrayResponseSchema) {}

class UserProductsArrayResponseDto extends createZodDto(UserProductsArrayResponseSchema) {}

class ProductsSingleRequestDto extends createZodDto(ProductsSingleRequestSchema) {}

class ProductsCreateRequestDto extends createZodDto(ProductsCreateRequestSchema) {}

class ProductSinglePostResponseDto extends createZodDto(ProductSinglePostResponseSchema) {}

class ProductUpdateRequestDto extends createZodDto(ProductUpdateRequestSchema) {}

class AllProductsQueryDto extends createZodDto(AllProductsQuerySchema) {}

export class RecommendationProductsResponseDto extends createZodDto(RecommendationProductsResponseSchema) {}

export class ProductsFilterResponseDto extends createZodDto(ProductsFilterResponseSchema) {}

export {
    ProductSingleResponseSchema,
    ProductsArrayResponseSchema,
    ProductSingleResponseDto,
    UserProductsArrayResponseDto,
    ProductsArrayResponseDto,
    ProductsSingleRequestSchema,
    ProductsSingleRequestDto,
    ProductsCreateRequestSchema,
    ProductsCreateRequestDto,
    ProductSinglePostResponseSchema,
    ProductSinglePostResponseDto,
    ProductUpdateRequestSchema,
    ProductUpdateRequestDto,
    AllProductsQuerySchema,
    AllProductsQueryDto,
}