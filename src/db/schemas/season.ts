import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  index,
  date,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";

export const season = pgTable(
  "season",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_hotel_company").on(table.companyId)
  ]
);
