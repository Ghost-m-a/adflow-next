import mongoose from "mongoose";

import ApiKey, { type ApiScope } from "@/models/ApiKey";
import { generateApiKey, hashApiKey } from "@/lib/api-keys/keys";

export class ApiKeyError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ApiKeyError";
    this.statusCode = statusCode;
  }
}

export async function createApiKey(input: {
  organizationId: string;
  userId: string;
  name: string;
  scopes: ApiScope[];
}) {
  if (!input.name || input.name.trim().length < 2) {
    throw new ApiKeyError("Name is required.", 400);
  }
  if (input.scopes.length === 0) {
    throw new ApiKeyError("At least one scope is required.", 400);
  }

  const { key, prefix, keyHash } = generateApiKey();

  const record = await ApiKey.create({
    organizationId: new mongoose.Types.ObjectId(input.organizationId),
    createdBy: new mongoose.Types.ObjectId(input.userId),
    name: input.name.trim(),
    keyHash,
    prefix,
    scopes: input.scopes,
  });

  // Return the plaintext key ONCE. It cannot be retrieved later.
  return {
    key,
    record: {
      _id: record._id.toString(),
      name: record.name,
      prefix: record.prefix,
      scopes: record.scopes,
      createdAt: record.createdAt,
    },
  };
}

export async function listApiKeys(organizationId: string) {
  const keys = await ApiKey.find({
    organizationId,
    revokedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  return keys.map((k) => ({
    _id: k._id.toString(),
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    lastUsedAt: k.lastUsedAt ?? null,
    createdAt: k.createdAt,
  }));
}

export async function revokeApiKey(keyId: string, organizationId: string) {
  if (!mongoose.isValidObjectId(keyId)) {
    throw new ApiKeyError("Invalid key.", 400);
  }
  const updated = await ApiKey.findOneAndUpdate(
    { _id: keyId, organizationId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true },
  ).lean();

  if (!updated) throw new ApiKeyError("Key not found.", 404);
  return { _id: updated._id.toString(), revokedAt: updated.revokedAt };
}

/** Verifies an API key and returns the owning organization + scopes. */
export async function verifyApiKey(rawKey: string) {
  if (!rawKey.startsWith("adflow_")) {
    throw new ApiKeyError("Invalid key format.", 401);
  }
  const keyHash = hashApiKey(rawKey);

  const record = await ApiKey.findOne({
    keyHash,
    revokedAt: null,
  })
    .select("+keyHash organizationId scopes")
    .lean();

  if (!record) throw new ApiKeyError("Invalid or revoked key.", 401);

  // Record last usage without blocking the request.
  void ApiKey.updateOne(
    { _id: record._id },
    { $set: { lastUsedAt: new Date() } },
  ).catch(() => {});

  return {
    organizationId: record.organizationId.toString(),
    scopes: record.scopes,
    keyId: record._id.toString(),
  };
}

export function hasScope(scopes: ApiScope[], required: ApiScope): boolean {
  return scopes.includes(required);
}
