# Mirai Intervieweb - Sistema de Evaluación de Habilidades

Sistema completo de evaluación de habilidades con análisis de CV mediante IA, entrevistas automatizadas y cuestionarios de habilidades blandas y duras.

## 🚀 Características

- ✅ Autenticación completa con JWT
- ✅ Subida y análisis de CV con IA (OpenAI GPT-4o-mini)
- ✅ Sistema de entrevista con evaluación automática
- ✅ Transcripción de audio con Whisper AI
- ✅ Cuestionarios de habilidades blandas (160 preguntas)
- ✅ Cuestionarios de habilidades duras - Inteligencias Múltiples (35 preguntas)
- ✅ Panel de administración
- ✅ Almacenamiento de CVs en AWS S3 (opcional, con fallback local)
- ✅ Guardado automático de progreso de entrevista

## 📋 Requisitos Previos

- Node.js 18+
- MongoDB (local o MongoDB Atlas)
- API Key de OpenAI
- (Opcional) Cuenta de AWS para S3
- (Opcional) Cuenta de Gmail para envío de emails

## 🛠️ Instalación

### Backend

1. Navega a la carpeta backend:
```bash
cd backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `env.example.txt`:
```env
MONGO_URI=mongodb+srv://username:password@miraiinnovation.mongodb.net/mirai-interviews?retryWrites=true&w=majority
JWT_SECRET=your_secret_key_here
PORT=20352
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
STORAGE_TYPE=local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket
OPENAI_API_KEY=your_openai_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

4. Inicia el servidor:
```bash
npm start
# o para desarrollo con watch
npm run dev
```

### Frontend

1. Navega a la carpeta frontend:
```bash
cd frontend
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
Mirai-Intervieweb/
├── backend/
│   ├── config/
│   │   ├── db.js              # Conexión MongoDB
│   │   └── email.js           # Configuración Nodemailer
│   ├── middleware/
│   │   ├── adminMiddleware.js # Verificación de admin
│   │   ├── upload.js          # Configuración Multer-S3/Local
│   │   └── videoUpload.js     # Configuración para videos
│   ├── models/
│   │   └── User.js            # Modelo de Usuario
│   ├── routes/
│   │   ├── authRoutes.js      # Autenticación
│   │   ├── userRoutes.js      # CV, cuestionarios, entrevista
│   │   └── adminRoutes.js     # Panel de administración
│   ├── utils/
│   │   └── cvUtils.js         # Funciones de análisis y evaluación
│   ├── uploads/               # Archivos subidos (local storage)
│   │   ├── cvs/               # CVs en PDF
│   │   └── videos/            # Videos de entrevista
│   └── index.js               # Servidor Express
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── contexts/          # Context API (AuthContext)
│   │   ├── pages/            # Páginas principales
│   │   └── utils/            # Utilidades (axios)
│   └── ...
│
└── README.md
```

## 🔑 Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Recuperación de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña

### Usuario
- `POST /api/users/upload-cv` - Subir CV (PDF)
- `POST /api/users/analyze-cv` - Analizar CV con IA
- `POST /api/users/submit-interview` - Enviar respuestas de entrevista
- `POST /api/users/transcribe-video` - Transcribir video con Whisper
- `POST /api/users/save-interview-progress` - Guardar progreso automáticamente
- `POST /api/users/submit-soft-skills` - Enviar cuestionario habilidades blandas
- `POST /api/users/submit-hard-skills` - Enviar cuestionario habilidades duras
- `GET /api/users/profile` - Obtener perfil del usuario
- `GET /api/users/interview-responses` - Obtener respuestas de entrevista

### Administración
- `GET /api/admin/users` - Listar usuarios
- `GET /api/admin/stats` - Estadísticas generales
- `PATCH /api/admin/users/:userId/toggle-status` - Activar/Desactivar usuario
- `PATCH /api/admin/users/:userId/role` - Cambiar rol
- `DELETE /api/admin/users/:userId` - Eliminar usuario

## 🎯 Flujo de Usuario

1. **Registro**: El usuario se registra (cuenta inactiva por defecto)
2. **Activación**: Un administrador activa la cuenta
3. **Login**: El usuario inicia sesión y recibe un token JWT
4. **Subida de CV**: El usuario sube su CV en formato PDF
5. **Análisis**: El sistema analiza el CV con IA y genera preguntas personalizadas
6. **Entrevista**: 
   - El usuario responde preguntas con grabación de video/audio
   - Transcripción automática con Whisper AI
   - Guardado automático de progreso
   - Si sale, puede continuar desde donde se quedó
7. **Cuestionarios**: El usuario completa los cuestionarios de habilidades
8. **Resultados**: El usuario puede ver sus resultados completos de todas las evaluaciones

## 🔒 Seguridad

- Contraseñas hasheadas con bcryptjs
- Tokens JWT con expiración (8 horas)
- Middleware de autenticación en rutas protegidas
- Validación de archivos (solo PDF, máximo 5MB para CVs, 50MB para videos)
- Verificación de usuario activo en cada request
- Prevención de copiar/pegar en entrevistas

## 📝 Notas

- Las cuentas nuevas están inactivas por defecto y requieren activación por un administrador
- El análisis de CV requiere una API key válida de OpenAI
- La subida de CVs puede usar AWS S3 o almacenamiento local (configurable con `STORAGE_TYPE`)
- El sistema de email es opcional pero recomendado para recuperación de contraseñas
- Las respuestas de entrevista se guardan automáticamente mientras el usuario responde
- Si la entrevista está completada, no se puede volver a iniciar

## 🛡️ Tecnologías Utilizadas

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT para autenticación
- OpenAI API (GPT-4o-mini, Whisper)
- AWS S3 (opcional)
- Nodemailer
- Multer para manejo de archivos

### Frontend
- React 18
- React Router DOM
- Tailwind CSS
- Axios
- MediaRecorder API para grabación de video
- Web Speech API (reemplazado por Whisper)

## 📄 Licencia

ISC
