import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  DeleteVaultDocumentBody,
  DeleteVaultDocumentParams,
  ListVaultDocumentsQueryParams,
  UpsertVaultDocumentBody,
  UpsertVaultDocumentParams,
  UpsertVaultDocumentResponse,
} from "@workspace/api-zod";
import { db, vaultDocumentsTable } from "@workspace/db";

const router: IRouter = Router();

function toApiDocument(document: typeof vaultDocumentsTable.$inferSelect) {
  return {
    id: document.id,
    type: document.type,
    label: document.label,
    status: document.status,
    identifier: document.identifier,
    updated: document.updated,
    icon: document.icon,
    color: document.color,
    imageData: document.imageData,
    contentType: document.contentType,
  };
}

router.get("/vault/documents", async (req, res) => {
  const { ownerKey } = ListVaultDocumentsQueryParams.parse(req.query);
  const documents = await db
    .select()
    .from(vaultDocumentsTable)
    .where(eq(vaultDocumentsTable.ownerKey, ownerKey))
    .orderBy(vaultDocumentsTable.createdAt);

  res.json(documents.map(toApiDocument));
});

router.put("/vault/documents/:documentId", async (req, res) => {
  const { documentId } = UpsertVaultDocumentParams.parse(req.params);
  const body = UpsertVaultDocumentBody.parse(req.body);
  const [existing] = await db
    .select({ ownerKey: vaultDocumentsTable.ownerKey })
    .from(vaultDocumentsTable)
    .where(eq(vaultDocumentsTable.id, documentId))
    .limit(1);

  if (existing && existing.ownerKey !== body.ownerKey) {
    res.status(409).json({ message: "Document belongs to another vault" });
    return;
  }

  const [document] = await db
    .insert(vaultDocumentsTable)
    .values({
      id: documentId,
      ownerKey: body.ownerKey,
      type: body.type,
      label: body.label,
      status: body.status,
      identifier: body.identifier,
      updated: body.updated,
      icon: body.icon,
      color: body.color,
      imageData: body.imageData ?? null,
      contentType: body.contentType ?? null,
    })
    .onConflictDoUpdate({
      target: vaultDocumentsTable.id,
      set: {
        ownerKey: body.ownerKey,
        type: body.type,
        label: body.label,
        status: body.status,
        identifier: body.identifier,
        updated: body.updated,
        icon: body.icon,
        color: body.color,
        imageData: body.imageData ?? null,
        contentType: body.contentType ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(UpsertVaultDocumentResponse.parse(toApiDocument(document)));
});

router.delete("/vault/documents/:documentId", async (req, res) => {
  const { documentId } = DeleteVaultDocumentParams.parse(req.params);
  const { ownerKey } = DeleteVaultDocumentBody.parse(req.body);

  await db
    .delete(vaultDocumentsTable)
    .where(
      and(
        eq(vaultDocumentsTable.id, documentId),
        eq(vaultDocumentsTable.ownerKey, ownerKey),
      ),
    );

  res.status(204).send();
});

export default router;