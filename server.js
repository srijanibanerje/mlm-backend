const express = require('express');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./config/db_connection');
const client = require('./config/redis');
const PORT = process.env.PORT || 3000;


const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static('./public'));
const path = require('path');
app.use('/public', express.static(path.join(__dirname, 'public')));


// routes
const authRoutes = require('./routes/authRoute');
const adminRoutes = require('./routes/adminRoute');
const userRoutes = require('./routes/userRoute');
const franchiseRoutes = require('./routes/franchiseRoutes');
const payoutRoutes = require('./routes/payoutRoute');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/franchise', franchiseRoutes);
app.use('/api/payouts', payoutRoutes);

app.listen(PORT);