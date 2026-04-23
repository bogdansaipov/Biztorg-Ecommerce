// import {
//   Controller,
//   Post,
//   Get,
//   Body,
//   Param,
//   UseGuards,
//   Req,
//   UploadedFile,
//   UseInterceptors,
//   BadRequestException,
//   HttpCode,
//   HttpStatus,
//   ForbiddenException,
//   NotFoundException,
//   Res,
//   Put,
// } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { extname, join } from 'path';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { MessageService } from './message.service';
// import { CreateMessageRequestDto, ImageMessageResponseDto, ImageMessageResponseSchema, MessageArrayResponseDto, MessageArrayResponseSchema, MessageSingleResponseDto, MessageSingleResponseSchema, UpdateMessageRequestDto } from './dto/message.dto';
// import { ApiOperation, ApiConsumes, ApiBody, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
// import type { AuthenticatedRequest } from 'src/shared/request-with-user-type';
// import { existsSync } from 'fs';
// import type { Response } from 'express';
// import { createBaseResponseDto } from 'src/helpers/create-base-response.helper';
// import { ZodSerializerDto } from 'nestjs-zod';

// @ApiBearerAuth()
// @Controller('messages')
// @UseGuards(JwtAuthGuard)
// export class MessageController {
//   constructor(private readonly messageService: MessageService) {}

//   @Post()
//   @HttpCode(HttpStatus.CREATED)
//   @ApiBody({type: CreateMessageRequestDto})
//   @ApiOperation({ summary: 'Send message (text or image_url)' })
//   @ApiCreatedResponse({
//       type: createBaseResponseDto(
//         MessageSingleResponseSchema,
//         'MessageSingleResponseSchema',
//       ),
//     })
//   @ZodSerializerDto(MessageSingleResponseSchema)
//   async sendMessage(@Req() req: AuthenticatedRequest, @Body() body: CreateMessageRequestDto): Promise<MessageSingleResponseDto> {
//     const userId = req.user.id;
//     return this.messageService.sendMessage(userId, body);
//   }

//   @Get(':receiverId')
//   @ApiOperation({ summary: 'Fetch conversation messages between two users' })
//   @ApiCreatedResponse({
//       type: createBaseResponseDto(
//         MessageArrayResponseSchema,
//         'MessageArrayResponseSchema',
//       ),
//     })
//   @ZodSerializerDto(MessageArrayResponseSchema)
//   async getMessages(@Req() req: AuthenticatedRequest, @Param('receiverId') receiverId: string): Promise<MessageArrayResponseDto> {
//     const senderId = req.user.id;
//     return this.messageService.getMessages(senderId, receiverId);
//   }

//   @Post('upload')
//   @HttpCode(HttpStatus.OK)
//   @ApiConsumes('multipart/form-data')
//   @ApiOperation({ summary: 'Upload chat image' })
//    @ApiCreatedResponse({
//       type: createBaseResponseDto(
//         ImageMessageResponseSchema,
//         'ImageMessageResponseSchema',
//       ),
//     })
//     @ZodSerializerDto(ImageMessageResponseSchema)
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         image: { type: 'string', format: 'binary' },
//       },
//       required: ['image'],
//     },
//   })
//   @UseInterceptors(
//     FileInterceptor('image', {
//       storage: diskStorage({
//         destination: './private/chat_images',
//         filename: (req, file, cb) => {
//           const uniqueSuffix =
//             Date.now() + '-' + Math.round(Math.random() * 1e9);
//           cb(null, uniqueSuffix + extname(file.originalname));
//         },
//       }),
//       limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
//       fileFilter: (req, file, cb) => {
//         if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp|gif)$/)) {
//           return cb(
//             new BadRequestException('Only image files are allowed'),
//             false,
//           );
//         }
//         cb(null, true);
//       },
//     }),
//   )
//   async uploadChatImage(@UploadedFile() image: Express.Multer.File, @Req() req: AuthenticatedRequest): Promise<ImageMessageResponseDto> {
//     if (!image) {
//       throw new BadRequestException('Image file is required');
//     }

//    const imageUrl = `/messages/image/${image.filename}`;

//    await this.messageService.registerTempUpload(image.filename, req.user.id)

//     return { filename: image.filename, imageUrl: imageUrl};
//   }

//   @Put('edit')
//   @HttpCode(HttpStatus.OK)
//   @ApiBody({type: UpdateMessageRequestDto})
// @ApiOperation({ summary: 'Edit a message (only sender can edit)' })
//  @ApiCreatedResponse({
//       type: createBaseResponseDto(
//         MessageSingleResponseSchema,
//         'MessageSingleResponseSchema',
//       ),
//     })
//     @ZodSerializerDto(MessageSingleResponseSchema)
// async editMessage(
//   @Req() req: AuthenticatedRequest,
//   @Body() body: UpdateMessageRequestDto,
// ): Promise<MessageSingleResponseDto> {
//   const userId = req.user.id;

//   return this.messageService.editMessage(userId, body);
// }

//   @Get('image/:filename')
// @ApiOperation({ summary: 'Get private chat image (authorized only)' })
// async getPrivateImage(
//   @Param('filename') filename: string,
//   @Req() req: AuthenticatedRequest,
//   @Res() res: Response,
// ) {
//   const userId = req.user.id;

//   const canAccess = await this.messageService.canAccessImage(userId, filename);
//   if (!canAccess) {
//     throw new ForbiddenException('You are not allowed to view this image');
//   }

//   const filePath = join(process.cwd(), 'private', 'chat_images', filename);

//   if (!existsSync(filePath)) {
//     throw new NotFoundException('Image not found');
//   }

//   res.setHeader('Cache-Control', 'private, max-age=31536000');
//   return res.sendFile(filePath);
// }

// }