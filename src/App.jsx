import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';
import './App.css';

const getWsUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
  } catch (e) {}
  return 'wss://glorious-fiesta-pv45wv747g6hx66-8765.app.github.dev';
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ wallets: [], agents: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState('ALL');
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 400 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);
  
  const wsRef = useRef(null);
  const containerRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);

  useEffect(() => {
    const connect = () => {
      const wsUrl = getWsUrl();
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsConnected(true);
          reconnectAttempts.current = 0;
        };
        
        ws.onerror = () => setIsConnected(false);
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.msg_type === 'LEADERBOARD_UPDATE') {
            setLeaderboard({ wallets: data.wallets, agents: data.agents });
            return;
          }
          setTransactions((prev) => {
            const existingIndex = prev.findIndex((t) => t.tx_hash === data.tx_hash);
            const newData = { time: new Date().toLocaleTimeString(), project: 'A.S.M.O.', status: data.status || 'CONFIRMED', ...data };
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], ...newData };
              return updated;
            }
            return [newData, ...prev].slice(0, 150);
          });
        };

        ws.onclose = () => {
          setIsConnected(false);
          scheduleReconnect();
        };

        wsRef.current = ws;
      } catch (err) {
        setIsConnected(false);
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setGraphDimensions({ width: containerRef.current.offsetWidth, height: 400 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const displayedTransactions = useMemo(() => {
    let filtered = transactions;
    if (activeNetwork !== 'ALL') {
      filtered = filtered.filter((tx) => tx.network === activeNetwork);
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter((tx) => tx.flag === filterType || tx.type === filterType);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.tx_hash?.toLowerCase().includes(term) ||
          tx.from_addr?.toLowerCase().includes(term) ||
          tx.to_addr?.toLowerCase().includes(term) ||
          tx.asset?.toLowerCase().includes(term) ||
          tx.narrative?.toLowerCase().includes(term) ||
          tx.from_label?.toLowerCase().includes(term) ||
          tx.to_label?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [transactions, activeNetwork, filterType, searchTerm]);

  const exportToCSV = () => {
    if (displayedTransactions.length === 0) return;
    const headers = [
      'Time', 'Network', 'Status', 'Type', 'Flag', 'Hash', 'Asset', 'Amount', 'Value_USD', 'From_Entity', 'To_Entity', 'Sybil_Cluster', 'Health_Factor', 'TWAP', 'Market_Trend', 'Price_Impact', 'Arbitrage_Spread', 'Agent_WinRate', 'MEV_Extracted', 'Exec_Depth', 'Realized_PnL', 'Narrative', 'Security_Label',
    ];
    const rows = displayedTransactions.map((tx) => [
      tx.time, tx.network || 'ARC', tx.status, tx.type, tx.flag || 'STANDARD', tx.tx_hash, tx.asset, tx.amount, tx.amount * (tx.price_usd || 0), tx.from_label || tx.from_addr || 'N/A', tx.to_label || tx.to_addr || 'N/A', tx.cluster || 'Isolated', tx.health_factor || 99.0, tx.twap || 0.0, tx.twap_trend || '', tx.price_impact || 0.0, tx.spread || 0.0, tx.agent_win_rate || 0.0, tx.mev_extracted || 0.0, tx.execution_depth || 1, tx.pnl || 0.0, tx.narrative || '', tx.sec_label || '✅ VERIFIED SAFE',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ASMO_Matrix_Export_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000' || addr === '0x00') return 'System / Genesis';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getExplorerLink = (network, addr) => {
    if (network === 'BASE') return `https://basescan.org/address/${addr}`;
    return `https://testnet.arcscan.app/address/${addr}`;
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
    return <span className="sec-safe">{label}</span>;
  };

  const renderTwapBadge = (twap, trend) => {
    if (!trend) return null;
    if (trend.includes('Accumulation')) return <span className="trend-accum">{trend} (TWAP: ${twap})</span>;
    if (trend.includes('Pressure')) return <span className="trend-dist">{trend} (TWAP: ${twap})</span>;
    if (trend.includes('Bullish')) return <span className="trend-bull">{trend} (TWAP: ${twap})</span>;
    if (trend.includes('Bearish')) return <span className="trend-bear">{trend} (TWAP: ${twap})</span>;
    return <span className="trend-neutral">{trend} (TWAP: ${twap})</span>;
  };

  const chartData = useMemo(() => {
    const counts = { AI_AGENT: 0, DEX_SWAP: 0, DEX_LIQUIDITY: 0, NATIVE: 0, TOKEN: 0, CROSS_CHAIN: 0, LENDING: 0, ARBITRAGE: 0 };
    let whaleVol = 0, agentVol = 0, dexVol = 0, bridgeVol = 0, lendingVol = 0, arbVol = 0, mevVol = 0, standardVol = 0;
    
    displayedTransactions.forEach((tx) => {
      if (counts[tx.type] !== undefined) counts[tx.type]++;
      const vol = (tx.amount || 0) * (tx.price_usd || 0);
      if (tx.flag === 'MEV_ACTIVITY') mevVol += vol;
      else if (tx.flag === 'ARBITRAGE_ACTIVITY') arbVol += vol;
      else if (tx.flag === 'LENDING_ACTIVITY') lendingVol += vol;
      else if (tx.flag === 'BRIDGE_ACTIVITY') bridgeVol += vol;
      else if (tx.flag === 'WHALE' || tx.flag === 'PENDING_WHALE') whaleVol += vol;
      else if (tx.flag === 'AGENT_FLOW') agentVol += vol;
      else if (tx.flag === 'DEX_ACTIVITY') dexVol += vol;
      else standardVol += vol;
    });
    
    const pie = Object.keys(counts)
      .filter((k) => counts[k] > 0)
      .map((k) => ({ name: k.replace('_', ' '), value: counts[k] }));
      
    const bar = [
      { name: 'MEV Vol', value: Math.round(mevVol), fill: '#dc2626' },
      { name: 'Arb Vol', value: Math.round(arbVol), fill: '#10b981' },
      { name: 'Lending Vol', value: Math.round(lendingVol), fill: '#ea580c' },
      { name: 'Bridge Vol', value: Math.round(bridgeVol), fill: '#0ea5e9' },
      { name: 'Whale Vol', value: Math.round(whaleVol), fill: '#f85149' },
      { name: 'AI Vol', value: Math.round(agentVol), fill: '#a371f7' },
      { name: 'DEX Vol', value: Math.round(dexVol), fill: '#db2777' },
      { name: 'Standard', value: Math.round(standardVol), fill: '#3fb950' },
    ].filter((d) => d.value > 0);
    
    return { pie, bar };
  }, [displayedTransactions]);

  const networkData = useMemo(() => {
    const nodesMap = new Map();
    const links = [];
    
    displayedTransactions.forEach((tx) => {
      if (!tx.from_addr || !tx.to_addr) return;
      if (tx.from_addr === '0x00' || tx.to_addr === '0x00') return;
      
      [
        { id: tx.from_addr, label: tx.from_label, flag: tx.flag, cluster: tx.cluster, type: tx.type },
        { id: tx.to_addr, label: tx.to_label, flag: tx.flag, cluster: tx.cluster, type: tx.type },
      ].forEach((ent) => {
        if (!nodesMap.has(ent.id)) {
          let color = '#3fb950';
          if (ent.label?.includes('Whale')) color = '#f85149';
          if (ent.label?.includes('Agent') || ent.label?.includes('Registry')) color = '#a371f7';
          if (ent.label?.includes('Pool')) color = '#db2777';
          if (ent.label?.includes('Bridge') || ent.type === 'CROSS_CHAIN') color = '#0ea5e9';
          if (ent.label?.includes('AAVE') || ent.type === 'LENDING') color = '#ea580c';
          if (ent.type === 'ARBITRAGE') color = '#10b981';
          if (ent.flag === 'MEV_ACTIVITY' || ent.label?.includes('MEV')) color = '#dc2626';
          
          nodesMap.set(ent.id, {
            id: ent.id,
            name: ent.label || `${ent.id.substring(0, 6)}...`,
            val: 2,
            color: color,
            cluster: ent.cluster,
          });
        } else {
          nodesMap.get(ent.id).val += 0.5;
        }
      });
      
      links.push({
        source: tx.from_addr,
        target: tx.to_addr,
        color: tx.flag === 'MEV_ACTIVITY' ? '#dc2626' : tx.type === 'ARBITRAGE' ? '#10b981' : tx.type === 'LENDING' ? '#ea580c' : tx.type === 'CROSS_CHAIN' ? '#0ea5e9' : tx.cluster ? '#ca8a04' : 'rgba(139, 148, 158, 0.3)',
      });
    });
    
    return { nodes: Array.from(nodesMap.values()), links };
  }, [displayedTransactions]);

  const PIE_COLORS = ['#a371f7', '#db2777', '#10b981', '#ea580c', '#0ea5e9', '#3fb950', '#fb8f44', '#dc2626'];

  return (
    <div className="dashboard-container">
      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔍 Deep Trace: {selectedTx.tx_hash}</h2>
              <button className="close-btn" onClick={() => setSelectedTx(null)}>✕</button>
            </div>
            <div className="modal-grid">
              <div className="modal-card">
                <h4>Execution Trace</h4>
                <p><strong>Network:</strong> {renderNetworkBadge(selectedTx.network)}</p>
                <p><strong>Gas Consumed:</strong> {selectedTx.gas_used} Gwei</p>
                <p><strong>Execution Depth:</strong> Level {selectedTx.execution_depth}</p>
                <p><strong>Block Status:</strong> {selectedTx.status}</p>
                <p><strong>Timestamp:</strong> {selectedTx.time}</p>
              </div>
              <div className="modal-card">
                <h4>Financials & Alpha</h4>
                <p><strong>Asset Transfer:</strong> {selectedTx.amount} {selectedTx.asset}</p>
                <p><strong>Total Value:</strong> ${(selectedTx.amount * selectedTx.price_usd).toFixed(2)}</p>
                <p><strong>Realized P&L:</strong> {renderPnL(selectedTx.pnl)}</p>
                <p><strong>Price Impact:</strong> {selectedTx.price_impact > 0 ? `${selectedTx.price_impact}%` : 'N/A'}</p>
                <p><strong>Alpha Extracted:</strong> {selectedTx.spread > 0 ? `Spread +${selectedTx.spread}%` : selectedTx.mev_extracted > 0 ? `MEV $${selectedTx.mev_extracted}` : 'N/A'}</p>
              </div>
            </div>
            <div className="modal-json">
              <h4>Raw Hex Payload & State Matrix</h4>
              <pre>{JSON.stringify(selectedTx, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
      
      <header className="header">
        <div className="logo-section">
          <h1>A.S.M.O.</h1>
          <span className="subtitle">Multi-Chain Intelligence Matrix & Global State</span>
        </div>
        <div className="network-switcher">
          <button className={`net-btn ${activeNetwork === 'ALL' ? 'active-net' : ''}`} onClick={() => setActiveNetwork('ALL')}>🌐 Global State</button>
          <button className={`net-btn ${activeNetwork === 'ARC' ? 'active-net' : ''}`} onClick={() => setActiveNetwork('ARC')}>🔷 ARC Network</button>
          <button className={`net-btn ${activeNetwork === 'BASE' ? 'active-net' : ''}`} onClick={() => setActiveNetwork('BASE')}>🔵 BASE Network</button>
        </div>
        <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
          <span className={isConnected ? 'pulse' : ''}>{isConnected ? '🟢' : '🔴'}</span> {isConnected ? 'Engine Linked' : 'Engine Offline'}
        </div>
      </header>

      <main className="main-content">
        <div className="leaderboard-container">
          <div className="leaderboard-card">
            <h3>🏆 Smart Money Whales (Top P&L)</h3>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Wallet Entity</th>
                  <th>Cumulative P&L</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.wallets.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', color: '#8b949e', fontStyle: 'italic', padding: '16px' }}>Accumulating P&L Data...</td></tr>
                ) : (
                  leaderboard.wallets.map((w, i) => (
                    <tr key={i}>
                      <td className="leaderboard-rank">#{i + 1}</td>
                      <td>{w.label ? <span className="entity-tag">{w.label}</span> : formatAddress(w.addr)}</td>
                      <td style={{ color: '#3fb950', fontWeight: 'bold' }}>+${w.pnl.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="leaderboard-card">
            <h3>🤖 Alpha Agents (Top Win Rate)</h3>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Agent Address</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.agents.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', color: '#8b949e', fontStyle: 'italic', padding: '16px' }}>Analyzing Agent Workflows...</td></tr>
                ) : (
                  leaderboard.agents.map((a, i) => (
                    <tr key={i}>
                      <td className="leaderboard-rank">#{i + 1}</td>
                      <td>{renderAgentBadge(a.label, a.wr)}</td>
                      <td style={{ color: '#a371f7', fontWeight: 'bold' }}>{a.wr}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h2>Force-Directed Wallet Network Graph ({activeNetwork})</h2>
            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Cross-Chain Dynamics. Red Links: MEV. Green: Arbitrage. Orange: Lending.</span>
          </div>
          <div className="graph-container" ref={containerRef} style={{ height: '400px', backgroundColor: '#010409', borderRadius: '8px', overflow: 'hidden', border: '1px solid #30363d' }}>
            {networkData.nodes.length > 0 ? (
              <ForceGraph2D
                width={graphDimensions.width}
                height={graphDimensions.height}
                graphData={networkData}
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={4}
                linkColor="color"
                linkWidth={(link) => (['#ca8a04', '#0ea5e9', '#ea580c', '#10b981', '#dc2626'].includes(link.color) ? 2 : 1)}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                backgroundColor="#010409"
              />
            ) : (
              <div className="empty-chart">Awaiting Node Connections...</div>
            )}
          </div>
        </div>

        <div className="analytics-dashboard">
          <div className="chart-box">
            <h3>Protocol Activity Distribution ({activeNetwork})</h3>
            {chartData.pie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {chartData.pie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0d1117', borderColor: '#30363d' }} itemStyle={{ color: '#c9d1d9' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Awaiting Network Data...</div>
            )}
          </div>
          <div className="chart-box">
            <h3>Intelligence Volume Metric ($) ({activeNetwork})</h3>
            {chartData.bar.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.bar} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#8b949e" tickFormatter={(value) => `$${value}`} />
                  <YAxis dataKey="name" type="category" stroke="#8b949e" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d1117', borderColor: '#30363d' }} itemStyle={{ color: '#c9d1d9' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.bar.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Awaiting Network Data...</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <h2>Multi-Chain Live Flow Matrix ({activeNetwork})</h2>
            </div>
            <div className="matrix-controls">
              <input type="text" className="search-input" placeholder="Search hash, address, asset, narrative..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="ALL">All Event Types</option>
                <option value="ARBITRAGE_ACTIVITY">🔄 Arbitrage Spread</option>
                <option value="MEV_ACTIVITY">🚨 MEV Exploits</option>
                <option value="WHALE">🐋 Whale Flows</option>
                <option value="AGENT_FLOW">🤖 AI Agent Actions</option>
                <option value="LENDING_ACTIVITY">🏦 Lending/Liquidations</option>
                <option value="BRIDGE_ACTIVITY">🌉 Bridge Activity</option>
              </select>
              <button className="export-btn" onClick={exportToCSV}>Backup Matrix Data</button>
            </div>
          </div>
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Action Protocol</th>
                  <th>Target Asset</th>
                  <th>Health & TWAP</th>
                  <th>Base Vol, MEV & Alpha</th>
                  <th>Initiator Entity</th>
                  <th>Receiver Entity</th>
                  <th>Realized P&L</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No records matched your search parameters in the {activeNetwork} Matrix...</td></tr>
                ) : (
                  displayedTransactions.map((tx, index) => (
                    <tr key={index} className="tx-row" style={getRowStyle(tx.status, tx.type, tx.flag)} onClick={() => setSelectedTx(tx)}>
                      <td className="tx-status">
                        <span className={`badge ${tx.status === 'PENDING' ? 'badge-pending' : 'badge-confirmed'}`}>
                          {tx.status === 'PENDING' ? '⏳ PENDING' : '✓ CONFIRMED'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {renderNetworkBadge(tx.network)}
                            {renderTypeBadge(tx.type)}
                            {tx.flag === 'WHALE' && <span className="badge badge-whale-alert">🚨 WHALE</span>}
                            {tx.flag === 'PENDING_WHALE' && <span className="badge badge-pending-whale">⚡ VANGUARD</span>}
                            {tx.flag === 'BRIDGE_ACTIVITY' && <span className="badge badge-bridge-activity">🔗 CROSS-CHAIN</span>}
                            {tx.flag === 'LENDING_ACTIVITY' && <span className="badge badge-lending-activity">🏦 DEFI LENDING</span>}
                            {tx.flag === 'ARBITRAGE_ACTIVITY' && <span className="badge badge-arbitrage-activity">⚡ SPREAD CAPTURE</span>}
                            {tx.flag === 'MEV_ACTIVITY' && <span className="badge badge-mev">🚨 MEV EXPLOIT</span>}
                            {tx.flag === 'AGENT_FLOW' && <span className="badge badge-agent-flow">🤖 AI FLOW</span>}
                            {tx.flag === 'DEX_ACTIVITY' && <span className="badge badge-dex-activity">⚡ CHORDSWAP</span>}
                          </div>
                          {tx.narrative && (
                            <span className="narrative-text" style={tx.type === 'ARBITRAGE' ? { color: '#34d399', borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' } : tx.flag === 'MEV_ACTIVITY' ? { color: '#fca5a5', borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' } : {}}>
                              {tx.narrative}
                            </span>
                          )}
                          {tx.cluster && <span className="cluster-badge">{tx.cluster}</span>}
                        </div>
                      </td>
                      <td className="tx-asset">{tx.asset.length > 20 ? `${tx.asset.substring(0, 17)}...` : tx.asset}</td>
                      <td className="tx-security">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {renderSecurityBadge(tx.sec_score, tx.sec_label)}
                          {renderHealthFactor(tx.health_factor)}
                          {tx.twap_trend && renderTwapBadge(tx.twap, tx.twap_trend)}
                        </div>
                      </td>
                      <td className="tx-value">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>{typeof tx.amount === 'number' && tx.price_usd > 0 ? `$${(tx.amount * tx.price_usd).toFixed(2)}` : '---'}</span>
                          {tx.price_impact > 0.05 && (
                            <span className={tx.price_impact > 1.0 ? 'impact-high' : 'impact-low'}>📉 Impact: {tx.price_impact}%</span>
                          )}
                          {tx.spread > 0 && (
                            <span className="impact-high" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>🔄 Spread: +{tx.spread}%</span>
                          )}
                          {tx.mev_extracted > 0 && <span className="mev-text">🔪 Extracted: ${tx.mev_extracted}</span>}
                        </div>
                      </td>
                      <td className="tx-wallet">
                        <a href={getExplorerLink(tx.network, tx.from_addr)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          {tx.from_label?.includes('Agent') ? renderAgentBadge(tx.from_label, tx.agent_win_rate) : tx.from_label ? <span className="entity-tag">{tx.from_label}</span> : formatAddress(tx.from_addr)}
                        </a>
                      </td>
                      <td className="tx-wallet">
                        <a href={getExplorerLink(tx.network, tx.to_addr)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          {tx.to_label?.includes('Agent') ? renderAgentBadge(tx.to_label, tx.agent_win_rate) : tx.to_label ? <span className="entity-tag">{tx.to_label}</span> : formatAddress(tx.to_addr)}
                        </a>
                      </td>
                      <td className="tx-pnl">{renderPnL(tx.pnl)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;