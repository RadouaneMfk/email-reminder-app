import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import expressLayouts from "express-ejs-layouts";

configDotenv();

const __dirname = path.dirname();
console.log(__dirname);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set(expressLayouts);
app.set("layout", "layout");

app.listen(port, ()=> {
	console.log(`server is running at http://localhost:${port}`);
});
