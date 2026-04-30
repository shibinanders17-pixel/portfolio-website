
const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  price: Number,
  image: String,
  qty: { type: Number, default: 1 }
});

const wishlistItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  price: Number,
  image: String,
  category: String
});

const userSchema = new mongoose.Schema({
  username:           { type: String, required: true, unique: true },
  password:           { type: String, required: true },
  name:               String,
  phone:              String,
  address:            String,
  pincode:            String,
  dob:                String,
  profileImg:         { type: String, default: "" },
  accountCreatedDate: { type: Date, default: Date.now },
  isDeleted:          { type: Boolean, default: false },
  cart:               [cartItemSchema],
  wishlist:           [wishlistItemSchema],
  wallet:             { type: Number, default: 0 },
  isBlocked:          { type: Boolean, default: false }
});

module.exports = mongoose.model("User", userSchema);