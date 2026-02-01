import expressAsyncHandler from "express-async-handler"

export const isAuthenticated = (req, res, next) => {
	if (req.isAuthenticated())
		return next();
	res.redirect("/login");
};

export const isNotAuthenticated = (req, res, next) => {
	if (!req.isAuthenticated())
	return next();
res.redirect("/dashboard");
};

export const isUserVerified = (req, res, next) => {
	if (req.user.isVerified)
		return next();
	res.redirect("/verify-email");
};