const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { db, uid } = require("./database");

const {
  JWT_SECRET,
  matchScore,
  requireAuth,
  requireRole,
  publicUser,
} = require("./auth");

const router = express.Router();

/* ============================================================
   HEALTH
   ============================================================ */

router.get("/health", (req, res) =>
  res.json({
    ok: true,
    name: "Cultivation Linkage API",
  })
);

/* ============================================================
   AUTH
   ============================================================ */

router.post("/auth/register", (req, res) => {
  const {
    role,
    name,
    email,
    password,
    phone,
    location,
    businessName,
  } = req.body || {};

  if (
    !role ||
    !["farmer", "buyer"].includes(role)
  ) {
    return res.status(400).json({
      error: "role must be 'farmer' or 'buyer'",
    });
  }

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "name, email and password are required",
    });
  }

  if (
    db.users.some(
      (u) =>
        u.email.toLowerCase() ===
        email.toLowerCase()
    )
  ) {
    return res.status(409).json({
      error:
        "An account with this email already exists",
    });
  }

  const user = {
    id: uid("usr"),
    role,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 8),
    phone: phone || "",
    location: location || "",
    businessName:
      role === "buyer"
        ? businessName || ""
        : undefined,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    token,
    user: publicUser(user),
  });
});

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() ===
      (email || "").toLowerCase()
  );

  if (
    !user ||
    !bcrypt.compareSync(
      password || "",
      user.passwordHash
    )
  ) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: publicUser(user),
  });
});

router.get(
  "/auth/me",
  requireAuth,
  (req, res) => {
    const user = db.users.find(
      (u) => u.id === req.user.id
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found" });
    }

    res.json({
      user: publicUser(user),
    });
  }
);

router.put(
  "/auth/me",
  requireAuth,
  (req, res) => {
    const user = db.users.find(
      (u) => u.id === req.user.id
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found" });
    }

    const {
      name,
      phone,
      location,
      businessName,
    } = req.body || {};

    if (name !== undefined) user.name = name;

    if (phone !== undefined)
      user.phone = phone;

    if (location !== undefined)
      user.location = location;

    if (
      businessName !== undefined &&
      user.role === "buyer"
    ) {
      user.businessName = businessName;
    }

    res.json({
      user: publicUser(user),
    });
  }
);

/* ============================================================
   LISTINGS
   ============================================================ */

const LISTING_FIELDS = [
  "crop",
  "quantity",
  "unit",
  "price",
  "quality",
  "location",
  "availableDate",
  "description",
];

router.get(
  "/listings",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    res.json({
      listings: db.listings.filter(
        (l) => l.farmerId === req.user.id
      ),
    });
  }
);

router.post(
  "/listings",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const body = req.body || {};

    for (const f of [
      "crop",
      "quantity",
      "unit",
      "price",
      "quality",
      "location",
    ]) {
      if (!body[f]) {
        return res.status(400).json({
          error: `${f} is required`,
        });
      }
    }

    const listing = {
      id: uid("lst"),
      farmerId: req.user.id,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    LISTING_FIELDS.forEach(
      (f) => (listing[f] = body[f])
    );

    listing.quantity = Number(listing.quantity);
    listing.price = Number(listing.price);

    db.listings.push(listing);

    res.status(201).json({
      listing,
    });
  }
);

router.put(
  "/listings/:id",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const listing = db.listings.find(
      (l) => l.id === req.params.id
    );

    if (!listing) {
      return res
        .status(404)
        .json({ error: "Listing not found" });
    }

    if (listing.farmerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not your listing" });
    }

    const body = req.body || {};

    LISTING_FIELDS.forEach((f) => {
      if (body[f] !== undefined) {
        listing[f] = body[f];
      }
    });

    if (body.status) {
      listing.status = body.status;
    }

    listing.quantity = Number(listing.quantity);
    listing.price = Number(listing.price);

    res.json({ listing });
  }
);

