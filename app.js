import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import {fileURLToPath} from "url";
import expressLayout from "express-ejs-layouts";
import DbConnect from "./config/DbConnect.js"

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(expressLayout);
app.set("layout", "layout");
app.set("views", path.join(__dirname, "views"));

DbConnect();

app.get("/", (req, res) => {
	res.render("index", {
		title: "email reminder app",
		currentPage: "home",
	});
})

app.get("/about", (req, res) => {
	res.render("about", {
		title: "email reminder app",
		currentPage: "about"
	});
});

app.get("/schedule", (req, res) => {
	res.render("schedule", {
		title: "email reminder app",
		currentPage: "schedule",
	});
})

app.get("/reminders", (req, res) => {
	res.render("reminders", {
		title: "email reminder app",
		currentPage: "reminders",
		reminders: []
	})
})

app.listen(port, ()=> {
	console.log(`server is running at http://localhost:${port}`);
});
