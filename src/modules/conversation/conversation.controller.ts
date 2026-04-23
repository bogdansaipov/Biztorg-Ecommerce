// import {
//   Controller,
//   Get,
//   HttpCode,
//   HttpStatus,
//   Req,
//   UseGuards,
// } from '@nestjs/common';
// import {
//   ApiOperation,
//   ApiOkResponse,
//   ApiBearerAuth,
// } from '@nestjs/swagger';
// import { ZodSerializerDto } from 'nestjs-zod';
// import { createBaseResponseDto } from 'src/helpers/create-base-response.helper';
// import { ConversationService } from './conversation.service';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { ConversationItemsArrayResponseSchema } from './dto/coversation.dto';
// import type { AuthenticatedRequest } from 'src/shared/request-with-user-type';

// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
// @Controller('conversations')
// export class ConversationController {
//   constructor(private readonly conversationService: ConversationService) {}

//   @Get()
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Get all chats of the authenticated user' })
//   @ApiOkResponse({
//     type: createBaseResponseDto(
//       ConversationItemsArrayResponseSchema,
//       'ConversationItemsArrayResponseSchema',
//     ),
//   })
//   @ZodSerializerDto(ConversationItemsArrayResponseSchema)
//   async getChats(@Req() req: AuthenticatedRequest) {
//     return this.conversationService.getChats(req.user.id);
//   }
// }