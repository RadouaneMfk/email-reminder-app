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
import { handleValidationErrors, loginValidation, registerValidation, resetPasswordValidator } from "./middleware/validators.js";
import User from "./models/user.js";
import passport from "./config/passport.js";
import session from "express-session";
import { scheduleValidation } from "./middleware/validators.js";
import bcrypt from "bcrypt";
import { isUserVerified } from "./middleware/auth.js";
import { sentOtpCode } from "./middleware/auth.js";
import {ReSentOtpCode} from "./middleware/auth.js";
import MongoStore from "connect-mongo";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { StatusCode } from "express-status-code";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());

const globalLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 100,
	message: {error: 'to many requests, try again later'},
});

const authLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 10,
	skipSuccessfulRequests: true,
	message: {error: 'too many requests, wait 15 minutes'},
})

app.use(globalLimiter);

app.use("/login", authLimiter);
app.use("/register", authLimiter);
app.use("/forgot-password", authLimiter);
app.use("/reset-password", authLimiter);
app.use("/verify-email", authLimiter);
app.use("/resend-verification", authLimiter);

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			maxAge: 1000 * 60 * 60 * 24 * 7,
			httpOnly: true,
			sameSite: "lax",
		},
		store: MongoStore.create({
			mongoUrl: process.env.MONGO_URI,
			ttl: 1000 * 60 * 60 * 24 * 7,
		})
	})
)

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
	res.locals.user = req.user || null;
	next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(expressLayout);
app.set("layout", "layout");
app.set("views", path.join(__dirname, "views"));

DbConnect();

export const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	}
})

app.get("/", (req, res) => {
	res.status(StatusCode.OK).render("index", {
		title: "email reminder app",
		currentPage: "home",
	});
})

app.get("/about", (req, res) => {
	res.status(StatusCode.OK).render("about", {
		title: "email reminder app",
		currentPage: "about",
	});
});

app.get("/forgot-password", (req, res) => {
	res.status(StatusCode.OK).render("forgot-password", {
		title: "email reminder app",
		currentPage: "forgot-password",
	})
})

app.get("/login", isNotAuthenticated, (req, res) => {
	res.status(StatusCode.OK).render("login", {
		title: "email reminder app",
		currentPage: "login",
	})
})

app.get("/register", isNotAuthenticated, (req, res) => {
	res.status(StatusCode.OK).render("register", {
		title: "email reminder app",
		currentPage: "register",
	})
})

app.get("/dashboard", isAuthenticated, isUserVerified, (req, res) => {
	res.status(StatusCode.OK).render("dashboard", {
		title: "email reminder app",
		currentPage: "dashboard",
		user: req.user,
	});
})

app.get("/reset-password/:token", (req, res) => {
	res.status(StatusCode.OK).render("reset-password", {
		title: "email reminder app",
		currentPage: "reset-password",
		token: req.params.token,
	});
})

app.get('/auth/google', passport.authenticate("google", {scope: ["profile", "email"]}));

app.get('/auth/google/callback', 
		passport.authenticate("google", {failureRedirect: '/login'}),
		(req, res) => {
			res.redirect("/dashboard");
		}
)

app.post("/reset-password/:token", resetPasswordValidator, handleValidationErrors, async (req, res) => {
	if (req.validationErrors)
	{
		return res.status(StatusCode.BadRequest).render("reset-password", {
			title: "email reminder app",
			currentPage: "reset-password",
			token: req.params.token,
			error: req.validationErrors[0].msg,
		})
	}
	try {
		const {password} = req.body;
		const {token} = req.params;
		
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findOne({
			_id: decoded.id,
			resetPasswordToken: token,
		})
		if (!user || user.resetPasswordExpires < Date.now()) {
			return res.status(StatusCode.BadRequest).render("reset-password", {
				title: "email reminder app",
				currentPage: "reset-password",
				token,
				error: "token invalid or has been expired, please request a new password reset",
			})
		}
		user.password = password;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpires = undefined;
		await user.save();
		return res.render("reset-password", {
			title: "email reminder app",
			currentPage: "reset-password",
			token,
			success: "password has been reset successfully, you can login now with your new password",
		})
	} catch (error) {
		console.error(error.message);
	}
})

