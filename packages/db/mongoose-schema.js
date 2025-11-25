// MongoDB schema for hoodie-nfc-tg
// This collection will store hoodie signup data

/*
Collection: hoodies
Structure: {
  _id: ObjectId,
  code: String (unique, 6 chars),
  firstName: String,
  tgHandle: String,
  email: String,
  size: String,
  status: String ('pending' | 'burned'),
  createdAt: Date,
  burnedAt: Date (optional)
}

Indexes:
- code (unique)
- status
- createdAt
*/

// You can create these indexes in MongoDB Compass or programmatically:
// db.hoodies.createIndex({ "code": 1 }, { unique: true })
// db.hoodies.createIndex({ "status": 1 })
// db.hoodies.createIndex({ "createdAt": 1 })