import { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
    const [profile, setProfile] = useState(null); // { id, skills, raw_text, verified_skills }
    const [jobSearch, setJobSearch] = useState(null); // { taskId, results, analytics }

    return (
        <AppContext.Provider value={{ profile, setProfile, jobSearch, setJobSearch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
