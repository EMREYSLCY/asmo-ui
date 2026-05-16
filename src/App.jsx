import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('wss://glorious-fiesta-pv45wv747g6hx66-8765.app.github.dev');

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        setTransactions((prev) => {
          const existingIndex = prev.findIndex(t => t.tx_hash === data.tx_hash);
          const newData = {
            time: new Date().toLocaleTimeString(),
            project: 'A.S.M.O.',
            status: data.status || 'CONFIRMED',
            ...data
          };

          if (existingIndex !== -1) {
             const updated = [...prev];
             updated[existingIndex] = { ...updated[existingIndex], ...newData };
             return updated;
          } else {
             return [newData, ...prev].slice(0, 100);
          }
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Time", "Status", "Type", "Flag", "Hash", "Asset", "Amount", "Value_USD", "From", "To", "Exec_Depth", "Realized_PnL"];
    const rows = transactions.map(tx => [
      tx.time, tx.status, tx.type, tx.flag || "STANDARD", tx.tx_hash, tx.asset, 
      tx.amount, tx.amount * (tx.price_usd || 0), tx.from_addr || "N/A", tx.to_addr || "N/A", tx.execution_depth || 1, tx.pnl || 0.0
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ASMO_PnL_Analytics_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'System / Genesis';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getRowStyle = (status, type, flag) => {
    if (status === 'PENDING') return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '3px solid #eab308', opacity: 0.8 };
    if (type === 'AI_AGENT' || flag === 'AGENT_FLOW') return { backgroundColor: 'rgba(163, 113, 247, 0.12)', borderLeft: '3px solid #a371f7' };
    if (type === 'DEX_SWAP' || type === 'DEX_LIQUIDITY' || flag === 'DEX_ACTIVITY') return { backgroundColor: 'rgba(219, 39, 119, 0.12)', borderLeft: '3px solid #db2777' };
    if (flag === 'WHALE') return { backgroundColor: 'rgba(248, 81, 73, 0.12)' };
    return {};
  };

  const renderTypeBadge = (type) => {
    switch(type) {
      case 'AI_AGENT': return <span className="badge badge-agent">AI AGENT</span>;
      case 'DEX_SWAP': return <span className="badge badge-dex-swap">🦄 SWAP</span>;
      case 'DEX_LIQUIDITY': return <span className="badge badge-dex-liquidity">🌊 POOL LP</span>;
      case 'TOKEN': return <span className="badge badge-token">TOKEN</span>;
      default: return <span className="badge badge-native">NATIVE</span>;
    }
  };

  const renderDepthIndicators = (depth, status) => {
    if (status === 'PENDING') return <span className="depth-label">⏳ Mempool</span>;
    const maxDepth = 4;
    let dots = [];
    for (let i = 1; i <= maxDepth; i++) {
      dots.push(<span key={i} className={`depth-dot ${i <= depth ? `active-depth-${depth}` : ''}`} />);
    }
    return <div className="depth-container">{dots}<span className="depth-label">L{depth}</span></div>;
  };

  const renderPnL = (pnl) => {
    if (!pnl || pnl === 0) return <span className="pnl-neutral">---</span>;
    if (pnl > 0) return <span className="pnl-positive">+ ${pnl.toFixed(2)}</span>;
    return <span className="pnl-negative">- ${Math.abs(pnl).toFixed(2)}</span>;
  };

  const chartData = useMemo(() => {
    const counts = { 'AI_AGENT': 0, 'DEX_SWAP': 0, 'DEX_LIQUIDITY': 0, 'NATIVE': 0, 'TOKEN': 0 };
    let whaleVol = 0, agentVol = 0, dexVol = 0, standardVol = 0;

    transactions.forEach(tx => {
      if (counts[tx.type] !== undefined) counts[tx.type]++;
      const vol = (tx.amount || 0) * (tx.price_usd || 0);
      if (tx.flag === 'WHALE' || tx.flag === 'PENDING_WHALE') whaleVol += vol;
      else if (tx.flag === 'AGENT_FLOW') agentVol += vol;
      else if (tx.flag === 'DEX_ACTIVITY') dexVol += vol;
      else standardVol += vol;
    });

    const pie = Object.keys(counts).filter(k => counts[k] > 0).map(k => ({ name: k.replace('_', ' '), value: counts[k] }));
    const bar = [
      { name: 'Whale Vol', value: Math.round(whaleVol), fill: '#f85149' },
      { name: 'AI Vol', value: Math.round(agentVol), fill: '#a371f7' },
      { name: 'DEX Vol', value: Math.round(dexVol), fill: '#db2777' },
      { name: 'Standard', value: Math.round(standardVol), fill: '#3fb950' }
    ].filter(d => d.value > 0);

    return { pie, bar };
  }, [transactions]);

  const PIE_COLORS = ['#a371f7', '#db2777', '#0284c7', '#3fb950', '#fb8f44'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#0d1117', padding: '10px', border: '1px solid #30363d', borderRadius: '6px' }}>
          <p style={{ color: '#c9d1d9', margin: 0 }}>{`${payload[0].name}: ${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo-section">
          <h1>A.S.M.O.</h1>
          <span className="subtitle">Wallet Detective & Visual P&L Matrix</span>
        </div>
        <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
          <span className={isConnected ? "pulse" : ""}>{isConnected ? '🟢' : '🔴'}</span> 
          {isConnected ? 'Engine Linked' : 'Engine Offline'}
        </div>
      </header>

      <main className="main-content">
        <div className="analytics-dashboard">
          <div className="chart-box">
            <h3>Protocol Activity Distribution</h3>
            {chartData.pie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {chartData.pie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="empty-chart">Awaiting Network Data...</div>}
          </div>

          <div className="chart-box">
            <h3>Intelligence Volume Metric ($)</h3>
            {chartData.bar.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.bar} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#8b949e" tickFormatter={(value) => `$${value}`} />
                  <YAxis dataKey="name" type="category" stroke="#8b949e" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.bar.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-chart">Awaiting Network Data...</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Live Flow Matrix & P&L Intelligence</h2>
            <button className="export-btn" onClick={exportToCSV}>Backup Matrix Data</button>
          </div>
          
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Action Protocol</th>
                  <th>Target Asset</th>
                  <th>Base Vol.</th>
                  <th>Initiator (From)</th>
                  <th>Receiver (To / Pool)</th>
                  <th>Exec. Depth</th>
                  <th>Realized P&L</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-state">Scanning Network for Smart Money flows...</td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => (
                    <tr key={index} className="tx-row" style={getRowStyle(tx.status, tx.type, tx.flag)}>
                      <td className="tx-status">
                         <span className={`badge ${tx.status === 'PENDING' ? 'badge-pending' : 'badge-confirmed'}`}>
                           {tx.status === 'PENDING' ? '⏳ PENDING' : '✓ CONFIRMED'}
                         </span>
                      </td>
                      <td>
                         {renderTypeBadge(tx.type)}
                         {tx.flag === 'WHALE' && <span className="badge badge-whale-alert">🚨 WHALE</span>}
                         {tx.flag === 'PENDING_WHALE' && <span className="badge badge-pending-whale">⚡ VANGUARD</span>}
                         {tx.flag === 'AGENT_FLOW' && <span className="badge badge-agent-flow">🤖 AI FLOW</span>}
                         {tx.flag === 'DEX_ACTIVITY' && <span className="badge badge-dex-activity">⚡ CHORDSWAP</span>}
                      </td>
                      <td className="tx-asset">{tx.asset.length > 20 ? `${tx.asset.substring(0,17)}...` : tx.asset}</td>
                      <td className="tx-value">{typeof tx.amount === 'number' && tx.price_usd > 0 ? `$${(tx.amount * tx.price_usd).toFixed(2)}` : '---'}</td>
                      <td className="tx-wallet">
                        <a href={`https://testnet.arcscan.app/address/${tx.from_addr}`} target="_blank" rel="noreferrer">
                          {formatAddress(tx.from_addr)}
                        </a>
                      </td>
                      <td className="tx-wallet">
                        <a href={`https://testnet.arcscan.app/address/${tx.to_addr}`} target="_blank" rel="noreferrer">
                          {formatAddress(tx.to_addr)}
                        </a>
                      </td>
                      <td className="tx-depth">{renderDepthIndicators(tx.execution_depth || 1, tx.status)}</td>
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