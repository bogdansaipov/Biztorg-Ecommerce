import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { RedisModule } from '../redis/redis.module';
import { DrizzleModule } from 'src/database/drizzle.module';

@Module({
  imports: [
    DrizzleModule,
    RedisModule,
  ],
  providers: [FavoritesService],
  controllers: [FavoritesController],
  exports: [FavoritesService],
})
export class FavoritesModule {}