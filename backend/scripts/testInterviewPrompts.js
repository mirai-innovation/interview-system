import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// DEFINIR TUS PROMPTS DE PRUEBA AQUÍ
// ============================================

const PROMPT_VERSIONS = {
  // Prompt original (actual)
  original: (questions, answers) => `
You are an expert evaluator of technical interviews and soft skills. 
Evaluate the following answers on a scale from 0 to 100 based on their quality, clarity, and relevance to the question. 

For each answer, provide:
1. A score between 0 and 100.
2. A brief explanation of the evaluation.

Here are the questions and answers:

${questions.map((q, i) => `Question ${i + 1}: ${q}\nAnswer ${i + 1}: ${answers[i]}\n`).join("\n")}

Respond ONLY in the following JSON format with an object containing an "evaluations" array:
{
  "evaluations": [
    { "score": 85, "explanation": "Clear and well-founded answer with examples." },
    { "score": 70, "explanation": "Good answer but lacks detail." }
  ]
}
  `,

  // Prompt enfocado en habilidades técnicas y blandas con énfasis en diversidad
  skills_focused: (questions, answers) => `
You are evaluating interview responses for candidates applying to research programs at Mirai Innovation Research Institute.

Focus on assessing, with particular priority:
- Diversity of background, perspectives, and experiences (give higher value to diverse or international experience)
- International experience (study, research, or collaboration in global contexts)
- Technical competence and knowledge

Additionally, also consider:
- Problem-solving abilities
- Communication skills
- Motivation and commitment
- Cultural fit for a diverse, internationally oriented research environment

Score each answer 0-100 based on:
- Evidence of diversity and/or international experience
- Technical accuracy and knowledge depth (if applicable)
- Clarity of expression
- Demonstration of globally relevant skills or experience
- Alignment with the values of diversity, international collaboration, and technical excellence in research

Questions and answers:

${questions.map((q, i) => `Question ${i + 1}: ${q}\nAnswer ${i + 1}: ${answers[i]}\n`).join("\n")}

Respond in JSON format:
{
  "evaluations": [
    { "score": 85, "explanation": "Demonstrates strong technical knowledge and clear communication." },
    { "score": 70, "explanation": "Shows motivation but lacks technical depth." }
  ]
}
  `,

  // Agrega más prompts aquí según necesites
  // prompt_v3: (questions, answers) => `...`,
};

// ============================================
// FUNCIÓN DE EVALUACIÓN
// ============================================

async function evaluateWithPrompt(questions, answers, promptTemplate, promptName) {
  try {
    const prompt = promptTemplate(questions, answers);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    let content = response.choices[0].message.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(content);
    const evaluations = parsed.evaluations || [];

    const total_score = evaluations.length > 0
      ? evaluations.reduce((acc, item) => acc + item.score, 0) / evaluations.length
      : 0;

    return {
      promptName,
      total_score: Math.round(total_score),
      evaluations,
      success: true
    };
  } catch (error) {
    console.error(`Error evaluating with ${promptName}:`, error.message);
    return {
      promptName,
      total_score: 0,
      evaluations: [],
      success: false,
      error: error.message
    };
  }
}

// ============================================
// FUNCIÓN PARA GENERAR EXCEL
// ============================================

