
# SkillFit AI Frontend

A modern, responsive React application built with **Vite** and **Tailwind CSS**. 
It serves as the user interface for the SkillFit AI desktop application, providing an interactive dashboard for resume analysis, job search, and career planning.

## 🚀 Key Features

### 1. 📊 Interactive Dashboard
*   **Skill Simulator**: Visualize how adding a new skill (e.g., "Docker") impacts your market reach.
*   **Verified Skills**: See which skills were automatically parsed from your resume.
*   **Comparisons**: Side-by-side view of your resume vs. target job descriptions.

### 2. 🌍 Job Search
*   **Multi-Platform Aggregation**: Unified view of jobs from LinkedIn, Indeed, Glassdoor, etc.
*   **Smart Filtering**: Filter by location, remote/onsite, and match score.
*   **Detail View**: One-click deep dive analysis for any job.

### 3. 🧠 AI-Powered Insights
*   **Career Roadmap**: Generates a personalized 3-month learning plan.
*   **Role Suggestions**: Recommends alternative career paths based on your skill set.
*   **Pivot Analysis**: Estimates difficulty and salary potential for switching careers.

## 🛠️ Tech Stack

*   **Framework**: React (v18)
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS + Shadcn UI (Radix Primitives)
*   **State Management**: React Context API
*   **Charts**: Recharts
*   **Icons**: Lucide React
*   **HTTP Client**: Axios

## 📦 Development

### Run Locally (Web Mode)

To start the development server:

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

### Build for Production (Desktop App)

To compile the frontend for bundling into the PyWebView desktop app:

```bash
npm run build
```

This generates static files in the `dist/` directory, which `desktop_app.py` serves in production mode.
