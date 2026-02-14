import { Zap, History } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-1.5 rounded-lg">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-display font-bold text-xl text-slate-900 tracking-tight">SkillFit AI</span>
                </Link>
                <div className="flex gap-8 text-sm font-medium text-slate-600 items-center">
                    <Link to="/history" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                        <History className="h-4 w-4" /> History
                    </Link>
                    <a href="https://github.com/Saishhhhhh/SkillFit-AI" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">GitHub</a>
                </div>
            </div>
        </nav>
    );
}
