/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import slugify from 'slugify';
import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
import * as schema from 'src/database/schema';
import { and, asc, desc, eq, isNotNull, isNull, sql, SQLWrapper } from 'drizzle-orm';
import { promises as fs } from "fs";
import { join } from "path";
import { ilike } from 'drizzle-orm';
import { TelegramService } from './telegram.service';
import { FacebookService } from './facebook.service';
import { InstagramService } from './instagram.service';
import { AllProductsQueryDto, ProductFilterQueryDto, ProductsArrayResponseDto, ProductsCreateRequestDto, ProductsFilterResponseDto, ProductSinglePostResponseDto, ProductSingleResponseDto, ProductsSingleRequestDto, ProductUpdateRequestDto, RecommendationProductsResponseDto, UserProductsArrayResponseDto } from './dto/product.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserRoleEnum } from 'src/utils/zod.schema';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { EnvType } from 'src/config/env/env-validation';
import { InferSelectModel } from 'drizzle-orm';

type Region = InferSelectModel<typeof schema.regionsSchema>;
type Product = InferSelectModel<typeof schema.productsSchema>;
type ProductImage = InferSelectModel<typeof schema.productImagesSchema>;
type ShopProfile = InferSelectModel<typeof schema.shopProfilesSchema>;
type User = InferSelectModel<typeof schema.usersSchema>;
type Profile = InferSelectModel<typeof schema.profilesSchema>;

type RegionWithParent = Pick<Region, 'id' | 'name' | 'slug' | 'parentId'> & {
  parent?: Pick<Region, 'id' | 'name' | 'slug' | 'parentId'> | null;
}

type ShopProfileWithSubscribers = Pick<ShopProfile, 'id' | 'shopName' | 'profileUrl'> & {
  subscriptions: {
    user: Pick<User, 'id'> & {
      profile?: Pick<Profile, 'fcmToken'> | null;
    };
  }[];
};

type ProductWithImages = Pick<Product, 'id' | 'userId'> & {
  images: Pick<ProductImage, 'id' | 'isMain'>[];
};

type ProductFromQuery = Product & {
  region: Pick<Region, 'id' | 'name' | 'slug' | 'parentId'> & {
    parent?: Region | null;
  };
  images: Pick<ProductImage, 'imageUrl' | 'isMain'>[];
};

function formatRegionName(region?: { name: string; parent?: { name: string } | null } | null): string {
  if (!region) return 'Не указано';
  return region.parent ? `${region.parent.name}, ${region.name}` : region.name;
}

@Injectable()
export class ProductService {
  protected cacheTTL: number;
  constructor(
    @InjectQueue('socialPostCreateQueue') private socialPostCreateQueue: Queue,
    @InjectQueue('socialPostUpdateQueue') private socialPostUpdateQueue: Queue,
    @InjectQueue('socialPostDeleteQueue') private socialPostDeleteQueue: Queue,
    @InjectQueue('notificationQueue') private notificationQueue: Queue,
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    private readonly redisService: RedisService,
    protected configService: ConfigService,
  ) {
     this.cacheTTL = this.configService.getOrThrow<EnvType['REDIS_TTL']>('REDIS_TTL');
  }

async getAllProducts(query: AllProductsQueryDto): Promise<ProductsArrayResponseDto> {

  const { limit = 10, page = 1 } = query;

  const offset = (page - 1) * limit;

  const cacheKey = `products:all:${page}:${limit}`;

  const cached = await this.redisService.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

    const totalResult = await this.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(schema.productsSchema);

    const total = totalResult[0]?.count ?? 0;

    const pages = Math.ceil(total / limit);

  const products = await this.db.query.productsSchema.findMany({
    orderBy: [desc(schema.productsSchema.createdAt)],
    with: {
      region: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
        with: {
          parent: {
            columns: {
              name: true,
          },
        },
      },
      },
      images: {
        columns: {
          imageUrl: true,
          isMain: true,
        },
        orderBy: desc(schema.productImagesSchema.isMain)
      }
    },
    limit: limit,
    offset: offset,
  });

