import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import agentRoutes from './routes/agent.routes';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/order.routes';
import ordersRoute from './routes/orders.route';
import referralRoutes from './routes/referral.routes';
import paymentRoutes from './routes/payment.route';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from localhost:3000 and localhost:3001
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CLIENT_URL
    ].filter(Boolean); // Remove undefined values
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, // Dynamic origin handling for development
  credentials: true, // Allow cookies to be sent with requests
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow these methods
  allowedHeaders: ['Content-Type', 'Authorization', 'Credentials'] // Explicitly allow these headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', ordersRoute);
app.use('/api/order', orderRoutes); // Individual order routes
app.use('/api/referral', referralRoutes);
app.use('/api/payment', paymentRoutes);



// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Function to initialize the server and create default admin if not exists
async function initializeServer() {
  try {
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Check if default admin exists, create if not
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@me.com' },
    });

    if (!existingAdmin) {
      console.log('Creating default admin user...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await prisma.user.create({
        data: {
          email: 'admin@me.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      
      console.log('Default admin user created successfully.');
      console.log('Email: admin@me.com');
      console.log('Password: 123456 (please change after first login)');
    } else {
      console.log('Default admin user already exists.');
    }
  } catch (error) {
    console.error('Error initializing server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});


// console.log("Hello world")