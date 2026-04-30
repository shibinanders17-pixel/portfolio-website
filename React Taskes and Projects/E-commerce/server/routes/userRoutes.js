const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const multer = require("multer");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Auth Middleware ───────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.isBlocked) return res.status(403).json({ message: "Your account has been blocked." });
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ─── Multer Config ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../E-commerce/public/profiles"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// ─── Joi Schemas ───────────────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters",
    "string.max": "Name must be at most 50 characters",
    "any.required": "Name is required",
  }),
  username: Joi.string().min(3).max(50).required().messages({
    "string.min": "Username must be at least 3 characters",
    "any.required": "Username is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  phone: Joi.string().min(10).max(10).required().messages({
    "string.min": "Phone number must be 10 digits",
    "string.max": "Phone number must be 10 digits",
    "any.required": "Phone is required",
  }),
  address: Joi.string().min(5).required().messages({
    "string.min": "Address must be at least 5 characters",
    "any.required": "Address is required",
  }),
  pincode: Joi.string().min(6).max(6).required().messages({
    "string.min": "Pincode must be 6 digits",
    "string.max": "Pincode must be 6 digits",
    "any.required": "Pincode is required",
  }),
  dob: Joi.string().optional(),
});

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    "any.required": "Username is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

const orderSchema = Joi.object({
  products: Joi.array().min(1).required().messages({
    "array.min": "At least one product is required",
    "any.required": "Products are required",
  }),
  totalPrice: Joi.number().min(1).required().messages({
    "number.min": "Total price must be greater than 0",
    "any.required": "Total price is required",
  }),
  totalItems: Joi.number().optional(),
  paymentMethod: Joi.string().required().messages({
    "any.required": "Payment method is required",
  }),
  userName: Joi.string().required(),
  phone: Joi.string().min(10).max(10).required().messages({
    "string.min": "Phone number must be 10 digits",
    "string.max": "Phone number must be 10 digits",
    "any.required": "Phone is required",
  }),
  address: Joi.string().min(5).required().messages({
    "string.min": "Address must be at least 5 characters",
    "any.required": "Address is required",
  }),
  pincode: Joi.string().min(6).max(6).optional(),
  useWallet: Joi.boolean().optional(),
  status: Joi.string().optional(),
  purchaseDate: Joi.any().optional(),
  isCartCheckout: Joi.boolean().optional()
});

// ─── Register ──────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({
      message: error.details[0].message
    });
    const { username, password, name, phone, address, pincode, dob } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, name, phone, address, pincode, dob });
    await user.save(); 
    res.json({ status: "success", message: "Registered successfully" });
   
  } catch (error) {
    next(error);
  }
});

// ─── Login ─────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({
      message: error.details[0].message
    });
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

     if (user.isBlocked) return res.status(403).json({ 
    message: "Your account has been blocked" 
  });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ jwt_token: token });
  } catch (error) {
    next(error);
  }
});

// ─── Get Profile ───────────────────────────────────────────
router.get("/profile", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// ─── Upload Profile Image ──────────────────────────────────
router.post("/profile/upload", authMiddleware, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const imagePath = `/profiles/${req.file.filename}`;
    await User.findByIdAndUpdate(req.userId, { profileImg: imagePath });
    res.json({ imagePath });
  } catch (error) {
    next(error);
  }
});


router.get("/products", async (req, res, next) => {
  try {
    const search   = req.query.search   || '';
    const category = req.query.category || 'All';
    const sortBy   = req.query.sort     || 'relevance';

    let query = { isDeleted: { $ne: true } };

    if(search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if(category && category !== 'All') {
      query.category = category;
    }

    let sortOption = {};
    if(sortBy === 'price-low')  sortOption = { price: 1 };
    if(sortBy === 'price-high') sortOption = { price: -1 };

    const products = await Product.find(query).sort(sortOption);
    res.json(products);

  } catch (error) {
    next(error);
  }
});


// ─── Products - Get by ID ──────────────────────────────────
router.get("/products/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// ─── Cart - Get ────────────────────────────────────────────
router.get("/cart", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user.cart);
  } catch (error) {
    next(error);
  }
});

// ─── Cart - Add ────────────────────────────────────────────
router.post("/cart", authMiddleware, async (req, res, next) => {
  try {
    const { productId, name, price, image, qty } = req.body;
    const user = await User.findById(req.userId);
    const existing = user.cart.find(item =>
      item.productId.toString() === productId
    );
    if (!existing) {
      user.cart.push({ productId, name, price, image, qty: qty || 1 });
      await user.save();
    }
    res.json(user.cart);
  } catch (error) {
    next(error);
  }
});