app.post("/forgot-password", async (req, res) => {
	try {
		const {email} = req.body;
		const user = await User.findOne({email});
		if (!user)
		{
			return res.render("forgot-password", {
				title: "email reminder app",
				currentPage: "forgot-password",
				success: "if this account exist, a reset link was sent. check inbox"
			})
		}
		const resetToken = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
			expiresIn: "1hr",
		})
		if (user && ((Date.now() - user.resetPasswordlastSendAt < 60 * 1000)))
		{
			return res.status(StatusCode.BadRequest).render("forgot-password", {
				title: "email reminder app",
				currentPage: "forgot-password",
				error: "please wait 1 minute before request new reset password",
			})
		}
		user.resetPasswordToken = resetToken;
		user.resetPasswordExpires = Date.now() + (60 * 60 * 1000);
		user.resetPasswordlastSendAt = Date.now();
		const resultUrl = `http://${req.headers.host}/reset-password/${resetToken}`;
		const emailOptions = {
			to: user.email,
			subject: "Reset Password Request",
			html: `<h2>you requested a password reset. click the link below to reset your password:</h2>
				<a href=${resultUrl}>reset password</a>
				<p>the link will expire in 1 hour.</p>
				<p>if you don't request nothing just ignore this email.</p>
			`
		}
		await user.save();
		await transporter.sendMail(emailOptions);
		return res.render("forgot-password", {
			title: "email reminder app",
			currentPage: "forgot-password",
			success: "if this account exist, a reset link was sent. check inbox",
		})
	} catch (error) {
		return res.status(StatusCode.BadRequest).render("forgot-password", {
			title: "email reminder app",
			currentPage: "forgot-password",
			error: "error processing the request, please try again.",
		})
	}
})

app.post("/register", 
		isNotAuthenticated,
 		registerValidation,
		handleValidationErrors,
		async (req, res) => {
			if (req.validationErrors) {
				return res.status(StatusCode.BadRequest).render("register", {
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
					return res.status(StatusCode.BadRequest).render("register", {
						title: "email reminder app",
						currentPage: "register",
						validationErrors: [{msg: "user already registered!"}],
					})
				}
				const user = new User({name, email, password});
				await user.save();
				await sentOtpCode(user);
				req.login(user, (err) => {
					if (err) {
						console.error(err);
						return res.redirect("register");
					}
					return res.render("verify-email", {
						title: "email reminder app",
						currentPage: "verify-email",
						email: user.email,
					});
				});
			} catch (error) {
				console.error(error);
				res.status(StatusCode.BadRequest).render("register", {
					title: "email remider app",
					currentPage: "register",
					validationErrors: [{msg: "An error occured, please try again"}],
				})
			}
	}
)

app.get("/verify-email", isAuthenticated, async (req, res) => {
	const user = await User.findById(req.user.id);
	res.render("verify-email", {
		title: "email reminder app",
		currentPage: "verify-email",
		email: user.email,
	})
})

app.post("/verify-email", isAuthenticated, async (req, res) => {
	try {
		const {code} = req.body;
		const user = await User.findById(req.user.id);
		if (!user.OTPexpiry || user.OTPexpiry < Date.now())
		{
			return res.status(StatusCode.BadRequest).render("verify-email", {
				title: "email reminder app",
				currentPage: "verify-email",
				error: "code invalid or has been expired!",
				email: user.email,
			})
		}
		const isMatchOTP = await user.compareOTP(code);
		if (!isMatchOTP)
		{
			return res.status(StatusCode.BadRequest).render("verify-email", {
				title: "email reminder app",
				currentPage: "verify-email",
				error: "code invalid or has been expired!",
				email: user.email,
			})
		}
		user.isVerified = true;
		user.OTPcode = undefined;
		user.OTPexpiry = undefined;
		user.OTPlastSendAt = undefined;
		const mailOptions = {
			to: user.email,
			subject: "Welcome to Email Reminder App",
			html: `
				<h2>Welcome to Email Reminder App</h2>
				<p>hey ${user.name}, Your account has been successfully created</p>
				<p>You can now use the app to schedule your important tasks and never forget a thing.</p>
			`
		};
		await user.save();
		await transporter.sendMail(mailOptions);
		if (user.isVerified) {
			req.login(user, (err) => {
				if (err) {
					console.error(err);
					return res.redirect("register");
				}
				return res.redirect("dashboard");
			});
		}
	} catch (error) {
		console.error(error);
	}
})

app.post("/resend-verification", isAuthenticated, async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (user.isVerified)
			return res.redirect("dashboard");
		await ReSentOtpCode(user);

		return res.render("verify-email", {
			title: "email reminder app",
			currentPage: "verify-email",
			email: user.email,
			success: "another verification code has been sent to you email!",
		})
	} catch (error) {
		return res.status(StatusCode.BadRequest).render("verify-email", {
			title: "email reminder app",
			currentPage: "verify-email",
			email: req.user.email,
			error: error.message || "please wait before requesting another code!",
		})
	}
})

