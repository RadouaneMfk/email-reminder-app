import expressAsyncHandler from "express-async-handler"
import User from "../models/user.js";
import nodemailer from "nodemailer";
import { transporter } from "../app.js";
import bcrypt from "bcrypt";

export const isAuthenticated = (req, res, next) => {
	if (req.isAuthenticated())
		return next();
	res.redirect("/login");
};

export const isNotAuthenticated = (req, res, next) => {
	if (req.isAuthenticated() && req.user?.isVerified)
		return res.redirect("/dashboard");
	return next();
};

export async function sentOtpCode(user) {
	if (user.OTPexpiry && user.OTPexpiry > Date.now())
		return;
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
}


export const isUserVerified = (req, res, next) => {
	if (!req.user)
		return res.redirect("/login");
	if (!req.user.isVerified)
		return res.redirect("/verify-email");
	next();
}