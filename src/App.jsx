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
            <button className="export-btn">Backup / Restore</button>
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
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
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