app.post("/login",
		isNotAuthenticated,
		loginValidation,
		handleValidationErrors,
		(req, res, next) => {
			if (req.validationErrors)
			{
				return res.status(StatusCode.BadRequest).render("login", {
					title: "email reminder app",
					currentPage: "login",
					errors: req.validationErrors,
				})
			}
			passport.authenticate("local", async (err, user, info) => {
				if (err)
					return next(err);

					if (!user) {
						return res.status(StatusCode.BadRequest).render("login", {
							title: "email reminder app",
							currentPage: "login",
							errors: [{msg: info.message || "Invalid email or password!"}],
						})
					}
					if (!user.isVerified) {
						if (!user.OTPexpiry || user.OTPexpiry < Date.now())
							await sentOtpCode(user);
						return req.login(user, (err) => {
							if (err) {
								console.error(err);
								return res.redirect("login");
							}
							return res.redirect("verify-email");
						})
					}
					return req.login(user, (err)=> {
						if (err)
							return res.redirect("login");
						return res.render("dashboard", {
							title: "email reminder app",
							currentPage: "dashboard",
							user,
						});
					})
			})(req, res, next);
		}
);

app.post("/logout", isAuthenticated, (req, res, next) => {
	if (req.session) {
		req.session.destroy((err) => {
			if (err)
				return next(err);
			res.redirect("/");
		})
	}
})

app.get("/schedule", isAuthenticated, isUserVerified, (req, res) => {
	res.render("schedule", {
		title: "email reminder app",
		currentPage: "schedule",
		success: req.query.success,
		userEmail: req.user.email,
		error: req.query.error,
	});
})

app.get("/reminders", isAuthenticated, isUserVerified, async (req, res) => {
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
		isUserVerified,
		scheduleValidation,
		handleValidationErrors,
		async (req, res) => {
			if (req.validationErrors)
			{
				return res.status(StatusCode.BadRequest).render("schedule", {
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
			return res.status(StatusCode.BadRequest).render("schedule", {
				title: "email reminder app",
				currentPage: "schedule",
				userEmail: req.user.email,
				error: {msg: "Error scheduling reminder. Please try again."},
			});
		}
})

app.post("/reminders/delete/:id", isAuthenticated, isUserVerified, async (req, res) => {
	try {
		await Reminder.findOneAndDelete({
			_id: req.params.id,
			userId: req.user.id,
			sent: false,
		});
		return res.redirect("/reminders");
	} catch (error) {
		console.error(error);
		return res.redirect("reminders");
	}
})

app.get("/reminders/edit/:id", isAuthenticated, isUserVerified, async (req, res) => {
try {
		const reminder = await Reminder.findOne({
			_id: req.params.id,
			userId: req.user.id,
		})
	
		if (!reminder || reminder.sent)
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
		isUserVerified,
		scheduleValidation,
		handleValidationErrors,
		async (req, res) => {
			const reminder = await Reminder.findOne({
				_id: req.params.id,
				userId: req.user.id,
			})
			if (!reminder || reminder.sent)
				return res.redirect("/reminders");
			if (req.validationErrors) {
				return res.status(StatusCode.BadRequest).render("edit-reminder", {
					title: "email reminder app",
					currentPage: "edit-reminder",
					reminder,
					error: req.validationErrors[0],
				})
			}
	try {
		const {message, datetime} = req.body;
		const {id} = req.params;

		await Reminder.findByIdAndUpdate(
		{
			_id: id,
			userId: req.user.id,
			sent: false,
		},
		{
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
