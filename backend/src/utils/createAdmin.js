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

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const createAdmin = async () => {
  try {
    const fullName = await askQuestion(
      "Admin full name: "
    );

    const employeeId = await askQuestion(
      "Admin employee ID: "
    );

    const email = await askQuestion(
      "Admin email: "
    );

    const password = await askQuestion(
      "Admin password: "
    );

    if (
      !fullName ||
      !employeeId ||
      !email ||
      !password
    ) {
      console.log("All fields are required.");
      rl.close();
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const existingUser = await User.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { employeeId: employeeId.trim() },
      ],
    });

    if (existingUser) {
      console.log(
        "A user with this email or employee ID already exists."
      );

      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const admin = await User.create({
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      department: "Administration",
      designation: "System Administrator",
      declarationAccepted: true,
      lastLogin: null,
    });

    console.log("\nAdmin account created successfully.");
    console.log({
      employeeId: admin.employeeId,
      email: admin.email,
      role: admin.role,
      accountStatus: admin.accountStatus,
    });

    await mongoose.disconnect();
    rl.close();

    process.exit(0);
  } catch (error) {
    console.error(
      "Failed to create admin:",
      error.message
    );

    try {
      await mongoose.disconnect();
    } catch {}

    rl.close();
    process.exit(1);
  }
};

createAdmin();