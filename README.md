# AWM Store - Backend

This is the backend API server for the AWM Store e-commerce platform, built with Node.js, Express, and Prisma ORM.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Built-in validation in controllers
- **Environment Management**: dotenv

## Features

- RESTful API endpoints for all e-commerce functionality
- User authentication and authorization (admin/agent roles)
- Product management system
- Order processing and management
- Commission tracking for agents
- Referral system with tracking
- Admin dashboard data endpoints
- Agent dashboard data endpoints
- Secure API endpoints with JWT authentication

## Database Schema

The application uses Prisma ORM with PostgreSQL database. Key entities include:

- **User**: Stores user information (admins and agents)
- **Product**: Product catalog with pricing and inventory
- **Order**: Order details and status tracking
- **Commission**: Agent commission records
- **Referral**: Referral tracking system
- **Payout**: Agent payout records

## Directory Structure

```
server/
├── src/
│   ├── controllers/      # Request handlers
│   │   ├── admin.controller.ts
│   │   ├── agent.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── product.controller.ts
│   │   ├── order.controller.ts
│   │   └── referral.controller.ts
│   ├── routes/          # API route definitions
│   │   ├── admin.routes.ts
│   │   ├── agent.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── products.routes.ts
│   │   ├── order.routes.ts
│   │   └── referral.routes.ts
│   ├── middlewares/     # Custom middleware
│   │   └── auth.middleware.ts
│   ├── utils/           # Utility functions
│   │   └── jwt.ts
│   └── server.ts        # Main server entry point
├── prisma/              # Prisma schema and migrations
│   ├── schema.prisma    # Database schema definition
│   ├── migrations/      # Database migration files
│   └── seed.ts          # Initial data seeding script
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables
└── tsconfig.json        # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm package manager
- PostgreSQL database server

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd a-world-marketing/server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```
Then edit `.env` with your actual values:
```
PORT=5002
DATABASE_URL="postgresql://username:password@localhost:5432/awm_store"
ACCESS_TOKEN_SECRET="your-super-secret-access-token-key"
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key"
NODE_ENV=development
CLIENT_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

4. Set up the database:
```bash
npx prisma db push
npx prisma db seed
```

5. Run the development server:
```bash
npm run dev
```

The API server will be available at `http://localhost:5002`

## Deployment

### Deploying to Render

The application is configured to deploy on Render. Follow these steps:

1. **Create a Render Web Service**:
   - Connect your GitHub repository
   - Select the `server` folder as the root directory
   - Choose Node.js as the environment

2. **Configure Environment Variables**:
   In your Render dashboard, add the following environment variables in the "Environment" section:
   
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   PORT=10000
   NODE_ENV=production
   ACCESS_TOKEN_SECRET=your-secret-here
   REFRESH_TOKEN_SECRET=your-secret-here
   CLIENT_URL=https://your-frontend-domain.com
   FRONTEND_URL=https://your-frontend-domain.com
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

3. **Build and Deploy Commands**:
   - Build: `npm install; npm run build`
   - Start: `node dist/server.js` or `npm start`

4. **Important Notes**:
   - Make sure your Supabase database is accessible from Render's IP range
   - The server will start listening on a port immediately and handle database initialization asynchronously
   - If the database is unavailable initially, the server will continue running and retry initialization
   - Ensure your `NODE_ENV` is set to `production` for production deployments

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh-token` - Refresh JWT token

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order (admin only)

### Users (Admin & Agent)
- `GET /api/admin/agents` - Get all agents
- `GET /api/agent/:id` - Get agent by ID
- `PUT /api/admin/agents/:id/status` - Update agent status (admin only)

### Admin Dashboard
- `GET /api/admin/dashboard/metrics` - Dashboard metrics
- `GET /api/admin/dashboard/daily-sales` - Daily sales data
- `GET /api/admin/dashboard/monthly-revenue` - Monthly revenue
- `GET /api/admin/dashboard/top-agents` - Top performing agents

### Agent Dashboard
- `GET /api/agent/:id/commissions` - Agent commissions
- `GET /api/agent/:id/payouts` - Agent payouts
- `GET /api/agent/:id/referrals` - Agent referrals
- `GET /api/agent/:id/profile` - Agent profile

## Environment Variables

The application requires the following environment variables:

- `PORT` - Port number for the server (default: 5002)
- `DATABASE_URL` - PostgreSQL database connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `JWT_EXPIRES_IN` - JWT expiration time (e.g., "7d" for 7 days)
- `NODE_ENV` - Environment mode (development/production)

## Authentication

The API uses JWT-based authentication. Protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Admin routes require admin role, while agent routes require agent role.

## Database Migrations

Prisma is used for database schema management:

- `npx prisma migrate dev` - Create and apply a new migration
- `npx prisma db push` - Push schema changes to database (development)
- `npx prisma generate` - Generate Prisma client
- `npx prisma studio` - Open Prisma Studio UI for database inspection

## Available Scripts

- `npm run dev` - Start the development server with nodemon
- `npm start` - Start the production server
- `npm run build` - Build the TypeScript code

## API Documentation

The API follows REST conventions with appropriate HTTP status codes:

- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST request
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Error Handling

The application includes comprehensive error handling with appropriate HTTP status codes and descriptive error messages. Validation is performed on all incoming requests.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Input validation to prevent injection attacks
- CORS configured to allow specific origins

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure all tests pass
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License.