router.delete(
  "/listings/:id",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const idx = db.listings.findIndex(
      (l) => l.id === req.params.id
    );

    if (idx === -1) {
      return res
        .status(404)
        .json({ error: "Listing not found" });
    }

    if (
      db.listings[idx].farmerId !==
      req.user.id
    ) {
      return res
        .status(403)
        .json({ error: "Not your listing" });
    }

    db.listings.splice(idx, 1);

    res.json({ ok: true });
  }
);

/* ============================================================
   REQUIREMENTS
   ============================================================ */

const REQ_FIELDS = [
  "crop",
  "quantity",
  "unit",
  "targetPrice",
  "quality",
  "preferredLocation",
  "requiredDate",
  "additionalRequirements",
];

router.get(
  "/requirements/mine",
  requireAuth,
  requireRole("buyer"),
  (req, res) => {
    res.json({
      requirements: db.requirements.filter(
        (r) => r.buyerId === req.user.id
      ),
    });
  }
);

router.get(
  "/requirements",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const {
      listingId,
      crop,
      location,
    } = req.query;

    let reqs = db.requirements.filter(
      (r) => r.status === "active"
    );

    if (crop) {
      reqs = reqs.filter((r) =>
        r.crop
          .toLowerCase()
          .includes(
            String(crop).toLowerCase()
          )
      );
    }

    if (location) {
      reqs = reqs.filter((r) =>
        r.preferredLocation
          .toLowerCase()
          .includes(
            String(location).toLowerCase()
          )
      );
    }

    const listing = listingId
      ? db.listings.find(
          (l) =>
            l.id === listingId &&
            l.farmerId === req.user.id
        )
      : null;

    const withScore = reqs.map((r) => ({
      ...r,
      matchPercent: listing
        ? matchScore(r, listing)
        : null,
    }));

    withScore.sort(
      (a, b) =>
        (b.matchPercent || 0) -
        (a.matchPercent || 0)
    );

    res.json({
      requirements: withScore,
    });
  }
);

router.post(
  "/requirements",
  requireAuth,
  requireRole("buyer"),
  (req, res) => {
    const body = req.body || {};

    for (const f of [
      "crop",
      "quantity",
      "unit",
      "targetPrice",
      "quality",
      "preferredLocation",
    ]) {
      if (!body[f]) {
        return res.status(400).json({
          error: `${f} is required`,
        });
      }
    }

    const requirement = {
      id: uid("req"),
      buyerId: req.user.id,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    REQ_FIELDS.forEach(
      (f) => (requirement[f] = body[f])
    );

    requirement.quantity = Number(
      requirement.quantity
    );

    requirement.targetPrice = Number(
      requirement.targetPrice
    );

    db.requirements.push(requirement);

    res.status(201).json({
      requirement,
    });
  }
);

router.put(
  "/requirements/:id",
  requireAuth,
  requireRole("buyer"),
  (req, res) => {
    const requirement =
      db.requirements.find(
        (r) => r.id === req.params.id
      );

    if (!requirement) {
      return res.status(404).json({
        error: "Requirement not found",
      });
    }

    if (
      requirement.buyerId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Not your requirement",
      });
    }

    const body = req.body || {};

    REQ_FIELDS.forEach((f) => {
      if (body[f] !== undefined) {
        requirement[f] = body[f];
      }
    });

    if (body.status) {
      requirement.status = body.status;
    }

    requirement.quantity = Number(
      requirement.quantity
    );

    requirement.targetPrice = Number(
      requirement.targetPrice
    );

    res.json({ requirement });
  }
);

router.delete(
  "/requirements/:id",
  requireAuth,
  requireRole("buyer"),
  (req, res) => {
    const idx = db.requirements.findIndex(
      (r) => r.id === req.params.id
    );

    if (idx === -1) {
      return res.status(404).json({
        error: "Requirement not found",
      });
    }

    if (
      db.requirements[idx].buyerId !==
      req.user.id
    ) {
      return res.status(403).json({
        error: "Not your requirement",
      });
    }

    db.requirements.splice(idx, 1);

    res.json({ ok: true });
  }
);

