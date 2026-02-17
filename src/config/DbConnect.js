import mongoose from "mongoose";
import express from "express";
import { configDotenv } from "dotenv";

configDotenv();

const DbConnect = async ()=> {
    try {
        await mongoose.connect(process.env.MONGO_URI);
	    console.log("connected to mongoDb ✅");
    } catch (error) {
        console.error(`db connection error: ${error.message}`);
        process.exit(1);
    }
}

export default DbConnect;
