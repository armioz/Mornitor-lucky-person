import React, { useState, useRef, useEffect } from 'react';
import { read, utils, writeFile } from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useLuckyDraw } from '../context/LuckyDrawContext';
import './LuckyDrawSystem.css';

// Reward constants
const REWARDS = [
    "รางวัลที่1 : เงินสดมูลค่ารวม 50,000 บาท (1 รางวัล)",
    "รางวัลที่2 : เงินสดมูลค่ารวม 90,000 บาท (3 รางวัล)",
    "รางวัลที่3 : เงินสดมูลค่ารวม 100,000 บาท (5 รางวัล)",
    "รางวัลที่4 : เงินสดมูลค่ารวม 160,000 บาท (16 รางวัล) *ติดต่อรับที่ HO",
    "รางวัลที่5 : เงินสดมูลค่ารวม 100,000 บาท (20 รางวัล) *ติดต่อรับที่ HO",
    "รางวัลแต่งกายยอดเยี่ยม เงินสดมูลค่ารวม 10,000 บาท (5 รางวัล) *ติดต่อรับที่ HO"
];

const NEON_COLORS = [
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#00ff00', // Lime
    '#ffff00', // Yellow
    '#FF5F1F', // Orange
    '#bf00ff'  // Purple
];

const LuckyDrawSystem = () => {
    // Context State
    const { candidates, setCandidates, winners, setWinners } = useLuckyDraw();
    const navigate = useNavigate();

    const [selectedReward, setSelectedReward] = useState(REWARDS[0]);
    const [employeeId, setEmployeeId] = useState('');
    // Remove local candidates/winners state
    const [foundEmployee, setFoundEmployee] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null); // ID pending deletion
    const [countdown, setCountdown] = useState(10); // Auto-cancel timer
    const fileInputRef = useRef(null);
    const employeeIdInputRef = useRef(null);
    const scrollRef = useRef(null);

    // REMOVED: Tab and Pagination State

    // Extract limit from reward string
    const getRewardLimit = (rewardStr) => {
        const match = rewardStr.match(/\((\d+)\s*รางวัล\)/);
        return match ? parseInt(match[1], 10) : Infinity;
    };

    // Check availability
    const getRewardStats = (reward) => {
        const limit = getRewardLimit(reward);
        const count = winners.filter(w => w.reward === reward).length;
        return { count, limit, remaining: limit - count };
    };

    // Self-healing: Ensure all winners have a UID
    React.useEffect(() => {
        const hasMissingUid = winners.some(w => !w._uid);
        if (hasMissingUid) {
            setWinners(prev => prev.map(w => w._uid ? w : { ...w, _uid: Date.now() + Math.random() }));
        }
    }, [winners]);

    // Timer Auto-Cancel Logic
    React.useEffect(() => {
        let timer;
        if (foundEmployee) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setFoundEmployee(null); // Auto-cancel
                        setEmployeeId('');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [foundEmployee]);

    // UI-based 2-step Delete Logic (Bypasses window.confirm)
    const handleDeleteCandidate = (uid, index, e) => {
        if (e) e.stopPropagation();

        // If this ID is already waiting for confirmation, perform delete
        if (deleteConfirmId === uid) {
            setWinners(prev => {
                if (uid) return prev.filter(w => w._uid !== uid);
                // Fallback
                const newWinners = [...prev];
                newWinners.splice(index, 1);
                return newWinners;
            });
            setDeleteConfirmId(null);
        } else {
            // First click: Request confirmation
            setDeleteConfirmId(uid);
            // Auto-reset after 3 seconds if not confirmed
            setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    // Helper to render the winners list
    const renderWinnersList = () => {
        return REWARDS.map((reward) => {
            const rewardWinners = winners.filter(w => w.reward === reward);
            if (rewardWinners.length === 0) return null;
            return (
                <div key={reward} className="reward-group">
                    <h4 className="reward-group-title">{reward.split(':')[0]}</h4>
                    {rewardWinners.map((w, i) => (
                        <div
                            key={w._uid || i} // Use UID if available
                            className="winner-item clickable"
                            onClick={() => {
                                if (window.confirm(`Are you sure you want to remove ${w.name} from the winner list?`)) {
                                    setWinners(prev => prev.filter(winner => winner._uid !== w._uid));
                                }
                            }}
                            title="Click to remove"
                        >
                            <span style={{
                                color: w.color || '#00bfff',
                                textShadow: `0 0 5px ${w.color}, 0 0 10px ${w.color}, 0 0 20px ${w.color}`
                            }}>
                                {w.id} - {w.name}
                            </span>
                            <span className="factory-tag">Factory: {w.factory}</span>
                        </div>
                    ))}
                </div>
            );
        });
    };

    // REMOVED: renderSummaryView (moved to SummaryPage)

    // Auto-scroll effect
    React.useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        // Only auto-scroll if we have enough items (matching the render logic)
        // and if content actually overflows
        if (winners.length <= 2) return;

        let animationFrameId;
        let currentScroll = scrollContainer.scrollTop;

        const scroll = () => {
            if (scrollContainer) {
                if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
                    currentScroll += 0.6;
                    const halfHeight = scrollContainer.scrollHeight / 2;

                    // Seamless loop reset (requires duplicated content)
                    if (currentScroll >= halfHeight) {
                        currentScroll = 0;
                    }
                    scrollContainer.scrollTop = currentScroll;
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationFrameId);
    }, [winners]);
    // ... (rest of file)

    // (In render)
    // {winners.length > 1 && renderWinnersList()}

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            // Use header: 1 to get array of arrays, easier to map by index
            const jsonData = utils.sheet_to_json(sheet, { header: 1 });

            // Skip header row (index 0) and map data
            // Column A = index 0 (ID)
            // Column C = index 2 (Part Name 1)
            // Column D = index 3 (Part Name 2)
            // Column H = index 7 (Factory)
            const parsedCandidates = jsonData.slice(1).map(row => {
                // Safety check for empty rows
                if (!row || row.length === 0) return null;

                return {
                    id: String(row[0] || '').trim(),
                    name: `${row[2] || ''} ${row[3] || ''}`.trim(),
                    factory: String(row[7] || '').trim()
                };
            }).filter(item => item !== null && item.id !== '');

            setCandidates(parsedCandidates);
            alert(`Loaded ${parsedCandidates.length} candidates!`);
        } catch (error) {
            console.error("Error parsing Excel:", error);
            alert("Error parsing Excel file. Please check the format.");
        }
    };

    const handleSearchObj = () => {
        if (!employeeId) {
            setFoundEmployee(null);
            return;
        }
        const found = candidates.find(c => c.id.toLowerCase() === employeeId.toLowerCase());

        // Check for duplicates
        if (found) {
            const alreadyWon = winners.find(w => w.id === found.id);
            if (alreadyWon) {
                alert(`⚠️ Employee ${found.id} - ${found.name} has already won: ${alreadyWon.reward.split(':')[0]}!`);
                setEmployeeId(''); // Clear input
                employeeIdInputRef.current?.focus(); // Refocus for next input
                return;
            }

            setFoundEmployee(found);
            setCountdown(10); // Reset timer
            employeeIdInputRef.current?.blur(); // Blur input to allow window hotkeys
        } else {
            setFoundEmployee(null);
        }
    };

    // Confirm Winner Logic (Extracted for re-use)
    const handleConfirmWinner = React.useCallback(() => {
        if (!foundEmployee) return;

        const stats = getRewardStats(selectedReward);
        if (stats.count >= stats.limit) {
            alert(`Cannot add winner. Limit reached for this reward (${stats.limit}/${stats.limit})`);
            return;
        }

        const randomColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        setWinners(prev => [...prev, {
            ...foundEmployee,
            reward: selectedReward,
            color: randomColor,
            _uid: Date.now() + Math.random()
        }]);
        setFoundEmployee(null);
        setEmployeeId('');
        alert(`Congratulation ${foundEmployee.name}!`);
    }, [foundEmployee, selectedReward, winners]);

    // Export Winners to Excel
    const handleExportWinners = () => {
        if (winners.length === 0) {
            alert("No winners to export!");
            return;
        }
        const ws = utils.json_to_sheet(winners.map(w => ({
            ID: w.id,
            Name: w.name,
            Factory: w.factory,
            Reward: w.reward
        })));
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Winners");
        writeFile(wb, "Hoya_Lucky_Person_List_Winners.xlsx");
    };

    // Hotkey: Enter to Confirm
    React.useEffect(() => {
        if (!foundEmployee) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                handleConfirmWinner();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [foundEmployee, handleConfirmWinner]);

    // Prevent Accidental Tab Close
    React.useEffect(() => {
        const handleBeforeUnload = (e) => {
            console.log("Triggering beforeunload check...", { candidates: candidates.length, winners: winners.length });

            // Check if we have active data (candidates loaded or winners selected)
            if (candidates.length > 0 || winners.length > 0) {
                console.log(" preventing unload!");
                e.preventDefault();
                e.returnValue = true; // Chrome requirement
                return true;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [candidates, winners]);

    return (
        <div className="lucky-draw-container">
            {/* Header */}
            <div className="header-section">
                <div className="logo-box">
                    <img src="/assets/hoya_logo.png" alt="HOYA Logo" style={{ height: '80px', width: 'auto' }} />
                </div>
                <h1 className="event-title">
                    THE 1ST HOYA<br />
                    CARBON NEUTRAL <span className="highlight">EVENT 2025</span>
                </h1>
                <div className="upload-section">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                    />
                    {candidates.length === 0 ? (
                        <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                            📂 Upload Excel File
                        </button>
                    ) : (
                        <div style={{ marginTop: '1rem', color: '#00ff00', fontWeight: 'bold', textShadow: '0 0 5px #00ff00', fontSize: '1.2rem', border: '1px solid #00ff00', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                            Total Candidates: {candidates.length.toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            <div className="main-content">
                {/* Left Control Panel */}
                <div className="control-panel">
                    {/* Find by ID */}
                    <div className="input-group">
                        <input
                            ref={employeeIdInputRef}
                            type="text"
                            placeholder="Enter Employee ID"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.stopPropagation(); // Prevent triggering global confirm hotkey
                                    handleSearchObj();
                                }
                            }}
                        />

                    </div>

                    {/* Reward Dropdown */}
                    <div className="input-group">
                        <select
                            value={selectedReward}
                            onChange={(e) => setSelectedReward(e.target.value)}
                        >
                            {REWARDS.map((r, idx) => {
                                const stats = getRewardStats(r);
                                const displayName = r.replace(' *ติดต่อรับที่ HO', '');

                                return (
                                    <option key={idx} value={r} disabled={stats.remaining <= 0 && r !== selectedReward}>
                                        {displayName} {stats.remaining <= 0 ? '(FULL)' : `[${stats.remaining} left]`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* CRUD Section */}
                    <div className="crud-section">
                        <h3>Winner Management</h3>

                        <div className="crud-table-container">
                            <table className="crud-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Reward</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {winners.map((c, i) => (
                                        <tr key={c._uid || i}>
                                            <td>{c.id}</td>
                                            <td>{c.name}</td>
                                            <td>{c.reward.split(':')[0]}</td>
                                            <td>
                                                <button
                                                    className="crud-delete-btn"
                                                    style={deleteConfirmId === c._uid ? { background: 'red', color: 'white', fontWeight: 'bold' } : {}}
                                                    onClick={(e) => handleDeleteCandidate(c._uid, i, e)}
                                                >
                                                    {deleteConfirmId === c._uid ? 'Confirm?' : 'Delete'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {winners.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>
                                                No winners yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Display Panel */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Tabs (Outside Card) - Replaced with Navigation Button */}
                    {!foundEmployee && (
                        <div className="tab-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                            <button
                                className="tab-btn active"
                                style={{ cursor: 'default' }}
                            >
                                Live Feed
                            </button>
                            <button
                                className="tab-btn"
                                onClick={() => navigate('/summary')}
                            >
                                Go to Summary list
                            </button>
                        </div>
                    )}

                    <div className="display-panel" style={{ flex: 'none', width: '100%' }}>
                        <div className="display-content">
                            {foundEmployee ? (
                                <div className="winner-card">
                                    <h3>{foundEmployee.name}</h3>
                                    <p>ID: {foundEmployee.id}</p>
                                    <p className="factory">Factory: {foundEmployee.factory}</p>
                                    <p className="reward-tag">{selectedReward.split(':')[0]}</p>

                                    {/* Countdown Timer */}
                                    <div style={{ fontSize: '2rem', color: '#FF5F1F', fontWeight: 'bold', margin: '1rem 0', textShadow: '0 0 10px #FF5F1F' }}>
                                        Auto-cancel in: {countdown}s
                                    </div>

                                    <button className="confirm-btn" onClick={handleConfirmWinner}>
                                        Confirm Lucky person
                                    </button>
                                </div>
                            ) : (
                                <div className="winners-list-container">
                                    <div className="winners-scroll" ref={scrollRef}>
                                        {renderWinnersList()}
                                        {/* Duplicate for seamless loop - only if we have enough items to scroll */}
                                        {winners.length > 2 && renderWinnersList()}
                                        {winners.length === 0 && <p style={{ opacity: 0.5 }}>No winners yet.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export Button Outside Box */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={handleExportWinners}
                            className="upload-btn"
                            style={{
                                fontSize: '1rem',
                                padding: '0.5rem 2rem',
                                background: 'linear-gradient(45deg, #00ff00, #00cc00)',
                                width: '100%',
                                marginTop: 0
                            }}
                        >
                            📥 Export Winners to Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LuckyDrawSystem;