/* ============================================================
   MARKETPLACE
   ============================================================ */

router.get(
  "/marketplace",
  requireAuth,
  (req, res) => {
    const {
      crop,
      price_max,
      quantity_min,
      quality,
      location,
      requirementId,
    } = req.query;

    let listings = db.listings.filter(
      (l) => l.status === "active"
    );

    if (crop) {
      listings = listings.filter((l) =>
        l.crop
          .toLowerCase()
          .includes(
            String(crop).toLowerCase()
          )
      );
    }

    if (quality) {
      listings = listings.filter(
        (l) =>
          l.quality.toLowerCase() ===
          String(quality).toLowerCase()
      );
    }

    if (location) {
      listings = listings.filter((l) =>
        l.location
          .toLowerCase()
          .includes(
            String(location).toLowerCase()
          )
      );
    }

    if (price_max) {
      listings = listings.filter(
        (l) =>
          l.price <= Number(price_max)
      );
    }

    if (quantity_min) {
      listings = listings.filter(
        (l) =>
          l.quantity >=
          Number(quantity_min)
      );
    }

    const requirement = requirementId
      ? db.requirements.find(
          (r) => r.id === requirementId
        )
      : null;

    const withFarmer = listings.map((l) => {
      const farmer = db.users.find(
        (u) => u.id === l.farmerId
      );

      return {
        ...l,
        farmerName: farmer
          ? farmer.name
          : "Unknown",
        matchPercent: requirement
          ? matchScore(requirement, l)
          : null,
      };
    });

    if (requirement) {
      withFarmer.sort(
        (a, b) =>
          (b.matchPercent || 0) -
          (a.matchPercent || 0)
      );
    }

    res.json({
      listings: withFarmer,
    });
  }
);

/* ============================================================
   OFFERS
   ============================================================ */

function publicOffer(o) {
  const farmer = db.users.find(
    (u) => u.id === o.farmerId
  );

  const buyer = db.users.find(
    (u) => u.id === o.buyerId
  );

  return {
    ...o,
    farmerName:
      farmer?.name || "Unknown",
    buyerName:
      buyer?.businessName ||
      buyer?.name ||
      "Unknown",
  };
}

router.get(
  "/offers",
  requireAuth,
  (req, res) => {
    const mine = db.offers.filter((o) =>
      req.user.role === "farmer"
        ? o.farmerId === req.user.id
        : o.buyerId === req.user.id
    );

    res.json({
      offers: mine.map(publicOffer),
    });
  }
);

router.post(
  "/offers",
  requireAuth,
  requireRole("buyer"),
  (req, res) => {
    const {
      listingId,
      requirementId,
      quantity,
      price,
    } = req.body || {};

    if (!listingId || !quantity || !price) {
      return res.status(400).json({
        error:
          "listingId, quantity and price are required",
      });
    }

    const listing = db.listings.find(
      (l) => l.id === listingId
    );

    if (!listing) {
      return res.status(404).json({
        error: "Listing not found",
      });
    }

    const offer = {
      id: uid("ofr"),
      listingId,
      requirementId:
        requirementId || null,
      farmerId: listing.farmerId,
      buyerId: req.user.id,
      crop: listing.crop,
      quantity: Number(quantity),
      price: Number(price),
      status: "pending",
      createdAt:
        new Date().toISOString(),
    };

    db.offers.push(offer);

    res.status(201).json({
      offer: publicOffer(offer),
    });
  }
);

