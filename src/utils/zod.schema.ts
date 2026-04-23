import { createZodDto } from 'nestjs-zod/dto';
import * as z from 'zod'

const enum UserRoleEnum {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SHOP_OWNER = 'SHOP_OWNER',
}

const enum CurrencyEnum {
  UZS = 'UZS',
  USD = 'USD',
}

const enum ProductType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
}

const enum PriorityType {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export const enum ConversationTypeEnum {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  PUBLIC = 'PUBLIC',
}

export const enum ParticipantRoleEnum {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER', 
}

export const enum MessageTypeEnum {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export const enum NotificationTypeEnum {
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_PRODUCT_POSTED = 'NEW_PRODUCT_POSTED', // new product posted from shop owner subscribed to
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
}

export const enum ShopMemberRoleEnum {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR', 
}

//base schema
const BaseSchema = z.object({
  id: z.string().uuid().describe('Primary key'),
  createdAt: z.coerce.date().describe("Time it was created"),
  updatedAt: z.coerce.date().describe("Time it was updated"),
  deletedAt: z.coerce.date().nullable().describe("Time it was deleted"),
});

const BaseSchemaForSwagger = z.object({
  id: z.uuid().describe('Primary key'),
  createdAt: z.iso.datetime().describe("Time it was created"),
  updatedAt: z.iso.datetime().describe("Time it was updated"),
  deletedAt: z.iso.datetime().nullable().describe("Time it was deleted"),
});

type BaseSchemaType = z.infer<typeof BaseSchema>;

const UserSchema = z
  .object({
    email: z.email().describe('User email account').nullable().optional(),
    name: z.string().describe("User name").nullable().optional(),
    phone: z.string().nullable().optional().describe('Phone number of user'),
    role: z
      .enum([UserRoleEnum.USER, UserRoleEnum.ADMIN, UserRoleEnum.SHOP_OWNER])
      .describe("Role might be either 'USER', 'SHOP_OWNER' or 'ADMIN'"),
    emailVerified: z.boolean().default(false).describe("Whether the user email is verified or not"),
    isSuspended: z
      .boolean()
      .default(false)
      .describe('Whether the user is suspended (cannot perform actions)'),
  })
  .extend(BaseSchemaForSwagger.shape);

type UserSchemaType = z.infer<typeof UserSchema>

const MessageSchema = z.object({
  conversationId: z.uuid().describe('Conversation ID'),
  senderId: z.uuid().nullable().optional().describe('Sender ID (null if user deleted)'),
  type: z
    .enum([MessageTypeEnum.TEXT, MessageTypeEnum.IMAGE, MessageTypeEnum.SYSTEM])
    .default(MessageTypeEnum.TEXT)
    .describe('Message type'),
  content: z.string().nullable().optional().describe('Text content of the message'),
  imageUrl: z.string().nullable().optional().describe('Image URL if message is an image'),
  replyToMessageId: z.uuid().nullable().optional().describe('ID of the message being replied to'),
  editedAt: z.iso.datetime().nullable().optional().describe('When the message was last edited'),
}).extend(BaseSchemaForSwagger.shape);

type MessageSchemaType = z.infer<typeof MessageSchema>;

const ProfileSchema = z.object({
  userId: z.uuid().describe('User id'),
  googleId: z.string().nullable().optional().describe('User account google id'),
  facebookId: z.string().nullable().optional().describe('User account facebook id'),
  fcmToken: z.string().nullable().optional().describe('User fcm token for notifications'),
  regionId: z.string().nullable().optional().describe("User region id")
}).extend(BaseSchemaForSwagger.shape)

type ProfileSchemaType = z.infer<typeof ProfileSchema>

const ShopProfileSchema = z.object({
  userId: z.uuid().describe('Owner user ID'),
  shopName: z.string().describe('Name of the shop'),
  description: z.string().nullable().optional().describe('Shop description'),
  taxIdNumber: z.string().nullable().optional().describe('Tax ID number'),
  contactName: z.string().nullable().optional().describe('Contact person name'),
  address: z.string().nullable().optional().describe('Shop address'),
  phone: z.string().describe('Phone number'),
  bannerUrl: z.string().nullable().optional().describe('Banner image URL'),
  profileUrl: z.string().nullable().optional().describe('Profile image URL'),
  facebookLink: z.string().nullable().optional().describe('Facebook link'),
  telegramLink: z.string().nullable().optional().describe('Telegram link'),
  instagramLink: z.string().nullable().optional().describe('Instagram link'),
  website: z.string().nullable().optional().describe('Website link'),
  verified: z.boolean().default(false).describe('Whether the shop is verified'),
  latitude: z.number().nullable().optional().describe('Latitude'),
  longitude: z.number().nullable().optional().describe('Longitude'),
}).extend(BaseSchemaForSwagger.shape);

type ShopProfileSchemaType = z.infer<typeof ShopProfileSchema>;

// For endpoints that return shop + computed stats
export const ShopProfileWithStatsSchema = ShopProfileSchema.extend({
  rating: z.number().default(0).describe('Average rating (computed)'),
  totalReviews: z.number().int().default(0).describe('Number of reviews (computed)'),
  subscribers: z.number().int().default(0).describe('Number of subscribers (computed)'),
});

export type ShopProfileWithStatsSchemaType = z.infer<typeof ShopProfileWithStatsSchema>;

export const NotificationSchema = z.object({
  receiverId: z.uuid().describe('User ID who receives the notification'),
  senderId: z.uuid().nullable().optional().describe('User ID who triggered the notification'),
  type: z
    .enum([
      NotificationTypeEnum.NEW_MESSAGE,
      NotificationTypeEnum.NEW_PRODUCT_POSTED,
      NotificationTypeEnum.NEW_FOLLOWER,
      NotificationTypeEnum.PRODUCT_APPROVED,
      NotificationTypeEnum.PRODUCT_REJECTED,
    ])
    .describe('Type of the notification'),
  productId: z.uuid().nullable().optional().describe('Related product ID'),
  messageId: z.uuid().nullable().optional().describe('Related message ID'),
  conversationId: z.uuid().nullable().optional().describe('Related conversation ID'),
  metadata: z
    .record(z.string(), z.any())
    .nullable()
    .optional()
    .describe('Snapshot data for rendering (e.g. productName, senderName)'),
  priority: z
    .enum([PriorityType.HIGH, PriorityType.MEDIUM, PriorityType.LOW])
    .default(PriorityType.MEDIUM)
    .describe('Priority level'),
  readAt: z.iso.datetime().nullable().optional().describe('When the notification was read (null = unread)'),
  expiresAt: z.iso.datetime().nullable().optional().describe('When this notification expires'),
}).extend(BaseSchemaForSwagger.shape);

export type NotificationSchemaType = z.infer<typeof NotificationSchema>;

export const ConversationSchema = z.object({
  type: z.enum([
    ConversationTypeEnum.DIRECT,
    ConversationTypeEnum.GROUP,
    ConversationTypeEnum.PUBLIC,
  ]).describe('Conversation type'),
  name: z.string().nullable().optional().describe('Name (group/public only)'),
  description: z.string().nullable().optional().describe('Description (group/public only)'),
  imageUrl: z.string().nullable().optional().describe('Avatar image URL'),
  createdBy: z.uuid().nullable().optional().describe('Creator user ID'),
  lastMessageAt: z.iso.datetime().nullable().optional().describe('Timestamp of last message'),
}).extend(BaseSchemaForSwagger.shape);

export type ConversationSchemaType = z.infer<typeof ConversationSchema>;

export const ConversationParticipantSchema = z.object({
  conversationId: z.uuid(),
  userId: z.uuid(),
  role: z.enum([
    ParticipantRoleEnum.OWNER,
    ParticipantRoleEnum.ADMIN,
    ParticipantRoleEnum.MEMBER,
  ]),
  joinedAt: z.iso.datetime(),
  leftAt: z.iso.datetime().nullable().optional(),
  lastReadMessageId: z.uuid().nullable().optional(),
  isMuted: z.boolean(),
}).extend(BaseSchemaForSwagger.shape);

// Represents a conversation as displayed in the user's chat list
export const ConversationListItemSchema = z.object({
  id: z.uuid(),
  type: z.enum([
    ConversationTypeEnum.DIRECT,
    ConversationTypeEnum.GROUP,
    ConversationTypeEnum.PUBLIC,
  ]),
  name: z.string().nullable().optional().describe('Chat name (group/public) OR other user name (DM)'),
  imageUrl: z.string().nullable().optional().describe('Chat avatar or other user avatar'),
  lastMessage: z.object({
    content: z.string().nullable().optional(),
    type: z.enum([MessageTypeEnum.TEXT, MessageTypeEnum.IMAGE, MessageTypeEnum.SYSTEM]),
    createdAt: z.iso.datetime(),
    senderId: z.uuid().nullable().optional(),
  }).nullable().optional().describe('Last message in the conversation'),
  unreadCount: z.number().int().default(0).describe('Number of unread messages'),
  isMuted: z.boolean().default(false),
  participantCount: z.number().int().describe('Total number of participants'),

  // DM-specific: details about the other participant
  otherUser: z.object({
    id: z.uuid(),
    name: z.string().nullable().optional(),
    profile: ProfileSchema.nullable().optional(),
    shopProfile: ShopProfileSchema.nullable().optional(),
    isShop: z.boolean(),
    isSubscribedByMe: z.boolean(),
    hasRatedByMe: z.boolean(),
  }).nullable().optional().describe('Other user details (DMs only)'),
});

export type ConversationListItemSchemaType = z.infer<typeof ConversationListItemSchema>;

const RegionSchema = z.object({
  name: z.string().describe('Region name'),
  parentId: z.uuid().nullable().optional().describe('Region parent id'),
  slug: z.string().describe('Region slugname'),
}).extend(BaseSchemaForSwagger.shape)

type RegionSchemaType = z.infer<typeof RegionSchema>

const CategorySchema = z.object({
  name: z.string().describe('Category name'),
  parentId: z.uuid().nullable().optional().describe('Parent category id'),
  slug: z.string().describe('Category slug name'),
  imageUrl: z.string().nullable().optional().describe('Category url of image'),
}).extend(BaseSchemaForSwagger.shape);

type CategorySchemaType = z.infer<typeof CategorySchema>

export const AttributeValueSchema = z.object({
  id: z.uuid(),
  value: z.string(),
  slug: z.string(),
});

export type AttributeValueSchemaType = z.infer<typeof AttributeValueSchema>

export const AttributeWithValuesSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  values: AttributeValueSchema.array(),
});

