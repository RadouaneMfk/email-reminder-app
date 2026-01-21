import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import {fileURLToPath} from "url";
import expressLayout from "express-ejs-layouts";
import DbConnect from "./config/DbConnect.js"
import Reminder from "./models/reminder.js";

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

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	}
})

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

app.get("/reminders", async(req, res) => {
	try {
		const reminders = await Reminder.find().sort({scheduledTime: 1});
		res.render("reminders", {
			title: "email reminder app",
			currentPage: "reminders",
			reminders,
		})
	} catch (error) {
		console.log(error.message);
	}
})

app.post("/schedule", async(req, res) => {
	try {
		const {email, message, datetime} = req.body;

		const reminder = new Reminder({
			email,
			message,
			scheduledTime: new Date(datetime),
		})
		await reminder.save();
		res.redirect("/schedule?success=true");
	} catch (error) {
		res.redirect("/schedule?error=true");
	}
})

cron.schedule("* * * * *", async (req, res) => {
	try {
		const now = new Date();
		const reminders = await Reminder.find({
			scheduledTime: {$lte: now},
			sent: false,
		})
		for (const reminder of reminders)
		{
			await transporter.sendMail({
				from: process.env.EMAIL_USER,
				to: reminder.email,
				text: reminder.message,
				subject: "email reminder app",
			})
			reminder.sent = true;
			await reminder.save();
		}
	} catch (error) {
		console.log("error in sending email", error);
	}
})

app.listen(port, ()=> {
	console.log(`server is running at http://localhost:${port}`);
});
