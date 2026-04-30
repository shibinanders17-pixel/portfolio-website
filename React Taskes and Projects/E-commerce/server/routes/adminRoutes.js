const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET;


const adminMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ message: "Not admin" });
    req.adminId = decoded.adminId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../E-commerce/public/images"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });


router.post("/upload", adminMiddleware, upload.single("image"), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ imagePath: `/images/${req.file.filename}` });
  } catch (error) {
    next(error);
  }
});


router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: "Admin not found" });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    const token = jwt.sign({ adminId: admin._id, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ jwt_token: token });
  } catch (error) {
    next(error);
  }
});


router.get("/stats", adminMiddleware, async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments({ isDeleted: { $ne: true } });
    const totalUsers    = await User.countDocuments();
    const totalOrders   = await Order.countDocuments();
    const orders        = await Order.find();
    const totalRevenue  = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    
    res.json({ totalProducts, totalUsers, totalOrders, totalRevenue });
  } catch (error) {
    next(error);
  }
});


router.get("/products", adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const { search, category } = req.query;

    const filter = { isDeleted: { $ne: true } };

    if (category && category !== "All") {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specs: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).skip(skip).limit(limit);
    res.json({ products, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});


router.get("/products/:id", adminMiddleware, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
});


router.post("/products", adminMiddleware, async (req, res, next) => {
  try {
    const { name, price, image, specs, description, category, originalPrice } = req.body;
    const product = new Product({
      name, price, image, specs,
      description, category, originalPrice
    });
    await product.save();
    res.json({ status: "success", message: "Product created", product });
  } catch (error) {
    next(error);
  }
});


router.put("/products/:id", adminMiddleware, async (req, res, next) => {
  try {
    const { name, price, image, specs, description, category, originalPrice } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, image, specs, description, category, originalPrice },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ status: "success", message: "Product updated", product });
  } catch (error) {
    next(error);
  }
});


router.delete("/products/:id", adminMiddleware, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ status: "success", message: "Product deleted" });
  } catch (error) {
    next(error);
  }
});


router.get("/orders", adminMiddleware, async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ _id: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});


router.get("/orders/:id", adminMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    .populate("userId", "username email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    next(error);
  }
});


router.put("/orders/:id", adminMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ status: "success", message: "Order updated", order });
  } catch (error) {
    next(error);
  }
});


router.get("/users", adminMiddleware, async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    next(error);
  }
});


router.get("/users/:id", adminMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    const orders = await Order.find({ userId: req.params.id }).sort({ _id: -1 });
    res.json({ user, orders });
  } catch (error) {
    next(error);
  }
});


router.patch("/users/:id/block", adminMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
   
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ status: "success" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;