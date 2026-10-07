import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Application from '../models/Application.js';
import connectDB from '../config/db.js';
import { sendFijReapplyInvitation } from '../config/email.js';
import { FIJ_PROGRAM, FIJ_CURRENT_ROUND_OPENED_AT, isFijReapplyEligible } from '../utils/fijReapply.js';

dotenv.config();

// ============================================
// INVITE FIRST-ROUND FUTURE INNOVATORS JAPAN APPLICANTS TO THE NEW CALL
// ============================================
// Dry run by default: lists who would be emailed.
//   node scripts/notifyFijReapply.js            -> dry run
//   node scripts/notifyFijReapply.js --send     -> send emails
//   node scripts/notifyFijReapply.js --send --to someone@example.com  -> send to one eligible user only
// Users already notified (fijReapplyNotifiedAt) are skipped, so the script can be re-run safely.

const DEADLINE_LABEL = 'December 18, 2026';
const DELAY_BETWEEN_EMAILS_MS = 2000; // ~30 emails/minute, safe for Gmail

const args = process.argv.slice(2);
const send = args.includes('--send');
const toIndex = args.indexOf('--to');
const onlyEmail = toIndex !== -1 ? args[toIndex + 1]?.toLowerCase() : null;

async function notifyFijReapply() {
  try {
    await connectDB();

    const query = {
      program: FIJ_PROGRAM,
      createdAt: { $lt: FIJ_CURRENT_ROUND_OPENED_AT },
      fijReapplyNotifiedAt: { $exists: false },
    };
    if (onlyEmail) query.email = onlyEmail;

    const users = await User.find(query).select('name email program createdAt cvAnalyzed interviewCompleted');
    const applications = await Application.find({ userId: { $in: users.map((u) => u._id) } })
      .select('userId firstName lastName step1Completed applicationRound');
    const appByUserId = new Map(applications.map((a) => [a.userId.toString(), a]));

    const eligible = users.filter((u) => isFijReapplyEligible(u, appByUserId.get(u._id.toString())));

    console.log(`\n${eligible.length} eligible user(s) not yet notified${onlyEmail ? ` (filtered to ${onlyEmail})` : ''}:\n`);
    eligible.forEach((u, i) => console.log(`  ${i + 1}. ${u.name} <${u.email}>`));

    if (!send) {
      console.log('\nDry run: no emails sent. Re-run with --send to send them.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    let sent = 0;
    const failed = [];
    for (let i = 0; i < eligible.length; i++) {
      const user = eligible[i];
      const app = appByUserId.get(user._id.toString());
      const fullName = app?.firstName && app?.lastName ? `${app.firstName} ${app.lastName}` : user.name;

      const result = await sendFijReapplyInvitation(user.email, fullName, DEADLINE_LABEL);
      if (result.success) {
        await User.updateOne({ _id: user._id }, { $set: { fijReapplyNotifiedAt: new Date() } });
        sent++;
        console.log(`  ✅ [${i + 1}/${eligible.length}] ${user.email}`);
      } else {
        failed.push({ email: user.email, error: result.error });
        console.log(`  ❌ [${i + 1}/${eligible.length}] ${user.email}: ${result.error}`);
      }

      if (i < eligible.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));
      }
    }

    console.log(`\nDone: ${sent} sent, ${failed.length} failed.\n`);
    await mongoose.connection.close();
    process.exit(failed.length ? 1 : 0);
  } catch (error) {
    console.error('Error notifying FIJ applicants:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

notifyFijReapply();
