/**
 * Revoca el acceso a la carta de aceptación solo para usuarios cuya carta
 * fue generada el 5 de febrero. El resto no se modifica.
 *
 * Uso: node backend/scripts/revokeAcceptanceLetterFeb5.js
 * (desde la raíz del proyecto, o desde backend: node scripts/revokeAcceptanceLetterFeb5.js)
 */

import connectDB from "../config/db.js";
import Application from "../models/Application.js";

// Año del 5 de febrero a aplicar (cambiar si es otro año)
const YEAR = 2026;
const FEB_5_START = new Date(`${YEAR}-02-05T00:00:00.000Z`);
const FEB_5_END = new Date(`${YEAR}-02-06T00:00:00.000Z`);

async function revoke() {
  await connectDB();

  const result = await Application.updateMany(
    {
      acceptanceLetterGeneratedAt: {
        $gte: FEB_5_START,
        $lt: FEB_5_END,
      },
    },
    { $set: { acceptanceLetterGeneratedAt: null } }
  );

  if (result.modifiedCount === 0) {
    console.log(
      `No hay aplicaciones con carta generada el 5 de febrero de ${YEAR}. Nada que revocar.`
    );
  } else {
    console.log(
      `Revocadas ${result.modifiedCount} aplicación(es) con carta generada el 5 de febrero de ${YEAR}.`
    );
  }
  process.exit(0);
}

revoke().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
