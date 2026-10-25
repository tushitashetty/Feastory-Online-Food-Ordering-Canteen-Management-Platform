# Feastory — MongoDB data model

Database: `feastory` (one database, 9 collections). Indexes are created automatically
on API start-up (`app/db.py → ensure_indexes`), and demo data is seeded once (`app/seed.py`).

## Original Supabase → MongoDB

| Original table | Now | Notes |
|---|---|---|
| `studentSignUp` | `students` | `_id` = SAP ID; password is bcrypt-hashed; `login` flag replaced by JWT |
| `canteenSignUp` | `canteen_staff` | `_id` = Employee ID; PIN bcrypt-hashed |
| `Menu` | `dishes` + `categories` | category stored by name inside the dish (denormalised) |
| `temp_cart` (row per item) | `carts` (one doc per student, items embedded) | |
| `Orders` (row per dish, `Pending/Ready/Served` booleans) | `orders` (one doc per order, items embedded, single `status`) | `order_no` gives human-readable #1, #2… |
| `Balance` column | `students.balance` + `wallet_transactions` ledger | |
| web3forms contact form | `feedback` | also e-mailed via web3forms; public fields shown as reviews on About | |

## Collections

### `students`
```js
{
  _id: 70012345678,                // SAP ID (11-digit int) — also the login id
  name: "Khushi Shah",
  email: "khushi@test.com",        // unique index
  password_hash: "$2b$12$…",       // bcrypt
  balance: 477.0,                  // eWallet, never < 0 (checkout uses a conditional $inc)
  created_at: ISODate()
}
```

### `canteen_staff`
```js
{ _id: 1234567890, name: "Canteen Manager", pin_hash: "$2b$12$…", created_at: ISODate() }
```

### `categories`
```js
{ _id: ObjectId, name: "South Indian", name_lower: "south indian", created_at: ISODate() }
// unique index on name_lower  → case-insensitive uniqueness
```

### `dishes`
```js
{
  _id: ObjectId("…"),              // exposed to the frontend as the dish id (string)
  name: "Masala Dosa",
  name_lower: "masala dosa",       // unique index
  price: 55.0,
  calories: 380,                   // optional
  category: "South Indian",        // category *name* (index)
  image_url: "https://feastory-dish-images.s3.ap-south-1.amazonaws.com/dishes/…jpg",
  is_available: true,              // "sold out" switch; hidden from students when false
  created_at: ISODate()
}
// indexes: {name_lower:1} unique, {category:1}, {is_available:1, created_at:-1}
```

### `carts` — one document per student
```js
{
  _id: 70012345678,                // student SAP ID
  items: [
    { dish_id: ObjectId("…"), quantity: 2, added_at: ISODate() }
  ]
}
// Cart line's public id == dish_id. Prices are always read live from `dishes`.
```

### `orders` — one document per order
```js
{
  _id: ObjectId,
  order_no: 3,                     // unique, from `counters` — shown as "Order #3"
  student_sapid: 70012345678,
  student_name: "Khushi Shah",     // snapshot for the canteen board
  total_amount: 173.0,
  payment_method: "eWallet",
  status: "placed",                // "placed" → "ready" → "served"  (forward only)
  items: [
    { dish_id: ObjectId("…"), dish_name: "Pav Bhaji", unit_price: 63.0, quantity: 1 }
    // name/price are snapshots → order history survives menu edits/deletes
  ],
  created_at: ISODate(),
  updated_at: ISODate()
}
// indexes: {order_no:1} unique, {student_sapid:1, created_at:-1}, {status:1, created_at:1}
```

### `wallet_transactions` — append-only ledger
```js
{
  _id: ObjectId,
  student_sapid: 70012345678,
  kind: "debit",                   // "credit" | "debit"
  amount: 173.0,
  balance_after: 327.0,
  order_no: 3,                     // null for top-ups / welcome balance
  note: "Order #3",
  created_at: ISODate()
}
```

### `feedback` — the "give feedback" form
```js
{ _id: ObjectId, name: "Dev Poriya", phone: "9123456780", email: "dev@test.com",
  rating: 4,                       // 1–5 stars
  message: "Cold coffee is elite…", created_at: ISODate() }
// index: {created_at:-1}. GET /api/feedback exposes only name/rating/message/created_at.
```

### `counters`
```js
{ _id: "orders", seq: 3 }          // $inc'd atomically to number orders
```

## Consistency guarantees

- **Checkout** runs as a multi-document **transaction** on Atlas/replica sets
  (`session.with_transaction`). On a standalone `mongod` it falls back to the same
  steps without a transaction.
- Even without a transaction the wallet can never go negative: the debit is
  `find_one_and_update({_id, balance: {$gte: total}}, {$inc: {balance: -total}})`
  — if two checkouts race, only one matches.
- Order numbers come from an atomic `$inc` on `counters`.
- Deleting a dish `$pull`s it from every cart; orders keep their snapshot.

## Handy queries (mongosh)

```js
use feastory

// canteen "Pending" column
db.orders.find({ status: "placed" }).sort({ created_at: 1 })

// today's revenue per dish
db.orders.aggregate([
  { $match: { created_at: { $gte: new Date(new Date().setHours(0,0,0,0)) } } },
  { $unwind: "$items" },
  { $group: { _id: "$items.dish_name",
              qty: { $sum: "$items.quantity" },
              revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } } } },
  { $sort: { revenue: -1 } }
])

// most ordered dishes today (what the home page shows)
db.orders.aggregate([
  { $match: { created_at: { $gte: new Date(new Date().setHours(0,0,0,0)) } } },
  { $unwind: "$items" },
  { $group: { _id: "$items.dish_id", qty: { $sum: "$items.quantity" } } },
  { $sort: { qty: -1 } }, { $limit: 6 }
])

// a student's wallet history
db.wallet_transactions.find({ student_sapid: 70012345678 }).sort({ created_at: -1 })

// reset the manager PIN (hash generated with: python -c "import bcrypt;print(bcrypt.hashpw(b'5678',bcrypt.gensalt()).decode())")
db.canteen_staff.updateOne({ _id: 1234567890 }, { $set: { pin_hash: "<bcrypt hash>" } })
```
