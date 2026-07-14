require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { secureHeaders,limiter,hpp} = require('./middleware/security');

//routes
const authRoutes = require('./route/authRoutes');
const wallet = require('./route/walletRoute');
const verifications = require('./route/mainVerificationsRoute');
const transactions = require('./route/transactionRoute');
const vtuPurchase = require('./route/vtuRoute');
const notifications = require('./route/notificationRoute');
const admin = require('./route/adminRoute');
const message = require('./route/messageRoutes');
const plans = require('./route/planRoutes')
const handleXixapayWebhook = require('./controller/walletController')

const app = express();

connectDB();
app.use(cors({
  origin: ['http://localhost:5173','https://smdata.com.ng','https://admin.smdata.com.ng'],
  methods: 'GET,POST,PUT,DELETE,PATCH',
  credentials: true,
}));

app.use('/api/wallet/webhook/xixapay', express.raw({ type: 'application/json' }));

app.set('trust proxy', 1); 
app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>API is working</h1>");
});
app.use(secureHeaders);
app.use(hpp);
app.use(limiter);

//routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', wallet);
app.use('/api/verify', verifications);
app.use("/api/vtu", vtuPurchase);
app.use('/api/transactions', transactions);
app.use('/api/admin', admin);
app.use('/api/message', message);
app.use('/api/data-plan', plans);
app.use('/api/notifications', notifications);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>{
    console.log(`server running on port ${PORT}`);
})
