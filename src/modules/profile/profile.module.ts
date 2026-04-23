import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from 'src/database/drizzle.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    ConfigModule,
    DrizzleModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService], 
})
export class ProfileModule {}