  const formatted = (products as ProductFromQuery[]).map((product) => {
  const { region } = product;
  return {
    ...product,
    region: {
      id: region.id,
      name: formatRegionName(region),
      slug: region.slug,
    },
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
  };
});

    const response = {
    products: formatted,
    pagination: {
      limit,
      page,
      total: Number(total),
      pages
    }
  };

  await this.redisService.setWithExpiry(cacheKey, JSON.stringify(response), this.cacheTTL);

  return response;
}

async filterProducts(query: ProductFilterQueryDto): Promise<ProductsFilterResponseDto> {
  const {
    page = 1,
    limit = 20,
    query: search,
    categoryId,
    regionId,
    parentRegionId,
    priceFrom,
    priceTo,
    currency,
    attributeValueIds,
    sorting,
    isUrgent,
    isFree
  } = query;

  const offset = (page - 1) * limit;
  const conditions: SQLWrapper[] = [];
  let orderBy: any = undefined;

  if (search?.trim()) {
    const normalizedSearch = search.trim();

    conditions.push(sql`
      (
        search_vector @@ websearch_to_tsquery('simple', ${normalizedSearch})
        OR similarity(name, ${normalizedSearch}) > 0.1
        OR similarity(description, ${normalizedSearch}) > 0.1
        OR name ILIKE ${'%' + normalizedSearch + '%'}
        OR description ILIKE ${'%' + normalizedSearch + '%'}
      )
    `);
  }

 if (categoryId) {
  conditions.push(sql`
    ${schema.productsSchema.categoryId} IN (
      WITH RECURSIVE category_tree AS (
        SELECT id
        FROM categories
        WHERE id = ${categoryId}

        UNION ALL

        SELECT c.id
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT id FROM category_tree
    )
  `);
}

  if (regionId) {
    conditions.push(eq(schema.productsSchema.regionId, regionId));
  }

  if (parentRegionId) {
    conditions.push(sql`
      ${schema.productsSchema.regionId} IN (
        SELECT id FROM regions WHERE parent_id = ${parentRegionId}
      )
    `);
  }

  if (isUrgent !== undefined) {
  conditions.push(
    eq(schema.productsSchema.isUrgent, isUrgent),
  );
}

  if (isFree !== undefined) {
  conditions.push(
    isFree
      ? isNull(schema.productsSchema.price)
      : isNotNull(schema.productsSchema.price)
  );
}

  if (priceFrom != null || priceTo != null) {
  const from = priceFrom ?? 0;
  const to = priceTo ?? 999999999;
  const effectiveCurrency = currency ?? 'UZS';

  if (effectiveCurrency === 'USD') {
    conditions.push(sql`
      (
        (currency = 'USD' AND price BETWEEN ${from} AND ${to})
        OR
        (currency = 'UZS' AND price BETWEEN ${from * 12750} AND ${to * 12750})
      )
    `);
  }

  if (effectiveCurrency === 'UZS') {
    conditions.push(sql`
      (
        (currency = 'UZS' AND price BETWEEN ${from} AND ${to})
        OR
        (currency = 'USD' AND price BETWEEN ${from / 12750} AND ${to / 12750})
      )
    `);
  }
}

  if (attributeValueIds?.length) {
    conditions.push(sql`
      ${schema.productsSchema.id} IN (
        SELECT product_id
        FROM product_attribute_values
        WHERE attribute_value_id IN (${sql.join(attributeValueIds.map(id => sql`${id}`), sql`, `)})
        GROUP BY product_id
        HAVING COUNT(*) >= ${attributeValueIds.length}
      )
    `);
  }

  switch (sorting) {
    case 'NEW':
      orderBy = desc(schema.productsSchema.createdAt);
      break;

    case 'CHEAP':
      orderBy = asc(schema.productsSchema.price);
      break;

    case 'EXPENSIVE':
      orderBy = desc(schema.productsSchema.price);
      break;

    default:
      if (search?.trim()) {
        const normalizedSearch = search.trim();

        orderBy = sql`
          ts_rank(search_vector, websearch_to_tsquery('simple', ${normalizedSearch})) DESC,
          similarity(name, ${normalizedSearch}) DESC,
          similarity(description, ${normalizedSearch}) DESC,
          ${schema.productsSchema.isUrgent} DESC,
          ${schema.productsSchema.createdAt} DESC
        `;
      } else {
        orderBy = sql`
          ${schema.productsSchema.isUrgent} DESC,
          ${schema.productsSchema.createdAt} DESC
        `;
      }
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const totalResult = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(schema.productsSchema)
    .where(whereClause);

  const total = Number(totalResult[0]?.count ?? 0);
  const pages = Math.ceil(total / limit);

  const products = await this.db.query.productsSchema.findMany({
    where: whereClause,
    orderBy,
    limit,
    offset,
    with: {
      region: {
        columns: { id: true, name: true, slug: true },
      },
      images: {
        columns: { imageUrl: true, isMain: true },
        orderBy: desc(schema.productImagesSchema.isMain),
      },
    },
  });

  const formatted = products.map(p => ({
    ...p,
    region: p.region as { id: string; name: string; slug: string },
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
  }));

  return {
    products: formatted,
    pagination: {
      limit,
      page,
      total,
      pages,
    },
  };
}

async getUserProducts(userId: string, query: AllProductsQueryDto): Promise<UserProductsArrayResponseDto> {

  const { limit = 12, page = 1 } = query;

  const offset = (page - 1) * limit;

  const cacheKey = `products:userId:${userId}:limit:${limit}:page:${page}`;

  const cached = await this.redisService.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const products = await this.db.query.productsSchema.findMany({
    orderBy: [desc(schema.productsSchema.createdAt)],
    limit: limit,
    offset: offset,
    where: eq(schema.productsSchema.userId, userId),
    with: {
      region: {
        columns: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
        with: {
          parent: true,
        },
      },
      images: {
        columns: {
          imageUrl: true,
          isMain: true,
        },
        orderBy: desc(schema.productImagesSchema.isMain),
      },
    },
  });

  const results = products.map((product) => {
    const region = product.region as RegionWithParent;

    const regionName = region?.parent?.name
  ? `${region.parent.name}, ${region.name}`
  : region?.name ?? 'Не указано';

    return {
      ...product,
      region: {
        id: region.id,
        name: regionName,
        slug: region.slug,
      },
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      deletedAt: product.deletedAt
        ? product.deletedAt.toISOString()
        : null,
    };
  });

  await this.redisService.setWithExpiry(
    cacheKey,
    JSON.stringify(results),
    this.cacheTTL,
  );

  return results;
}

async getShopProducts(
  shopId: string,
  query: AllProductsQueryDto,
): Promise<UserProductsArrayResponseDto> {

  const { limit = 12, page = 1 } = query;

  const offset = (page - 1) * limit;

  const cacheKey = `products:shopId:${shopId}:limit:${limit}:page:${page}`;

  const cached = await this.redisService.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const products = await this.db.query.productsSchema.findMany({
    orderBy: [desc(schema.productsSchema.createdAt)],
    where: eq(schema.productsSchema.shopId, shopId),
    limit: limit,
    offset: offset,
    with: {
      region: {
        columns: { id: true, name: true, slug: true, parentId: true },
        with: { parent: true },
      },
      images: {
        columns: { imageUrl: true, isMain: true },
        orderBy: desc(schema.productImagesSchema.isMain),
      },
    },
  });

  const results = products.map((product) => {
    const region = product.region as RegionWithParent;
    const regionName = formatRegionName(region);

    return {
      ...product,
      region: { id: region.id, name: regionName, slug: region.slug },
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
    };
  });

  await this.redisService.setWithExpiry(cacheKey, JSON.stringify(results), this.cacheTTL);
  return results;
}

async getSingleProduct(
  input: ProductsSingleRequestDto
): Promise<ProductSingleResponseDto> {

  const cacheKey = input.productId ? `product:id:${input.productId}` : `product:slug:${input.productSlug}`;

  const cached = await this.redisService.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  };

  const whereClause = input.productId
    ? eq(schema.productsSchema.id, input.productId)
    : eq(schema.productsSchema.slug, input.productSlug as string); 

  const product = await this.db.query.productsSchema.findFirst({
    where: whereClause,
    with: {
      region: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        columns: {
          imageUrl: true,
          isMain: true,
        },
        orderBy: desc(schema.productImagesSchema.isMain),
      },
      user: {
        columns: {
          name: true,
          phone: true
        },
      },
      category: {
        columns: {
          id: true,
          name: true,
          slug: true,
        }
      }
    },
  });

   if (!product) {
    throw new NotFoundException(`Product not found`);
  }

  const attributeRows = await this.db
  .select({
    attributeId: schema.attributesSchema.id,
    attributeName: schema.attributesSchema.name,
    attributeSlug: schema.attributesSchema.slug,

    valueId: schema.attributeValuesSchema.id,
    value: schema.attributeValuesSchema.value,
    valueSlug: schema.attributeValuesSchema.slug,
  })
  .from(schema.productsAttributeValuesSchema)
  .innerJoin(
    schema.attributeValuesSchema,
    eq(
      schema.productsAttributeValuesSchema.attributeValueId,
      schema.attributeValuesSchema.id,
    ),
  )
  .innerJoin(
    schema.attributeAttributeValuesSchema,
    eq(
      schema.attributeAttributeValuesSchema.attributeValueId,
      schema.attributeValuesSchema.id,
    ),
  )
  .innerJoin(
    schema.attributesSchema,
    eq(
      schema.attributeAttributeValuesSchema.attributeId,
      schema.attributesSchema.id,
    ),
  )

  .where(eq(schema.productsAttributeValuesSchema.productId, product.id));

  const attributes = attributeRows.map((row) => ({
  attributeId: row.attributeId,
  attributeName: row.attributeName,
  attributeSlug: row.attributeSlug,
  valueId: row.valueId,
  value: row.value,
  valueSlug: row.valueSlug,
}));

  const result = {
    ...product,
   user: {
  name: (product.user as { name: string }).name,
  phone: (product.user as { phone: string }).phone
},
    region: product.region as { id: string; name: string; slug: string },
    category: product.category as {id: string, name: string, slug: string},
    attributes,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
  };

  await this.redisService.setWithExpiry(cacheKey, JSON.stringify(result), this.cacheTTL);

  return result;
}

