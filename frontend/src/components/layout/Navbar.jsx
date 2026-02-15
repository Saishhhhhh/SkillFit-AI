import { useState, useEffect } from 'react';
import { History, Moon, Sun, Github, Menu, X, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../common/Logo';

export default function Navbar() {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = () => setDarkMode(!darkMode);

    const isActive = (path) => location.pathname === path;

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group relative z-50" onClick={() => setMobileMenuOpen(false)}>
                        <Logo />
                        <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-violet-600 transition-all">
                            SkillFit AI
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            to="/compare"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/compare')
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Sparkles className="h-4 w-4" />
                            Deep Dive
                        </Link>

                        <Link
                            to="/history"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/history')
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <History className="h-4 w-4" />
                            History
                        </Link>

                        <a
                            href="https://github.com/Saishhhhhh/SkillFit-AI"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                        </a>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all active:scale-90"
                            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            aria-label="Toggle Theme"
                        >
                            {darkMode ? <Sun className="h-4 w-4 animate-spin-slow" /> : <Moon className="h-4 w-4 animate-pulse-slow" />}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4 z-50">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 bg-white dark:bg-slate-900 z-40 transition-transform duration-300 md:hidden flex flex-col pt-24 px-6 gap-6 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-medium py-2 border-b border-slate-100 dark:border-slate-800 ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}
                >
                    Home
                </Link>
                <Link
                    to="/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-medium py-2 border-b border-slate-100 dark:border-slate-800 ${isActive('/history') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}
                >
                    History
                </Link>
                <a
                    href="https://github.com/Saishhhhhh/SkillFit-AI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium py-2 text-slate-600 dark:text-slate-300 flex items-center gap-2"
                >
                    <Github className="h-5 w-5" /> GitHub Repo
                </a>
            </div>
        </nav>
    );
}
