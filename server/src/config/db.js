import dns from 'node:dns';
import mongoose from 'mongoose';

// Force public DNS inside Node (system resolver refuses SRV on some networks)
try { dns.setServers(['1.1.1.1', '8.8.8.8']); } catch {}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }

  // Graceful shutdown: SIGTERM (docker stop / Render deploy) closes the pool
  // instead of killing in-flight queries mid-write, then exits.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      console.log(`${signal} received — closing MongoDB connection`);
      try { await mongoose.disconnect(); } finally { process.exit(0); }
    });
  }
};

export default connectDB;
