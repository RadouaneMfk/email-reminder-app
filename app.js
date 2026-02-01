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
import { isNotAuthenticated, isAuthenticated } from "./middleware/auth.js";
import { handleValidationErrors, loginValidation, registerValidation } from "./middleware/validators.js";
import User from "./models/user.js";
import passport from "./config/passport.js";
import session from "express-session";
import { scheduleValidation } from "./middleware/validators.js";
import bcrypt from "bcrypt";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 7,
			httpOnly: true,
			secret: true,
			sameSite: "lax",
		},
	})
)

app.use(passport.initialize());
app.use(passport.session());

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
		currentPage: "about",
	});
});

app.get("/login", isNotAuthenticated, (req, res) => {
	res.render("login", {
		title: "email reminder app",
		currentPage: "login",
	})
})

app.get("/register", isNotAuthenticated, (req, res) => {
	res.render("register", {
		title: "email reminder app",
		currentPage: "register",
	})
})

app.get("/dashboard",isAuthenticated, (req, res) => {
	res.render("dashboard", {
		title: "email reminder app",
		currentPage: "dashboard",
		user: req.user,
	});
})

app.post("/register", 
		isNotAuthenticated,
 		registerValidation,
		handleValidationErrors,
		async (req, res) => {
			if (req.validationErrors) {
				return res.render("register", {
					title: "email reminder app",
					currentPage: "register",
					validationErrors: req.validationErrors,
				});
			}
			try {
				const {name, email, password} = req.body;

				const existUser = await User.findOne({email});
				if (existUser)
				{
					return res.render("register", {
						title: "email reminder app",
						currentPage: "register",
						validationErrors: [{msg: "user already registered!"}],
					})
				}
				const user = new User({name, email, password});
				await user.save();
				const code = String(Math.floor(100000 + Math.random() * 900000));
				const salt = await bcrypt.genSalt(10);
				user.OTPcode = await bcrypt.hash(code, salt);
				user.OTPexpiry = Date.now() + 10 * 60 * 1000;
				await user.save();
				await transporter.sendMail({
					from: process.env.EMAIL_USER,
					to: user.email,
					subject: "your account verification code",
					text: `your verification code is ${code}, will expiry in 10 minutes`,
				})
				req.login(user, (err) => {
					if (err) {
						console.error(err);
						return res.redirect("register");
					}
					return res.redirect("verify-email");
				});
			} catch (error) {
				console.error(error);
				res.render("register", {
					title: "email remider app",
					currentPage: "register",
					validationErrors: [{msg: "An error occured, please try again"}],
				})
			}
	}
)

app.get("/verify-email", isAuthenticated, async (req, res) => {
	res.render("verify-email", {
		title: "email reminder app",
		currentPage: "verify-email",
	})
})

app.post("/verify-email", isAuthenticated, async (req, res) => {
	try {
		const {code} = req.body;
		const user = await User.findById(req.user.id);
		const isMatchOTP = await user.compareOTP(code);
		if (!isMatchOTP)
		{
			return res.render("verify-email", {
				title: "email reminder app",
				currentPage: "verify-email",
				error: "code invalid or has been expired!",
			})
		}
		user.isVerified = true;
		user.OTPcode = undefined;
		user.OTPexpiry = undefined;
		await user.save();
		return res.render("dashboard", {
			title: "email reminder app",
			currentPage: "dashboard",
			user,
		})
	} catch (error) {
		console.error(error);
	}
})

app.post("/login",
		isNotAuthenticated,
		loginValidation,
		handleValidationErrors,
		(req, res, next) => {
			if (req.validationErrors)
			{
				return res.render("login", {
					title: "email reminder app",
					currentPage: "login",
					errors: req.validationErrors,
				})
			}
			passport.authenticate("local", (err, user, info) => {
				if (err)
					return next(err);

					if (!user) {
						return res.render("login", {
							title: "email reminder app",
							currentPage: "login",
							errors: [{msg: info.message || "Invalid email or password!"}],
						})
					}
					
					req.login(user, (err) => {
						if (err){
							console.error(err);
							return res.redirect("login");
						}
						return res.redirect("dashboard");
					})
			})(req, res, next);
		}
);

app.post("/logout", (req, res, next) => {
	if (req.session) {
		req.session.destroy((err) => {
			if (err)
				return next(err);
			res.redirect("/");
		})
	}
})

app.get("/schedule", isAuthenticated, (req, res) => {
	res.render("schedule", {
		title: "email reminder app",
		currentPage: "schedule",
		success: req.query.success,
		userEmail: req.user.email,
		error: req.query.error,
	});
})

app.get("/reminders", isAuthenticated, async (req, res) => {
	try {
		const reminders = await Reminder.find({
			userId: req.user.id,
		}).sort({scheduledTime: 1});
		res.render("reminders", {
			title: "email reminder app",
			currentPage: "reminders",
			reminders: reminders,
		});
	} catch (error) {
		console.error(error);
		res.render("reminders", {
			title: "email reminder app",
			currentPage: "reminders",
			reminders: [],
		})
	}
})

app.post("/schedule",
		isAuthenticated,
		scheduleValidation,
		handleValidationErrors,
		async (req, res) => {
			if (req.validationErrors)
			{
				return res.render("schedule", {
					title: "email reminder app",
					currentPage: "schedule",
					userEmail: req.user.email,
					error: req.validationErrors[0],
				})
			}
		try {
			const {message, datetime} = req.body;
			const reminder = new Reminder({
				userId: req.user.id,
				email: req.user.email,
				message,
				scheduledTime: new Date(datetime),
			})
			await reminder.save();
			return res.redirect("schedule?success=true");
		} catch (error) {
			console.error(error);
			return res.render("schedule", {
				title: "email reminder app",
				currentPage: "schedule",
				userEmail: req.user.email,
				error: {msg: "Error scheduling reminder. Please try again."},
			});
		}
})

app.post("/reminders/delete/:id", isAuthenticated, async (req, res) => {
	try {
		await Reminder.findByIdAndDelete({
			_id: req.params.id,
			userId: req.user.id,
		})
		return res.redirect("/reminders");
	} catch (error) {
		console.error(error);
		return res.redirect("reminders");
	}
})

app.get("/reminders/edit/:id", isAuthenticated, async (req, res) => {
try {
		const reminder = await Reminder.findById(req.params.id);
	
		if (!reminder)
			return res.redirect("/reminders");
	
		return res.render("edit-reminder", {
			title: "email reminder app",
			currentPage: "edit-reminder",
			reminder,
		})
} catch (error) {
	console.error(error);
	return res.render("/reminders");
}
})

app.post("/reminders/edit/:id", isAuthenticated,
		scheduleValidation,
		handleValidationErrors,
		async (req, res) => {
			const reminder = await Reminder.findById(req.params.id);
			if (req.validationErrors) {
				return res.render("edit-reminder", {
					title: "email reminder app",
					currentPage: "edit-reminder",
					reminder,
					error: req.validationErrors[0],
				})
			}
	try {
		const {message, datetime} = req.body;
		const {id} = req.params;

		await Reminder.findByIdAndUpdate(id, {
			message,
			scheduledTime: datetime,
		},
		{
			new: true,
			runValidators: true,
		})
		return res.redirect("/reminders");
	} catch (error) {
		console.error(error);
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
