import expressAsyncHandler from "express-async-handler"
import User from "../models/user.js";
import nodemailer from "nodemailer";
import { transporter } from "../app.js";
import bcrypt from "bcrypt";
import { client } from "../app.js";

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
	user.OTPlastSendAt = Date.now();
	await user.save();
	const email = new Brevo.SendSmtpEmail();
	email.subject = 'Your account verification code';
	email.textContent = `Your verification code is ${code}, it will expire in 10 minutes`;
	email.sender = { name: 'Email Reminder App', email: 'noreply@yourgmail.com' };
	email.to = [{ email: user.email }];
	try {
		const result = await client.sendTransacEmail(email);
		console.log('Brevo result:', JSON.stringify(result));
	  } catch (err) {
		console.error('Brevo error:', err);
	}
}

export async function ReSentOtpCode(user) {
	const now = Date.now();

	if (user.OTPexpiry && now - user.OTPlastSendAt < 60 * 1000)
		throw new Error("please wait 1 minute before request new code");
	const code = String(Math.floor(100000 + Math.random() * 900000));
	const salt = await bcrypt.genSalt(10);
	user.OTPcode = await bcrypt.hash(code, salt);
	user.OTPexpiry = Date.now() + 10 * 60 * 1000;
	user.OTPlastSendAt = now;
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