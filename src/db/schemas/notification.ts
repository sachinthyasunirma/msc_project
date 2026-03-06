import { nanoid } from "nanoid";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { company } from "@/db/schemas/company";
import { user } from "@/db/schemas/user";

export const internalNotification = pgTable(
  "internal_notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    contextTitle: text("context_title"),
    contextUrl: text("context_url"),
    isRead: boolean("is_read").notNull().default(false),
    deletedBySender: boolean("deleted_by_sender").notNull().default(false),
    deletedByRecipient: boolean("deleted_by_recipient").notNull().default(false),
    deliveredAt: timestamp("delivered_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("idx_internal_notification_company").on(table.companyId),
    index("idx_internal_notification_recipient").on(table.recipientUserId),
    index("idx_internal_notification_sender").on(table.senderUserId),
    index("idx_internal_notification_created").on(table.createdAt),
  ]
);
