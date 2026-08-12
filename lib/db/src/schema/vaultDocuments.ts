import { createInsertSchema } from "drizzle-zod";
import { timestamp, text, uniqueIndex, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const vaultDocumentsTable = pgTable(
  "vault_documents",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    type: text("type").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull(),
    identifier: text("identifier").notNull(),
    updated: text("updated").notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    imageData: text("image_data"),
    contentType: text("content_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerDocumentIndex: uniqueIndex("vault_documents_owner_document_idx").on(table.ownerKey, table.id),
  }),
);

export const insertVaultDocumentSchema = createInsertSchema(vaultDocumentsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertVaultDocument = z.infer<typeof insertVaultDocumentSchema>;
export type VaultDocument = typeof vaultDocumentsTable.$inferSelect;