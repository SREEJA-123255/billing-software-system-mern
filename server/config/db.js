const mongoose = require("mongoose");
const dns = require("dns");

const connectDB = async () => {
  // Use public Google DNS servers to resolve MongoDB SRV records on Windows networks
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  } catch (dnsErr) {
    // Ignore if not supported in environment
  }

  const primaryUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/billing_system";
  const localUri = "mongodb://127.0.0.1:27017/billing_system";

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 6000
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Primary MongoDB Connection Failed: ${error.message}`);

    if (error.message.includes("whitelist") || error.message.includes("Could not connect to any servers")) {
      console.warn("⚠️  MongoDB Atlas IP Access Warning: Your current IP address is not whitelisted in MongoDB Atlas.");
      console.warn("👉 To fix Atlas: Go to MongoDB Atlas -> Network Access -> Add IP Address -> Select 'Allow Access from Anywhere' (0.0.0.0/0).");
    }

    // Attempt automatic fallback to running local MongoDB instance if cloud fails
    if (primaryUri !== localUri) {
      console.log("🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/billing_system)...");
      try {
        const localConn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
        console.log(`✅ Connected to Local MongoDB fallback: ${localConn.connection.host}`);
        return localConn;
      } catch (localErr) {
        console.error("❌ Local MongoDB fallback also failed:", localErr.message);
      }
    }

    process.exit(1);
  }
};

module.exports = connectDB;
