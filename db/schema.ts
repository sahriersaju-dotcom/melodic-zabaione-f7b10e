import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial().primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});
