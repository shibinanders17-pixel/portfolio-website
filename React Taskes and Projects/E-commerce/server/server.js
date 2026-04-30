require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const Admin = require("./models/Admin");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "../E-commerce/public/images")));
app.use("/profiles", express.static(path.join(__dirname, "../E-commerce/public/profiles")));

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // ─── Auto Admin Create ─────────────────────────────────
    const existing = await Admin.findOne({ 
      username: process.env.ADMIN_USERNAME 
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD, 10
      );
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: hashedPassword
      });
      console.log("Admin created successfully! ✅");
    } else {
      console.log("Admin already exists! ✅");
    }
  })
  .catch(err => console.log(err));

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
app.use(errorHandler);

app.listen(5002, () => {
  console.log("Server running on port 5002");
});
