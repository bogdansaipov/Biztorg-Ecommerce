import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { createBaseResponseDto } from 'src/helpers/create-base-response.helper';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/shared/request-with-user-type';
import { FollowsService } from './follows.service';
import {
  UserFollowingResponseDto,
  UserFollowingResponseSchema,
} from './dto/follows.dto';
import { MessageResponseDto, MessageResponseSchema } from 'src/utils/zod.schema';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get the current user's following list",
    description:
      "Returns users and shops the authenticated user follows, along with each follow target's most recent products (up to 12).",
  })
  @ApiOkResponse({
    type: createBaseResponseDto(
      UserFollowingResponseSchema,
      'UserFollowingResponseSchema',
    ),
  })
  @ZodSerializerDto(UserFollowingResponseSchema)
  async getMyFollowing(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserFollowingResponseDto> {
    return this.followsService.getUserFollowing(req.user.id);
  }

  @Post('users/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    type: createBaseResponseDto(MessageResponseSchema, 'MessageResponseSchema'),
  })
  @ZodSerializerDto(MessageResponseSchema)
  async followUser(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    return this.followsService.followUser(req.user.id, targetUserId);
  }

  @Delete('users/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    type: createBaseResponseDto(MessageResponseSchema, 'MessageResponseSchema'),
  })
  @ZodSerializerDto(MessageResponseSchema)
  async unfollowUser(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    return this.followsService.unfollowUser(req.user.id, targetUserId);
  }

  @Post('shops/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Follow a shop' })
  @ApiParam({ name: 'shopId', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    type: createBaseResponseDto(MessageResponseSchema, 'MessageResponseSchema'),
  })
  @ZodSerializerDto(MessageResponseSchema)
  async followShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    return this.followsService.followShop(req.user.id, shopId);
  }

  @Delete('shops/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a shop' })
  @ApiParam({ name: 'shopId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    type: createBaseResponseDto(MessageResponseSchema, 'MessageResponseSchema'),
  })
  @ZodSerializerDto(MessageResponseSchema)
  async unfollowShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    return this.followsService.unfollowShop(req.user.id, shopId);
  }
}