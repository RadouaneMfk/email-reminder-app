import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import User from "../models/user.js";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";

passport.use(
	new LocalStrategy(
	{
		usernameField: "email"
	},
	async (email, password, done) => {
		try {
			const user = await User.findOne({email});
			if (!user) {
				return done(null, false, {
					message: 'Invalid email or password!',
				})
			}
			const isMatchPass = await user.comparePassword(password);
	
			if (!isMatchPass) {
				return done(null, false, {
					message: 'Invalid email or password!',
				})
			}
			return done(null, user);
		} catch (error) {
			return done(error);
		}
	}
	)
)

passport.use(
	new GoogleStrategy(
	{
		clientID: process.env.CLIENT_GOOGLE_ID,
		clientSecret: process.env.CLIENT_GOOGLE_SECRET,
		callbackURL: "http://localhost:3000/auth/google/callback",
	},
	async (accessToken, refreshToken, profile, done) => {
		try {
			let user = await User.findOne({googleId: profile.id});
			if (user)
				return done(null, user);
			user = await User.findOne({email: profile.emails[0].value});
			if (user) {
				user.googleId = profile.id,
				await user.save();
				return done(null, user);
			}
			const newUser = await User.create({
				googleId: profile.id,
				name: profile.displayName,
				email: profile.emails[0].value,
				isVerified: true,
			})
			return done(null, newUser);
			
		} catch (error) {
			return done(error, null);
		}
	}
	)
)

passport.serializeUser((user, done) => {
	done(null, user.id);
})

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (error) {
		done(error);
	}
})

export default passport;