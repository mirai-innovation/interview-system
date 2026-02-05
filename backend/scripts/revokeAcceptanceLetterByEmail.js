/**
 * Revoca el acceso a la carta de aceptación para un usuario por email.
 *
 * Uso: node backend/scripts/revokeAcceptanceLetterByEmail.js <email>
 * Ejemplo: node backend/scripts/revokeAcceptanceLetterByEmail.js dananicolelp@hotmail.com
 */

import connectDB from "../config/db.js";
import User from "../models/User.js";
import Application from "../models/Application.js";

const email = process.argv[2]?.trim()?.toLowerCase();
if (!email) {
  console.error("Uso: node revokeAcceptanceLetterByEmail.js <email>");
  process.exit(1);
}

async function revoke() {
  await connectDB();

  const user = await User.findOne({ email }).select("_id name email");
  if (!user) {
    console.error(`No se encontró ningún usuario con email: ${email}`);
    process.exit(1);
  }

  const app = await Application.findOne({ userId: user._id }).select(
    "acceptanceLetterGeneratedAt"
  );
  if (!app || !app.acceptanceLetterGeneratedAt) {
    console.log(
      `El usuario ${user.name} (${email}) no tiene carta de aceptación generada. Nada que revocar.`
    );
    process.exit(0);
    return;
  }

  await Application.updateOne(
    { userId: user._id },
    { $set: { acceptanceLetterGeneratedAt: null } }
  );

  console.log(
    `Acceso a la carta revocado para: ${user.name} (${email}).`
  );
  process.exit(0);
}

revoke().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
