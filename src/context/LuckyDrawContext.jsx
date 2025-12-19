import React, { createContext, useContext, useState, useEffect } from 'react';

const LuckyDrawContext = createContext();

export const useLuckyDraw = () => useContext(LuckyDrawContext);

export const LuckyDrawProvider = ({ children }) => {
    // Shared State
    const [candidates, setCandidates] = useState([]);
    const [winners, setWinners] = useState([]);

    // Derived State Logic can live here or in components?
    // For now, these are the critical pieces to persist.

    // Optional: Persist to localStorage if needed
    useEffect(() => {
        const savedWinners = localStorage.getItem('hoya_winners');
        if (savedWinners) {
            try {
                setWinners(JSON.parse(savedWinners));
            } catch (e) {
                console.error("Failed to load winners", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('hoya_winners', JSON.stringify(winners));
    }, [winners]);

    const value = {
        candidates,
        setCandidates,
        winners,
        setWinners
    };

    return (
        <LuckyDrawContext.Provider value={value}>
            {children}
        </LuckyDrawContext.Provider>
    );
};
