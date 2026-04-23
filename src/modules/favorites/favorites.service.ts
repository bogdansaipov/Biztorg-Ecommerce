import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
import * as schema from 'src/database/schema';
import { RedisService } from '../redis/redis.service';
import { EnvType } from 'src/config/env/env-validation';
import { MessageResponseDto } from 'src/utils/zod.schema';
import { UserProductsArrayResponseDto } from '../product/dto/product.dto';

type Region = InferSelectModel<typeof schema.regionsSchema>;
type Product = InferSelectModel<typeof schema.productsSchema>;
type ProductImage = InferSelectModel<typeof schema.productImagesSchema>;

type ProductFromQuery = Product & {
  region: Pick<Region, 'id' | 'name' | 'slug' | 'parentId'> & {
    parent?: Region | null;
  };
  images: Pick<ProductImage, 'imageUrl' | 'isMain'>[];
};

function formatRegionName(
  region?: { name: string; parent?: { name: string } | null } | null,
): string {
  if (!region) return 'Не указано';
  return region.parent ? `${region.parent.name}, ${region.name}` : region.name;
}

@Injectable()
export class FavoritesService {
  private cacheTTL: number;

  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTL = this.configService.getOrThrow<EnvType['REDIS_TTL']>('REDIS_TTL');
  }

  async getUserFavorites(userId: string): Promise<UserProductsArrayResponseDto> {
    const cacheKey = `favoriteProducts:userId:${userId}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const favorites = await this.db.query.favoriteProductsSchema.findMany({
      orderBy: [desc(schema.favoriteProductsSchema.createdAt)],
      where: eq(schema.favoriteProductsSchema.userId, userId),
      with: {
        product: {
          with: {
            region: {
              columns: {
                id: true,
                name: true,
                slug: true,
                parentId: true,
              },
              with: { parent: true },
            },
            images: {
              columns: { imageUrl: true, isMain: true },
              orderBy: desc(schema.productImagesSchema.isMain),
            },
          },
        },
      },
    });

    const results = favorites
      .map((fav) => fav.product as ProductFromQuery | null)
      .filter((product): product is ProductFromQuery => product !== null)
      .map((product) => {
        const { region } = product;
        const regionName = formatRegionName(region);

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

  async addFavorite(userId: string, productId: string): Promise<MessageResponseDto> {
    const product = await this.db.query.productsSchema.findFirst({
      where: and(
        eq(schema.productsSchema.id, productId),
        isNull(schema.productsSchema.deletedAt),
      ),
      columns: { id: true, userId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.userId === userId) {
      throw new BadRequestException('You cannot favorite your own product');
    }

    await this.db
      .insert(schema.favoriteProductsSchema)
      .values({
        userId,
        productId,
      })
      .onConflictDoNothing();

    await this.invalidateCache(userId);

    return { message: 'Товар добавлен в избранное' };
  }

  async removeFavorite(userId: string, productId: string): Promise<MessageResponseDto> {
    const result = await this.db
      .delete(schema.favoriteProductsSchema)
      .where(
        and(
          eq(schema.favoriteProductsSchema.userId, userId),
          eq(schema.favoriteProductsSchema.productId, productId),
        ),
      )
      .returning({ id: schema.favoriteProductsSchema.id });

    if (result.length === 0) {
      throw new NotFoundException('This product is not in your favorites');
    }

    await this.invalidateCache(userId);

    return { message: 'Товар удалён из избранного' };
  }

  private async invalidateCache(userId: string): Promise<void> {
    await this.redisService.delete(`favoriteProducts:userId:${userId}`);
  }
}