async getRecommendations(productId: string): Promise<RecommendationProductsResponseDto> {
  const cacheKey = `products:recommendations:${productId}`;

  const cached = await this.redisService.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const product = await this.db.query.productsSchema.findFirst({
    where: eq(schema.productsSchema.id, productId),
    columns: {
      id: true,
      categoryId: true,
      userId: true,
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  const userProducts = await this.db.query.productsSchema.findMany({
    where: and(
      eq(schema.productsSchema.userId, product.userId),
      sql`${schema.productsSchema.id} != ${productId}`,
    ),
    orderBy: desc(schema.productsSchema.createdAt),
    limit: 24,
    with: {
      region: {
        columns: { id: true, name: true, slug: true },
      },
      images: {
        columns: { imageUrl: true, isMain: true },
        orderBy: desc(schema.productImagesSchema.isMain),
        limit: 1,
      },
    },
  });

  const attributeValueRows = await this.db
    .select({
      attributeValueId: schema.productsAttributeValuesSchema.attributeValueId,
    })
    .from(schema.productsAttributeValuesSchema)
    .where(eq(schema.productsAttributeValuesSchema.productId, productId));

  const attributeValueIds = attributeValueRows.map(v => v.attributeValueId);

  let similarProducts: typeof userProducts = [];

  if (attributeValueIds.length) {
    const similarProductIds = await this.db
      .select({
        productId: schema.productsAttributeValuesSchema.productId,
        matchCount: sql<number>`count(*)`,
      })
      .from(schema.productsAttributeValuesSchema)
      .innerJoin(
        schema.productsSchema,
        eq(
          schema.productsSchema.id,
          schema.productsAttributeValuesSchema.productId,
        ),
      )
      .where(
        and(
          sql`${schema.productsAttributeValuesSchema.attributeValueId} IN (${sql.join(
            attributeValueIds.map(id => sql`${id}`),
            sql`, `,
          )})`,
          sql`${schema.productsAttributeValuesSchema.productId} != ${productId}`,
          eq(schema.productsSchema.categoryId, product.categoryId),
          sql`${schema.productsSchema.userId} != ${product.userId}`,
        ),
      )
      .groupBy(schema.productsAttributeValuesSchema.productId)
      .having(sql`count(*) >= 2`)
      .orderBy(desc(sql`count(*)`))
      .limit(12);

    const similarIds = similarProductIds.map(p => p.productId);

    if (similarIds.length) {
      similarProducts = await this.db.query.productsSchema.findMany({
        where: sql`${schema.productsSchema.id} IN (${sql.join(
          similarIds.map(id => sql`${id}`),
          sql`, `,
        )})`,
        orderBy: desc(schema.productsSchema.createdAt),
        with: {
          region: {
            columns: { id: true, name: true, slug: true },
          },
          images: {
            columns: { imageUrl: true, isMain: true },
            orderBy: desc(schema.productImagesSchema.isMain),
            limit: 1,
          },
        },
      });
    }
  }

  if (!attributeValueIds.length) {
    similarProducts = await this.db.query.productsSchema.findMany({
      where: and(
        eq(schema.productsSchema.categoryId, product.categoryId),
        sql`${schema.productsSchema.id} != ${productId}`,
        sql`${schema.productsSchema.userId} != ${product.userId}`,
      ),
      orderBy: desc(schema.productsSchema.createdAt),
      limit: 12,
      with: {
        region: {
          columns: { id: true, name: true, slug: true },
        },
        images: {
          columns: { imageUrl: true, isMain: true },
          orderBy: desc(schema.productImagesSchema.isMain),
          limit: 1,
        },
      },
    });
  }

  const userProductsFormatted = userProducts.map(p => ({
    ...p,
    region: p.region as { id: string; name: string; slug: string },
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
  }));

  const similarProductsFormatted = similarProducts.map(p => ({
    ...p,
    region: p.region as { id: string; name: string; slug: string },
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
  }));

  const response = {
    userProducts: userProductsFormatted,
    similarProducts: similarProductsFormatted,
  };

  await this.redisService.setWithExpiry(
    cacheKey,
    JSON.stringify(response),
    this.cacheTTL,
  );

  return response;
}

async createProduct(
  userId: string,
  input: ProductsCreateRequestDto,
  images: Express.Multer.File[],
): Promise<ProductSinglePostResponseDto> {
  
  const slug = slugify(input.name, { lower: true, strict: true, locale: 'ru' });

  const result = await this.db.transaction(async (tx) => {
    const exists = await tx.query.productsSchema.findFirst({
      where: eq(schema.productsSchema.slug, slug),
    });

    const [newProduct] = await tx
      .insert(schema.productsSchema)
      .values({
        categoryId: input.categoryId,
        userId: userId,
        regionId: input.regionId,
        name: input.name,
        slug,
        description: input.description,
        price: input.price ?? null,
        isUrgent: input.isUrgent,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        enableTelegram: input.enableTelegram,
        currency: input.currency ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .returning();

    const finalSlug = exists ? `${slug}-${newProduct.id}` : slug;
    if (exists) {
      await tx
        .update(schema.productsSchema)
        .set({ slug: finalSlug })
        .where(eq(schema.productsSchema.id, newProduct.id));
    }

    const imageRecords = images.map((img, index) => ({
      productId: newProduct.id,
      imageUrl: `/uploads/products/${img.filename}`,
      isMain: index === 0,
    }));
    await tx.insert(schema.productImagesSchema).values(imageRecords);

    if (input.attributeValueIds?.length) {
  const uniqueAttributeValueIds = Array.from(
    new Set(input.attributeValueIds)
  );

  await tx
    .insert(schema.productsAttributeValuesSchema)
    .values(
      uniqueAttributeValueIds.map((attributeValueId) => ({
        productId: newProduct.id,
        attributeValueId,
      }))
    )
    .onConflictDoNothing();
}

    return {
      ...newProduct,
      slug: finalSlug,
      createdAt: newProduct.createdAt.toISOString(),
      updatedAt: newProduct.updatedAt.toISOString(),
      deletedAt: newProduct.deletedAt ? newProduct.deletedAt.toISOString() : null,
    };
  });

  await this.enqueueSocialPost(result, userId, input.regionId, images).catch((err) => {
  });

  // await this.notifyShopSubscribers(userId, result, input, images);

  await this.clearProductCache(userId, result.id, slug);

  return result;
}

async updateProduct(
  userId: string,
  productId: string,
  input: ProductUpdateRequestDto,
  images?: Express.Multer.File[],
): Promise<ProductSinglePostResponseDto> {
  const product = await this.db.query.productsSchema.findFirst({
    where: eq(schema.productsSchema.id, productId),
    with: {
      images: { orderBy: desc(schema.productImagesSchema.isMain) },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  if (product.userId !== userId) {
    throw new ForbiddenException('You are not allowed to edit this product');
  }

  const slug = input.name
    ? slugify(input.name, { lower: true, strict: true, locale: 'ru' })
    : product.slug;

  const existingImages = product.images.map((img) => `https://biztorg.uz/public${img.imageUrl}`);
  const newImages = images ? images.map((img) => `https://biztorg.uz/public/uploads/products/${img.filename}`) : [];
  const allImages = [...existingImages, ...newImages].slice(0, 4);

  const result = await this.db.transaction(async (tx) => {

    const [updatedProduct] = await tx
      .update(schema.productsSchema)
      .set({
        name: input.name ?? product.name,
        slug,
        description: input.description ?? product.description,
        categoryId: input.categoryId ?? product.categoryId,
        price: input.price ?? product.price ?? null,
        currency: input.currency ?? product.currency ?? null,
        latitude: input.latitude ?? product.latitude,
        longitude: input.longitude ?? product.longitude,
        isUrgent: input.isUrgent ?? product.isUrgent,
        contactName: input.contactName ?? product.contactName,
        contactPhone: input.contactPhone ?? product.contactPhone,
        enableTelegram: input.enableTelegram ?? product.enableTelegram,
        regionId: input.regionId ?? product.regionId,
      })
      .where(eq(schema.productsSchema.id, productId))
      .returning();

    const newImageRecords = images
      ? images.map((img, index) => ({
          productId,
          imageUrl: `/uploads/products/${img.filename}`,
          isMain: index === 0 && existingImages.length === 0,
        }))
      : [];

    if (newImageRecords.length) {
      await tx.insert(schema.productImagesSchema).values(newImageRecords);
    }

    return {
      ...updatedProduct,
      slug,
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
      deletedAt: updatedProduct.deletedAt ? updatedProduct.deletedAt.toISOString() : null,
    };
  });

  await this.socialPostUpdateQueue.add('updateSocialPost', {
    productId,
    updatedData: {
      ...input,
      images: allImages,
    },
  });

  await this.clearProductCache(userId, result.id, slug);

  return result;
}

async deleteProduct(userId: string, productId: string) {
  
  const product = await this.db.query.productsSchema.findFirst({
    where: eq(schema.productsSchema.id, productId),
    with: {
      images: true,
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  if (product.userId !== userId) {
    throw new ForbiddenException('You cannot delete this product');
  }

  for (const img of product.images) {
    const filePath = join(process.cwd(), 'public', img.imageUrl.replace(/^\/+/, ''));
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.warn('File not found, skipping delete:', filePath);
      } else {
        console.error('Error deleting image file:', err);
      }
    }
  }

  await this.db
    .delete(schema.productImagesSchema)
    .where(eq(schema.productImagesSchema.productId, productId));

    await this.socialPostDeleteQueue.add('removeFromSocials', {
      telegramPostId: product.telegramPostId,
      facebookPostId: product.facebookPostId,
    });

  await this.db.delete(schema.productsSchema).where(eq(schema.productsSchema.id, productId));

  await this.clearProductCache(userId, productId, product.slug);

  return { message: 'Product deleted successfully' };
}

async deleteImage(userId: string, imageId: string) {
  const image = await this.db.query.productImagesSchema.findFirst({
    where: eq(schema.productImagesSchema.id, imageId),
    with: {
      product: {
        columns: { id: true, userId: true },
        with: {
          images: {
            orderBy: desc(schema.productImagesSchema.isMain),
          },
        },
      },
    },
  });

  if (!image) {
    throw new NotFoundException('Image not found');
  }

  const product = image.product as ProductWithImages;

  if (product.userId !== userId) {
    throw new ForbiddenException('You cannot delete this image');
  }

  if (image.imageUrl) {
    const filePath = join(
      process.cwd(),
      'public',
      image.imageUrl.replace(/^\/+/, ''),
    );

    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  await this.db
    .delete(schema.productImagesSchema)
    .where(eq(schema.productImagesSchema.id, imageId));

  if (image.isMain) {
    const remainingImages = product.images.filter(
      (img) => img.id !== imageId,
    );

    if (remainingImages.length > 0) {
      const firstImageId = remainingImages[0].id;

      await this.db
        .update(schema.productImagesSchema)
        .set({ isMain: true })
        .where(eq(schema.productImagesSchema.id, firstImageId));
    }
  }

  return {
    message: 'Image was deleted successfully',
  };
}

private async enqueueSocialPost(
  product: any,
  userId: string,
  regionId: string,
  images: Express.Multer.File[],
): Promise<void> {

  const productImages = images.map(
    (img) => `https://3d3886f788d5.ngrok-free.app/public/uploads/products/${img.filename}`,
  );

  const [user, region] = await Promise.all([
    this.db.query.usersSchema.findFirst({ where: eq(schema.usersSchema.id, userId) }),
    this.db.query.regionsSchema.findFirst({ where: eq(schema.regionsSchema.id, regionId) }),
  ]);

  if (!user) {
    throw new NotFoundException(`User not found`);
  }

  const contactName = product.contactName || user.name || 'Имя не указано';
  const contactPhone = product.contactPhone || user.phone || 'Номер телефона не указан';

  await this.socialPostCreateQueue.add('postToSocials', {
    product: {
      ...product,
      regionName: region?.name ?? 'Регион не указан',
    },
    contactName,
    contactPhone,
    images: productImages,
    isShop: false,
    shopName: null,
  });
}

// private async notifyShopSubscribers(
//   userId: string,
//   product: any,
//   input: any,
//   images: Express.Multer.File[],
// ): Promise<void> {

//   const user = await this.db.query.usersSchema.findFirst({
//     where: eq(schema.usersSchema.id, userId),
//     with: {
//       shopProfile: {
//         with: {
//           subscriptions: {
//             with: {
//               user: { with: { profile: true } },
//             },
//           },
//         },
//       },
//     },
//   });

//   if (!user?.shopProfile) {
//     return;
//   }

//   const shop = user.shopProfile as ShopProfileWithSubscribers;

//   const subscribers = shop.subscriptions ?? [];
//   if (!subscribers.length) {
//     return;
//   }

//   const productImage = images.length
//     ? `https://biztorg.uz/public/uploads/products/${images[0].filename}`
//     : '';

//   const notificationTitle = `${shop.shopName} опубликовал новое объявление`;
//   const notificationBody = `${input.name} - ${input.description}`.slice(0, 300);

//   const shopImageMain = shop.profileUrl
//     ? `https://biztorg.uz/public/${shop.profileUrl}`
//     : '';

//   for (const sub of subscribers) {
//     const subscriber = sub.user;

//     const fcmToken = subscriber?.profile?.fcmToken;
//     if (!fcmToken) {
//       continue;
//     }

//     await this.notificationQueue.add(
//       'sendNotification',
//       {
//         productId: product.id,
//         notificationTitle,
//         notificationBody,
//         fcmToken,
//         productImageUrl: productImage,
//         senderId: user.id,
//         shopName: shop.shopName,
//         productName: input.name,
//         productDescription: input.description,
//         subscriberId: subscriber.id,
//         shopImage: shopImageMain,
//       },
//       { delay: 200 },
//     );
//   }
// }

  private async clearProductCache(userId: string, productId?: string, slug?: string) {
  await Promise.all([
    this.redisService.delete('products:all'),
    this.redisService.delete(`products:userId:${userId}`),
    ...(productId ? [this.redisService.delete(`product:id:${productId}`)] : []),
    ...(slug ? [this.redisService.delete(`product:slug:${slug}`)] : []),
  ]);
}
}