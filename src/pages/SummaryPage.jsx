import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLuckyDraw } from '../context/LuckyDrawContext';
import '../components/LuckyDrawSystem.css'; // Reuse CSS

const REWARDS = [
    "รางวัลที่1 : เงินสดมูลค่ารวม 50,000 บาท (1 รางวัล)",
    "รางวัลที่2 : เงินสดมูลค่ารวม 90,000 บาท (3 รางวัล)",
    "รางวัลที่3 : เงินสดมูลค่ารวม 100,000 บาท (5 รางวัล)",
    "รางวัลที่4 : เงินสดมูลค่ารวม 160,000 บาท (16 รางวัล) *ติดต่อรับที่ HO",
    "รางวัลที่5 : เงินสดมูลค่ารวม 100,000 บาท (20 รางวัล) *ติดต่อรับที่ HO",
    "รางวัลแต่งกายยอดเยี่ยม เงินสดมูลค่ารวม 10,000 บาท (5 รางวัล) *ติดต่อรับที่ HO"
];

// import * as XLSX from 'xlsx';

const SummaryPage = () => {
    const { winners } = useLuckyDraw();
    const navigate = useNavigate();
    const [summaryFilter, setSummaryFilter] = useState('All');

    const filteredWinners = summaryFilter === 'All'
        ? winners
        : winners.filter(w => w.reward === summaryFilter);

    const handleExport = async () => {
        const XLSX = await import('xlsx'); // Dynamic import

        // Map data to include "Reward Type"
        const dataToExport = filteredWinners.map(w => ({
            ID: w.id,
            Name: w.name,
            Factory: w.factory,
            'Reward Type': w.reward.replace(' *ติดต่อรับที่ HO', '') // Cleaned text
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Winners");
        XLSX.writeFile(wb, "Hoya_Lucky_Draw_Winners.xlsx");
    };

    return (
        <div className="lucky-draw-container">
            <h1 className="event-title">Summary List</h1>

            {/* Navigation & Filter (Outside Card) */}
            <div style={{ maxWidth: '1000px', width: '100%', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/')}
                        className="upload-btn"
                        style={{ marginTop: 0, padding: '0.5rem 1rem' }}
                    >
                        &lt; Back to Live Feed
                    </button>
                    <button
                        onClick={handleExport}
                        className="upload-btn"
                        style={{ marginTop: 0, padding: '0.5rem 1rem', background: '#217346', borderColor: '#217346', color: 'white' }}
                    >
                        Export to Excel
                    </button>
                </div>

                <div className="summary-controls" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ marginRight: 0 }}>Reward:</label>
                        <select
                            value={summaryFilter}
                            onChange={(e) => setSummaryFilter(e.target.value)}
                        >
                            <option value="All">All Rewards</option>
                            {REWARDS.map((r, i) => (
                                <option key={i} value={r}>
                                    {r.includes(':') ? r.split(':')[0] : r.replace(' *ติดต่อรับที่ HO', '')}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="summary-view" style={{ maxWidth: '1000px', width: '100%', background: 'rgba(0,0,0,0.5)', padding: '2rem', borderRadius: '20px' }}>

                {/* Selected Reward Header */}
                {/* Selected Reward Header */}
                <h2 style={{
                    textAlign: 'center',
                    color: '#ffd700',
                    marginBottom: '0.5rem',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                    marginTop: 0,
                    fontSize: '1.5rem',
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    {summaryFilter === 'All' ? 'All Rewards' :
                        (summaryFilter.includes(':') ? summaryFilter.split(':')[0] : summaryFilter.replace(' *ติดต่อรับที่ HO', ''))}
                </h2>

                <div className="summary-table-container">
                    <table className="summary-table">
                        <thead>
                            <tr>
                                <th style={{ width: '20%' }}>ID</th>
                                <th style={{ width: '50%' }}>Name</th>
                                <th style={{ width: '30%' }}>Factory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWinners.map((w, i) => (
                                <tr key={w._uid || i}>
                                    <td>{w.id}</td>
                                    <td>{w.name}</td>
                                    <td>{w.factory}</td>
                                </tr>
                            ))}
                            {filteredWinners.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No winners found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>


            </div>
        </div>
    );
};

export default SummaryPage;
