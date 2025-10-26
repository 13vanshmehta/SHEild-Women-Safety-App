// Connecting to database
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');

const dbURI = process.env.MONGODB_URI;

const connection = async () => {
    try {
        await mongoose.connect(dbURI);
        console.log('Connected to Database Successfully!');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

module.exports = connection;
