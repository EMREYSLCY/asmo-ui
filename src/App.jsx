import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
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

const Sparkline = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const chartData = data.map((val, i) => ({ i, val }));
  return (
    <div className="sparkline-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="val" 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={true} 
            animationDuration={800} 
            animationEasing="ease-in-out" 
          />
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

const renderPnL = (pnl) => {
  if (!pnl || pnl === 0) return <span className="pnl-neutral">---</span>;
  return <AnimatedNumber value={pnl} prefix={pnl > 0 ? "+ $" : "- $"} isPositive={pnl > 0} />;
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
                    <th>Trend</th>
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
                      <td>
                        {tx.sparkline && <Sparkline data={tx.sparkline} color={tx.pnl >= 0 ? '#10b981' : '#f85149'} />}
                      </td>
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
                      <th>Performance</th>
                      <th>Aggregated P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.wallets.map((w, i) => (
                      <tr key={i}>
                        <td>#{i + 1}</td>
                        <td>{formatAddress(w.addr)}</td>
                        <td>
                          {w.sparkline && <Sparkline data={w.sparkline} color="#10b981" />}
                        </td>
                        <td><AnimatedNumber value={w.pnl} prefix="+$" isPositive={true} /></td>
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
                      <td><AnimatedNumber value={route.est_profit} prefix="$" isPositive={true} /></td>
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

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ wallets: [], agents: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
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

  const dashboardProps = { 
    transactions, setTransactions, leaderboard, setLeaderboard, activeNetwork: "ALL", setActiveNetwork: () => {},
    graphDimensions: {width: 800, height: 400}, setGraphDimensions: () => {}, searchTerm, setSearchTerm,
    filterType, setFilterType, selectedTx: null, setSelectedTx: () => {}, selectedEntity: null, setSelectedEntity: () => {},
    executeFlashloan: () => {}, executeAtomicArb: () => {}, exportToCSV: () => {},
    displayMempool: { volume: 0, impact: 0, txs: [] }, projectAnalysis: [], networkData: {nodes:[], links:[]}, chartData: {pie:[], bar:[]}, entityData: null
  };

  return (
    <div className="os-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>A.S.M.O.</h1>
          <span>v20.0.0.1</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <span>📊</span> GLOBAL MATRIX
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
      </main>
    </div>
  );
}