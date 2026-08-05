import { normalizeEmail } from "../lib/auth.js";
import { AUTHOR_EDIT_STATES } from "../lib/documentStates.js";

/** Core metadata fields stored on documents row. */
export const METADATA_FIELDS = [
  "title",
  "description",
  "doc_type",
  "department",
  "classification",
  "reference_number",
  "tags",
  "custom_metadata",
];

/**
 * Author may edit when document is in their custody (draft or sent back).
 * @param {object} doc
 * @param {string} actorEmail
 */
export function canAuthorEditDocument(doc, actorEmail) {
  const em = normalizeEmail(actorEmail);
  const owner = normalizeEmail(doc?.author_email || doc?.created_by_email);
  if (!em || owner !== em) return false;
  if (doc.zone !== "managed") return doc.zone === "scratch" && doc.state === "draft";
  return AUTHOR_EDIT_STATES.includes(doc.state);
}

/**
 * @param {object} body
 * @param {object} docTypeDef - row from doc_type_definitions (optional)
 */
export function normalizeMetadataInput(body, docTypeDef) {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim();
  if (body.description !== undefined) {
    out.description = body.description ? String(body.description).trim() : null;
  }
  if (body.doc_type !== undefined) out.doc_type = String(body.doc_type).trim();
  if (body.docType !== undefined) out.doc_type = String(body.docType).trim();
  if (body.department !== undefined) {
    out.department = body.department ? String(body.department).trim() : null;
  }
  if (body.classification !== undefined) {
    out.classification = body.classification ? String(body.classification).trim() : null;
  }
  if (body.reference_number !== undefined || body.referenceNumber !== undefined) {
    const raw = body.reference_number ?? body.referenceNumber;
    out.reference_number = raw ? String(raw).trim() : null;
  }
  if (body.tags !== undefined) {
    out.tags = Array.isArray(body.tags) ? body.tags : [];
  }
  if (body.custom_metadata !== undefined || body.customMetadata !== undefined) {
    const raw = body.custom_metadata ?? body.customMetadata;
    out.custom_metadata =
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }

  if (docTypeDef?.required_fields) {
    const required = Array.isArray(docTypeDef.required_fields)
      ? docTypeDef.required_fields
      : [];
    for (const field of required) {
      const key = String(field);
      if (key === "title" && !out.title) {
        const e = new Error(`required_field_missing:${key}`);
        e.statusCode = 400;
        throw e;
      }
      if (key === "description" && !out.description) {
        const e = new Error(`required_field_missing:${key}`);
        e.statusCode = 400;
        throw e;
      }
    }
  }

  return out;
}

/**
 * @param {import("pg").PoolClient} client
 */
export async function recordMetadataHistory(client, {
  documentId,
  before,
  after,
  actorEmail,
}) {
  for (const field of METADATA_FIELDS) {
    const oldVal = before?.[field];
    const newVal = after?.[field];
    const oldStr =
      oldVal === undefined || oldVal === null
        ? null
        : typeof oldVal === "object"
          ? JSON.stringify(oldVal)
          : String(oldVal);
    const newStr =
      newVal === undefined || newVal === null
        ? null
        : typeof newVal === "object"
          ? JSON.stringify(newVal)
          : String(newVal);
    if (oldStr === newStr) continue;
    await client.query(
      `
        insert into document_metadata_history(
          document_id, field_name, old_value, new_value, changed_by_email
        )
        values ($1,$2,$3,$4,$5)
      `,
      [documentId, field, oldStr, newStr, normalizeEmail(actorEmail)],
    );
  }
}
