import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import Tree from 'react-d3-tree';
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

const PIE_COLORS = ['#a371f7', '#db2777', '#10b981', '#ea580c', '#0ea5e9', '#3fb950', '#fb8f44', '#dc2626'];

const formatAddress = (addr) => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000' || addr === '0x00') return 'System / Genesis';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

const getRowStyle = (status, type, flag) => {
  if (status === 'PENDING') return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '3px solid #eab308', opacity: 0.8 };
  if (flag === 'MEV_ACTIVITY') return { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderLeft: '3px solid #dc2626' };
  if (type === 'ARBITRAGE' || flag === 'ARBITRAGE_ACTIVITY') return { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderLeft: '3px solid #10b981' };
  if (type === 'CROSS_CHAIN' || flag === 'BRIDGE_ACTIVITY') return { backgroundColor: 'rgba(14, 165, 233, 0.12)', borderLeft: '3px solid #0ea5e9' };
  if (type === 'LENDING' || flag === 'LENDING_ACTIVITY') return { backgroundColor: 'rgba(234, 88, 12, 0.12)', borderLeft: '3px solid #ea580c' };
  if (type === 'AI_AGENT' || flag === 'AGENT_FLOW') return { backgroundColor: 'rgba(163, 113, 247, 0.12)', borderLeft: '3px solid #a371f7' };
  if (type === 'DEX_SWAP' || type === 'DEX_LIQUIDITY' || flag === 'DEX_ACTIVITY') return { backgroundColor: 'rgba(219, 39, 119, 0.12)', borderLeft: '3px solid #db2777' };
  if (flag === 'WHALE') return { backgroundColor: 'rgba(248, 81, 73, 0.12)' };
  return {};
};

const renderNetworkBadge = (net) => {
  const network = net || 'ARC';
  if (network === 'BASE') return <span className="badge badge-base">🔵 BASE</span>;
  return <span className="badge badge-arc">🔷 ARC</span>;
};

const renderTypeBadge = (type) => {
  switch (type) {
    case 'ARBITRAGE': return <span className="badge badge-arbitrage">🔄 ARBITRAGE</span>;
    case 'LENDING': return <span className="badge badge-lending">🏦 LENDING</span>;
    case 'CROSS_CHAIN': return <span className="badge badge-bridge">🌉 BRIDGE</span>;
    case 'AI_AGENT': return <span className="badge badge-agent">AI AGENT</span>;
    case 'DEX_SWAP': return <span className="badge badge-dex-swap">🦄 SWAP</span>;
    case 'DEX_LIQUIDITY': return <span className="badge badge-dex-liquidity">🌊 POOL LP</span>;
    case 'TOKEN': return <span className="badge badge-token">TOKEN</span>;
    default: return <span className="badge badge-native">NATIVE</span>;
  }
};

const renderPnL = (pnl) => {
  if (!pnl || pnl === 0) return <span className="pnl-neutral">---</span>;
  if (pnl > 0) return <span className="pnl-positive">+ ${pnl.toFixed(2)}</span>;
  return <span className="pnl-negative">- ${Math.abs(pnl).toFixed(2)}</span>;
};

const renderAgentBadge = (label, winRate) => {
  if (!label) return null;
  if (winRate > 60) return <span className="agent-alpha">🌟 Alpha Agent (WR: {winRate}%)</span>;
  if (winRate > 0) return <span className="agent-beta">🤖 Beta Agent (WR: {winRate}%)</span>;
  return <span className="entity-tag">{label}</span>;
};

const renderHealthFactor = (hf) => {
  if (!hf || hf >= 90) return <span className="sec-safe">HF: N/A</span>;
  if (hf === 0) return <span className="sec-danger" style={{ animation: 'pulse-danger 0.5s infinite' }}>💀 LIQUIDATED</span>;
  if (hf < 1.1) return <span className="sec-danger" style={{ animation: 'pulse-danger 1s infinite' }}>⚠️ LIQ RISK ({hf})</span>;
  if (hf < 1.5) return <span className="sec-warn">HF: {hf} (Warn)</span>;
  return <span className="sec-safe">HF: {hf}</span>;
};

const renderSecurityBadge = (score, label) => {
  if (!label) return <span className="sec-safe">✅ VERIFIED</span>;
  if (score < 25) return <span className="sec-danger">{label}</span>;
  if (score < 50) return <span className="sec-warn">{label}</span>;
  return <span className="sec-safe">Check {label}</span>;
};

