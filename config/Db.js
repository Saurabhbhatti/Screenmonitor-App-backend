import { connect } from "mongoose";

// database configuration 
const Db = async () => {
  try {
    const connection = await connect(process.env.DATABASE_URL);
    console.log("DATABASE CONNECTED");
    return connection;
  } catch (err) {
    console.log("DATABASE CONNECTION ERROR", err);
    process.exit(1);
  }
};

export default Db;
