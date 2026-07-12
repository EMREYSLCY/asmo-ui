import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import './App.css';

const getWsUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
  } catch (e) {}
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.dev')) {
    return `wss://${window.location.hostname.replace('-5173', '-8765')}`;
  }
  return 'ws://localhost:8765';
};

const formatAddress = (addr) => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000' || addr === '0x00') return 'System / Genesis';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

const getRowStyle = (status, type, flag) => {
  if (flag === 'ARBITRAGE_ACTIVITY') return { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981' };
  if (type === 'DEX_SWAP') return { backgroundColor: 'rgba(219, 39, 119, 0.08)', borderLeft: '3px solid #db2777' };
  return {};
};

const Sparkline = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const chartData = data.map((val, i) => ({ i, val }));
  return (
    <div className="sparkline-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={800} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const AnimatedNumber = ({ value, prefix = "", suffix = "", isPositive }) => {
  return (
    <span className={`animated-number ${isPositive ? 'positive' : 'negative'}`}>
      {prefix}{Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
    </span>
  );
};

const CommandPalette = ({ isOpen, onClose, setActiveTab, wsRef }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const commands = [
    { id: 'nav_dash', icon: '📊', name: 'Navigate: Global Matrix', action: () => setActiveTab('DASHBOARD') },
    { id: 'nav_eth', icon: '🧠', name: 'Navigate: Ethical AI Tracker', action: () => setActiveTab('ETHICAL_AI') },
    { id: 'nav_api', icon: '🌐', name: 'Navigate: B2B API Gateway', action: () => setActiveTab('API_GATEWAY') },
    { id: 'sys_flush', icon: '🧹', name: 'System: Flush Visual Cache', action: () => console.log('Cache Cleared') },
    { id: 'sys_lock', icon: '🔐', name: 'System: Engage KMS Enclave', action: () => {
      if(wsRef.current) wsRef.current.send(JSON.stringify({action: 'SYSTEM_COMMAND', command: 'ENGAGE_KMS'}));
    }},
  ];

  const filteredCommands = commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <span className="cmd-search-icon">⚡</span>
          <input 
            ref={inputRef}
            className="cmd-input" 
            type="text" 
            placeholder="A.S.M.O. Command Protocol... (Search arrays, modules, commands)" 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="cmd-esc-hint">ESC to close</span>
        </div>
        <div className="cmd-list">
          {filteredCommands.length > 0 ? (
            filteredCommands.map(cmd => (
              <div 
                key={cmd.id} 
                className="cmd-item" 
                onClick={() => {
                  cmd.action();
                  onClose();
                  setQuery('');
                }}
              >
                <span className="cmd-item-icon">{cmd.icon}</span>
                <span className="cmd-item-name">{cmd.name}</span>
                <span className="cmd-item-arrow">↵</span>
              </div>
            ))
          ) : (
            <div className="cmd-empty">No directives found in current matrix.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ transactions, leaderboard }) => {
  const [panelConfig, setPanelConfig] = useState([
    { id: 'FLOW_MATRIX', title: '🎛️ Live Flow Matrix', size: 'grid-full', visible: true },
    { id: 'LEADERBOARD', title: '🏆 Alpha Entities', size: 'grid-half', visible: true }
  ]);

  const updatePanelSize = (id, newSize) => {
    setPanelConfig(prev => prev.map(p => p.id === id ? { ...p, size: newSize } : p));
  };

  const togglePanelVisibility = (id) => {
    setPanelConfig(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
  };

  return (
    <div className="workspace-grid-container">
      <div className="workspace-toolbar">
        <h3>🛠️ GRID MANAGEMENT SYSTEM</h3>
        <div className="toolbar-toggles">
          {panelConfig.map(p => (
            <button key={p.id} className={`toggle-btn ${p.visible ? 'active' : 'inactive'}`} onClick={() => togglePanelVisibility(p.id)}>
              {p.visible ? '👁️' : '🕶️'} {p.title.split(' ')[1]}
            </button>
          ))}
          <div className="cmd-hint-badge">
            Press <kbd>⌘</kbd> + <kbd>K</kbd> for Command Palette
          </div>
        </div>
      </div>

      <div className="workspace-grid-layout">
        {panelConfig.find(p => p.id === 'FLOW_MATRIX')?.visible && (
          <div className={`panel workspace-panel-widget ${panelConfig.find(p => p.id === 'FLOW_MATRIX').size}`}>
            <div className="widget-header-controls">
              <h4>{panelConfig.find(p => p.id === 'FLOW_MATRIX').title}</h4>
              <div className="size-controls">
                <button onClick={() => updatePanelSize('FLOW_MATRIX', 'grid-third')}>1/3</button>
                <button onClick={() => updatePanelSize('FLOW_MATRIX', 'grid-half')}>1/2</button>
                <button onClick={() => updatePanelSize('FLOW_MATRIX', 'grid-full')}>FULL</button>
              </div>
            </div>

            <div className="table-container">
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Asset</th>
                    <th>Trend Matrix</th>
                    <th>Realized Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={index} className="tx-row" style={getRowStyle(tx.status, tx.type, tx.flag)}>
                      <td><span className="badge badge-confirmed">✓ CONFIRMED</span></td>
                      <td>{tx.asset}</td>
                      <td>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <span style={{color: '#8b949e', fontSize: '0.8rem'}}>{tx.twap_trend}</span>
                          {tx.sparkline && <Sparkline data={tx.sparkline} color={tx.pnl >= 0 ? '#10b981' : '#f85149'} />}
                        </div>
                      </td>
                      <td>
                        {tx.pnl ? <AnimatedNumber value={tx.pnl} prefix={tx.pnl > 0 ? "+ $" : "- $"} isPositive={tx.pnl > 0} /> : <span style={{color: '#8b949e'}}>---</span>}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan="4" style={{textAlign: 'center', padding: '24px', color: '#8b949e'}}>Awaiting telemetry from nodes...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {panelConfig.find(p => p.id === 'LEADERBOARD')?.visible && (
          <div className={`panel workspace-panel-widget ${panelConfig.find(p => p.id === 'LEADERBOARD').size}`}>
            <div className="widget-header-controls">
              <h4>{panelConfig.find(p => p.id === 'LEADERBOARD').title}</h4>
              <div className="size-controls">
                <button onClick={() => updatePanelSize('LEADERBOARD', 'grid-third')}>1/3</button>
                <button onClick={() => updatePanelSize('LEADERBOARD', 'grid-half')}>1/2</button>
                <button onClick={() => updatePanelSize('LEADERBOARD', 'grid-full')}>FULL</button>
              </div>
            </div>
            <div className="leaderboard-container" style={{ gridTemplateColumns: '1fr', padding: '16px' }}>
              <div className="leaderboard-card">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Entity Wallet</th>
                      <th>Performance</th>
                      <th>Aggregated P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.wallets.map((w, i) => (
                      <tr key={i}>
                        <td>#{i + 1}</td>
                        <td style={{fontFamily: 'monospace', color: '#58a6ff'}}>{formatAddress(w.addr)}</td>
                        <td>{w.sparkline && <Sparkline data={w.sparkline} color="#10b981" />}</td>
                        <td><AnimatedNumber value={w.pnl} prefix="+$" isPositive={true} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ wallets: [], agents: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const connect = () => {
      const wsUrl = getWsUrl();
      try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => setIsConnected(true);
        ws.onerror = () => setIsConnected(false);
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.msg_type === 'LEADERBOARD_UPDATE') {
            setLeaderboard({ wallets: data.wallets, agents: data.agents });
            return;
          }
          if (data.msg_type === 'TRANSACTION') {
            setTransactions((prev) => {
              const existingIndex = prev.findIndex((t) => t.tx_hash === data.tx_hash);
              const newData = { time: new Date().toLocaleTimeString(), project: 'A.S.M.O.', status: 'CONFIRMED', ...data };
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], ...newData };
                return updated;
              }
              return [newData, ...prev].slice(0, 150);
            });
          }
        };
        ws.onclose = () => setIsConnected(false);
        wsRef.current = ws;
      } catch (err) { setIsConnected(false); }
    };
    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  return (
    <div className="os-layout">
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} setActiveTab={setActiveTab} wsRef={wsRef} />
      
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>A.S.M.O.</h1>
          <span>v21.0.0.1</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <span>📊</span> GLOBAL MATRIX
          </button>
          <button className={`nav-btn ${activeTab === 'API_GATEWAY' ? 'active' : ''}`} onClick={() => setActiveTab('API_GATEWAY')} style={{ color: '#0ea5e9' }}>
            <span>🌐</span> B2B API GATEWAY
          </button>
          <button className={`nav-btn ${activeTab === 'ETHICAL_AI' ? 'active' : ''}`} onClick={() => setActiveTab('ETHICAL_AI')}>
            <span>🧠</span> ETHICAL AI
          </button>
          <button className="nav-btn locked" disabled>
            <span>🔐</span> KMS ENCLAVE 🔒
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
            <span>{isConnected ? '🟢' : '🔴'}</span> {isConnected ? ' LIVE NODE' : ' LINK SEVERED'}
          </div>
        </div>
      </aside>
      <main className="os-main-content">
        {activeTab === 'DASHBOARD' && (
          <Dashboard transactions={transactions} leaderboard={leaderboard} />
        )}
        {activeTab !== 'DASHBOARD' && (
           <div style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8b949e', flexDirection: 'column'}}>
             <span style={{fontSize: '3rem', marginBottom: '16px'}}>🚧</span>
             <h2>Module Active in Background</h2>
             <p>Use Global Matrix for primary flow.</p>
           </div>
        )}
      </main>
    </div>
  );
}