function generateExcelForPrompt(promptName, results, outputDir) {
  // Preparar datos para Excel
  const excelData = results.map(userResult => {
    const promptResult = userResult.promptResults.find(r => r.promptName === promptName);
    return {
      'Nombre': userResult.userName || '',
      'Email': userResult.userEmail || '',
      'CV Score': userResult.cvScore !== undefined && userResult.cvScore !== null ? userResult.cvScore : 'N/A',
      'Interview Score': promptResult && promptResult.success 
        ? promptResult.total_score 
        : 'N/A'
    };
  });

  // Crear workbook
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

  // Ajustar anchos de columna
  const columnWidths = [
    { wch: 30 }, // Nombre
    { wch: 35 }, // Email
    { wch: 12 }, // CV Score
    { wch: 15 }  // Interview Score
  ];
  worksheet['!cols'] = columnWidths;

  // Generar nombre de archivo con timestamp
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const fileName = `interview_evaluation_${promptName}_${timestamp}.xlsx`;
  const filePath = path.join(outputDir, fileName);

  // Guardar archivo
  XLSX.writeFile(workbook, filePath);
  
  console.log(`   📊 Excel generado: ${fileName}`);
  return filePath;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function testPrompts(excludeEmails = []) {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('\n📊 Conectado a la base de datos\n');

    // Crear directorio de salida si no existe
    const outputDir = path.join(__dirname, '../prompt_test_results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Obtener usuarios con entrevistas completadas
    let query = {
      interviewCompleted: true,
      interviewResponses: { $exists: true, $ne: [] }
    };

    // Si se proporcionan emails a excluir, agregar filtro
    if (excludeEmails.length > 0) {
      // Normalizar emails para comparación (lowercase, trim)
      const normalizedExclude = excludeEmails.map(e => e.toLowerCase().trim());
      query.email = { $nin: normalizedExclude };
      console.log(`\n🚫 Excluyendo ${excludeEmails.length} usuarios ya procesados\n`);
    }

    const users = await User.find(query)
      .select('name email score questions interviewResponses interviewScore interviewAnalysis program');
    // Sin límite - procesa todos los usuarios que coincidan con el query

    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios con entrevistas completadas');
      process.exit(0);
    }

    console.log(`✅ Encontrados ${users.length} usuarios con entrevistas completadas\n`);
    console.log('='.repeat(80));
    console.log('🧪 INICIANDO PRUEBAS DE PROMPTS\n');

    const results = [];

    // Probar cada usuario
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n👤 [${i + 1}/${users.length}] Usuario: ${user.name} (${user.email})`);
      console.log(`   Score CV actual: ${user.score || 'N/A'}%`);
      console.log(`   Score Interview actual: ${user.interviewScore || 'N/A'}%`);
      
      // Construir todas las preguntas (generadas + default)
      const firstQuestion = "What is your motivation for applying to this program and joining Mirai Innovation Research Institute?";
      let lastQuestion;
      if (user.program === 'FUTURE_INNOVATORS_JAPAN') {
        lastQuestion = "Why do you deserve to be awarded this scholarship?";
      } else {
        lastQuestion = "What is your plan to finance your tuition, travel expenses, and accommodation during your stay in Japan?";
      }
      const defaultQuestions = [firstQuestion, lastQuestion];
      const generatedQuestions = user.questions || [];
      const allQuestions = [...generatedQuestions, ...defaultQuestions];
      const answers = user.interviewResponses || [];

      if (allQuestions.length !== answers.length) {
        console.log(`   ⚠️  Saltando: número de preguntas y respuestas no coincide`);
        continue;
      }

      const userResults = {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        cvScore: user.score || null,
        currentInterviewScore: user.interviewScore || null,
        promptResults: []
      };

      // Probar cada versión del prompt
      for (const [promptName, promptTemplate] of Object.entries(PROMPT_VERSIONS)) {
        console.log(`   🔄 Probando prompt: ${promptName}...`);
        
        const result = await evaluateWithPrompt(
          allQuestions,
          answers,
          promptTemplate,
          promptName
        );

        userResults.promptResults.push(result);
        
        if (result.success) {
          console.log(`      ✅ Score: ${result.total_score}%`);
        } else {
          console.log(`      ❌ Error: ${result.error}`);
        }

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      results.push(userResults);
    }

    // ============================================
    // GENERAR ARCHIVOS EXCEL POR PROMPT
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 GENERANDO ARCHIVOS EXCEL POR PROMPT\n');

    const generatedFiles = [];
    
    for (const promptName of Object.keys(PROMPT_VERSIONS)) {
      console.log(`\n📝 Generando Excel para prompt: ${promptName}`);
      const filePath = generateExcelForPrompt(promptName, results, outputDir);
      generatedFiles.push({ promptName, filePath });
    }

    // ============================================
    // GENERAR REPORTE DE RESUMEN
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE DE RESULTADOS\n');

    // Resumen por prompt
    console.log('📈 PROMEDIO DE SCORES POR PROMPT:');
    console.log('-'.repeat(80));
    
    for (const promptName of Object.keys(PROMPT_VERSIONS)) {
      const scores = [];
      results.forEach(userResult => {
        const promptResult = userResult.promptResults.find(r => r.promptName === promptName);
        if (promptResult && promptResult.success) {
          scores.push(promptResult.total_score);
        }
      });

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const stdDev = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / scores.length);
        console.log(`${promptName.padEnd(20)} | Promedio: ${avg.toFixed(1)}% | Min: ${min}% | Max: ${max}% | StdDev: ${stdDev.toFixed(1)}% | Usuarios: ${scores.length}`);
      }
    }

    // Comparación detallada por usuario
    console.log('\n\n👥 COMPARACIÓN POR USUARIO (primeros 5):');
    console.log('-'.repeat(80));
    
    results.slice(0, 5).forEach(userResult => {
      console.log(`\n${userResult.userName} (CV: ${userResult.cvScore || 'N/A'}% | Interview actual: ${userResult.currentInterviewScore || 'N/A'}%)`);
      userResult.promptResults.forEach(promptResult => {
        if (promptResult.success) {
          const diff = userResult.currentInterviewScore 
            ? (promptResult.total_score - userResult.currentInterviewScore) 
            : null;
          const diffStr = diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}%)` : '';
          console.log(`  ${promptResult.promptName.padEnd(20)}: ${promptResult.total_score}%${diffStr}`);
        }
      });
    });

    // Guardar resultados en archivo JSON (opcional)
    const reportPath = path.join(outputDir, `prompt_test_results_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados JSON guardados en: ${reportPath}`);

    // Listar archivos generados
    console.log('\n📁 ARCHIVOS EXCEL GENERADOS:');
    console.log('-'.repeat(80));
    generatedFiles.forEach(({ promptName, filePath }) => {
      console.log(`  ✅ ${promptName}: ${path.basename(filePath)}`);
    });

    console.log(`\n📂 Todos los archivos están en: ${outputDir}`);
    console.log('\n✅ Pruebas completadas\n');
    
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// ============================================
// FUNCIÓN PARA LEER EMAILS DE ARCHIVO
// ============================================

function readEmailsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('@'));
  } catch (error) {
    console.error(`Error leyendo archivo: ${error.message}`);
    return [];
  }
}

// ============================================
// EJECUTAR
// ============================================

// Opción 1: Procesar todos los usuarios (comportamiento por defecto)
// testPrompts();

// Opción 2: Excluir usuarios ya procesados (leer del archivo de emails faltantes)
// Primero ejecuta: node scripts/findMissingUsers.js
// Luego descomenta y ajusta la ruta del archivo:
const missingEmailsFile = path.join(__dirname, '../prompt_test_results/missing_emails_latest.txt');
if (fs.existsSync(missingEmailsFile)) {
  const excludeEmails = readEmailsFromFile(missingEmailsFile);
  if (excludeEmails.length > 0) {
    console.log(`📧 Leyendo ${excludeEmails.length} emails a excluir de: ${path.basename(missingEmailsFile)}`);
    // Invertir la lógica: procesar SOLO los que NO están en la lista
    // Para esto, necesitamos obtener todos y filtrar
    testPromptsForMissingUsers(excludeEmails);
  } else {
    testPrompts();
  }
} else {
  // Si no existe el archivo, procesar todos
  testPrompts();
}

// ============================================
// FUNCIÓN ALTERNATIVA PARA PROCESAR SOLO USUARIOS FALTANTES
// ============================================

