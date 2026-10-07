import mongoose from "mongoose";

// Snapshot of a previous application round, taken before a user starts a new one.
// `application` is the full Application document; `userProgress` holds the CV,
// interview and survey fields that live on the User document.
const applicationArchiveSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    program: { type: String },
    round: { type: String }, // Round being archived, e.g. 'FIJ-2026-1'
    nextRound: { type: String }, // Round the user moved on to, e.g. 'FIJ-2026-2'
    archivedAt: { type: Date, default: Date.now },
    application: { type: mongoose.Schema.Types.Mixed },
    userProgress: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const ApplicationArchive = mongoose.model("ApplicationArchive", applicationArchiveSchema);
export default ApplicationArchive;
