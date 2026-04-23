import { relations, sql } from 'drizzle-orm';
import { doublePrecision } from 'drizzle-orm/pg-core';
import { jsonb } from 'drizzle-orm/pg-core';
import { numeric } from 'drizzle-orm/pg-core';
import { uniqueIndex, customType } from 'drizzle-orm/pg-core';
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  decimal,
  uuid,
  varchar,
  check,
} from 'drizzle-orm/pg-core';
import { UserRoleEnum, CurrencyEnum, ProductType, UserSchema, PriorityType, ConversationTypeEnum, ParticipantRoleEnum, MessageTypeEnum, NotificationTypeEnum, ShopMemberRoleEnum } from 'src/utils/zod.schema';

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// enums
export const DrizzleUserRoleEnum = pgEnum('user_role', [
    UserRoleEnum.ADMIN,
    UserRoleEnum.USER,
    UserRoleEnum.SHOP_OWNER
]);

export const DrizzleCurrencyEnum = pgEnum('currency', [
    CurrencyEnum.USD,
    CurrencyEnum.UZS
]);

export const DrizzleProductType = pgEnum('product_type', [
    ProductType.PURCHASE,
    ProductType.SALE
]);

export const DrizzlePriorityEnum = pgEnum('priority_type', [
  PriorityType.HIGH,
  PriorityType.MEDIUM,
  PriorityType.LOW
]);

export const DrizzleConversationTypeEnum = pgEnum('conversation_type', [
   ConversationTypeEnum.DIRECT, // 1-on-1 DM
    ConversationTypeEnum.GROUP, // private group (invite only)
    ConversationTypeEnum.PUBLIC // public room (anyone can join)
]);

export const DrizzleParticipantRoleEnum = pgEnum('participant_role', [
  ParticipantRoleEnum.OWNER,    // creator, full control
  ParticipantRoleEnum.ADMIN,    // can moderate
  ParticipantRoleEnum.MEMBER   // regular participant
]);

export const DrizzleMessageTypeEnum = pgEnum('message_type', [
  MessageTypeEnum.TEXT,
  MessageTypeEnum.IMAGE,
  MessageTypeEnum.SYSTEM,  // 'SYSTEM' = "Alice joined the chat"
]);

export const DrizzleNotificationTypeEnum = pgEnum('notification_type', [
  NotificationTypeEnum.NEW_MESSAGE,
  NotificationTypeEnum.NEW_PRODUCT_POSTED, // new product posted from shop owner subscribed to
  NotificationTypeEnum.NEW_FOLLOWER,
  NotificationTypeEnum.PRODUCT_APPROVED,
  NotificationTypeEnum.PRODUCT_REJECTED,
]);

export const DrizzleShopMemberRoleEnum = pgEnum('shop_member_role', [
  ShopMemberRoleEnum.OWNER,
  ShopMemberRoleEnum.ADMIN,
  ShopMemberRoleEnum.EDITOR,
]);

// schemas
const baseSchema = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
};

export const usersSchema = pgTable('users', {
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  phone: varchar('phone', { length: 20 }).unique(),
  name: text('name'),
  role: DrizzleUserRoleEnum('role').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  isSuspended: boolean('is_suspended').notNull().default(false),
  ...baseSchema,
});

export const profilesSchema = pgTable('profiles', {
    userId: uuid('user_id').notNull().references(() => usersSchema.id, {
        onDelete: 'cascade',
    }),
    googleId: text('google_id'),
    facebookId: text('facebook_id'),
    fcmToken: text('fcm_token'),
    regionId: uuid('region_id').references(() => regionsSchema.id),
   ...baseSchema,
}, (table) => [
  index("profiles_user_idx").on(table.userId),
]);

export const tempPhoneCredentialsSchema = pgTable('temp_phone_credentials', {
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  requestId: varchar('request_id', {length: 255}).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...baseSchema
})

