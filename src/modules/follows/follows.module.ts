// follows.module.ts
import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { ProductModule } from '../product/product.module';
import { RedisModule } from '../redis/redis.module';
import { DrizzleModule } from 'src/database/drizzle.module';

@Module({
  imports: [
    ProductModule,
    DrizzleModule,
    RedisModule,
  ], 
  providers: [FollowsService],
  controllers: [FollowsController],
  exports: [FollowsService],
})
export class FollowsModule {}