async function testPromptsForMissingUsers(excludeEmails) {
  try {
    await connectDB();
    console.log('\n📊 Conectado a la base de datos\n');

    const outputDir = path.join(__dirname, '../prompt_test_results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Normalizar emails a excluir
    const normalizedExclude = new Set(excludeEmails.map(e => e.toLowerCase().trim()));

    // Obtener TODOS los usuarios
    const allUsers = await User.find({
      interviewCompleted: true,
      interviewResponses: { $exists: true, $ne: [] }
    })
    .select('name email score questions interviewResponses interviewScore interviewAnalysis program');

    // Filtrar solo los que NO están en la lista de excluidos
    const users = allUsers.filter(
      user => !normalizedExclude.has(user.email?.toLowerCase().trim())
    );

    console.log(`✅ Total usuarios en BD: ${allUsers.length}`);
    console.log(`🚫 Usuarios a excluir: ${excludeEmails.length}`);
    console.log(`📊 Usuarios a procesar: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No hay usuarios para procesar');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('='.repeat(80));
    console.log('🧪 INICIANDO PRUEBAS DE PROMPTS\n');

    const results = [];

    // Probar cada usuario (resto del código igual)
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n👤 [${i + 1}/${users.length}] Usuario: ${user.name} (${user.email})`);
      console.log(`   Score CV actual: ${user.score || 'N/A'}%`);
      console.log(`   Score Interview actual: ${user.interviewScore || 'N/A'}%`);
      
      // Construir todas las preguntas (generadas + default)
      const firstQuestion = "What is your motivation for applying to this program and joining Mirai Innovation Research Institute?";
      let lastQuestion;
      if (user.program === 'FUTURE_INNOVATORS_JAPAN') {
        lastQuestion = "Why do you deserve to be awarded this scholarship?";
      } else {
        lastQuestion = "What is your plan to finance your tuition, travel expenses, and accommodation during your stay in Japan?";
      }
      const defaultQuestions = [firstQuestion, lastQuestion];
      const generatedQuestions = user.questions || [];
      const allQuestions = [...generatedQuestions, ...defaultQuestions];
      const answers = user.interviewResponses || [];

      if (allQuestions.length !== answers.length) {
        console.log(`   ⚠️  Saltando: número de preguntas y respuestas no coincide`);
        continue;
      }

      const userResults = {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        cvScore: user.score || null,
        currentInterviewScore: user.interviewScore || null,
        promptResults: []
      };

      // Probar cada versión del prompt
      for (const [promptName, promptTemplate] of Object.entries(PROMPT_VERSIONS)) {
        console.log(`   🔄 Probando prompt: ${promptName}...`);
        
        const result = await evaluateWithPrompt(
          allQuestions,
          answers,
          promptTemplate,
          promptName
        );

        userResults.promptResults.push(result);
        
        if (result.success) {
          console.log(`      ✅ Score: ${result.total_score}%`);
        } else {
          console.log(`      ❌ Error: ${result.error}`);
        }

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      results.push(userResults);
    }

    // Generar archivos Excel (resto del código igual)
    console.log('\n' + '='.repeat(80));
    console.log('📊 GENERANDO ARCHIVOS EXCEL POR PROMPT\n');

    const generatedFiles = [];
    
    for (const promptName of Object.keys(PROMPT_VERSIONS)) {
      console.log(`\n📝 Generando Excel para prompt: ${promptName}`);
      const filePath = generateExcelForPrompt(promptName, results, outputDir);
      generatedFiles.push({ promptName, filePath });
    }

    // Generar reporte de resumen
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE DE RESULTADOS\n');

    // Resumen por prompt
    console.log('📈 PROMEDIO DE SCORES POR PROMPT:');
    console.log('-'.repeat(80));
    
    for (const promptName of Object.keys(PROMPT_VERSIONS)) {
      const scores = [];
      results.forEach(userResult => {
        const promptResult = userResult.promptResults.find(r => r.promptName === promptName);
        if (promptResult && promptResult.success) {
          scores.push(promptResult.total_score);
        }
      });

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const stdDev = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / scores.length);
        console.log(`${promptName.padEnd(20)} | Promedio: ${avg.toFixed(1)}% | Min: ${min}% | Max: ${max}% | StdDev: ${stdDev.toFixed(1)}% | Usuarios: ${scores.length}`);
      }
    }

    // Comparación detallada por usuario
    console.log('\n\n👥 COMPARACIÓN POR USUARIO (primeros 5):');
    console.log('-'.repeat(80));
    
    results.slice(0, 5).forEach(userResult => {
      console.log(`\n${userResult.userName} (CV: ${userResult.cvScore || 'N/A'}% | Interview actual: ${userResult.currentInterviewScore || 'N/A'}%)`);
      userResult.promptResults.forEach(promptResult => {
        if (promptResult.success) {
          const diff = userResult.currentInterviewScore 
            ? (promptResult.total_score - userResult.currentInterviewScore) 
            : null;
          const diffStr = diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}%)` : '';
          console.log(`  ${promptResult.promptName.padEnd(20)}: ${promptResult.total_score}%${diffStr}`);
        }
      });
    });

    // Guardar resultados en archivo JSON
    const reportPath = path.join(outputDir, `prompt_test_results_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados JSON guardados en: ${reportPath}`);

    // Listar archivos generados
    console.log('\n📁 ARCHIVOS EXCEL GENERADOS:');
    console.log('-'.repeat(80));
    generatedFiles.forEach(({ promptName, filePath }) => {
      console.log(`  ✅ ${promptName}: ${path.basename(filePath)}`);
    });

    console.log(`\n📂 Todos los archivos están en: ${outputDir}`);
    console.log('\n✅ Pruebas completadas\n');
    
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