export const conversationsSchema = pgTable('conversations', {
  type: DrizzleConversationTypeEnum('type').default(ConversationTypeEnum.DIRECT).notNull(),
  name: varchar('name', { length: 255 }),          // for group/public only
  description: text('description'),                // for group/public only
  imageUrl: varchar('image_url', { length: 255 }), // chat avatar
  createdBy: uuid('created_by').references(() => usersSchema.id, { onDelete: 'set null' }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  ...baseSchema,
}, (table) => [
  index('conversations_type_idx').on(table.type),
  index('conversations_last_message_idx').on(table.lastMessageAt),
]);

export const conversationParticipantsSchema = pgTable('conversation_participants', {
  conversationId: uuid('conversation_id').notNull()
    .references(() => conversationsSchema.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  role: DrizzleParticipantRoleEnum('role').notNull().default(ParticipantRoleEnum.MEMBER),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp('left_at', { withTimezone: true }),
  lastReadMessageId: uuid('last_read_message_id'),
  isMuted: boolean('is_muted').default(false).notNull(),
  ...baseSchema,
}, (table) => [
  uniqueIndex('conversation_participants_unique').on(table.conversationId, table.userId),
  index('conversation_participants_user_idx').on(table.userId),
  index('conversation_participants_convo_idx').on(table.conversationId),
]);

export const messagesSchema = pgTable('messages', {
  conversationId: uuid('conversation_id').notNull()
    .references(() => conversationsSchema.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .references(() => usersSchema.id, { onDelete: 'set null' }),
  type: DrizzleMessageTypeEnum('type').notNull().default(MessageTypeEnum.TEXT),
  content: text('content'),
  imageUrl: varchar('image_url', { length: 255 }),
  replyToMessageId: uuid('reply_to_message_id'),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  ...baseSchema,
}, (table) => [
  index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  index('messages_sender_idx').on(table.senderId),
  check('messages_has_content', sql`
  (${table.type} = 'SYSTEM') OR
  (${table.content} IS NOT NULL OR ${table.imageUrl} IS NOT NULL)
`),
]);

export const notificationsSchema = pgTable('notifications', {
  receiverId: uuid('receiver_id')
    .notNull()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .references(() => usersSchema.id, { onDelete: 'set null' }),
  type: DrizzleNotificationTypeEnum('type').notNull(),
  productId: uuid('product_id')
    .references(() => productsSchema.id, { onDelete: 'set null' }),
  messageId: uuid('message_id')
    .references(() => messagesSchema.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .references(() => conversationsSchema.id, { onDelete: 'cascade' }),
  // e.g. { productName, productImageUrl, senderName, messagePreview, rejectionReason }
  metadata: jsonb('metadata'),
  priority: DrizzlePriorityEnum('priority').default(PriorityType.MEDIUM).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...baseSchema,
}, (table) => [
  index('notifications_receiver_unread_idx')
    .on(table.receiverId, table.readAt, table.createdAt),
  index('notifications_expires_idx').on(table.expiresAt),
  index('notifications_product_idx').on(table.productId),
]);


export const shopProfilesSchema = pgTable('shop_profiles', {
  userId: uuid('user_id').notNull()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  shopName: varchar('shop_name', { length: 255 }).notNull(),
  description: text('description'),
  taxIdNumber: varchar('tax_id_number', { length: 255 }),
  contactName: varchar('contact_name', { length: 255 }),
  address: varchar('address', { length: 255 }),
  phone: varchar('phone', { length: 50 }).notNull(),
  bannerUrl: varchar('banner_url', { length: 255 }),
  profileUrl: varchar('profile_url', { length: 255 }),
  facebookLink: varchar('facebook_link', { length: 255 }),
  telegramLink: varchar('telegram_link', { length: 255 }),
  instagramLink: varchar('instagram_link', { length: 255 }),
  website: varchar('website', { length: 255 }),
  verified: boolean('verified').default(false).notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  ...baseSchema,
}, (table) => [
  index('shop_profiles_user_idx').on(table.userId),
  index('shop_profiles_verified_idx').on(table.verified),
]);

export const shopMembersSchema = pgTable('shop_members', {
  shopId: uuid('shop_id').notNull()
    .references(() => shopProfilesSchema.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  role:DrizzleShopMemberRoleEnum('role').notNull(),
  invitedBy: uuid('invited_by').references(() => usersSchema.id, { onDelete: 'set null' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  ...baseSchema,
}, (table) => [
  uniqueIndex('shop_members_unique').on(table.shopId, table.userId),
  index('shop_members_user_idx').on(table.userId),
  index('shop_members_shop_idx').on(table.shopId),
]);

export const followsSchema = pgTable('follows', {
  followerId: uuid('follower_id').notNull()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  followingUserId: uuid('following_user_id')
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  followingShopId: uuid('following_shop_id')
    .references(() => shopProfilesSchema.id, { onDelete: 'cascade' }),
  ...baseSchema,
}, (table) => [
  uniqueIndex('follows_user_unique')
    .on(table.followerId, table.followingUserId)
    .where(sql`${table.followingUserId} IS NOT NULL`),
  uniqueIndex('follows_shop_unique')
    .on(table.followerId, table.followingShopId)
    .where(sql`${table.followingShopId} IS NOT NULL`),

  index('follows_following_user_idx').on(table.followingUserId),
  index('follows_following_shop_idx').on(table.followingShopId),
  index('follows_follower_idx').on(table.followerId),

  check('follows_exactly_one_target', sql`
    (${table.followingUserId} IS NULL) <> (${table.followingShopId} IS NULL)
  `),
  check('follows_not_self_user', sql`
    ${table.followingUserId} IS NULL OR ${table.followerId} <> ${table.followingUserId}
  `),
]);

export const shopRatingsSchema = pgTable('shop_ratings', {
  userId: uuid('user_id').notNull()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  shopProfileId: uuid('shop_profile_id').notNull()
    .references(() => shopProfilesSchema.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  ...baseSchema,
}, (table) => [
  uniqueIndex('unique_user_shop_rating').on(table.userId, table.shopProfileId),
  index('shop_ratings_shop_idx').on(table.shopProfileId),
  check('shop_ratings_rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
]);

export const regionsSchema = pgTable('regions', {
    name: text('name').notNull(),
    parentId: uuid('parent_id'),
    slug: text('slug').unique().notNull(),
    ...baseSchema
},

(table) => [
  index("regions_parent_idx").on(table.parentId)
]
)

export const categoriesSchema = pgTable('categories', {
    parentId: uuid('parent_id').references(() => categoriesSchema.id, {
        onDelete: 'cascade',
    }),

    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    imageUrl: text('image_url'),

    ...baseSchema,
},

(table) => [
    index("categories_parent_idx").on(table.parentId)
]
)

export const productsSchema = pgTable('products', {
    categoryId: uuid('category_id')
        .notNull()
        .references(() => categoriesSchema.id),
    userId: uuid('user_id').notNull().references(() => usersSchema.id),
    shopId: uuid('shop_id')
    .references(() => shopProfilesSchema.id),
    regionId: uuid('region_id').notNull().references(() => regionsSchema.id),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    price: decimal('price'),
    currency: DrizzleCurrencyEnum('currency'),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    isUrgent: boolean('is_urgent').notNull().default(false),
    contactName: text('contact_name'),
    contactPhone: text('contact_phone'),
    enableTelegram: boolean('enable_telegram').notNull().default(true),


    facebookPostId: varchar("facebook_post_id", { length: 255 }),
    telegramPostId: varchar("telegram_post_id", { length: 255 }),
    instagramPostId: varchar("instagram_post_id", { length: 255 }),

    ...baseSchema,
    searchVector: tsvector("search_vector"),
},

(table) => [
    index('products_category_idx').on(table.categoryId),
    index('products_region_idx').on(table.regionId),
    index('products_user_idx').on(table.userId),
    index('products_price_idx').on(table.price),
    index('products_urgent_idx').on(table.isUrgent),
    index('products_shop_idx').on(table.shopId),
]
)

export const productImagesSchema = pgTable('product_images', {
    productId: uuid('product_id').notNull().references(() => productsSchema.id, {onDelete: 'cascade'}),
    imageUrl: varchar("image_url", { length: 255 }).notNull(),
    isMain: boolean('is_main').notNull().default(false),
    ...baseSchema
}, (table) => [
  index('product_images_product_idx').on(table.productId),
]);

export const attributesSchema = pgTable(
  'attributes',
  {
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    ...baseSchema
  },
  (table) => [
    uniqueIndex('attributes_slug_unique').on(table.slug),
  ]
);

export const attributeValuesSchema = pgTable(
  'attribute_values',
  {
    value: varchar('value', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    ...baseSchema
  },
  (table) => [
    uniqueIndex('attribute_values_slug_unique').on(table.slug),
  ]
);

export const categoryAttributesSchema = pgTable(
  'category_attributes',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categoriesSchema.id, { onDelete: 'cascade' }),

    attributeId: uuid('attribute_id')
      .notNull()
      .references(() => attributesSchema.id, { onDelete: 'cascade' }),

    ...baseSchema
  },
  (table) => [
    uniqueIndex('category_attribute_unique')
      .on(table.categoryId, table.attributeId),
  ]
);

export const attributeAttributeValuesSchema = pgTable(
  'attribute_attribute_values',
  {
    attributeId: uuid('attribute_id')
      .notNull()
      .references(() => attributesSchema.id, { onDelete: 'cascade' }),

    attributeValueId: uuid('attribute_value_id')
      .notNull()
      .references(() => attributeValuesSchema.id, { onDelete: 'cascade' }),

    ...baseSchema
  },
  (table) => [
    uniqueIndex('attribute_value_unique')
      .on(table.attributeId, table.attributeValueId),
  ]
);

export const categoryAttributeValuesSchema = pgTable(
  'category_attribute_values',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categoriesSchema.id, { onDelete: 'cascade' }),

    attributeId: uuid('attribute_id')
      .notNull()
      .references(() => attributesSchema.id, { onDelete: 'cascade' }),

    attributeValueId: uuid('attribute_value_id')
      .notNull()
      .references(() => attributeValuesSchema.id, { onDelete: 'cascade' }),

    ...baseSchema,
  },
  (table) => [
    uniqueIndex('category_attribute_value_unique')
      .on(table.categoryId, table.attributeId, table.attributeValueId),
  ]
);

export const productsAttributeValuesSchema = pgTable("product_attribute_values", {
    productId: uuid('product_id').notNull().references(() => productsSchema.id, {onDelete: 'cascade'}),
    attributeValueId: uuid('attribute_value_id').notNull().references(() => attributeValuesSchema.id,  {onDelete: 'cascade'}),
    ...baseSchema
}, (table) => [
    uniqueIndex("product_attribute_values_product_id_attribute_value_id_idx")
    .on(table.productId, table.attributeValueId),
  ]);

export const favoriteProductsSchema = pgTable('favorites', {
    userId: uuid('user_id').notNull().references(() => usersSchema.id, {onDelete: 'cascade'}),
    productId: uuid('product_id').notNull().references(() => productsSchema.id, {onDelete: 'cascade'}),
    ...baseSchema
}, (table) => [
  uniqueIndex('favorites_unique').on(table.userId, table.productId),
  index('favorites_user_idx').on(table.userId),
  index('favorites_product_idx').on(table.productId),
]);

export const tempCredentialsSchema = pgTable("temp_credentials", {
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...baseSchema,
});

//relations
// user-profile relations
export const usersRelations = relations(usersSchema, ({ one, many }) => ({
  profile: one(profilesSchema, {
    fields: [usersSchema.id],
    references: [profilesSchema.userId],
    relationName: "user_profile",
  }),

  shopProfiles: many(shopProfilesSchema, {
  relationName: "user_shopprofile",
}),

  following: many(followsSchema, {
    relationName: "user_following",
  }),

  followers: many(followsSchema, {
    relationName: "user_followers",
  }),

  shopMemberships: many(shopMembersSchema, {
    relationName: "user_shop_memberships",
  }),

  shopInvitations: many(shopMembersSchema, {
    relationName: "user_shop_invitations",
  }),

  favorites: many(favoriteProductsSchema, {
    relationName: "user_favorites",
  }),
  products: many(productsSchema, {
    relationName: "user_products",
  }),
  sentMessages: many(messagesSchema, {
    relationName: "message_sender",
  }),

  conversationParticipations: many(conversationParticipantsSchema, {
    relationName: "user_conversation_participations",
  }),

  createdConversations: many(conversationsSchema, {
    relationName: "conversation_creator",
  }),

  receivedNotifications: many(notificationsSchema, {
    relationName: "notification_receiver",
  }),

  sentNotifications: many(notificationsSchema, {
    relationName: "notification_sender",
  }),
   shopRatings: many(shopRatingsSchema, {
    relationName: "user_shop_ratings",
  }),
}));

export const profilesRelations = relations(profilesSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [profilesSchema.userId],
    references: [usersSchema.id],
    relationName: "user_profile",
  }),
  region: one(regionsSchema, {
    fields: [profilesSchema.regionId],
    references: [regionsSchema.id],
    relationName: "region_profiles",
  }),

}));

export const shopProfileRelations = relations(shopProfilesSchema, ({one, many}) => ({
  user: one(usersSchema, {
    fields: [shopProfilesSchema.userId],
    references: [usersSchema.id],
    relationName: "user_shopprofile"
  }),

  members: many(shopMembersSchema, {
      relationName: "shop_members",
  }),

  ratings: many(shopRatingsSchema, {
      relationName: "shop_profile_ratings",
    }),

  followers: many(followsSchema, {
    relationName: "shop_followers",
  }),
}))

export const shopMembersRelations = relations(shopMembersSchema, ({ one }) => ({
  shopProfile: one(shopProfilesSchema, {
    fields: [shopMembersSchema.shopId],
    references: [shopProfilesSchema.id],
    relationName: "shop_members",
  }),
  user: one(usersSchema, {
    fields: [shopMembersSchema.userId],
    references: [usersSchema.id],
    relationName: "user_shop_memberships",
  }),
  inviter: one(usersSchema, {
    fields: [shopMembersSchema.invitedBy],
    references: [usersSchema.id],
    relationName: "user_shop_invitations",
  })
}))

export const followsRelations = relations(followsSchema, ({ one }) => ({
  follower: one(usersSchema, {
    fields: [followsSchema.followerId],
    references: [usersSchema.id],
    relationName: "user_following",
  }),
  followingUser: one(usersSchema, {
    fields: [followsSchema.followingUserId],
    references: [usersSchema.id],
    relationName: "user_followers",
  }),
  followingShop: one(shopProfilesSchema, {
    fields: [followsSchema.followingShopId],
    references: [shopProfilesSchema.id],
    relationName: "shop_followers",
  }),
}));

export const shopRatingsRelations = relations(
  shopRatingsSchema,
  ({ one }) => ({
    user: one(usersSchema, {
      fields: [shopRatingsSchema.userId],
      references: [usersSchema.id],
      relationName: "user_shop_ratings",
    }),
    shopProfile: one(shopProfilesSchema, {
      fields: [shopRatingsSchema.shopProfileId],
      references: [shopProfilesSchema.id],
      relationName: "shop_profile_ratings",
    }),
  })
);

export const conversationsRelations = relations(conversationsSchema, ({one, many}) => ({
  creator: one(usersSchema, {
    fields: [conversationsSchema.createdBy],
    references: [usersSchema.id],
    relationName: "conversation_creator",
  }),
  participants: many(conversationParticipantsSchema, {
    relationName: "conversation_participants",
  }),
  messages: many(messagesSchema, {
    relationName: "conversation_messages",
  }),
}))

export const conversationParticipantsRelations = relations(
  conversationParticipantsSchema,
  ({ one }) => ({
    conversation: one(conversationsSchema, {
      fields: [conversationParticipantsSchema.conversationId],
      references: [conversationsSchema.id],
      relationName: "conversation_participants",
    }),
    user: one(usersSchema, {
      fields: [conversationParticipantsSchema.userId],
      references: [usersSchema.id],
      relationName: "user_conversation_participations",
    }),
  })
);

export const messagesRelations = relations(messagesSchema, ({ one }) => ({
  conversation: one(conversationsSchema, {
    fields: [messagesSchema.conversationId],
    references: [conversationsSchema.id],
    relationName: "conversation_messages",
  }),
  sender: one(usersSchema, {
    fields: [messagesSchema.senderId],
    references: [usersSchema.id],
    relationName: "message_sender",
  }),
}));

export const notificationsRelations = relations(notificationsSchema, ({ one }) => ({
  receiver: one(usersSchema, {
    fields: [notificationsSchema.receiverId],
    references: [usersSchema.id],
    relationName: "notification_receiver",
  }),
  sender: one(usersSchema, {
    fields: [notificationsSchema.senderId],
    references: [usersSchema.id],
    relationName: "notification_sender",
  }),
  product: one(productsSchema, {
    fields: [notificationsSchema.productId],
    references: [productsSchema.id],
    relationName: "notification_product",
  }),
  message: one(messagesSchema, {
    fields: [notificationsSchema.messageId],
    references: [messagesSchema.id],
    relationName: "notification_message",
  }),
  conversation: one(conversationsSchema, {
    fields: [notificationsSchema.conversationId],
    references: [conversationsSchema.id],
    relationName: "notification_conversation",
  }),
}));


// regions relations
export const regionsRelations = relations(regionsSchema, ({ one, many }) => ({
  parent: one(regionsSchema, {
    fields: [regionsSchema.parentId],
    references: [regionsSchema.id],
    relationName: "region_parent",
  }),
  children: many(regionsSchema, {
    relationName: "region_children",
  }),
  profiles: many(profilesSchema, {
    relationName: "region_profiles",
  }),
  products: many(productsSchema, {
    relationName: "region_products",
  }),
}));

// product relations
export const productsRelations = relations(productsSchema, ({ one, many }) => ({
   category: one(categoriesSchema, {
  fields: [productsSchema.categoryId],
  references: [categoriesSchema.id],
  relationName: 'product_category_one',
}),
  user: one(usersSchema, {
    fields: [productsSchema.userId],
    references: [usersSchema.id],
    relationName: "user_products",
  }),
  attributeValues: many(productsAttributeValuesSchema, {
    relationName: "product_attribute_values",
  }),
  favorites: many(favoriteProductsSchema, {
    relationName: "product_favorites",
  }),
  images: many(productImagesSchema, {
    relationName: "product_images",
  }),
  region: one(regionsSchema, {
    fields: [productsSchema.regionId],
    references: [regionsSchema.id],
    relationName: "region_products",
  }),
}));

// product images relations
export const productImagesRelations = relations(productImagesSchema, ({ one }) => ({
  product: one(productsSchema, {
    fields: [productImagesSchema.productId],
    references: [productsSchema.id],
    relationName: "product_images",
  }),
}));

// favorite products relations
export const favoriteProductsRelations = relations(favoriteProductsSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [favoriteProductsSchema.userId],
    references: [usersSchema.id],
    relationName: "user_favorites",
  }),
  product: one(productsSchema, {
    fields: [favoriteProductsSchema.productId],
    references: [productsSchema.id],
    relationName: "product_favorites",
  }),
}));

