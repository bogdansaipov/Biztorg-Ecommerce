// import {
//   Controller,
//   Get,
//   Put,
//   Param,
//   Req,
//   HttpCode,
//   HttpStatus,
//   UseGuards,
//   NotFoundException,
// } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiOperation,
//   ApiOkResponse,
//   ApiTags,
//   ApiParam,
// } from '@nestjs/swagger';
// import { ZodSerializerDto } from 'nestjs-zod';
// import { createBaseResponseDto } from 'src/helpers/create-base-response.helper';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { NotificationsService } from './notification.service';
// import {
//   NotificationArrayResponseSchema,
//   NotificationArrayResponseDto,
// } from './dto/notification.dto';
// import type { AuthenticatedRequest } from 'src/shared/request-with-user-type';

// @ApiBearerAuth()
// @ApiTags('Notifications')
// @Controller('notifications')
// @UseGuards(JwtAuthGuard)
// export class NotificationsController {
//   constructor(private readonly notificationsService: NotificationsService) {}

//   @Get()
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Get all unseen notifications for the current user' })
//   @ApiOkResponse({
//     type: createBaseResponseDto(NotificationArrayResponseSchema, 'NotificationArrayResponseSchema'),
//   })
//   @ZodSerializerDto(NotificationArrayResponseSchema)
//   async getUserNotifications(
//     @Req() req: AuthenticatedRequest,
//   ): Promise<NotificationArrayResponseDto> {
//     return this.notificationsService.getUserNotifications(req.user.id);
//   }

//   @Put('mark-all-seen')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Mark all notifications as seen for the current user' })
//   async markAllAsSeen(@Req() req: AuthenticatedRequest) {
//     return this.notificationsService.markAllAsSeen(req.user.id);
//   }

//   @Put('mark-chat-seen/:otherUserId')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Mark all chat notifications as seen between two users' })
//   @ApiParam({ name: 'otherUserId', type: 'string', example: 'uuid-v4' })
//   async markChatNotificationsAsSeen(
//     @Param('otherUserId') otherUserId: string,
//     @Req() req: AuthenticatedRequest,
//   ) {
//     if (!otherUserId) {
//       throw new NotFoundException('Other user ID is required');
//     }

//     return this.notificationsService.markChatNotificationsAsSeen(req.user.id, otherUserId);
//   }
// }