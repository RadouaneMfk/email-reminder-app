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
