import { and, desc, eq, isNull } from 'drizzle-orm';
import { ProductService } from 'src/modules/product/product.service';
import { UserFollowingResponseDto } from './dto/follows.dto';
import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/database/drizzle.provider';
import { RedisService } from '../redis/redis.service';
import * as schema from 'src/database/schema';

type FollowedUserLean = {
  id: string;
  name: string | null;
  phone: string | null;
};

type FollowedShopLean = {
  id: string;
  shopName: string;
  profileUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
};

@Injectable()
export class FollowsService {
  private readonly cacheTTL = 60;
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    private redisService: RedisService,
    private productService: ProductService,
  ) {}

  async getUserFollowing(userId: string): Promise<UserFollowingResponseDto> {
    const cacheKey = `following:userId:${userId}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const follows = await this.db.query.followsSchema.findMany({
      where: eq(schema.followsSchema.followerId, userId),
      orderBy: [desc(schema.followsSchema.createdAt)],
      with: {
        followingUser: {
          columns: { id: true, name: true, phone: true },
        },
        followingShop: {
          columns: {
            id: true,
            shopName: true,
            profileUrl: true,
            bannerUrl: true,
            verified: true,
          },
        },
      },
    });

    const userFollows = follows.filter(
      (f) => f.followingUserId !== null && f.followingUser !== null,
    );
    const shopFollows = follows.filter(
      (f) => f.followingShopId !== null && f.followingShop !== null,
    );

    const [users, shops] = await Promise.all([
      Promise.all(
        userFollows.map(async (f) => ({
          followedAt: f.createdAt.toISOString(),
          user: f.followingUser! as FollowedUserLean,
          products: await this.productService.getUserProducts(
            f.followingUserId!,
            { limit: 12, page: 1 },
          ),
        })),
      ),
      Promise.all(
        shopFollows.map(async (f) => ({
          followedAt: f.createdAt.toISOString(),
          shop: f.followingShop! as FollowedShopLean,
          products: await this.productService.getShopProducts(
            f.followingShopId!,
            { limit: 12, page: 1 },
          ),
        })),
      ),
    ]);

    const response: UserFollowingResponseDto = { users, shops };

    await this.redisService.setWithExpiry(
      cacheKey,
      JSON.stringify(response),
      this.cacheTTL,
    );

    return response;
  }

  async followUser(followerId: string, targetUserId: string) {
  if (followerId === targetUserId) {
    throw new BadRequestException('You cannot follow yourself');
  }

  const target = await this.db.query.usersSchema.findFirst({
    where: and(
      eq(schema.usersSchema.id, targetUserId),
      isNull(schema.usersSchema.deletedAt),
    ),
    columns: { id: true },
  });

  if (!target) {
    throw new NotFoundException('User not found');
  }

  await this.db
    .insert(schema.followsSchema)
    .values({
      followerId,
      followingUserId: targetUserId,
    })
    .onConflictDoNothing(); 

  await this.invalidateCache(followerId);

  return { message: 'Успешно подписались на профиль' };
}

async unfollowUser(followerId: string, targetUserId: string) {
  const result = await this.db
    .delete(schema.followsSchema)
    .where(and(
      eq(schema.followsSchema.followerId, followerId),
      eq(schema.followsSchema.followingUserId, targetUserId),
    ))
    .returning({ id: schema.followsSchema.id });

  if (result.length === 0) {
    throw new NotFoundException('You were not following this user');
  }

  await this.invalidateCache(followerId);

  return {message: 'Успешно отписались от профиля' };
}

async followShop(followerId: string, shopId: string) {
  const shop = await this.db.query.shopProfilesSchema.findFirst({
    where: and(
      eq(schema.shopProfilesSchema.id, shopId),
      isNull(schema.shopProfilesSchema.deletedAt),
    ),
    columns: { id: true, userId: true },
  });

  if (!shop) {
    throw new NotFoundException('Shop not found');
  }

  if (shop.userId === followerId) {
    throw new BadRequestException('You cannot follow your own shop');
  }

  await this.db
    .insert(schema.followsSchema)
    .values({
      followerId,
      followingShopId: shopId,
    })
    .onConflictDoNothing();   // ← idempotent

  await this.invalidateCache(followerId);

  return { message: 'Успешно подписались на магазин' };
}

async unfollowShop(followerId: string, shopId: string) {
  const result = await this.db
    .delete(schema.followsSchema)
    .where(and(
      eq(schema.followsSchema.followerId, followerId),
      eq(schema.followsSchema.followingShopId, shopId),
    ))
    .returning({ id: schema.followsSchema.id });

  if (result.length === 0) {
    throw new NotFoundException('You were not following this shop');
  }

  await this.invalidateCache(followerId);

  return { message: 'Успешно отписались от магазина' };
}

private async invalidateCache(followerId: string): Promise<void> {
  await this.redisService.delete(`following:userId:${followerId}`);
}
}