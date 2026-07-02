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

const renderLogicTree = (nodes) => {
  return (
    <ul className="logic-tree">
      {nodes.map((node, i) => (
        <li key={i} className="tree-node">
          <div className={`tree-label risk-${node.risk}`}>
            {node.label}
          </div>
          {node.children && node.children.length > 0 && renderLogicTree(node.children)}
        </li>
      ))}
    </ul>
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

      {atomicSimulator.isOpen && atomicSimulator.route && (
        <div className="modal-overlay" onClick={() => setAtomicSimulator({ ...atomicSimulator, isOpen: false })}>
          <div className="flash-modal" style={{ borderColor: '#3b82f6', boxShadow: '0 0 40px rgba(59, 130, 246, 0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flash-header" style={{ borderBottomColor: '#3b82f6' }}>
              <h2 style={{ color: '#3b82f6' }}>⚛️ ATOMIC CROSS-CHAIN ROUTER</h2>
              <button className="close-btn" onClick={() => setAtomicSimulator({ ...atomicSimulator, isOpen: false })}>✕</button>
            </div>
            
            <div className="flash-body">
              <div className="flash-info-row">
                <span>Target Bridge Route:</span>
                <strong style={{color: '#c9d1d9'}}>{atomicSimulator.route.route}</strong>
              </div>
              <div className="flash-info-row">
                <span>Inter-Chain Spread:</span>
                <strong style={{color: '#10b981'}}>+{atomicSimulator.route.spread}%</strong>
              </div>
              
              <div className="flash-slider-container">
                <label>Atomic Flash Capital (USD): <span style={{color: '#38bdf8', fontWeight: 'bold'}}>${atomicSimulator.amount.toLocaleString()}</span></label>
                <input 
                  type="range" 
                  min="10000" 
                  max="5000000" 
                  step="10000" 
                  value={atomicSimulator.amount} 
                  className="flash-slider"
                  style={{ background: '#0c4a6e' }}
                  onChange={(e) => setAtomicSimulator({ ...atomicSimulator, amount: Number(e.target.value) })}
                  disabled={atomicSimulator.status !== 'IDLE'}
                />
              </div>

              {atomicSimulator.route && (
                <div className="flash-results">
                  <div className="flash-res-item">
                    <span>Est. Net Profit</span>
                    <span style={{color: '#3fb950', fontWeight: 'bold'}}>${((atomicSimulator.amount * (atomicSimulator.route.spread / 100)) - 150).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flash-action">
                {atomicSimulator.status === 'IDLE' && (
                  <button 
                    className="flash-btn pulse" 
                    style={{backgroundColor: '#3b82f6', color: '#fff'}}
                    onClick={executeAtomicArb}
                  >
                    INITIATE ATOMIC HOP
                  </button>
                )}
                {atomicSimulator.status === 'BRIDGING' && (
                  <button className="flash-btn" style={{backgroundColor: '#0ea5e9', color: '#fff'}} disabled>
                    ROUTING L0 PACKETS...
                  </button>
                )}
                {atomicSimulator.status === 'SUCCESS' && (
                  <button className="flash-btn" style={{backgroundColor: '#3fb950'}} onClick={() => setAtomicSimulator({ ...atomicSimulator, isOpen: false })}>
                    ATOMIC ARBITRAGE CLEARED
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

      {gasWars.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px', backgroundColor: 'rgba(234, 88, 12, 0.05)', borderColor: '#ea580c', boxShadow: 'inset 0 0 40px rgba(234, 88, 12, 0.15)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#ea580c' }}>⛽🪓 FLASHBOTS BRIBE OPTIMIZER</h2>
            <span className="pulse-text" style={{ color: '#ea580c', fontWeight: 'bold' }}>ACTIVE GAS WARS DETECTED...</span>
          </div>
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th style={{ color: '#fdba74' }}>Time</th>
                  <th style={{ color: '#fdba74' }}>Target Hash</th>
                  <th style={{ color: '#fdba74' }}>Rival MEV Bot</th>
                  <th style={{ color: '#fdba74' }}>Rival Bid (Gwei)</th>
                  <th style={{ color: '#fdba74' }}>A.S.M.O. Optimized Bid</th>
                  <th style={{ color: '#fdba74' }}>Capital Saved (USD)</th>
                  <th style={{ color: '#fdba74' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {gasWars.map((war, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(234, 88, 12, 0.2)' }}>
                    <td style={{ color: '#8b949e' }}>{war.time}</td>
                    <td style={{ fontFamily: 'monospace', color: '#c9d1d9' }}>{war.target_hash.substring(0, 10)}...</td>
                    <td style={{ fontFamily: 'monospace', color: '#fca5a5' }}>{war.rival_bot}</td>
                    <td style={{ color: '#f85149' }}>{war.rival_bid}</td>
                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>{war.asmo_bid}</td>
                    <td style={{ color: '#3fb950', fontWeight: 'bold' }}>+${war.saved_capital}</td>
                    <td>
                      <span className="badge pulse" style={{ backgroundColor: '#ea580c', color: '#fff' }}>
                        {war.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {autoEjectAlerts.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', boxShadow: 'inset 0 0 40px rgba(239, 68, 68, 0.2)', animation: 'pulse-danger 1s infinite' }}>
          <div className="panel-header">
            <h2 style={{ color: '#ef4444' }}>🛡️⚡ AUTO-EJECT FRONT-RUNNER PROTOCOL</h2>
            <span className="pulse-text" style={{ color: '#ef4444', fontWeight: 'bold' }}>CRITICAL: RUG PULL DETECTED</span>
          </div>
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th style={{ color: '#fca5a5' }}>Target Pool</th>
                  <th style={{ color: '#fca5a5' }}>Malicious Developer</th>
                  <th style={{ color: '#fca5a5' }}>Attacker Gas</th>
                  <th style={{ color: '#fca5a5' }}>Required Gas (2x)</th>
                  <th style={{ color: '#fca5a5' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {autoEjectAlerts.map((alert, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <td style={{ fontFamily: 'monospace', color: '#c9d1d9' }}>{formatAddress(alert.pool_addr)}</td>
                    <td style={{ fontFamily: 'monospace', color: '#fca5a5' }}>{formatAddress(alert.dev_addr)}</td>
                    <td style={{ color: '#8b949e' }}>{alert.est_gas_gwei} Gwei</td>
                    <td style={{ color: '#eab308', fontWeight: 'bold' }}>{alert.est_gas_gwei * 2} Gwei</td>
                    <td>
                      <button 
                        className="export-btn" 
                        style={{ padding: '8px 16px', fontSize: '1rem', backgroundColor: '#ef4444', color: '#fff', fontWeight: '900', letterSpacing: '1px', border: '2px solid #b91c1c' }}
                        onClick={() => executeAutoEject(alert)}
                      >
                        EXECUTE FRONTRUN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vestingDumps.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px', backgroundColor: 'rgba(220, 38, 38, 0.05)', borderColor: '#b91c1c', boxShadow: 'inset 0 0 30px rgba(185, 28, 28, 0.15)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#ef4444' }}>⏳🩸 VESTING DUMP PREDICTOR</h2>
            <span className="pulse-text" style={{ color: '#ef4444' }}>Massive Token Unlock Detected...</span>
          </div>
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th style={{ color: '#fca5a5' }}>Detection Time</th>
                  <th style={{ color: '#fca5a5' }}>Network</th>
                  <th style={{ color: '#fca5a5' }}>Token Contract</th>
                  <th style={{ color: '#fca5a5' }}>Dev Wallet</th>
                  <th style={{ color: '#fca5a5' }}>Unlocked Vol (USD)</th>
                  <th style={{ color: '#fca5a5' }}>Status</th>
                  <th style={{ color: '#fca5a5' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {vestingDumps.map((dump, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(220, 38, 38, 0.2)' }}>
                    <td style={{ color: '#8b949e' }}>{dump.time}</td>
                    <td>{renderNetworkBadge(dump.network)}</td>
                    <td style={{ fontFamily: 'monospace', color: '#58a6ff' }} onClick={() => setSelectedEntity(dump.token_addr)} className="entity-link">{formatAddress(dump.token_addr)}</td>
                    <td style={{ fontFamily: 'monospace', color: '#8b949e' }} onClick={() => setSelectedEntity(dump.dev_addr)} className="entity-link">{formatAddress(dump.dev_addr)}</td>
                    <td style={{ color: '#f85149', fontWeight: 'bold' }}>${dump.usd_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: '#dc2626', color: '#fff', animation: 'pulse-danger 1s infinite' }}>
                        {dump.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="export-btn" 
                        style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#dc2626', fontWeight: 'bold' }}
                        onClick={() => executeShortDump(dump)}
                      >
                        📉 SHORT TARGET
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="leaderboard-container">
        <div className="leaderboard-card">
          <h3>🏆 Smart Money Whales (Top P&L)</h3>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Wallet Entity</th>
                <th>Cumulative P&L</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.wallets.map((w, i) => (
                <tr key={i}>
                  <td className="leaderboard-rank">#{i + 1}</td>
                  <td><span className="entity-link" onClick={() => setSelectedEntity(w.addr)}>{w.label || formatAddress(w.addr)}</span></td>
                  <td style={{ color: '#3fb950', fontWeight: 'bold' }}>+${w.pnl.toFixed(2)}</td>
                  <td>
                    <button 
                      className="export-btn" 
                      style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: shadowTargets.includes(w.addr) ? '#dc2626' : '#0ea5e9' }}
                      onClick={() => toggleShadow(w.addr)}
                    >
                      {shadowTargets.includes(w.addr) ? '🛑 STOP' : '👁️ SHADOW'}
                    </button>
                  </td>
                </tr>
              ))}
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.agents.map((a, i) => (
                <tr key={i}>
                  <td className="leaderboard-rank">#{i + 1}</td>
                  <td><span className="entity-link" onClick={() => setSelectedEntity(a.addr)}>{a.label || formatAddress(a.addr)}</span></td>
                  <td style={{ color: '#a371f7', fontWeight: 'bold' }}>{a.wr}%</td>
                  <td>
                    <button 
                      className="export-btn" 
                      style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: shadowTargets.includes(a.addr) ? '#dc2626' : '#0ea5e9' }}
                      onClick={() => toggleShadow(a.addr)}
                    >
                      {shadowTargets.includes(a.addr) ? '🛑 STOP' : '👁️ SHADOW'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel shadow-panel" style={{ marginBottom: '24px', borderColor: '#14b8a6', boxShadow: 'inset 0 0 20px rgba(20, 184, 166, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#14b8a6' }}>🥷 MEV Shadow-Relay Interceptor</h2>
          <span className="pulse-text" style={{ color: '#14b8a6' }}>Detecting Unseen Private TXs & Bribes...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Execution Time</th>
                <th>Network</th>
                <th>Stealth Hash</th>
                <th>Hidden Volume (USD)</th>
                <th>TX Protocol</th>
                <th>Validator Bribe</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shadowRelayAlerts.map((alert, idx) => (
                <tr key={idx} style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                  <td style={{ color: '#8b949e' }}>{alert.time}</td>
                  <td>{renderNetworkBadge(alert.network)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{alert.tx_hash.substring(0, 15)}...</td>
                  <td style={{ color: '#eab308', fontWeight: 'bold' }}>${alert.usd_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td style={{ color: '#14b8a6', fontWeight: 'bold' }}>{alert.type}</td>
                  <td style={{ color: '#f85149', fontWeight: 'bold' }}>${alert.bribe.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>
                    <button className="export-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#14b8a6', color: '#000' }}>
                      DECODE ROUTE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel shadow-panel" style={{ marginBottom: '24px', borderColor: '#0ea5e9', boxShadow: 'inset 0 0 20px rgba(14, 165, 233, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#0ea5e9' }}>🤖 Institutional Copy-Trade Engine (Shadow Mode)</h2>
          <span className="pulse-text" style={{ color: '#0ea5e9' }}>Awaiting Target Execution...</span>
        </div>
        <div className="project-analysis-grid">
          <div className="recovery-card" style={{ flex: 1, marginRight: '16px' }}>
            <h3 style={{ marginTop: 0, color: '#e6edf3' }}>Active Targets</h3>
            {shadowTargets.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#8b949e' }}>Select a target from the leaderboard to initiate Shadow Protocol.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shadowTargets.map((addr, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#010409', padding: '8px 12px', borderRadius: '4px', border: '1px solid #30363d' }}>
                    <span style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{formatAddress(addr)}</span>
                    <button className="close-btn" style={{ fontSize: '1rem' }} onClick={() => toggleShadow(addr)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="table-container" style={{ flex: 2 }}>
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Execution Time</th>
                  <th>Network</th>
                  <th>Shadow Hash</th>
                  <th>Mirrored Action</th>
                  <th>Target Source</th>
                </tr>
              </thead>
              <tbody>
                {shadowLogs.map((log, idx) => (
                  <tr key={idx} style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                    <td style={{ color: '#8b949e' }}>{log.time}</td>
                    <td>{renderNetworkBadge(log.network)}</td>
                    <td style={{ fontFamily: 'monospace', color: '#58a6ff' }} onClick={() => setSelectedTx(log)} className="entity-link">{log.tx_hash.substring(0, 15)}...</td>
                    <td style={{ fontWeight: 'bold', color: '#c9d1d9' }}>Copied ${log.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} Flow</td>
                    <td style={{ color: '#0ea5e9' }}>{log.narrative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel sentinel-panel" style={{ marginBottom: '24px', borderColor: '#d946ef', boxShadow: 'inset 0 0 20px rgba(217, 70, 239, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#d946ef' }}>🔬 Bytecode Decompiler & Logic Tree</h2>
          <span className="pulse-text" style={{ color: '#d946ef' }}>Awaiting Unverified Hash...</span>
        </div>
        <div className="sentinel-controls" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input type="text" className="search-input" style={{flex: 1, borderColor: '#d946ef'}} placeholder="Enter Unverified Contract Address (0x...)" value={decompileInput} onChange={e => setDecompileInput(e.target.value)} />
          <button className="export-btn" style={{backgroundColor: '#d946ef', color: '#000'}} onClick={handleDecompile}>{isDecompiling ? 'DECOMPILING...' : 'EXTRACT LOGIC TREE'}</button>
        </div>
        
        {decompileData && (
          <div className="decompile-results" style={{ background: '#010409', borderRadius: '8px', border: '1px solid #30363d', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Contract Target</span>
                <div style={{ fontFamily: 'monospace', color: '#c9d1d9', fontSize: '1.1rem' }}>{decompileData.address}</div>
              </div>
              <div>
                <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Compiler</span>
                <div style={{ fontFamily: 'monospace', color: '#c9d1d9' }}>{decompileData.compiler_version}</div>
              </div>
              <div>
                <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Size</span>
                <div style={{ fontFamily: 'monospace', color: '#c9d1d9' }}>{decompileData.size_bytes} Bytes</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>System Verdict</span>
                <div style={{ fontWeight: 'bold', color: decompileData.overall_risk === 'CRITICAL' ? '#f85149' : decompileData.overall_risk === 'WARNING' ? '#eab308' : '#3fb950' }}>
                  {decompileData.overall_risk}
                </div>
              </div>
            </div>
            <div className="logic-tree-container" style={{ paddingLeft: '8px' }}>
              {renderLogicTree(decompileData.nodes)}
            </div>
          </div>
        )}
      </div>

      <div className="panel sentinel-panel" style={{ marginBottom: '24px', borderColor: '#3b82f6', boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#3b82f6' }}>🛡️ Smart Contract Sentinel</h2>
          <span className="pulse-text" style={{ color: '#3b82f6' }}>Awaiting Target Hash...</span>
        </div>
        <div className="sentinel-controls" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <select value={auditNetwork} onChange={e => setAuditNetwork(e.target.value)} className="filter-select" style={{ width: '150px' }}>
             <option value="BASE">🔵 BASE</option>
             <option value="ARC">🔷 ARC</option>
          </select>
          <input type="text" className="search-input" style={{flex: 1}} placeholder="Enter Contract Address (0x...)" value={auditInput} onChange={e => setAuditInput(e.target.value)} />
          <button className="export-btn" style={{backgroundColor: '#3b82f6'}} onClick={handleAudit}>{isAuditing ? 'SCANNING...' : 'AUDIT CONTRACT'}</button>
        </div>
        
        {auditData && (
          <div className="audit-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="mempool-stat-card" style={{ borderColor: auditData.score >= 90 ? '#3fb950' : auditData.score >= 50 ? '#eab308' : '#f85149' }}>
              <h4>Security Score</h4>
              <div className="mempool-value" style={{ color: auditData.score >= 90 ? '#3fb950' : auditData.score >= 50 ? '#eab308' : '#f85149' }}>
                {auditData.score}/100
              </div>
            </div>
            <div className="mempool-stat-card">
              <h4>Honeypot Status</h4>
              <div className="mempool-value" style={{ color: auditData.is_honeypot ? '#f85149' : '#3fb950' }}>
                {auditData.is_honeypot ? 'DETECTED' : 'SAFE'}
              </div>
            </div>
            <div className="mempool-stat-card">
              <h4>Mintable / Inflation</h4>
              <div className="mempool-value" style={{ color: auditData.is_mintable ? '#eab308' : '#3fb950' }}>
                {auditData.is_mintable ? 'WARNING' : 'LOCKED'}
              </div>
            </div>
            <div className="mempool-stat-card">
              <h4>Blacklist Function</h4>
              <div className="mempool-value" style={{ color: auditData.is_blacklisted ? '#f85149' : '#3fb950' }}>
                {auditData.is_blacklisted ? 'PRESENT' : 'NONE'}
              </div>
            </div>
            <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '12px', background: '#010409', borderRadius: '8px', border: '1px solid #30363d' }}>
              <span style={{ color: '#8b949e', marginRight: '12px' }}>Final Verdict:</span> 
              <strong style={{ fontSize: '1.2rem', color: auditData.score >= 90 ? '#3fb950' : auditData.score >= 50 ? '#eab308' : '#f85149' }}>{auditData.label}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="panel sentiment-panel" style={{ marginBottom: '24px', borderColor: '#8b5cf6', boxShadow: 'inset 0 0 20px rgba(139, 92, 246, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#8b5cf6' }}>🧠 Farcaster Sentiment Matrix</h2>
          <span className="pulse-text" style={{ color: '#8b5cf6' }}>Cross-Referencing On-Chain Vol...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Detection Time</th>
                <th>Network</th>
                <th>Target Contract</th>
                <th>Social Narrative</th>
                <th>Mentions/Hr</th>
                <th>Hype Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sentimentData.map((data, idx) => (
                <tr key={idx} style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}>
                  <td style={{ color: '#8b949e' }}>{data.time}</td>
                  <td>{renderNetworkBadge(data.network)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#58a6ff' }} onClick={() => setSelectedEntity(data.asset)} className="entity-link">{formatAddress(data.asset)}</td>
                  <td style={{ fontWeight: 'bold', color: '#d2a8ff' }}>{data.narrative}</td>
                  <td>{data.mentions.toLocaleString()}</td>
                  <td style={{ fontWeight: 'bold', color: data.hype_score > 90 ? '#f85149' : '#3fb950' }}>{data.hype_score}/100</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: data.hype_score > 90 ? '#dc2626' : '#238636', color: '#fff' }}>
                      {data.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel bridge-tsunami-panel" style={{ marginBottom: '24px', borderColor: '#0ea5e9', boxShadow: 'inset 0 0 20px rgba(14, 165, 233, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#0ea5e9' }}>🌉 Multi-Hop Bridge Vacuum</h2>
          <span className="pulse-text" style={{ color: '#0ea5e9' }}>Monitoring Cross-Chain Portals...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Detection Time</th>
                <th>Source Chain</th>
                <th>Destination Chain</th>
                <th>Asset</th>
                <th>Volume (USD)</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bridgeTsunamis.map((tsunami, idx) => (
                <tr key={idx} style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                  <td style={{ color: '#8b949e' }}>{tsunami.time}</td>
                  <td style={{ color: '#c9d1d9', fontWeight: 'bold' }}>{tsunami.source}</td>
                  <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{tsunami.destination}</td>
                  <td style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{tsunami.asset}</td>
                  <td style={{ color: '#eab308', fontWeight: 'bold' }}>${tsunami.usd_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td style={{ color: '#f85149', fontWeight: 'bold' }}>~{tsunami.eta_seconds}s</td>
                  <td>
                    <span className="badge pulse" style={{ backgroundColor: '#0ea5e9', color: '#000' }}>
                      {tsunami.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '24px', borderColor: '#64748b', boxShadow: 'inset 0 0 20px rgba(100, 116, 139, 0.15)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#9ca3af' }}>🌪️ Dark Pool Forensics</h2>
          <span className="pulse-text" style={{ color: '#9ca3af' }}>Tracing Shadow OTC...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Detection Time</th>
                <th>Network</th>
                <th>Suspect Hash</th>
                <th>Source Entity</th>
                <th>Wash Protocol</th>
                <th>Est. Laundered (USD)</th>
              </tr>
            </thead>
            <tbody>
              {darkPoolAlerts.map((alert, idx) => (
                <tr key={idx} style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                  <td style={{ color: '#8b949e' }}>{alert.time}</td>
                  <td>{renderNetworkBadge(alert.network)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{alert.tx_hash.substring(0, 15)}...</td>
                  <td style={{ fontFamily: 'monospace', color: '#c9d1d9' }} onClick={() => setSelectedEntity(alert.from_addr)} className="entity-link">{formatAddress(alert.from_addr)}</td>
                  <td style={{ color: '#f85149', fontWeight: 'bold' }}>{alert.protocol}</td>
                  <td style={{ color: '#eab308', fontWeight: 'bold' }}>${alert.usd_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '24px', borderColor: '#a371f7', boxShadow: 'inset 0 0 20px rgba(163, 113, 247, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#a371f7' }}>🚀 Zero-Block Sniper</h2>
          <span className="pulse-text" style={{ color: '#a371f7' }}>Scanning Factory Contracts...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Network</th>
                <th>Target Token</th>
                <th>Pool Pair</th>
                <th>Dev/Creator</th>
                <th>Security Report</th>
                <th>System Verdict</th>
              </tr>
            </thead>
            <tbody>
              {snipeTargets.map((target, idx) => (
                <tr key={idx} style={{ backgroundColor: 'rgba(163, 113, 247, 0.05)' }}>
                  <td style={{ color: '#8b949e' }}>{target.time}</td>
                  <td>{renderNetworkBadge(target.network)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#58a6ff' }} onClick={() => setSelectedEntity(target.token0)} className="entity-link">{formatAddress(target.token0)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#c9d1d9' }}>{formatAddress(target.pair)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#8b949e' }} onClick={() => setSelectedEntity(target.creator)} className="entity-link">{formatAddress(target.creator)}</td>
                  <td>{renderSecurityBadge(target.score, target.label)}</td>
                  <td style={{ fontWeight: 'bold', color: target.score >= 80 ? '#3fb950' : target.score >= 50 ? '#eab308' : '#f85149' }}>{target.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '24px', borderColor: '#ef4444', boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#ef4444' }}>🩸 DeFi Liquidation Kill-Zone</h2>
          <span className="pulse-text" style={{ color: '#ef4444' }}>Tracking Vulnerable Collateral...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Target Entity</th>
                <th>Locked Collateral</th>
                <th>Active Debt</th>
                <th>Health Factor</th>
                <th>Status</th>
                <th>Est. Liq. Reward</th>
              </tr>
            </thead>
            <tbody>
              {killZone.map((kz, i) => (
                <tr key={i} style={{ backgroundColor: kz.hf < 1.05 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.1)' }}>
                  <td style={{ fontFamily: 'monospace', color: '#58a6ff' }} onClick={() => setSelectedEntity(kz.address)} className="entity-link">{formatAddress(kz.address)}</td>
                  <td>${kz.collateral.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td style={{ color: '#f85149' }}>${kz.debt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td style={{ fontWeight: 'bold', color: kz.hf < 1.05 ? '#f85149' : '#eab308' }}>{kz.hf}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: kz.hf < 1.05 ? '#dc2626' : '#ca8a04', color: '#fff' }}>
                      {kz.hf < 1.05 ? 'CRITICAL' : 'AT RISK'}
                    </span>
                  </td>
                  <td style={{ color: '#3fb950', fontWeight: 'bold' }}>${kz.est_liq_profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '24px', borderColor: '#ca8a04', boxShadow: 'inset 0 0 20px rgba(202, 138, 4, 0.05)' }}>
        <div className="panel-header">
          <h2 style={{ color: '#eab308' }}>🕷️ Sybil Hunter</h2>
          <span className="pulse-text" style={{ color: '#eab308' }}>Detecting Wash Trading...</span>
        </div>
        <div className="table-container">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Sybil Cluster ID</th>
                <th>Connected Entities</th>
                <th>Network Dominance (PnL)</th>
                <th>Risk Profile</th>
              </tr>
            </thead>
            <tbody>
              {sybilClusters.map((cluster, idx) => (
                <tr key={idx} style={{ backgroundColor: 'rgba(202, 138, 4, 0.05)' }}>
                  <td style={{ color: '#eab308', fontWeight: 'bold' }}>{cluster.name}</td>
                  <td style={{ color: '#c9d1d9' }}>{cluster.wallets.length} Wallets Linked</td>
                  <td style={{ color: cluster.total_pnl >= 0 ? '#3fb950' : '#f85149', fontWeight: 'bold' }}>
                    {cluster.total_pnl >= 0 ? '+' : '-'}${Math.abs(cluster.total_pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: cluster.wallets.length > 5 ? '#dc2626' : '#ea580c', color: '#fff' }}>
                      {cluster.wallets.length > 5 ? 'HIGH RISK (SYBIL)' : 'SUSPICIOUS RING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const BribeSimulatorTerminal = ({ wsRef }) => {
  const [baseBribe, setBaseBribe] = useState(5.0);
  const [competitors, setCompetitors] = useState(3);
  const [congestion, setCongestion] = useState(65);
  const [simResults, setSimResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!wsRef.current) return;
    const ws = wsRef.current;
    const handleBribeMsg = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'BRIBE_SIM_RESULT') {
          setSimResults(data.data);
          setIsSimulating(false);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handleBribeMsg);
    return () => ws.removeEventListener('message', handleBribeMsg);
  }, [wsRef]);

  const handleSimulate = () => {
    if (!wsRef.current) return;
    setIsSimulating(true);
    setSimResults(null);
    wsRef.current.send(JSON.stringify({
      action: 'SIMULATE_BRIBE',
      base_bribe: baseBribe,
      competitors: competitors,
      congestion: congestion
    }));
  };

  return (
    <div className="bribe-container">
      <div className="bribe-header">
        <h2>🎰 FLASHBOTS PROBABILISTIC SIMULATOR</h2>
        <span>Dynamic Gas War Inclusion Forecasting</span>
      </div>

      <div className="bribe-controls-grid">
        <div className="bribe-input-card">
          <label>Base Mempool Bribe (Gwei)</label>
          <input type="number" value={baseBribe} onChange={(e) => setBaseBribe(e.target.value)} />
          <span>The current standard execution tip.</span>
        </div>
        <div className="bribe-input-card">
          <label>Detected Competitors (Bots)</label>
          <input type="number" value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
          <span>Active smart contracts targeting the same block.</span>
        </div>
        <div className="bribe-input-card">
          <label>Network Congestion (%)</label>
          <input type="number" value={congestion} onChange={(e) => setCongestion(e.target.value)} />
          <span>Current block space saturation.</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <button className="bribe-run-btn pulse" onClick={handleSimulate} disabled={isSimulating}>
          {isSimulating ? 'COMPUTING INCLUSION MATRIX...' : 'RUN MONTE CARLO SIMULATION'}
        </button>
      </div>

      {simResults && (
        <div className="bribe-results-wrapper">
          <h3 style={{ color: '#8b949e', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>
            Inclusion Probability Matrix
          </h3>
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Simulated Bribe (Gwei)</th>
                <th>Increase vs Base</th>
                <th>Inclusion Probability</th>
                <th>System Verdict</th>
              </tr>
            </thead>
            <tbody>
              {simResults.map((res, idx) => (
                <tr key={idx} style={{ backgroundColor: res.status === 'OPTIMAL' ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                  <td style={{ color: '#c9d1d9', fontWeight: 'bold' }}>{res.bribe_amount}</td>
                  <td style={{ color: '#8b949e' }}>+{((res.bribe_amount / baseBribe - 1) * 100).toFixed(1)}%</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: res.probability > 90 ? '#3fb950' : res.probability > 50 ? '#eab308' : '#f85149', fontWeight: 'bold' }}>
                        {res.probability}%
                      </span>
                      <div className="sig-bar-bg" style={{ width: '100px', height: '6px', background: '#30363d', borderRadius: '3px', overflow: 'hidden' }}>
                        <div className="sig-bar-fill" style={{ width: `${res.probability}%`, height: '100%', background: res.probability > 90 ? '#3fb950' : res.probability > 50 ? '#eab308' : '#f85149' }}></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: res.status === 'OPTIMAL' ? '#10b981' : res.status === 'OVERPAID' ? '#ea580c' : '#dc2626', color: '#fff' }}>
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ wallets: [], agents: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState('ALL');
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 400 });
  const [cabalDimensions, setCabalDimensions] = useState({ width: 800, height: 400 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const [killZone, setKillZone] = useState([]);
  const [sybilClusters, setSybilClusters] = useState([]);
  const [snipeTargets, setSnipeTargets] = useState([]);
  const [darkPoolAlerts, setDarkPoolAlerts] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [shadowTargets, setShadowTargets] = useState([]);
  const [shadowLogs, setShadowLogs] = useState([]);
  const [bridgeTsunamis, setBridgeTsunamis] = useState([]);
  const [shadowRelayAlerts, setShadowRelayAlerts] = useState([]);
  const [autoEjectAlerts, setAutoEjectAlerts] = useState([]);
  const [vestingDumps, setVestingDumps] = useState([]);
  const [gasWars, setGasWars] = useState([]);
  const [sequencerAlerts, setSequencerAlerts] = useState([]);
  const [multiSigAlerts, setMultiSigAlerts] = useState([]);
  const [indexerData, setIndexerData] = useState(null);
  const [overlordState, setOverlordState] = useState({ active: false, max_spend: 50000, min_profit: 500, enclave_secured: false, signer_provider: 'NONE' });
  const [enclaveState, setEnclaveState] = useState({ status: 'UNLOCKED', provider: 'NONE', key_id: 'N/A', fips_compliant: false });
  
  const [auditInput, setAuditInput] = useState('');
  const [auditNetwork, setAuditNetwork] = useState('BASE');
  const [auditData, setAuditData] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  
  const [decompileInput, setDecompileInput] = useState('');
  const [isDecompiling, setIsDecompiling] = useState(false);
  const [decompileData, setDecompileData] = useState(null);

  const [cabalInput, setCabalInput] = useState('');
  const [isScanningCabal, setIsScanningCabal] = useState(false);
  const [cabalData, setCabalData] = useState(null);
  
  const [mempoolSim, setMempoolSim] = useState({ ARC: { volume: 0, impact: 0, txs: [] }, BASE: { volume: 0, impact: 0, txs: [] } });
  
  const [arbitrageRoutes, setArbitrageRoutes] = useState([]);
  const [flashSimulator, setFlashSimulator] = useState({ isOpen: false, route: null, amount: 50000, status: 'IDLE', result: null });
  const [atomicSimulator, setAtomicSimulator] = useState({ isOpen: false, route: null, amount: 50000, status: 'IDLE', result: null });
  
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
          if (data.msg_type === 'INDEXER_TELEMETRY') {
            setIndexerData(data.data);
            return;
          }
          if (data.msg_type === 'ENCLAVE_STATUS') {
            setEnclaveState(data.data);
            return;
          }
          if (data.msg_type === 'SEQUENCER_ALERT') {
            setSequencerAlerts(prev => [data.data, ...prev].slice(0, 50));
            return;
          }
          if (data.msg_type === 'MULTISIG_ALERT') {
            setMultiSigAlerts(prev => [data.data, ...prev].slice(0, 20));
            return;
          }
          if (data.msg_type === 'OVERLORD_STATUS') {
            setOverlordState(data.data.state || data.data);
            return;
          }
          if (data.msg_type === 'GAS_WAR_ALERT') {
            setGasWars(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'LEADERBOARD_UPDATE') {
            setLeaderboard({ wallets: data.wallets, agents: data.agents });
            return;
          }
          if (data.msg_type === 'CABAL_RESULT') {
            setCabalData(data.data);
            setIsScanningCabal(false);
            return;
          }
          if (data.msg_type === 'VESTING_DUMP_ALERT') {
            setVestingDumps(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'AUTO_EJECT_ALERT') {
            setAutoEjectAlerts(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'SHADOW_RELAY_ALERT') {
            setShadowRelayAlerts(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'INCOMING_BRIDGE_TSUNAMI') {
            setBridgeTsunamis(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 4));
            return;
          }
          if (data.msg_type === 'DECOMPILE_RESULT') {
            setDecompileData(data.data);
            setIsDecompiling(false);
            return;
          }
          if (data.msg_type === 'SHADOW_TRADE') {
            setShadowLogs(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 10));
            setTransactions(prev => [{ time: new Date().toLocaleTimeString(), project: 'A.S.M.O.', status: 'CONFIRMED', ...data }, ...prev].slice(0, 150));
            return;
          }
          if (data.msg_type === 'SOCIAL_SENTIMENT') {
            setSentimentData(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'DARK_POOL_ALERT') {
            setDarkPoolAlerts(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'ZERO_BLOCK_SNIPER') {
            setSnipeTargets(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'KILL_ZONE_UPDATE') {
            setKillZone(data.data);
            return;
          }
          if (data.msg_type === 'SYBIL_HUNTER_UPDATE') {
            setSybilClusters(data.data);
            return;
          }
          if (data.msg_type === 'ARBITRAGE_RADAR') {
            setArbitrageRoutes(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            return;
          }
          if (data.msg_type === 'MEMPOOL_SIMULATION') {
            setMempoolSim(prev => ({ ...prev, [data.network]: { volume: data.total_volume, impact: data.expected_impact, txs: data.high_risk_txs } }));
            return;
          }
          if (data.msg_type === 'BACKUP_READY') {
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ASMO_Disaster_Recovery_${new Date().getTime()}.json`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
            return;
          }
          if (data.msg_type === 'AUDIT_RESULT') {
            setAuditData(data.data);
            setIsAuditing(false);
            return;
          }
          setTransactions((prev) => {
            if(data.msg_type !== 'TRANSACTION') return prev;
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
        ws.onclose = () => setIsConnected(false);
        wsRef.current = ws;
      } catch (err) { setIsConnected(false); }
    };
    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const dashboardProps = { 
    transactions, setTransactions, leaderboard, setLeaderboard, activeNetwork, setActiveNetwork,
    graphDimensions, setGraphDimensions, cabalDimensions, setCabalDimensions, searchTerm, setSearchTerm,
    filterType, setFilterType, selectedTx, setSelectedTx, selectedEntity, setSelectedEntity, soundEnabled, setSoundEnabled,
    killZone, setKillZone, sybilClusters, setSybilClusters, snipeTargets, setSnipeTargets, darkPoolAlerts, setDarkPoolAlerts,
    sentimentData, setSentimentData, shadowTargets, setShadowTargets, shadowLogs, setShadowLogs, bridgeTsunamis, setBridgeTsunamis,
    shadowRelayAlerts, setShadowRelayAlerts, autoEjectAlerts, setAutoEjectAlerts, vestingDumps, setVestingDumps, gasWars, setGasWars,
    overlordState, setOverlordState, auditInput, setAuditInput, auditNetwork, setAuditNetwork, auditData, setAuditData, isAuditing, setIsAuditing,
    decompileInput, setDecompileInput, isDecompiling, setIsDecompiling, decompileData, setDecompileData, cabalInput, setCabalInput, isScanningCabal, setIsScanningCabal, cabalData, setCabalData,
    mempoolSim, setMempoolSim, arbitrageRoutes, setArbitrageRoutes, flashSimulator, setFlashSimulator, atomicSimulator, setAtomicSimulator, wsRef,
    handleOverlordToggle: () => {}, handleBackup: () => {}, handleRestore: () => {}, handleAudit: () => {}, handleDecompile: () => {}, executeAutoEject: () => {}, executeShortDump: () => {}, executeFlashloan: () => {}, executeAtomicArb: () => {}, toggleShadow: () => {}, exportToCSV: () => {},
    displayMempool: mempoolSim.BASE, projectAnalysis: [], networkData: {nodes:[], links:[]}, chartData: {pie:[], bar:[]}, entityData: null, fileInputRef: null, containerRef: null, cabalRef: null, PIE_COLORS
  };

  return (
    <div className="os-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>A.S.M.O.</h1>
          <span>v12.0.0.1</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <span>📊</span> GLOBAL MATRIX
          </button>
          <button className={`nav-btn ${activeTab === 'INDEXER' ? 'active' : ''}`} onClick={() => setActiveTab('INDEXER')}>
            <span>🗄️</span> LOCAL INDEXER
          </button>
          <button className={`nav-btn ${activeTab === 'ENCLAVE' ? 'active' : ''}`} onClick={() => setActiveTab('ENCLAVE')} style={{ color: enclaveState.status === 'SECURED' ? '#10b981' : ''}}>
            <span>{enclaveState.status === 'SECURED' ? '🔐' : '🔓'}</span> KMS ENCLAVE
          </button>
          <button className={`nav-btn ${activeTab === 'SIMULATOR' ? 'active' : ''}`} onClick={() => setActiveTab('SIMULATOR')}>
            <span>🎰</span> BRIBE SIMULATOR
          </button>
          <button className={`nav-btn ${activeTab === 'SEQUENCER' ? 'active' : ''}`} onClick={() => setActiveTab('SEQUENCER')}>
            <span>🛰️</span> L2 SEQUENCER
          </button>
          <button className={`nav-btn ${activeTab === 'MULTISIG' ? 'active' : ''}`} onClick={() => setActiveTab('MULTISIG')}>
            <span>🔐</span> MULTI-SIG RADAR
          </button>
          <button className={`nav-btn ${activeTab === 'AA_PROFILE' ? 'active' : ''}`} onClick={() => setActiveTab('AA_PROFILE')}>
            <span>🪪</span> 4337 PROFILER
          </button>
          <button className={`nav-btn ${activeTab === 'ORACLE' ? 'active' : ''}`} onClick={() => setActiveTab('ORACLE')}>
            <span>🔮</span> THE ORACLE
          </button>
          <button className={`nav-btn ${activeTab === 'NEXUS' ? 'active' : ''}`} onClick={() => setActiveTab('NEXUS')}>
            <span>🕸️</span> NEXUS MAP
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
        {activeTab === 'INDEXER' && <IndexerTerminal indexerData={indexerData} wsRef={wsRef} />}
        {activeTab === 'ENCLAVE' && <EnclaveTerminal enclaveState={enclaveState} wsRef={wsRef} />}
        {activeTab === 'SIMULATOR' && <BribeSimulatorTerminal wsRef={wsRef} />}
        {activeTab === 'SEQUENCER' && <SequencerTerminal sequencerAlerts={sequencerAlerts} wsRef={wsRef} activeNetwork={activeNetwork} />}
        {activeTab === 'MULTISIG' && <MultiSigRadar multiSigAlerts={multiSigAlerts} wsRef={wsRef} />}
        {activeTab === 'AA_PROFILE' && <AccountAbstractionTerminal wsRef={wsRef} />}
        {activeTab === 'ORACLE' && <OracleMachine wsRef={wsRef} />}
        {activeTab === 'NEXUS' && <NexusCartographer wsRef={wsRef} cabalData={cabalData} isScanningCabal={isScanningCabal} setCabalData={setCabalData} activeNetwork={activeNetwork} />}
      </main>
    </div>
  );
}