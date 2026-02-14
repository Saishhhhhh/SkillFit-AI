import { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
    const [profile, setProfile] = useState(null); // { id, skills, raw_text, verified_skills }
    const [jobSearch, setJobSearch] = useState(null); // { taskId, results, analytics }
    const [genAIConfig, setGenAIConfig] = useState({ provider: 'groq', apiKey: '' }); // BYOK config

    return (
        <AppContext.Provider value={{ profile, setProfile, jobSearch, setJobSearch, genAIConfig, setGenAIConfig }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
