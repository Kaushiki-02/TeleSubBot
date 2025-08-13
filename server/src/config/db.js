const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.NODE_ENV === 'development' ? process.env.MONGO_URI : process.env.MONGO_URI_PROD);
    console.log(`MongoDB ${process.env.NODE_ENV === 'prod' ? "Atlas" : "Compass"} Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
