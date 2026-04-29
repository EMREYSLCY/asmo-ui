import React from 'react';
import './App.css';

function App() {
  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo-section">
          <h1>A.S.M.O.</h1>
          <span className="subtitle">Smart Money Oracle</span>
        </div>
        <div className="status-indicator">
          <span className="pulse">🟢</span> ARC Testnet Live
        </div>
      </header>

      <main className="main-content">
        <div className="panel">
          <div className="panel-header">
            <h2>Live P&L Accounting</h2>
            <button className="export-btn">Backup Data</button>
          </div>
          
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Transaction Hash</th>
                  <th>Asset</th>
                  <th>Amount (USD)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="5" className="empty-state">
                    Waiting for blockchain radar signals...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;