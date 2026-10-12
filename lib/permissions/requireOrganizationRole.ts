import mongoose from "mongoose";
import Membership, {
  type OrganizationRole,
} from "@/models/Membership";
import Organization from "@/models/Organization";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";

export class AuthorizationError extends Error {
  readonly statusCode = 403;

  constructor(message = "You do not have permission to do this.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class OrganizationNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "Organization not found.") {
    super(message);
    this.name = "OrganizationNotFoundError";
  }
}

export async function requireOrganizationRole(
  organizationId: string,
  allowedRoles: readonly OrganizationRole[]
) {
  const session = await requireSession();

  if (
    !mongoose.isValidObjectId(organizationId) ||
    !mongoose.isValidObjectId(session.userId)
  ) {
    throw new OrganizationNotFoundError();
  }

  await connectToDatabase();

  const organization = await Organization.findById(organizationId)
    .select("_id ownerId isSuspended")
    .lean();

  if (!organization) {
    throw new OrganizationNotFoundError();
  }

  if (organization.isSuspended) {
    throw new AuthorizationError(
      "This organization is suspended."
    );
  }

  // The owner has full organization permissions, even if a membership
  // record has not yet been created.
  const isOwner =
    organization.ownerId.toString() === session.userId;

  if (isOwner) {
    return {
      session,
      organization,
      role: "owner" as const,
    };
  }

  const membership = await Membership.findOne({
    organizationId: organization._id,
    userId: new mongoose.Types.ObjectId(session.userId),
  })
    .select("role")
    .lean();

  if (!membership) {
    throw new AuthorizationError(
      "You are not a member of this organization."
    );
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new AuthorizationError();
  }

  return {
    session,
    organization,
    role: membership.role,
  };
}
