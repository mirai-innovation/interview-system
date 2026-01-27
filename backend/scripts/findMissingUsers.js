import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function findMissingUsers() {
  try {
    await connectDB();
    console.log('\n📊 Conectado a la base de datos\n');

    // Leer el archivo Excel más reciente
    const outputDir = path.join(__dirname, '../prompt_test_results');
    
    if (!fs.existsSync(outputDir)) {
      console.log('❌ No se encontró el directorio de resultados');
      process.exit(0);
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('interview_evaluation_original_') && f.endsWith('.xlsx'))
      .sort()
      .reverse(); // El más reciente primero

    if (files.length === 0) {
      console.log('❌ No se encontraron archivos Excel');
      process.exit(0);
    }

    const latestFile = path.join(outputDir, files[0]);
    console.log(`📄 Leyendo archivo: ${files[0]}\n`);

    // Leer Excel
    const fileBuffer = fs.readFileSync(latestFile);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    // Obtener emails ya procesados
    const processedEmails = new Set(
      excelData.map(row => row.Email?.toLowerCase().trim()).filter(Boolean)
    );

    console.log(`✅ Usuarios ya procesados: ${processedEmails.size}\n`);

    // Obtener todos los usuarios con entrevistas completadas
    const allUsers = await User.find({
      interviewCompleted: true,
      interviewResponses: { $exists: true, $ne: [] }
    })
    .select('name email score interviewScore');

    console.log(`📊 Total de usuarios con entrevistas: ${allUsers.length}\n`);

    // Encontrar usuarios faltantes
    const missingUsers = allUsers.filter(
      user => !processedEmails.has(user.email?.toLowerCase().trim())
    );

    console.log('='.repeat(80));
    console.log(`🔍 USUARIOS FALTANTES: ${missingUsers.length}\n`);
    console.log('='.repeat(80));

    if (missingUsers.length === 0) {
      console.log('✅ Todos los usuarios ya fueron procesados\n');
    } else {
      console.log('\n📋 Lista de usuarios faltantes:\n');
      missingUsers.forEach((user, index) => {
        console.log(`${(index + 1).toString().padStart(3)}. ${(user.name || 'N/A').padEnd(40)} | ${user.email || 'N/A'} | CV: ${user.score || 'N/A'}%`);
      });

      // Guardar lista en archivo JSON
      const missingList = missingUsers.map(u => ({
        name: u.name,
        email: u.email,
        cvScore: u.score || null,
        interviewScore: u.interviewScore || null
      }));

      const jsonPath = path.join(outputDir, `missing_users_${Date.now()}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(missingList, null, 2));
      console.log(`\n💾 Lista guardada en: ${jsonPath}`);

      // Guardar solo emails en un archivo de texto para fácil copia
      const emailsPath = path.join(outputDir, `missing_emails_${Date.now()}.txt`);
      const emailsList = missingUsers.map(u => u.email).filter(Boolean).join('\n');
      fs.writeFileSync(emailsPath, emailsList);
      console.log(`📧 Emails guardados en: ${emailsPath}`);

      // También guardar con nombre fijo para fácil acceso
      const latestEmailsPath = path.join(outputDir, 'missing_emails_latest.txt');
      fs.writeFileSync(latestEmailsPath, emailsList);
      console.log(`📧 También guardado como: missing_emails_latest.txt (para uso automático)`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

findMissingUsers();

