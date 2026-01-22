import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
	},
	password: {
		type: String,
		required: true,
		minlength: 8,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	}
})

userSchema.pre("save", async function (next) {
	if (!this.isModified("password"))
		return next();
	try {
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
})

userSchema.methods.comparePassword = async function(inputPassword) {
	return await bcrypt.compare(inputPassword, this.password);
}

const User = mongoose.model("User", userSchema);
export default User;