const renderTwapBadge = (twap, trend) => {
  if (!trend) return null;
  if (trend.includes('Accumulation')) return <span className="trend-accum">{trend} (TWAP: ${twap})</span>;
  if (trend.includes('Pressure')) return <span className="trend-dist">{trend} (TWAP: ${twap})</span>;
  if (trend.includes('Bullish')) return <span className="trend-bull">{trend} (TWAP: ${twap})</span>;
  if (trend.includes('Bearish')) return <span className="trend-bear">{trend} (TWAP: ${twap})</span>;
  return <span className="trend-neutral">{trend} (TWAP: ${twap})</span>;
};

const Dashboard = ({ 
  transactions, leaderboard, activeNetwork, filterType, searchTerm,
  setFilterType, setSearchTerm, setSelectedTx, selectedTx,
  selectedEntity, setSelectedEntity, killZone, sybilClusters,
  snipeTargets, darkPoolAlerts, sentimentData, shadowTargets,
  shadowLogs, bridgeTsunamis, shadowRelayAlerts, autoEjectAlerts,
  vestingDumps, gasWars, handleBackup, handleRestore, handleAudit, handleDecompile,
  executeAutoEject, executeShortDump, executeFlashloan,
  executeAtomicArb, toggleShadow, auditInput, setAuditInput,
  auditData, isAuditing, decompileInput, setDecompileInput,
  decompileData, isDecompiling, auditNetwork, setAuditNetwork,
  flashSimulator, setFlashSimulator, atomicSimulator, setAtomicSimulator,
  arbitrageRoutes, displayMempool, projectAnalysis, networkData, chartData,
  fileInputRef, containerRef, exportToCSV, graphDimensions
}) => {
  const [panelConfig, setPanelConfig] = useState([
    { id: 'FLOW_MATRIX', title: '🎛️ Live Flow Matrix', size: 'grid-full', visible: true },
    { id: 'LEADERBOARD', title: '🏆 Alpha Entities', size: 'grid-half', visible: true },
    { id: 'ARBITRAGE_RADAR', title: '🌉 Cross-Chain Arbitrage', size: 'grid-half', visible: true }
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
            
            <div className="matrix-controls" style={{ padding: '16px' }}>
              <input type="text" className="search-input" placeholder="Search parameters..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="ALL">All Flows</option>
                <option value="ARBITRAGE_ACTIVITY">🔄 Arbitrage Spread</option>
                <option value="WHALE">🐋 Whale Action</option>
              </select>
            </div>

            <div className="table-container">
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Action Protocol</th>
                    <th>Asset</th>
                    <th>Metrics Matrix</th>
                    <th>Realized Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={index} className="tx-row" style={getRowStyle(tx.status, tx.type, tx.flag)} onClick={() => setSelectedTx(tx)}>
                      <td><span className="badge badge-confirmed">✓ CONFIRMED</span></td>
                      <td>{renderTypeBadge(tx.type)}</td>
                      <td>{tx.asset}</td>
                      <td>{renderTwapBadge(tx.twap, tx.twap_trend)}</td>
                      <td>{renderPnL(tx.pnl)}</td>
                    </tr>
                  ))}
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
                      <th>Aggregated P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.wallets.map((w, i) => (
                      <tr key={i}>
                        <td>#{i + 1}</td>
                        <td>{formatAddress(w.addr)}</td>
                        <td style={{ color: '#3fb950', fontWeight: 'bold' }}>+${w.pnl.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {panelConfig.find(p => p.id === 'ARBITRAGE_RADAR')?.visible && (
          <div className={`panel workspace-panel-widget ${panelConfig.find(p => p.id === 'ARBITRAGE_RADAR').size}`}>
            <div className="widget-header-controls">
              <h4>{panelConfig.find(p => p.id === 'ARBITRAGE_RADAR').title}</h4>
              <div className="size-controls">
                <button onClick={() => updatePanelSize('ARBITRAGE_RADAR', 'grid-third')}>1/3</button>
                <button onClick={() => updatePanelSize('ARBITRAGE_RADAR', 'grid-half')}>1/2</button>
                <button onClick={() => updatePanelSize('ARBITRAGE_RADAR', 'grid-full')}>FULL</button>
              </div>
            </div>
            <div className="table-container" style={{ padding: '16px' }}>
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Route</th>
                    <th>Spread</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrageRoutes.map((route, idx) => (
                    <tr key={idx}>
                      <td style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{route.asset}</td>
                      <td>{route.route}</td>
                      <td style={{ color: '#10b981' }}>+{route.spread}%</td>
                      <td style={{ color: '#3fb950' }}>${route.est_profit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EthicalSentimentTerminal = ({ wsRef, ethicalAlerts }) => {
  const [targetAsset, setTargetAsset] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!wsRef.current) return;
    const ws = wsRef.current;
    const handleMsg = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'ETHICAL_ANALYSIS_RESULT') {
          setAnalysisData(data.data);
          setIsAnalyzing(false);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handleMsg);
    return () => ws.removeEventListener('message', handleMsg);
  }, [wsRef]);

  const handleAnalysis = () => {
    if (!targetAsset || !wsRef.current) return;
    setIsAnalyzing(true);
    setAnalysisData(null);
    wsRef.current.send(JSON.stringify({
      action: 'RUN_ETHICAL_SENTIMENT',
      target_asset: targetAsset
    }));
  };

  return (
    <div className="ethical-container">
      <div className="ethical-header">
        <h2>🧠 ETHICAL SENTIMENT & NARRATIVE TRACKER</h2>
        <span>Protecting Liquidity from Organized Pump & Dumps</span>
      </div>
      <div className="ethical-layout">
        <div className="ethical-live-feed">
          <h3 style={{ color: '#8b949e', borderBottom: '1px solid #30363d', paddingBottom: '8px', margin: '0 0 16px 0' }}>Live Ecosystem Warnings</h3>
          <div className="ethical-alerts-list">
            {ethicalAlerts.map((alert, i) => (
              <div key={i} className="ethical-alert-card" style={{ borderLeftColor: alert.bot_activity_ratio > 65 ? '#f85149' : '#3fb950' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{formatAddress(alert.asset)}</span>
                </div>
                <div style={{ fontWeight: 'bold' }}>{alert.manipulation_risk}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ethical-main-panel">
          <div className="ethical-controls">
            <input type="text" placeholder="Enter Target Asset Contract (0x...)" value={targetAsset} onChange={e => setTargetAsset(e.target.value)} disabled={isAnalyzing} />
            <button className="pulse" onClick={handleAnalysis} disabled={isAnalyzing || !targetAsset}>
              {isAnalyzing ? 'SCANNING SOCIAL GRAPHS...' : 'AUDIT PROJECT NARRATIVE'}
            </button>
          </div>
          {analysisData && (
            <div className="ethical-results">
              <div className="ethical-stats-grid">
                <div className="ethical-stat-box" style={{ borderColor: analysisData.color }}>
                  <span>Risk Level</span>
                  <strong style={{ color: analysisData.color }}>{analysisData.risk_classification}</strong>
                </div>
                <div className="ethical-stat-box">
                  <span>Bot Concentration</span>
                  <strong>{analysisData.bot_ratio}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ wallets: [], agents: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [ethicalAlerts, setEthicalAlerts] = useState([]);
  const [arbitrageRoutes, setArbitrageRoutes] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const wsUrl = getWsUrl();
      try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => setIsConnected(true);
        ws.onerror = () => setIsConnected(false);
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.msg_type === 'ETHICAL_SENTIMENT_ALERT') {
            setEthicalAlerts(prev => [data.data, ...prev].slice(0, 10));
            return;
          }
          if (data.msg_type === 'ARBITRAGE_RADAR') {
            setArbitrageRoutes(prev => [data, ...prev].slice(0, 5));
            return;
          }
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
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>A.S.M.O.</h1>
          <span>v19.0.0.1</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <span>📊</span> GLOBAL MATRIX
          </button>
          <button className={`nav-btn ${activeTab === 'ETHICAL_AI' ? 'active' : ''}`} onClick={() => setActiveTab('ETHICAL_AI')}>
            <span>🧠</span> ETHICAL AI
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
          <Dashboard 
            transactions={transactions} leaderboard={leaderboard} activeNetwork="ALL"
            filterType={filterType} setFilterType={setFilterType} searchTerm={searchTerm}
            setSearchTerm={setSearchTerm} arbitrageRoutes={arbitrageRoutes} wsRef={wsRef}
          />
        )}
        {activeTab === 'ETHICAL_AI' && <EthicalSentimentTerminal wsRef={wsRef} ethicalAlerts={ethicalAlerts} />}
      </main>
    </div>
  );
}