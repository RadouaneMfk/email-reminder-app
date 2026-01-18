import mongoose from "mongoose"

const reminderShcema = new mongoose.Schema({
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
		type: String,
		required: true,
	},
	sent: {
		type: Boolean,
		default: false,
	}
})

const Reminder = mongoose.model("Reminder", reminderShcema);

export default Reminder;