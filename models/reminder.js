import mongoose from "mongoose"

const reminderShcema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	email: {
		type: String,
		required: true,
		trim: true,
	},
	message: {
		type: String,
		required: true,
		trim: true,
	},
	scheduledTime: {
		type: Date,
		required: true,
	},
	sent: {
		type: Boolean,
		default: false,
	}
})

const Reminder = mongoose.model("Reminder", reminderShcema);

export default Reminder;