export type AttributeWithValuesSchemaType = z.infer<typeof AttributeWithValuesSchema>

export const AttributeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
});

export const CreateAttributeSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

export const AttachAttributeToCategorySchema = z.object({
  categoryId: z.uuid(),
  attributeId: z.uuid(),
});


export const AttachValueToAttributeSchema = z.object({
  attributeId: z.uuid(),
  attributeValueId: z.uuid(),
});

export const CreateAttributeValueSchema = z.object({
  value: z.string(),
  slug: z.string(),
});

const ProductSchema = z.object({
  categoryId: z.uuid(),
  userId: z.uuid(),
  regionId: z.uuid(),

  name: z.string(),
  slug: z.string(),
  description: z.string(),

  price: z.string().nullable().optional(),
  currency: z
    .enum([CurrencyEnum.USD, CurrencyEnum.UZS])
    .nullable()
    .optional(),

  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),

  isUrgent: z.coerce.boolean().default(false),
  enableTelegram: z.coerce.boolean().default(true),

  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),

  facebookPostId: z.string().nullable().optional(),
  telegramPostId: z.string().nullable().optional(),
  instagramPostId: z.string().nullable().optional(),
}).extend(BaseSchemaForSwagger.shape);

type ProductSchemaType = z.infer<typeof ProductSchema>

