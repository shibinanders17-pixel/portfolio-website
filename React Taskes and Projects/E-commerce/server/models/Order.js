const mongoose = require("mongoose");

const orderProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name:      String,
  image:     String,
  price:     Number,
  quantity:  { type: Number, default: 1 }
});

const orderSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName:      String,
  email:         String,
  address:       String,
  pincode:       String, 
  phone:         String,
  paymentMethod: String,
  products:      [orderProductSchema],
  orderId:       { type: String, default: () => "ORD" + Date.now() },
  purchaseDate:  { type: Date, default: Date.now },
  totalPrice:    Number,
  totalItems:    Number,
  status:        { type: String, default: "Pending⏳" }
});

module.exports = mongoose.model("Order", orderSchema);