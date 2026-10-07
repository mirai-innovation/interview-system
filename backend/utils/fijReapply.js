import Application from "../models/Application.js";
import ApplicationArchive from "../models/ApplicationArchive.js";

// Future Innovators Japan: second call for applications.
// Applicants from the first round may restart the process from their dashboard.
export const FIJ_PROGRAM = "FUTURE_INNOVATORS_JAPAN";
export const FIJ_PREVIOUS_ROUND = "FIJ-2026-1";
export const FIJ_CURRENT_ROUND = "FIJ-2026-2";
// Registration for the second round reopened on this date; earlier accounts belong to the first round.
export const FIJ_CURRENT_ROUND_OPENED_AT = new Date("2026-09-30T00:00:00+09:00");
// Last moment to restart an application (end of Dec 18, 2026, Japan time).
export const FIJ_REAPPLY_DEADLINE = new Date("2026-12-18T23:59:59+09:00");
export const FIJ_REAPPLY_DEADLINE_LABEL = "December 18, 2026";

// User fields that hold CV, interview and survey progress
const USER_PROGRESS_FIELDS = [
  "cvPath", "cvText", "analysis", "skills", "questions", "score", "cvAnalyzed",
  "interviewResponses", "interviewVideo", "interviewVideoTranscription", "interviewScore",
  "interviewAnalysis", "interviewRecommendations", "interviewCompleted", "retakeReason",
  "satisfactionSurvey", "softSkillsResults", "softSkillsSurveyCompleted",
  "hardSkillsResults", "hardSkillsSurveyCompleted",
];

// Application fields cleared on reapply. Personal, contact, academic and language
// answers are kept so the form comes back pre-filled.
const APPLICATION_RESET_UNSET = [
  "signature", "acceptanceLetterGeneratedAt", "registrationFeeStatus", "registrationFeePaidAt",
  "stripeCheckoutSessionId", "stripePaymentIntentId", "invoiceDateRange", "invoiceStatus",
  "scholarshipPercentage", "invoiceApprovedAt", "paymentProofUrl", "paymentProofStatus",
  "paymentProofUploadedAt", "paymentProofApprovedAt", "paymentFollowUp", "scheduledMeeting",
];

/** True when the user took part in the first FIJ round and may start the current one. */
export const isFijReapplyEligible = (user, application, now = new Date()) => {
  if (!user || user.program !== FIJ_PROGRAM) return false;
  if (now > FIJ_REAPPLY_DEADLINE) return false;
  if (!user.createdAt || user.createdAt >= FIJ_CURRENT_ROUND_OPENED_AT) return false;
  if (application?.applicationRound === FIJ_CURRENT_ROUND) return false;
  return !!(application?.step1Completed || user.cvAnalyzed || user.interviewCompleted);
};

/** True for FIJ accounts created after the current round opened (new applicants, not reapplicants). */
export const isFijCurrentRoundRegistrant = (user) =>
  user?.program === FIJ_PROGRAM && !!user.createdAt && user.createdAt >= FIJ_CURRENT_ROUND_OPENED_AT;

export const getFijReapplyStatus = (user, application) => ({
  eligible: isFijReapplyEligible(user, application),
  round: FIJ_CURRENT_ROUND,
  deadline: FIJ_REAPPLY_DEADLINE,
});

/**
 * Archives the user's previous round and resets their progress so they can apply again.
 * `user` and `application` are mongoose documents; `application` may be null.
 */
export const archiveAndResetForFijReapply = async (user, application) => {
  const userObj = user.toObject();
  const userProgress = {};
  for (const field of USER_PROGRESS_FIELDS) {
    if (userObj[field] !== undefined) userProgress[field] = userObj[field];
  }

  await ApplicationArchive.create({
    userId: user._id,
    program: user.program,
    round: application?.applicationRound || FIJ_PREVIOUS_ROUND,
    nextRound: FIJ_CURRENT_ROUND,
    application: application ? application.toObject() : null,
    userProgress,
  });

  // The CV file itself is kept (the archive points to it); only the references are cleared.
  user.cvPath = undefined;
  user.cvText = undefined;
  user.analysis = undefined;
  user.skills = [];
  user.questions = [];
  user.score = undefined;
  user.cvAnalyzed = false;
  user.interviewResponses = [];
  user.interviewVideo = undefined;
  user.interviewVideoTranscription = undefined;
  user.interviewScore = undefined;
  user.interviewAnalysis = [];
  user.interviewRecommendations = undefined;
  user.interviewCompleted = false;
  user.retakeReason = undefined;
  user.satisfactionSurvey = undefined;
  user.softSkillsResults = undefined;
  user.softSkillsSurveyCompleted = false;
  user.hardSkillsResults = undefined;
  user.hardSkillsSurveyCompleted = false;
  await user.save();

  if (application) {
    for (const field of APPLICATION_RESET_UNSET) {
      application.set(field, undefined);
    }
    application.step1Completed = false;
    application.step2Completed = false;
    application.step3Completed = false;
    application.step4Completed = false;
    application.currentStep = 1;
    application.isDraft = true;
    application.plagiarismCheckConfirmed = false;
    application.acceptanceLetterProgramType = "MIRI";
    application.appliedBefore = true;
    application.applicationRound = FIJ_CURRENT_ROUND;
    application.lastSavedAt = new Date();
    await application.save();
  } else {
    // Without an application the round marker would be missing and the user would stay eligible.
    await Application.create({
      userId: user._id,
      email: user.email,
      appliedBefore: true,
      applicationRound: FIJ_CURRENT_ROUND,
    });
  }
};
