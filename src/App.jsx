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
          <h3 style={{ color: '#8b949e', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>
            Live Ecosystem Warnings
          </h3>
          <div className="ethical-alerts-list">
            {ethicalAlerts.length === 0 ? (
              <div className="empty-state">Monitoring social graphs...</div>
            ) : (
              ethicalAlerts.map((alert, i) => (
                <div key={i} className="ethical-alert-card" style={{ borderLeftColor: alert.bot_activity_ratio > 65 ? '#f85149' : alert.bot_activity_ratio > 35 ? '#eab308' : '#3fb950' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{formatAddress(alert.asset)}</span>
                    <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>{alert.time}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: alert.bot_activity_ratio > 65 ? '#f85149' : '#eab308' }}>
                    {alert.manipulation_risk}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#8b949e' }}>Bot Activity: {alert.bot_activity_ratio}%</span>
                    <span style={{ color: '#3fb950' }}>Organic: {alert.organic_score}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ethical-main-panel">
          <div className="ethical-controls">
            <input 
              type="text" 
              placeholder="Enter Target Asset Contract (0x...)" 
              value={targetAsset} 
              onChange={e => setTargetAsset(e.target.value)} 
              disabled={isAnalyzing}
            />
            <button className="pulse" onClick={handleAnalysis} disabled={isAnalyzing || !targetAsset}>
              {isAnalyzing ? 'SCANNING SOCIAL GRAPHS...' : 'AUDIT PROJECT NARRATIVE'}
            </button>
          </div>

          {analysisData && (
            <div className="ethical-results">
              <div className="ethical-stats-grid">
                <div className="ethical-stat-box" style={{ borderColor: analysisData.color }}>
                  <span>Manipulation Risk</span>
                  <strong style={{ color: analysisData.color, fontSize: '1.2rem' }}>
                    {analysisData.risk_classification}
                  </strong>
                </div>
                <div className="ethical-stat-box">
                  <span>Detected Bot Ratio</span>
                  <strong style={{ color: analysisData.bot_ratio > 50 ? '#f85149' : '#eab308' }}>{analysisData.bot_ratio}%</strong>
                </div>
                <div className="ethical-stat-box">
                  <span>Organic Community</span>
                  <strong style={{ color: '#3fb950' }}>{analysisData.organic_score}%</strong>
                </div>
                <div className="ethical-stat-box">
                  <span>Social Media Volume</span>
                  <strong style={{ color: '#0ea5e9' }}>{analysisData.social_volume.toLocaleString()} Ping/Hr</strong>
                </div>
              </div>

              <div className="ethical-narrative-card">
                <div className="narrative-header">Primary Manipulative Narrative Detected</div>
                <div className="narrative-value">"{analysisData.top_narrative}"</div>
                <div style={{ marginTop: '16px', color: '#8b949e', lineHeight: '1.5' }}>
                  A.S.M.O. has scanned 14,000+ Farcaster frames and X threads. 
                  The current sentiment polarity is <strong style={{ color: analysisData.sentiment_polarity > 0 ? '#3fb950' : '#f85149' }}>{analysisData.sentiment_polarity}</strong>. 
                  {analysisData.bot_ratio > 50 
                    ? " High correlation with known astroturfing farm wallets detected. DO NOT provide liquidity."
                    : " Network growth appears organic. Safe to engage."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  return (
    <>
      {flashSimulator.isOpen && flashSimulator.route && (
        <div className="modal-overlay" onClick={() => setFlashSimulator({ ...flashSimulator, isOpen: false })}>
          <div className="flash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flash-header">
              <h2>⚡ FLASHLOAN ATTACK SIMULATOR</h2>
              <button className="close-btn" onClick={() => setFlashSimulator({ ...flashSimulator, isOpen: false })}>✕</button>
            </div>
            
            <div className="flash-body">
              <div className="flash-info-row">
                <span>Target Route:</span>
                <strong style={{color: '#c9d1d9'}}>{flashSimulator.route.route}</strong>
              </div>
              <div className="flash-info-row">
                <span>Market Spread:</span>
                <strong style={{color: '#10b981'}}>+{flashSimulator.route.spread}%</strong>
              </div>
              
              <div className="flash-slider-container">
                <label>Borrowed Capital (USD): <span style={{color: '#eab308', fontWeight: 'bold'}}>${flashSimulator.amount.toLocaleString()}</span></label>
                <input 
                  type="range" 
                  min="10000" 
                  max="5000000" 
                  step="10000" 
                  value={flashSimulator.amount} 
                  className="flash-slider"
                  onChange={(e) => setFlashSimulator({ ...flashSimulator, amount: Number(e.target.value) })}
                  disabled={flashSimulator.status !== 'IDLE'}
                />
              </div>

              {flashSimulator.route && (
                <div className="flash-results">
                  <div className="flash-res-item">
                    <span>Est. Gross Profit</span>
                    <span style={{color: '#c9d1d9'}}>${(flashSimulator.amount * (flashSimulator.route.spread / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flash-res-item">
                    <span>AAVE Fee (0.05%)</span>
                    <span style={{color: '#f85149'}}>-${(flashSimulator.amount * 0.0005).toFixed(2)}</span>
                  </div>
                  <hr style={{borderColor: '#30363d', margin: '12px 0'}} />
                  <div className="flash-res-item" style={{fontSize: '1.2rem'}}>
                    <span>Net Extractable Value</span>
                    <span style={{color: ((flashSimulator.amount * (flashSimulator.route.spread / 100)) - (flashSimulator.amount * 0.0005) - 85.5) > 0 ? '#3fb950' : '#dc2626', fontWeight: 'bold'}}>
                      ${((flashSimulator.amount * (flashSimulator.route.spread / 100)) - (flashSimulator.amount * 0.0005) - 85.5).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flash-action">
                {flashSimulator.status === 'IDLE' && (
                  <button 
                    className="flash-btn pulse" 
                    style={{backgroundColor: '#10b981'}}
                    onClick={executeFlashloan}
                  >
                    EXECUTE ATTACK
                  </button>
                )}
                {flashSimulator.status === 'SIMULATING' && (
                  <button className="flash-btn" style={{backgroundColor: '#eab308', color: '#000'}} disabled>
                    BROADCASTING TO MEMPOOL...
                  </button>
                )}
                {flashSimulator.status === 'SUCCESS' && (
                  <button className="flash-btn" style={{backgroundColor: '#3fb950'}} onClick={() => setFlashSimulator({ ...flashSimulator, isOpen: false })}>
                    ATTACK SUCCESSFUL
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEntity && entityData && (
        <div className="modal-overlay" onClick={() => setSelectedEntity(null)}>
          <div className="xray-modal" onClick={(e) => e.stopPropagation()}>
            <div className="xray-header">
              <div className="xray-title">
                <h2>🕵️‍♂️ X-RAY PROFILER: {entityData.label}</h2>
                <span style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '8px', display: 'block' }}>{entityData.address}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedEntity(null)}>✕</button>
            </div>
            
            <div className="xray-biometrics">
              <h4 style={{ color: '#e6edf3', marginTop: 0, borderBottom: '1px solid #30363d', paddingBottom: '12px' }}>🧠 BEHAVIORAL BIOMETRICS & PSYCH PROFILE</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="bio-stat">
                  <span className="bio-label">Classification</span>
                  <span className="bio-value">{entityData.biometrics.profile}</span>
                </div>
                <div className="bio-stat">
                  <span className="bio-label">Active Timezone</span>
                  <span className="bio-value">{entityData.biometrics.session}</span>
                </div>
                <div className="bio-stat">
                  <span className="bio-label">Risk Tolerance</span>
                  <span className="bio-value" style={{color: entityData.biometrics.risk.includes('Extreme') ? '#f85149' : '#eab308'}}>{entityData.biometrics.risk}</span>
                </div>
                <div className="bio-stat">
                  <span className="bio-label">Fear/Greed Index ({entityData.biometrics.greed}/100)</span>
                  <div className="greed-bar-bg">
                    <div className="greed-bar-fill" style={{ width: `${entityData.biometrics.greed}%`, backgroundColor: entityData.biometrics.greed > 75 ? '#f85149' : entityData.biometrics.greed > 40 ? '#eab308' : '#3fb950' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="xray-metrics">
              <div className="xray-card">
                <div className="xray-card-title">Total Volume (USD)</div>
                <div className="xray-card-value">${entityData.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="xray-card">
                <div className="xray-card-title">Net Realized PnL</div>
                <div className="xray-card-value">{renderPnL(entityData.netPnl)}</div>
              </div>
              <div className="xray-card">
                <div className="xray-card-title">Top Asset Interacted</div>
                <div className="xray-card-value" style={{ color: '#0ea5e9', fontSize: '1.1rem' }}>{entityData.topAsset}</div>
              </div>
              <div className="xray-card">
                <div className="xray-card-title">Primary Counterparty</div>
                <div className="xray-card-value" style={{ color: '#a371f7', fontSize: '1.1rem' }}>{entityData.topCounterparty}</div>
              </div>
            </div>
            <div className="xray-history">
              <h4 style={{ color: '#e6edf3', marginTop: 0, borderBottom: '1px solid #30363d', paddingBottom: '12px' }}>RECENT ACTIVITY FINGERPRINT</h4>
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Network</th>
                    <th>Action</th>
                    <th>Value</th>
                    <th>PnL / Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {entityData.history.map((tx, idx) => (
                    <tr key={idx} style={getRowStyle(tx.status, tx.type, tx.flag)}>
                      <td style={{ color: '#8b949e' }}>{tx.time}</td>
                      <td>{renderNetworkBadge(tx.network)}</td>
                      <td>{renderTypeBadge(tx.type)}</td>
                      <td style={{ fontWeight: 'bold' }}>{typeof tx.amount === 'number' && tx.price_usd > 0 ? `$${(tx.amount * tx.price_usd).toFixed(2)}` : '---'}</td>
                      <td>{renderPnL(tx.pnl)}</td>
                    </tr>
                  ))}
                  {entityData.history.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#8b949e', padding: '20px' }}>No direct history found in current matrix state.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTx && !selectedEntity && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔍 DEEP TRACE: {selectedTx.tx_hash}</h2>
              <button className="close-btn" onClick={() => setSelectedTx(null)}>✕</button>
            </div>
            <div className="modal-grid">
              <div className="modal-card">
                <h4>EXECUTION TRACE</h4>
                <p><strong>Network:</strong> {renderNetworkBadge(selectedTx.network)}</p>
                <p><strong>Gas Consumed:</strong> {selectedTx.gas_used} Gwei</p>
                <p><strong>Execution Depth:</strong> Level {selectedTx.execution_depth}</p>
                <p><strong>Block Status:</strong> {selectedTx.status}</p>
                <p><strong>Timestamp:</strong> {selectedTx.time}</p>
              </div>
              <div className="modal-card">
                <h4>FINANCIALS & ALPHA</h4>
                <p><strong>Asset Transfer:</strong> {selectedTx.amount} {selectedTx.asset}</p>
                <p><strong>Total Value:</strong> ${(selectedTx.amount * selectedTx.price_usd).toFixed(2)}</p>
                <p><strong>Realized P&L:</strong> {renderPnL(selectedTx.pnl)}</p>
                <p><strong>Price Impact:</strong> {selectedTx.price_impact > 0 ? `${selectedTx.price_impact}%` : 'N/A'}</p>
                <p><strong>Alpha Extracted:</strong> {selectedTx.spread > 0 ? `Spread +${selectedTx.spread}%` : selectedTx.mev_extracted > 0 ? `MEV $${selectedTx.mev_extracted}` : 'N/A'}</p>
              </div>
              {selectedTx.decoded_payload && (
                <div className="modal-card">
                  <h4>🕵️‍♂️ PAYLOAD X-RAY</h4>
                  <p><strong>Method ID:</strong> <span style={{color: '#a371f7', fontFamily: 'monospace'}}>{selectedTx.decoded_payload.method}</span></p>
                  <p><strong>Deciphered:</strong> <span style={{color: '#58a6ff', fontWeight: 'bold'}}>{selectedTx.decoded_payload.name}</span></p>
                  <p><strong>Payload Size:</strong> {selectedTx.decoded_payload.raw_length} bytes</p>
                  <p><strong>Risk Profile:</strong>
                    <span className="badge" style={{
                      marginLeft: '8px',
                      backgroundColor: selectedTx.decoded_payload.risk === 'CRITICAL' ? '#dc2626' : selectedTx.decoded_payload.risk === 'HIGH' ? '#ca8a04' : selectedTx.decoded_payload.risk === 'MEDIUM' ? '#2563eb' : '#3fb950',
                      color: '#fff',
                      boxShadow: selectedTx.decoded_payload.risk === 'CRITICAL' ? '0 0 8px rgba(220, 38, 38, 0.6)' : 'none'
                    }}>
                      {selectedTx.decoded_payload.risk}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="modal-json">
              <h4>RAW HEX PAYLOAD & STATE MATRIX</h4>
              <pre>{JSON.stringify(selectedTx, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <h2>Multi-Chain Live Flow Matrix ({activeNetwork})</h2>
          </div>
          <div className="matrix-controls">
            <input type="text" className="search-input" placeholder="Search hash, address, asset..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="ALL">All Event Types</option>
              <option value="ARBITRAGE_ACTIVITY">🔄 Arbitrage Spread</option>
              <option value="MEV_ACTIVITY">🚨 MEV Exploits</option>
              <option value="WHALE">🐋 Whale Flows</option>
              <option value="AGENT_FLOW">🤖 AI Agent Actions</option>
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
              {displayedTransactions.map((tx, index) => (
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
                        {tx.flag === 'ARBITRAGE_ACTIVITY' && <span className="badge badge-arbitrage-activity">⚡ SPREAD CAPTURE</span>}
                      </div>
                      {tx.narrative && (
                        <span className="narrative-text" style={tx.type === 'ARBITRAGE' ? { color: '#34d399', borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' } : {}}>
                          {tx.narrative}
                        </span>
                      )}
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
                    </div>
                  </td>
                  <td className="tx-wallet">
                    <span className="entity-link" onClick={(e) => { e.stopPropagation(); setSelectedEntity(tx.from_addr); }}>
                      {tx.from_label?.includes('Agent') ? renderAgentBadge(tx.from_label, tx.agent_win_rate) : tx.from_label ? <span className="entity-tag">{tx.from_label}</span> : formatAddress(tx.from_addr)}
                    </span>
                  </td>
                  <td className="tx-wallet">
                    <span className="entity-link" onClick={(e) => { e.stopPropagation(); setSelectedEntity(tx.to_addr); }}>
                      {tx.to_label?.includes('Agent') ? renderAgentBadge(tx.to_label, tx.agent_win_rate) : tx.to_label ? <span className="entity-tag">{tx.to_label}</span> : formatAddress(tx.to_addr)}
                    </span>
                  </td>
                  <td className="tx-pnl">{renderPnL(tx.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ wallets: [], agents: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState('ALL');
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 400 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  const [ethicalAlerts, setEthicalAlerts] = useState([]);

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
          if (data.msg_type === 'TRANSACTION') {
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
    transactions, setTransactions, leaderboard, setLeaderboard, activeNetwork, setActiveNetwork,
    graphDimensions, setGraphDimensions, searchTerm, setSearchTerm,
    filterType, setFilterType, selectedTx, setSelectedTx, selectedEntity, setSelectedEntity,
    executeFlashloan: () => {}, executeAtomicArb: () => {}, exportToCSV: () => {},
    displayMempool: { volume: 0, impact: 0, txs: [] }, projectAnalysis: [], networkData: {nodes:[], links:[]}, chartData: {pie:[], bar:[]}, entityData: null
  };

  return (
    <div className="os-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>A.S.M.O.</h1>
          <span>v18.0.0.1</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <span>📊</span> GLOBAL MATRIX
          </button>
          <button className={`nav-btn ${activeTab === 'ETHICAL_AI' ? 'active' : ''}`} onClick={() => setActiveTab('ETHICAL_AI')} style={{ color: '#0ea5e9' }}>
            <span>🧠</span> ETHICAL AI
          </button>
          <button className="nav-btn locked" disabled>
            <span>🗄️</span> LOCAL INDEXER 🔒
          </button>
          <button className="nav-btn locked" disabled>
            <span>🔐</span> KMS ENCLAVE 🔒
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
            <span className={isConnected ? 'pulse' : ''}>{isConnected ? '🟢' : '🔴'}</span> 
            {isConnected ? ' SYSTEM CONNECTED' : ' LINK SEVERED'}
          </div>
        </div>
      </aside>

      <main className="os-main-content">
        <div style={{ display: activeTab === 'DASHBOARD' ? 'block' : 'none', height: '100%' }}>
          <Dashboard {...dashboardProps} />
        </div>
        {activeTab === 'ETHICAL_AI' && <EthicalSentimentTerminal wsRef={wsRef} ethicalAlerts={ethicalAlerts} />}
      </main>
    </div>
  );
}