const PaginationResponseSchema = z
  .object({
    limit: z.number().int().min(1).max(100),
    page: z.number().int().min(1),
    total: z.number().int().min(0),
    pages: z.number().int().min(0),
  })
  .describe('Pagination response schema');

const PaginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    page: z.coerce.number().int().min(1).default(1),
  })
  .describe('Pagination query schema');

// interceptors and filters
const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema?: T) =>
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: dataSchema ? dataSchema.optional() : z.any().optional(),
    timestamp: z.string(),
  });

type SuccessResponseSchemaType<T = z.ZodTypeAny> = z.infer<
  ReturnType<typeof SuccessResponseSchema<z.ZodType<T>>>
>;

const ErrorDetailsSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

type ErrorDetailsSchemaType = z.infer<typeof ErrorDetailsSchema>;

const BaseErrorResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: dataSchema.nullable(),
    errors: z.array(ErrorDetailsSchema).nullable().optional(),
    timestamp: z.string(),
    path: z.string(),
  });

type BaseErrorResponseSchemaType = z.infer<
  ReturnType<typeof BaseErrorResponseSchema<z.ZodTypeAny>>
>;

const DatabaseErrorSchema = z.object({
  code: z.string().optional(),
  constraint: z.string().optional(),
  detail: z.string().optional(),
  table: z.string().optional(),
  column: z.string().optional(),
});

type DatabaseErrorSchemaType = z.infer<typeof DatabaseErrorSchema>;


export const MessageResponseSchema = z.object({
  message: z.string().describe('Operation result message'),
}).describe('Simple message response');

export class MessageResponseDto extends createZodDto(MessageResponseSchema) {}

export {
    BaseSchema,
    type BaseSchemaType,
    UserRoleEnum,
    ProductType,
    CurrencyEnum,
    PriorityType,
    UserSchema,
    type UserSchemaType,
    SuccessResponseSchema,
    type SuccessResponseSchemaType,
    ErrorDetailsSchema,
    type ErrorDetailsSchemaType,
    BaseErrorResponseSchema,
    type BaseErrorResponseSchemaType,
    DatabaseErrorSchema,
    type DatabaseErrorSchemaType,
    CategorySchema,
    type CategorySchemaType,
    PaginationResponseSchema,
    BaseSchemaForSwagger,
    PaginationQuerySchema,
    ProfileSchema,
    type ProfileSchemaType,
    RegionSchema,
    type RegionSchemaType,
    ProductSchema,
    type ProductSchemaType,
    MessageSchema,
    type MessageSchemaType,
    ShopProfileSchema,
    type ShopProfileSchemaType,
}