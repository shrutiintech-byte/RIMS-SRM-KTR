
const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "RIMS - Research Incentive Management System API",
      version: "1.0.0",
      description:
        "Interactive API documentation and testing for the RIMS Faculty and Admin management system.",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
    ],

    // JWT authentication configuration
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token obtained after login.",
        },
      },

      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Request completed successfully",
            },
          },
        },

        LoginRequest: {
          type: "object",
          required: ["identifier", "password"],
          properties: {
            identifier: {
              type: "string",
              example: "admin@rims.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "YourAdminPassword",
            },
          },
        },

        RejectRegistrationRequest: {
          type: "object",
          required: ["rejectionReason"],
          properties: {
            rejectionReason: {
              type: "string",
              example:
                "Please provide valid supporting documents.",
            },
          },
        },
      },
    },

    // Apply JWT authentication globally in Swagger
    security: [
      {
        BearerAuth: [],
      },
    ],
  },

  apis: [
    path.resolve(__dirname, "../routes/adminRoutes.js"),
    path.resolve(__dirname, "../routes/authRoutes.js"),
    path.resolve(__dirname, "../routes/claimRoutes.js"),
    path.resolve(__dirname, "../routes/dashboardRoutes.js"),
    path.resolve(__dirname, "../routes/documentRoutes.js"),
    path.resolve(__dirname, "../routes/notificationRoutes.js"),
    path.resolve(__dirname, "../routes/reportRoutes.js"),
    path.resolve(__dirname, "../routes/settingsRoutes.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
