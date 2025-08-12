# 🎓 Purdue Academic Planner - Sharing Guide

## 🚀 Quick Deploy Options

### **Option 1: Vercel (Recommended)**
```bash
npm install -g vercel
vercel
```

### **Option 2: Netlify**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### **Option 3: GitHub Pages**
```bash
npm install --save-dev gh-pages
npm run deploy
```

## 🔑 Environment Setup

1. **Copy environment file:**
   ```bash
   cp env.example .env
   ```

2. **Add your Gemini API key:**
   ```bash
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Get a free Gemini API key:**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

## 📦 Project Structure

```
final/
├── src/
│   ├── components/          # UI Components
│   ├── pages/              # Main Pages
│   ├── contexts/           # State Management
│   ├── services/           # AI & API Services
│   └── hooks/              # Custom Hooks
├── public/                 # Static Assets
└── package.json           # Dependencies
```

## 🎯 Key Features

- **AI-Powered Transcript Parsing** - Upload PDFs and auto-parse courses
- **Smart Course Matching** - Match against Purdue course database
- **Academic Planner** - Plan your degree with semester blocks
- **GPA Calculation** - Automatic GPA computation
- **Course Verification** - Review and edit parsed courses

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📱 Access URLs

- **Local Development:** http://localhost:8080/
- **Network Access:** http://YOUR_IP:8080/

## 🎨 Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Google Gemini API
- **State:** React Context
- **Routing:** React Router DOM

## 📄 License

MIT License - Feel free to use and modify! 