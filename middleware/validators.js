import { body, validationResult } from "express-validator";

export const registerValidation = [
	body("name").trim()
	.notEmpty().withMessage("name is required")
	.isLength({min: 2}).withMessage("name must be at least 2 characters"),

	body("email").trim()
	.notEmpty().withMessage("email is required")
	.isEmail().withMessage("please provide a valid email")
	.normalizeEmail(),

	body("password").trim()
	.notEmpty().withMessage("password is required")
	.isLength({min: 8}).withMessage("password must be at least 8 characters"),

	body("confirmPassword").trim()
	.notEmpty().withMessage("please confirm your password")
	.custom((value, {req}) => {
		if (value !== req.body.password) {
			throw new Error('passwords do not match!');
		}
		return true;
	}),
];

export const loginValidation = [
	body("email").trim()
	.notEmpty().withMessage("email is required")
	.isEmail().withMessage("please provide a valid email")
	.normalizeEmail(),

	body("password").trim()
	.notEmpty().withMessage("password is required")
];

export const scheduleValidation = [
	body("message").trim()
	.notEmpty().withMessage("message is required")
	.isLength({min: 5}).withMessage("message must be at least 5 characters"),

	body("datetime").trim()
	.notEmpty().withMessage("Date and Time is required")
	.custom(value => {
		const sheduledTime = new Date(value);
		if (sheduledTime <= new Date()) {
			throw new Error('scheduled time must be in the future');
		}
		return true;
	}),
];

export const resetPasswordValidator = [
	body("password").trim()
	.notEmpty().withMessage("password is required")
	.isLength({min: 8}).withMessage("password must be at least 8 characters"),

	body("confirmPassword").trim()
	.notEmpty().withMessage("confirm password is required")
	.custom((value, {req}) => {
		if (value !== req.body.password)
		{
			throw new Error("passwords do not match!");
		}
		return true;
	})
];

export const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);

	if (!errors.isEmpty())
	{
		req.validationErrors = errors.array();
		return next();
	}
	next();
}
