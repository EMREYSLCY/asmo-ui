import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('wss://glorious-fiesta-pv45wv747g6hx66-8765.app.github.dev/');

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        setTransactions((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            project: 'A.S.M.O.',
            ...data
          },
          ...prev
        ].slice(0, 50));
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ["Time", "Project", "Type", "Flag", "Hash", "Asset", "Amount", "Value_USD", "From", "To", "Gas_Used", "Exec_Depth"];
    const rows = transactions.map(tx => [
      tx.time,
      tx.project,
      tx.type,
      tx.flag || "STANDARD",
      tx.tx_hash,
      tx.asset,
      tx.amount,
      tx.amount * (tx.price_usd || 0),
      tx.from_addr || "N/A",
      tx.to_addr || "N/A",
      tx.gas_used || 0,
      tx.execution_depth || 1
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ASMO_EVM_Trace_Accounting_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'System / Genesis';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getRowStyle = (type, flag) => {
    if (type === 'AI_AGENT' || flag === 'AGENT_FLOW') {
      return { backgroundColor: 'rgba(163, 113, 247, 0.12)', borderLeft: '3px solid #a371f7' };
    }
    if (type === 'DEX_SWAP' || type === 'DEX_LIQUIDITY' || flag === 'DEX_ACTIVITY') {
      return { backgroundColor: 'rgba(219, 39, 119, 0.12)', borderLeft: '3px solid #db2777' };
    }
    if (flag === 'WHALE') {
      return { backgroundColor: 'rgba(248, 81, 73, 0.12)' };
    }
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

  const renderDepthIndicators = (depth) => {
    const maxDepth = 4;
    let dots = [];
    for (let i = 1; i <= maxDepth; i++) {
      dots.push(
        <span 
          key={i} 
          className={`depth-dot ${i <= depth ? `active-depth-${depth}` : ''}`}
        />
      );
    }
    return (
      <div className="depth-container">
        {dots}
        <span className="depth-label">L{depth}</span>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo-section">
          <h1>A.S.M.O.</h1>
          <span className="subtitle">EVM Trace & Execution Depth Matrix Terminal</span>
        </div>
        <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
          <span className={isConnected ? "pulse" : ""}>{isConnected ? '🟢' : '🔴'}</span> 
          {isConnected ? 'Engine Linked' : 'Engine Offline'}
        </div>
      </header>

      <main className="main-content">
        <div className="panel">
          <div className="panel-header">
            <h2>Live Flow Matrix & EVM Depth Accounting</h2>
            <button className="export-btn" onClick={exportToCSV}>Backup Trace Data</button>
          </div>
          
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Project</th>
                  <th>Action Protocol</th>
                  <th>Transaction Hash</th>
                  <th>Target Asset / Contract</th>
                  <th>Base Vol.</th>
                  <th>Est. Value ($)</th>
                  <th>Initiator (From)</th>
                  <th>Receiver (To / Pool)</th>
                  <th>Exec. Depth</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty-state">
                      Simulating EVM execution traces for Native, DEX, and Agentic AI flows...
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => (
                    <tr 
                      key={index} 
                      className="tx-row" 
                      style={getRowStyle(tx.type, tx.flag)}
                    >
                      <td className="tx-time">{tx.time}</td>
                      <td className="tx-project">
                         <span className="badge badge-project">{tx.project}</span>
                      </td>
                      <td>
                         {renderTypeBadge(tx.type)}
                         
                         {tx.flag === 'WHALE' && (
                           <span className="badge badge-whale-alert">🚨 WHALE</span>
                         )}
                         
                         {tx.flag === 'AGENT_FLOW' && (
                           <span className="badge badge-agent-flow">🤖 AI FLOW</span>
                         )}

                         {tx.flag === 'DEX_ACTIVITY' && (
                           <span className="badge badge-dex-activity">⚡ CHORDSWAP</span>
                         )}
                      </td>
                      <td className="tx-hash">
                        <a href={`https://testnet.arcscan.app/tx/${tx.tx_hash}`} target="_blank" rel="noreferrer">
                          {tx.tx_hash.substring(0, 10)}...{tx.tx_hash.substring(tx.tx_hash.length - 8)}
                        </a>
                      </td>
                      <td className="tx-asset">{tx.asset.length > 20 ? `${tx.asset.substring(0,17)}...` : tx.asset}</td>
                      <td className="tx-amount">
                        {typeof tx.amount === 'number' ? tx.amount.toFixed(4) : tx.amount}
                      </td>
                      <td className="tx-value">
                        {typeof tx.amount === 'number' && tx.price_usd > 0 ? 
                          `$${(tx.amount * tx.price_usd).toFixed(2)}` : 
                          '---'}
                      </td>
                      <td className="tx-wallet">
                        <a 
                          href={`https://testnet.arcscan.app/address/${tx.from_addr}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={tx.flag === 'WHALE' ? { color: '#ff7b72', fontWeight: 'bold' } : {}}
                        >
                          {formatAddress(tx.from_addr)}
                        </a>
                      </td>
                      <td className="tx-wallet">
                        <a 
                          href={`https://testnet.arcscan.app/address/${tx.to_addr}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={tx.flag === 'WHALE' ? { color: '#ff7b72', fontWeight: 'bold' } : {}}
                        >
                          {formatAddress(tx.to_addr)}
                        </a>
                      </td>
                      <td className="tx-depth">
                        {renderDepthIndicators(tx.execution_depth || 1)}
                      </td>
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