// ─── Cart - Remove ─────────────────────────────────────────
router.delete("/cart/:productId", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    user.cart = user.cart.filter(item =>
      item.productId.toString() !== req.params.productId
    );
    await user.save();
    res.json(user.cart);
  } catch (error) {
    next(error);
  }
});

// ─── Cart - Update Quantity ────────────────────────────────
router.put("/cart/:productId", authMiddleware, async (req, res, next) => {
  try {
    const { qty } = req.body;
    const user = await User.findById(req.userId);
    const item = user.cart.find(item =>
      item.productId.toString() === req.params.productId
    );
    if (item) {
      if (qty <= 0) {
        user.cart = user.cart.filter(i =>
          i.productId.toString() !== req.params.productId
        );
      } else {
        item.qty = qty;
      }
    }
    await user.save();
    res.json(user.cart);
  } catch (error) {
    next(error);
  }
});

// ─── Wishlist - Get ────────────────────────────────────────
router.get("/wishlist", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user.wishlist);
  } catch (error) {
    next(error);
  }
});

// ─── Wishlist - Add ────────────────────────────────────────
router.post("/wishlist", authMiddleware, async (req, res, next) => {
  try {
    const { productId, name, price, image, category } = req.body;
    const user = await User.findById(req.userId);
    const existing = user.wishlist.find(item =>
      item.productId.toString() === productId
    );
    if (!existing) {
      user.wishlist.push({ productId, name, price, image, category });
      await user.save();
    }
    res.json(user.wishlist);
  } catch (error) {
    next(error);
  }
});

// ─── Wishlist - Remove ─────────────────────────────────────
router.delete("/wishlist/:productId", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    user.wishlist = user.wishlist.filter(item =>
      item.productId.toString() !== req.params.productId
    );
    await user.save();
    res.json(user.wishlist);
  } catch (error) {
    next(error);
  }
});

// ─── Place Order ───────────────────────────────────────────
router.post("/orders", authMiddleware, async (req, res, next) => {
  try {
    const { error } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({
      message: error.details[0].message
    });
    const {
      userName, address, pincode, phone, paymentMethod,
      products, totalPrice, totalItems,
      status, purchaseDate
    } = req.body;
    const user = await User.findById(req.userId);

   
    let walletUsed = 0;
    const { useWallet } = req.body;
    if (useWallet && user.wallet > 0) {
      walletUsed = Math.min(user.wallet, totalPrice);
      user.wallet -= walletUsed;
    }

    const order = new Order({
      userId: req.userId,
      userName, address, pincode, phone, paymentMethod,
      products: products || [],
      totalPrice: totalPrice - walletUsed,
      totalItems,
      status: status || "Pending⏳",
      purchaseDate: purchaseDate || new Date()
    });
    await order.save();
    const { isCartCheckout } = req.body;
    
    if (isCartCheckout) {
      user.cart = [];
    } else {
      const orderedProductIds = products.map(p => p.productId.toString());
      user.cart = user.cart.filter(
        item => !orderedProductIds.includes(item.productId.toString())
      );
    }
    await user.save();
    res.json({ status: "success", message: "Order placed", order, walletUsed });
  } catch (error) {
    next(error);
  }
});

// ─── Get Orders ────────────────────────────────────────────
router.get("/orders", authMiddleware, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:orderId", authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.userId
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// ─── Update Order Delivery Details ─────────────────────────
router.put("/orders/:orderId/delivery", authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.userId
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.status.includes("Pending")) {
      return res.status(400).json({ message: "Only pending orders can be edited" });
    }
    const { userName, phone, address, pincode } = req.body;
    order.userName = userName;
    order.phone    = phone;
    order.address  = address;
    order.pincode  = pincode;
    await order.save();
    res.json({ status: "success", message: "Delivery details updated", order });
  } catch (error) {
    next(error);
  }
});

// ─── Cancel Order ──────────────────────────────────────────
router.put("/orders/:orderId/cancel", authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.userId
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.status.includes("Pending")) {
      return res.status(400).json({
        message: "Only pending orders can be cancelled"
      });
    }
    order.status = "Cancelled❌";
    await order.save();
    
    let refundAmount = 0;
    if (order.paymentMethod === "UPI" || order.paymentMethod === "Card") {
      refundAmount = order.totalPrice;
      await User.findByIdAndUpdate(req.userId, {
        $inc: { wallet: refundAmount }
      });
    }

    res.json({
      status: "success",
      paymentMethod: order.paymentMethod,
      refundAmount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;