router.patch(
  "/offers/:id",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const { status } = req.body || {};

    if (
      !["accepted", "rejected"].includes(
        status
      )
    ) {
      return res.status(400).json({
        error:
          "status must be 'accepted' or 'rejected'",
      });
    }

    const offer = db.offers.find(
      (o) => o.id === req.params.id
    );

    if (!offer) {
      return res.status(404).json({
        error: "Offer not found",
      });
    }

    if (offer.farmerId !== req.user.id) {
      return res.status(403).json({
        error: "Not your offer",
      });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({
        error: "Offer already decided",
      });
    }

    offer.status = status;

    if (status === "accepted") {
      db.orders.push({
        id: uid("ord"),
        offerId: offer.id,
        farmerId: offer.farmerId,
        buyerId: offer.buyerId,
        crop: offer.crop,
        quantity: offer.quantity,
        agreedPrice: offer.price,
        orderStatus: "confirmed",
        paymentStatus: "pending",
        createdAt:
          new Date().toISOString(),
      });
    }

    res.json({
      offer: publicOffer(offer),
    });
  }
);

/* ============================================================
   ORDERS
   ============================================================ */

function publicOrder(o) {
  const farmer = db.users.find(
    (u) => u.id === o.farmerId
  );

  const buyer = db.users.find(
    (u) => u.id === o.buyerId
  );

  return {
    ...o,
    farmerName:
      farmer?.name || "Unknown",
    buyerName:
      buyer?.businessName ||
      buyer?.name ||
      "Unknown",
  };
}

router.get(
  "/orders",
  requireAuth,
  (req, res) => {
    const mine = db.orders.filter((o) =>
      req.user.role === "farmer"
        ? o.farmerId === req.user.id
        : o.buyerId === req.user.id
    );

    res.json({
      orders: mine.map(publicOrder),
    });
  }
);

router.patch(
  "/orders/:id",
  requireAuth,
  (req, res) => {
    const {
      orderStatus,
      paymentStatus,
    } = req.body || {};

    const order = db.orders.find(
      (o) => o.id === req.params.id
    );

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    if (
      order.farmerId !== req.user.id &&
      order.buyerId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Not your order",
      });
    }

    if (orderStatus) {
      if (
        ![
          "confirmed",
          "processing",
          "completed",
        ].includes(orderStatus)
      ) {
        return res.status(400).json({
          error: "Invalid orderStatus",
        });
      }

      order.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      if (
        ![
          "pending",
          "processing",
          "paid",
        ].includes(paymentStatus)
      ) {
        return res.status(400).json({
          error: "Invalid paymentStatus",
        });
      }

      order.paymentStatus = paymentStatus;
    }

    res.json({
      order: publicOrder(order),
    });
  }
);

/* ============================================================
   ADMIN
   ============================================================ */

router.get(
  "/admin/stats",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json({
      totalFarmers:
        db.users.filter(
          (u) => u.role === "farmer"
        ).length,

      totalBuyers:
        db.users.filter(
          (u) => u.role === "buyer"
        ).length,

      activeListings:
        db.listings.filter(
          (l) => l.status === "active"
        ).length,

      activeRequirements:
        db.requirements.filter(
          (r) => r.status === "active"
        ).length,

      totalOrders: db.orders.length,
    });
  }
);

router.get(
  "/admin/farmers",
  requireAuth,
  requireRole("admin"),
  (req, res) =>
    res.json({
      farmers: db.users
        .filter(
          (u) => u.role === "farmer"
        )
        .map(publicUser),
    })
);

router.get(
  "/admin/buyers",
  requireAuth,
  requireRole("admin"),
  (req, res) =>
    res.json({
      buyers: db.users
        .filter(
          (u) => u.role === "buyer"
        )
        .map(publicUser),
    })
);

router.get(
  "/admin/listings",
  requireAuth,
  requireRole("admin"),
  (req, res) =>
    res.json({
      listings: db.listings,
    })
);

router.get(
  "/admin/requirements",
  requireAuth,
  requireRole("admin"),
  (req, res) =>
    res.json({
      requirements: db.requirements,
    })
);

router.get(
  "/admin/offers",
  requireAuth,
  requireRole("admin"),
  (req, res) =>
    res.json({
      offers: db.offers,
    })
);

router.get(
  "/admin/orders",
  requireAuth,
  requireRole("admin"),
  (req, res) =>
    res.json({
      orders: db.orders,
    })
);

module.exports = router;
