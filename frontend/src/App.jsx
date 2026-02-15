import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ResumeReview from './pages/ResumeReview';
import Dashboard from './pages/Dashboard';
import JobListingPage from './pages/JobListingPage';
import HistoryPage from './pages/HistoryPage';
import ComparisonPage from './pages/ComparisonPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resume-review" element={<ResumeReview />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<JobListingPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/compare" element={<ComparisonPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
