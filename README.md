# 🚀 Hired-AI

> **Your AI-Powered Interview Command Center.** Prepare, practice, and perform with real-time assistance.

Hired-AI is a comprehensive platform designed to give candidates an edge in the job market. By leveraging advanced local and cloud-based AI, it acts as a personalized career coach and real-time interview co-pilot.

---

## ✨ Features

- **🧠 Knowledge Base**: Upload your resume, skills, and past experiences. The AI synthesizes this context to provide personalized advice and answers.
- **🎯 Practice Sessions**: Engage in AI-powered mock interviews tailored to specific roles and companies. Receive immediate, actionable feedback on your responses.
- **⚡ Live Interview HUD**: A low-latency, real-time Heads-Up Display (HUD) for actual interviews. It uses local speech-to-text (Whisper) and Google's Gemini to provide instant suggestions and guidance during your interview.

---

## 🛠️ Tech Stack

This project is built using modern, highly-performant web technologies:

### **Frontend**
- **Framework**: [Next.js](https://nextjs.org/) (v16) with App Router & React 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

### **Backend & Infrastructure**
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Deployment**: Vercel (Recommended for Next.js) / Firebase Hosting

### **Artificial Intelligence**
- **Cloud LLM**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`) for reasoning, feedback, and answer generation.
- **Local Models**: [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js/) for local, in-browser processing (e.g., local Whisper for private, low-latency audio transcription).

---

## 🚀 Getting Started (Local Development)

Follow these instructions to set up the project on your local machine.

### Prerequisites
- **Node.js** (v20 or newer recommended)
- **Firebase Account**: You need a Firebase project configured with Authentication and Firestore Database.
- **Google AI API Key**: Get one from [Google AI Studio](https://aistudio.google.com/).

### 1. Clone the repository
```bash
git clone https://github.com/farouk-abdelazeem/hired-AI.git
cd hired-AI
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory by copying the example file:
```bash
cp .env.local.example .env.local
```
Fill in your Firebase configuration and Gemini API Key in the `.env.local` file:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

GEMINI_API_KEY=your_gemini_api_key
```

### 4. Firebase Setup
Ensure your Firestore security rules are deployed. You can use the Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application running.

---

## 🌍 Deployment

### Deploying the Application (Vercel)
The easiest way to deploy the Next.js frontend is via [Vercel](https://vercel.com/):

1. Push your code to a GitHub repository.
2. Go to Vercel and click **Add New Project**.
3. Import your GitHub repository.
4. **Crucial**: Add all the environment variables from your `.env.local` to the Vercel deployment settings.
5. Click **Deploy**.

### Deploying Firebase Rules
Make sure your production Firebase environment is secure:
```bash
firebase deploy --only firestore:rules
```

---

## 📁 Project Structure

- `/src/app`: Next.js App Router pages (Dashboard, Auth, API Routes).
- `/src/components`: Reusable UI components (shadcn/ui, Layouts, Auth).
- `/src/context`: React Context providers (e.g., `AuthContext.tsx` for state management).
- `/src/lib`: Utilities, AI configurations, Firebase initialization, and Web Workers for local AI processing.
- `/public`: Static assets and scripts (e.g., `pcm16-processor.js` for audio processing and handling microphone streams).

---

*Built with Next.js, Firebase, and Gemini AI.*
