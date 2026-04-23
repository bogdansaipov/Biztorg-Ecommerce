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
import { FavoritesService } from './favorites.service';
import {
  MessageResponseDto,
  MessageResponseSchema,
} from 'src/utils/zod.schema';
import {
  UserProductsArrayResponseDto,
  UserProductsArrayResponseSchema,
} from '../product/dto/product.dto';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get the current user's favorite products",
    description: "Returns all products the authenticated user has favorited.",
  })
  @ApiOkResponse({
    type: createBaseResponseDto(
      UserProductsArrayResponseSchema,
      'UserProductsArrayResponseSchema',
    ),
  })
  @ZodSerializerDto(UserProductsArrayResponseSchema)
  async getMyFavorites(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserProductsArrayResponseDto> {
    return this.favoritesService.getUserFavorites(req.user.id);
  }

  @Post(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a product to favorites' })
  @ApiParam({ name: 'productId', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    type: createBaseResponseDto(MessageResponseSchema, 'MessageResponseSchema'),
  })
  @ZodSerializerDto(MessageResponseSchema)
  async addFavorite(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    return this.favoritesService.addFavorite(req.user.id, productId);
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product from favorites' })
  @ApiParam({ name: 'productId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    type: createBaseResponseDto(MessageResponseSchema, 'MessageResponseSchema'),
  })
  @ZodSerializerDto(MessageResponseSchema)
  async removeFavorite(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    return this.favoritesService.removeFavorite(req.user.id, productId);
  }
}