
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const dotenv = require("dotenv");

const User = require("../models/User");

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question) =>
  new Promise((resolve) => {
    rl.question(question, resolve);
  });

const resetAdminPassword = async () => {
  try {
    const email = await askQuestion("Admin email: ");
    const newPassword = await askQuestion(
      "Enter new password: "
    );

    if (!email.trim() || !newPassword) {
      throw new Error("Email and password are required.");
    }

    if (newPassword.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters."
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");

    const admin = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "ADMIN",
    });

    if (!admin) {
      throw new Error("Admin account not found.");
    }

    admin.passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    await admin.save();

    console.log("Admin password reset successfully.");
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    rl.close();
  }
};

resetAdminPassword();