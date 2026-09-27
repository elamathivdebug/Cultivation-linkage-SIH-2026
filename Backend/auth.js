const jwt = require("jsonwebtoken");
const { db } = require("./database");

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-change-me";

/* ============================================================
   MATCHING
   crop 40 | quantity 20 | price 20 | quality 10 | location 10
   ============================================================ */

function toKg(qty, unit) {
  return unit === "tonne" ? qty * 1000 : qty;
}

function matchScore(requirement, listing) {
  if (!requirement || !listing) return 0;

  if (
    requirement.crop.trim().toLowerCase() !==
    listing.crop.trim().toLowerCase()
  ) {
    return 0;
  }

  const reqQty = toKg(
    requirement.quantity,
    requirement.unit
  );

  const listQty = toKg(
    listing.quantity,
    listing.unit
  );

  let qtyScore;

  const ratio = listQty / reqQty;

  if (ratio >= 1) {
    qtyScore =
      Math.max(0.6, 1 - (ratio - 1) * 0.1) * 20;
  } else {
    qtyScore = Math.max(0, ratio) * 20;
  }

  let priceScore = 10;

  if (requirement.targetPrice && listing.price) {
    const diff =
      Math.abs(
        listing.price - requirement.targetPrice
      ) / requirement.targetPrice;

    priceScore =
      diff <= 0.02
        ? 20
        : diff >= 0.3
        ? 0
        : Math.round((1 - diff / 0.3) * 20);
  }

  const qualityScore =
    requirement.quality?.toLowerCase() ===
    listing.quality?.toLowerCase()
      ? 10
      : 3;

  let locationScore = 5;

  if (
    requirement.preferredLocation &&
    listing.location
  ) {
    const a =
      requirement.preferredLocation.toLowerCase();

    const b = listing.location.toLowerCase();

    locationScore =
      a === b
        ? 10
        : a
            .split(",")
            .map((t) => t.trim())
            .some((t) => b.includes(t))
        ? 7
        : 2;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        40 +
          qtyScore +
          priceScore +
          qualityScore +
          locationScore
      )
    )
  );
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Not authenticated" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res
      .status(401)
      .json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (
      !req.user ||
      !roles.includes(req.user.role)
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized" });
    }

    next();
  };
}

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

module.exports = {
  JWT_SECRET,
  matchScore,
  requireAuth,
  requireRole,
  publicUser,
};
