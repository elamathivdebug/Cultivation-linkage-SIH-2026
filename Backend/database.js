const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const uid = (prefix) =>
  `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

// In-memory database
// Data resets when the server restarts.
const db = {
  users: [],
  listings: [],
  requirements: [],
  offers: [],
  orders: [],
};

function seed() {
  const now = () => new Date().toISOString();
  const pass = bcrypt.hashSync("password123", 8);

  const farmers = [
    {
      name: "Ramesh Kumar",
      email: "ramesh@farm.in",
      location: "Nashik, Maharashtra",
      phone: "9876500001",
    },
    {
      name: "Suresh Patil",
      email: "suresh@farm.in",
      location: "Chennai, Tamil Nadu",
      phone: "9876500002",
    },
    {
      name: "Lakshmi Devi",
      email: "lakshmi@farm.in",
      location: "Coimbatore, Tamil Nadu",
      phone: "9876500003",
    },
  ];

  const buyers = [
    {
      name: "Priya Sharma",
      business: "FreshMart Wholesale",
      email: "priya@freshmart.in",
      location: "Chennai, Tamil Nadu",
      phone: "9876600001",
    },
    {
      name: "Vikram Mehta",
      business: "AgroBulk Traders",
      email: "vikram@agrobulk.in",
      location: "Mumbai, Maharashtra",
      phone: "9876600002",
    },
  ];

  farmers.forEach((f) =>
    db.users.push({
      id: uid("usr"),
      role: "farmer",
      name: f.name,
      email: f.email,
      passwordHash: pass,
      phone: f.phone,
      location: f.location,
      createdAt: now(),
    })
  );

  buyers.forEach((b) =>
    db.users.push({
      id: uid("usr"),
      role: "buyer",
      name: b.name,
      businessName: b.business,
      email: b.email,
      passwordHash: pass,
      phone: b.phone,
      location: b.location,
      createdAt: now(),
    })
  );

  db.users.push({
    id: uid("usr"),
    role: "admin",
    name: "Admin",
    email: "admin@cultivationlinkage.in",
    passwordHash: pass,
    createdAt: now(),
  });

  const farmerIds = db.users
    .filter((u) => u.role === "farmer")
    .map((u) => u.id);

  const buyerIds = db.users
    .filter((u) => u.role === "buyer")
    .map((u) => u.id);

  const listingsSeed = [
    {
      crop: "Tomato",
      quantity: 600,
      unit: "kg",
      price: 24,
      quality: "Grade A",
      location: "Chennai, Tamil Nadu",
      availableDate: "2026-10-02",
      description: "Freshly harvested tomatoes.",
    },
    {
      crop: "Onion",
      quantity: 2000,
      unit: "kg",
      price: 18,
      quality: "Grade A",
      location: "Nashik, Maharashtra",
      availableDate: "2026-10-05",
      description: "Premium red onions.",
    },
    {
      crop: "Rice",
      quantity: 4,
      unit: "tonne",
      price: 38000,
      quality: "Grade A",
      location: "Coimbatore, Tamil Nadu",
      availableDate: "2026-10-08",
      description: "Polished, sorted rice.",
    },
    {
      crop: "Mango",
      quantity: 800,
      unit: "kg",
      price: 45,
      quality: "Grade A",
      location: "Nashik, Maharashtra",
      availableDate: "2026-10-12",
      description: "Alphonso mangoes.",
    },
  ];

  listingsSeed.forEach((l, i) =>
    db.listings.push({
      id: uid("lst"),
      farmerId: farmerIds[i % farmerIds.length],
      status: "active",
      createdAt: now(),
      ...l,
    })
  );

  const reqSeed = [
    {
      crop: "Tomato",
      quantity: 500,
      unit: "kg",
      targetPrice: 25,
      quality: "Grade A",
      preferredLocation: "Chennai, Tamil Nadu",
      requiredDate: "2026-10-04",
      additionalRequirements: "Deliver within 3 days.",
    },
    {
      crop: "Rice",
      quantity: 3,
      unit: "tonne",
      targetPrice: 39000,
      quality: "Grade A",
      preferredLocation: "Coimbatore, Tamil Nadu",
      requiredDate: "2026-10-09",
      additionalRequirements: "",
    },
  ];

  reqSeed.forEach((r, i) =>
    db.requirements.push({
      id: uid("req"),
      buyerId: buyerIds[i % buyerIds.length],
      status: "active",
      createdAt: now(),
      ...r,
    })
  );
}

seed();

module.exports = {
  db,
  uid,
};
