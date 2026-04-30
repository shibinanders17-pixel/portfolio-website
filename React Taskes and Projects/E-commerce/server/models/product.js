const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title:         String,
  name:          String,
  price:         Number,
  originalPrice: Number,
  image:         String,
  specs:         String,
  description:   String,
  category:      String,
  isDeleted:     { type: Boolean, default: false }
});

module.exports = mongoose.model("Product", productSchema);