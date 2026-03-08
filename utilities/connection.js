// Connecting to database
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google's DNS so Atlas SRV records resolve correctly
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const dbURI = process.env.MONGODB_URI;

const connection = async () => {
    const tryConnect = async () => {
        try {
            await mongoose.connect(dbURI, {
                serverSelectionTimeoutMS: 15000,
            });
            console.log('✅ Connected to Database Successfully!');
        } catch (error) {
            console.error('❌ Database connection error:', error.message);
            console.log('🔄 Retrying database connection in 5 seconds...');
            setTimeout(tryConnect, 5000);
        }
    };
    await tryConnect();
};

module.exports = connection;
