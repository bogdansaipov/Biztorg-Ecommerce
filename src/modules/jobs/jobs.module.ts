import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SocialPostProcessor } from './create-social-post.processor';
import { TelegramService } from '../product/telegram.service';
import { FacebookService } from '../product/facebook.service';
import { InstagramService } from '../product/instagram.service';
import { validateEnv } from 'src/config/env/env-validation';
import { DrizzleModule } from 'src/database/drizzle.module';
import { UpdateSocialPostProcessor } from './update-social-post.processor';
import { DeleteSocialPostProcessor } from './delete-social-post.processor';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisModule } from '../redis/redis.module';

const env = validateEnv();

@Module({
  imports: [
    DrizzleModule,
    RedisModule,
    BullModule.forRoot({
      connection: {
        host:  env.REDIS_HOST, 
        port:  env.REDIS_PORT,
      },
    }),
    BullModule.registerQueue({
      name: 'socialPostCreateQueue',
    }, {
      name: 'socialPostUpdateQueue',
    }, {
      name: 'socialPostDeleteQueue',
    }, {
      name: 'notificationQueue',
    }),
  ],
  providers: [
    SocialPostProcessor,
    UpdateSocialPostProcessor,
    DeleteSocialPostProcessor,
    TelegramService,
    FacebookService,
    InstagramService,
    FirebaseService
  ],
  exports: [BullModule],
})
export class JobsModule {}
