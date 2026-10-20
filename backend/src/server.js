
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

dotenv.config();

const connectDatabase = require("./config/database");

// Route imports
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const claimRoutes = require("./routes/claimRoutes");
const documentRoutes = require("./routes/documentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Error middleware
const {
  errorMiddleware,
} = require("./middleware/errorMiddleware");

const app = express();

/*
 * CORS configuration.
 * Allow the Vite development and production preview origins.
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:4173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as
      // local scripts and server-to-server requests.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked this origin: ${origin}`)
      );
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/*
 * Parse request bodies.
 */
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
 * Swagger UI for API testing and documentation.
 */
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

/*
 * Serve uploaded profile photographs.
 */
app.use(
  "/uploads/profile-photos",
  express.static(
    path.join(
      __dirname,
      "../uploads/profile-photos"
    )
  )
);

/*
 * Health check.
 */
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "RIMS Backend API is running",
  });
});

/*
 * API routes.
 */

// Authentication
app.use("/api/auth", authRoutes);

// Faculty dashboard
app.use("/api/dashboard", dashboardRoutes);

// Claims
app.use("/api/claims", claimRoutes);

// Documents
app.use("/api/documents", documentRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Reports
app.use("/api/reports", reportRoutes);

// Settings
app.use("/api/settings", settingsRoutes);

// Admin management
app.use("/api/admin", adminRoutes);

/*
 * Handle unknown API routes.
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "The requested API endpoint was not found",
  });
});

/*
 * Centralized error handler.
 * This must remain after all routes.
 */
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

/*
 * Start the application only after MongoDB connects.
 */
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(
        `RIMS Backend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start RIMS backend:",
      error.message
    );

    process.exit(1);
  }
};

startServer();
