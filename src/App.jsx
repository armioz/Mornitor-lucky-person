import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LuckyDrawProvider } from './context/LuckyDrawContext';
import SpotlightBackground from './components/SpotlightBackground';
import LuckyDrawSystem from './components/LuckyDrawSystem';
import SummaryPage from './pages/SummaryPage';
import './App.css';

function App() {
    return (
        <LuckyDrawProvider>
            <BrowserRouter>
                <SpotlightBackground />
                <Routes>
                    <Route path="/" element={<LuckyDrawSystem />} />
                    <Route path="/summary" element={<SummaryPage />} />
                </Routes>
            </BrowserRouter>
        </LuckyDrawProvider>
    );
}

export default App;
