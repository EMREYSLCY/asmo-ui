import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
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
    };

    return () => ws.close();
  }, []);

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ["Time", "Project", "Type", "Hash", "Asset", "Amount", "Value_USD"];
    const rows = transactions.map(tx => [
      tx.time,
      tx.project,
      tx.type,
      tx.tx_hash,
      tx.asset,
      tx.amount,
      tx.amount * (tx.price_usd || 0)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ASMO_Backup_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo-section">
          <h1>A.S.M.O.</h1>
          <span className="subtitle">Smart Money Oracle</span>
        </div>
        <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
          <span className={isConnected ? "pulse" : ""}>{isConnected ? '🟢' : '🔴'}</span> 
          {isConnected ? 'Engine Linked' : 'Engine Offline'}
        </div>
      </header>

      <main className="main-content">
        <div className="panel">
          <div className="panel-header">
            <h2>Live P&L Accounting</h2>
            <button className="export-btn" onClick={exportToCSV}>Backup Data</button>
          </div>
          
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Transaction Hash</th>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>Value ($)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      Waiting for blockchain radar signals...
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => (
                    <tr key={index} className="tx-row">
                      <td className="tx-time">{tx.time}</td>
                      <td className="tx-project">
                         <span className="badge badge-project">{tx.project}</span>
                      </td>
                      <td>
                         <span className={`badge ${tx.type === 'TOKEN' ? 'badge-token' : 'badge-native'}`}>
                           {tx.type}
                         </span>
                      </td>
                      <td className="tx-hash">
                        <a href={`https://testnet.arcscan.app/tx/${tx.tx_hash}`} target="_blank" rel="noreferrer">
                          {tx.tx_hash.substring(0, 10)}...{tx.tx_hash.substring(tx.tx_hash.length - 8)}
                        </a>
                      </td>
                      <td className="tx-asset">{tx.asset.length > 10 ? `${tx.asset.substring(0,6)}...` : tx.asset}</td>
                      <td className="tx-amount">
                        {typeof tx.amount === 'number' ? tx.amount.toFixed(4) : tx.amount}
                      </td>
                      <td className="tx-value">
                        {typeof tx.amount === 'number' && tx.price_usd ? 
                          `$${(tx.amount * tx.price_usd).toFixed(2)}` : 
                          '---'}
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