// categories relations
export const categoriesRelations = relations(categoriesSchema, ({ one, many }) => ({
    parent: one(categoriesSchema, {
        fields: [categoriesSchema.parentId],
        references: [categoriesSchema.id],
        relationName: 'category_parent',
    }),

    children: many(categoriesSchema, {
        relationName: 'category_parent',
    }),

    products: many(productsSchema, {
  relationName: 'category_products_many',
}),

  categoryAttributes: many(categoryAttributesSchema, {
    relationName: 'category_attributes',
  }),
}))

export const attributesRelations = relations(attributesSchema, ({ many }) => ({
  categories: many(categoryAttributesSchema, {
    relationName: 'attribute_categories',
  }),
  values: many(attributeAttributeValuesSchema, {
    relationName: 'attribute_values',
  }),
}));

export const attributeValuesRelations = relations(attributeValuesSchema, ({ one, many }) => ({
  attributes: many(attributeAttributeValuesSchema),
  products: many(productsAttributeValuesSchema, {
    relationName: 'attribute_value_products',
  }),
}));

export const categoryAttributesRelations = relations(
  categoryAttributesSchema,
  ({ one }) => ({
    category: one(categoriesSchema, {
      fields: [categoryAttributesSchema.categoryId],
      references: [categoriesSchema.id],
      relationName: 'category_attributes',
    }),
    attribute: one(attributesSchema, {
      fields: [categoryAttributesSchema.attributeId],
      references: [attributesSchema.id],
      relationName: 'attribute_categories',
    }),
  })
);

export const attributeAttributeValuesRelations = relations(
  attributeAttributeValuesSchema,
  ({ one }) => ({
    attribute: one(attributesSchema, {
      fields: [attributeAttributeValuesSchema.attributeId],
      references: [attributesSchema.id],
      relationName: 'attribute_values',
    }),
    value: one(attributeValuesSchema, {
      fields: [attributeAttributeValuesSchema.attributeValueId],
      references: [attributeValuesSchema.id],
    }),
  })
);

// product attribute values pivot relations
export const productsAttributeValuesRelations = relations(productsAttributeValuesSchema, ({ one }) => ({
  product: one(productsSchema, {
    fields: [productsAttributeValuesSchema.productId],
    references: [productsSchema.id],
    relationName: "product_attribute_values",
  }),
  attributeValue: one(attributeValuesSchema, {
    fields: [productsAttributeValuesSchema.attributeValueId],
    references: [attributeValuesSchema.id],
    relationName: "attribute_value_products",
  }),
}));

