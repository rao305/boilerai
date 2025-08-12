# 🎓 Purdue Academic Planner

A comprehensive academic planning platform for Purdue University students with AI-powered transcript parsing and intelligent course management.

## 🚀 Features

- **🤖 AI-Powered Transcript Parsing** - Upload PDFs and automatically extract course information
- **📚 Smart Course Matching** - Match parsed courses against Purdue's course database
- **📅 Academic Planner** - Plan your degree with interactive semester blocks
- **📊 GPA Calculation** - Automatic GPA computation and tracking
- **✅ Course Verification** - Review and edit parsed courses before adding to planner
- **🔄 Real-time Sync** - Automatic transfer of verified courses to academic planner

## 🏗️ Architecture

```
purdue-academic-planner/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # UI Components
│   │   ├── pages/          # Main Pages
│   │   ├── contexts/       # State Management
│   │   ├── services/       # API Services
│   │   └── hooks/          # Custom Hooks
│   └── package.json
├── backend/                 # Node.js + Express
│   ├── src/
│   │   ├── controllers/    # Business Logic
│   │   ├── routes/         # API Routes
│   │   ├── models/         # Data Models
│   │   └── middleware/     # Express Middleware
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component Library
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime
- **Express** - Web Framework
- **Multer** - File Upload
- **Axios** - HTTP Client
- **pdf-parse** - PDF Processing

### AI Integration
- **Google Gemini API** - AI Processing
- **Custom Prompts** - Structured Data Extraction

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd purdue-academic-planner
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Add your Gemini API key to .env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Add your Gemini API key to .env
GEMINI_API_KEY=your_api_key_here
```

## 🚀 Running the Application

### Development Mode

#### Frontend (Port 8080)
```bash
npm run dev
```

#### Backend (Port 5000)
```bash
cd backend
npm run dev
```

### Production Build
```bash
# Frontend
npm run build

# Backend
cd backend
npm start
```

## 🔑 Environment Variables

### Frontend (.env)
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

## 📡 API Endpoints

### Transcript Processing
- `POST /api/transcript/upload` - Upload and process transcript file
- `POST /api/transcript/process-text` - Process transcript text
- `GET /api/transcript/status/:jobId` - Get processing status

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/search` - Search courses

### Academic Planner
- `GET /api/planner` - Get academic plan
- `POST /api/planner` - Save academic plan

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## 🎯 Usage

### 1. Upload Transcript
- Go to "Transcript Management" tab
- Upload PDF transcript or paste text
- AI will parse and extract course information

### 2. Verify Courses
- Review parsed courses in verification table
- Edit course details if needed
- Verify courses for accuracy

### 3. Plan Academic Journey
- Courses automatically transfer to Academic Planner
- Organize by semester and year
- Track progress toward graduation

## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── TranscriptUploader.tsx
│   ├── CourseVerificationTable.tsx
│   └── ui/             # shadcn/ui components
├── pages/              # Main application pages
│   ├── Dashboard.tsx
│   ├── AcademicPlanner.tsx
│   └── TranscriptManagement.tsx
├── contexts/           # React Context providers
│   └── AcademicPlanContext.tsx
├── services/           # API and external services
│   ├── transcriptParser.ts
│   └── api.ts
└── hooks/              # Custom React hooks
```

### Key Components

#### TranscriptUploader
- File upload with drag-and-drop
- Text input fallback
- Progress tracking
- AI processing integration

#### CourseVerificationTable
- Interactive course review
- Bulk selection and transfer
- GPA calculation display
- Course editing capabilities

#### AcademicPlanner
- Semester-based course organization
- Edit mode with add/remove functionality
- Credit tracking
- Visual progress indicators

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
vercel

# Deploy backend
cd backend
vercel
```

### Netlify
```bash
# Build frontend
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Docker
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Purdue University for course data
- Google Gemini API for AI processing
- shadcn/ui for beautiful components
- Vite for fast development experience

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Contact: [your-email@example.com]

---

**Built with ❤️ for Purdue students**
