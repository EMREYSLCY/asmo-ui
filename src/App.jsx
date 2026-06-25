import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
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

const OracleMachine = ({ wsRef }) => {
  const [messages, setMessages] = useState([
    { role: 'oracle', content: 'INITIALIZING ORACLE CORE... I am the omniscient contract auditor. Provide a smart contract hash or protocol inquiry to begin forensic analysis.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!wsRef.current) return;
    const ws = wsRef.current;
    const handleOracleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'ORACLE_RESPONSE') {
          setIsTyping(false);
          setMessages(prev => [...prev, { role: 'oracle', content: data.data.response, confidence: data.data.confidence }]);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handleOracleMessage);
    return () => ws.removeEventListener('message', handleOracleMessage);
  }, [wsRef]);

  const handleSend = () => {
    if (!input.trim() || !wsRef.current) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsTyping(true);
    const possibleHashMatch = input.match(/0x[a-fA-F0-9]{40}/);
    const target = possibleHashMatch ? possibleHashMatch[0] : "GLOBAL_STATE";
    wsRef.current.send(JSON.stringify({ action: 'ORACLE_QUERY', query: input, target: target }));
    setInput('');
  };

  return (
    <div className="oracle-container">
      <div className="oracle-header">
        <h2>🔮 THE ORACLE MACHINE</h2>
        <span>Advanced LLM Smart Contract Forensics</span>
      </div>
      <div className="oracle-chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role === 'oracle' ? 'oracle-msg' : 'user-msg'}`}>
            <div className="msg-avatar">{msg.role === 'oracle' ? '🔮' : '👤'}</div>
            <div className="msg-content">
              <p>{msg.content}</p>
              {msg.confidence && <span className="confidence-badge">Confidence: {msg.confidence}%</span>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message oracle-msg typing-indicator">
            <div className="msg-avatar">🔮</div>
            <div className="msg-content"><p>Synthesizing bytecode logic...</p></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="oracle-input-area">
        <input type="text" placeholder="Query a token hash, address, or vulnerability pattern..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend}>EXECUTE QUERY</button>
      </div>
    </div>
  );
};

const NexusCartographer = ({ wsRef, cabalData, isScanningCabal, setCabalData, activeNetwork }) => {
  const [input, setInput] = useState('');
  const containerRef = useRef(null);
  const [dim, setDim] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDim({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleScan = () => {
    if (!input || !wsRef.current) return;
    setCabalData(null);
    wsRef.current.send(JSON.stringify({ action: 'CABAL_SCAN', address: input, network: activeNetwork === 'ALL' ? 'ARC' : activeNetwork }));
  };

  return (
    <div className="nexus-container" ref={containerRef}>
      <div className="nexus-overlay">
        <h2>🕸️ NEXUS CARTOGRAPHER</h2>
        <span>Full-Scale Inter-Node Syndicate Tracing</span>
        
        <div className="nexus-search">
          <input type="text" placeholder="Target Address (0x...)" value={input} onChange={(e) => setInput(e.target.value)} />
          <button onClick={handleScan} disabled={isScanningCabal}>
            {isScanningCabal ? 'SCANNING DEEP SPACE...' : 'INITIALIZE TRACE'}
          </button>
        </div>

        {cabalData && (
          <div className="nexus-stats">
            <div className="nexus-stat-box" style={{ borderColor: cabalData.total_cabal_dominance > 50 ? '#f85149' : '#eab308' }}>
              <span>Total Insider Control</span>
              <strong style={{ color: cabalData.total_cabal_dominance > 50 ? '#f85149' : '#eab308' }}>{cabalData.total_cabal_dominance}%</strong>
            </div>
            <div className="nexus-stat-box">
              <span>Syndicates Found</span>
              <strong>{cabalData.syndicates.length}</strong>
            </div>
            <div className="nexus-stat-box" style={{ borderColor: cabalData.risk_level === 'CRITICAL' ? '#f85149' : '#eab308' }}>
              <span>Risk Level</span>
              <strong style={{ color: cabalData.risk_level === 'CRITICAL' ? '#f85149' : '#eab308' }}>{cabalData.risk_level}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="nexus-graph">
        {cabalData ? (
          <ForceGraph3D
            width={dim.width}
            height={dim.height}
            graphData={cabalData.graph}
            nodeLabel="name"
            nodeColor="color"
            nodeVal="val"
            linkColor="color"
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            backgroundColor="#010409"
            onNodeClick={(node) => {
               navigator.clipboard.writeText(node.id);
               alert('Node hash secured to clipboard: ' + node.id);
            }}
          />
        ) : (
          <div className="nexus-empty">AWAITING TARGET COORDINATES...</div>
        )}
      </div>
    </div>
  );
};

const OverlordForge = ({ wsRef, overlordState, setOverlordState }) => {
  const [nodes, setNodes] = useState([
    { id: 1, type: 'TRIGGER', key: 'Mempool Event', operator: '==', value: 'Any' }
  ]);

  const addCondition = () => setNodes([...nodes, { id: Date.now(), type: 'CONDITION', key: 'Whale Volume', operator: '>', value: '50000' }]);
  const addAction = () => setNodes([...nodes, { id: Date.now(), type: 'ACTION', key: 'Execute', operator: '==', value: 'Snipe Pair' }]);
  const removeNode = (id) => setNodes(nodes.filter(n => n.id !== id));
  const updateNode = (id, field, val) => setNodes(nodes.map(n => n.id === id ? { ...n, [field]: val } : n));

  const handleSaveStrategy = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'SAVE_STRATEGY', data: nodes }));
      alert("OVERLORD STRATEGY SAVED AND DEPLOYED.");
    }
  };

  return (
    <div className="forge-container">
      <div className="forge-header">
        <h2>🛠️ OVERLORD STRATEGY FORGE</h2>
        <span>Visual Node-Based Autonomous Rule Builder</span>
      </div>
      <div className="forge-workspace">
        <div className="forge-palette">
          <h3>Toolbox</h3>
          <button className="forge-btn condition-btn" onClick={addCondition}>+ Add Condition (IF)</button>
          <button className="forge-btn action-btn" onClick={addAction}>+ Add Action (THEN)</button>
          <div className="forge-global-settings">
            <h4>Global Execution Limits</h4>
            <div className="forge-setting-row">
              <label>Max Spend ($)</label>
              <input type="number" value={overlordState.max_spend} onChange={e => setOverlordState({...overlordState, max_spend: Number(e.target.value)})} />
            </div>
            <div className="forge-setting-row">
              <label>Min Profit ($)</label>
              <input type="number" value={overlordState.min_profit} onChange={e => setOverlordState({...overlordState, min_profit: Number(e.target.value)})} />
            </div>
            <button className="forge-save-btn pulse" onClick={handleSaveStrategy}>DEPLOY STRATEGY</button>
          </div>
        </div>
        <div className="forge-canvas">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className={`forge-node node-${node.type.toLowerCase()}`}>
                <div className="node-header">
                  <span>{node.type}</span>
                  {index > 0 && <button className="node-del-btn" onClick={() => removeNode(node.id)}>✕</button>}
                </div>
                <div className="node-body">
                  <select value={node.key} onChange={(e) => updateNode(node.id, 'key', e.target.value)}>
                    {node.type === 'TRIGGER' && <option value="Mempool Event">Mempool Event</option>}
                    {node.type === 'CONDITION' && (
                      <><option value="Whale Volume">Whale Volume ($)</option><option value="Security Score">Security Score</option><option value="Sybil Dominance">Sybil Dominance (%)</option><option value="Social Hype">Social Hype Index</option></>
                    )}
                    {node.type === 'ACTION' && <option value="Execute">Execute Command</option>}
                  </select>
                  {node.type !== 'ACTION' && node.type !== 'TRIGGER' && (
                    <select className="op-select" value={node.operator} onChange={(e) => updateNode(node.id, 'operator', e.target.value)}>
                      <option value=">">&gt;</option><option value="<">&lt;</option><option value="==">==</option>
                    </select>
                  )}
                  {node.type !== 'TRIGGER' ? (
                    node.type === 'ACTION' ? (
                      <select value={node.value} onChange={(e) => updateNode(node.id, 'value', e.target.value)}>
                        <option value="Snipe Pair">Snipe New Pair</option>
                        <option value="Flashloan Arb">Flashloan Arbitrage</option>
                        <option value="Auto-Eject Front-Run">Auto-Eject Front-Run</option>
                        <option value="Short Dump">Short Vesting Dump</option>
                      </select>
                    ) : (
                      <input type="text" value={node.value} onChange={(e) => updateNode(node.id, 'value', e.target.value)} />
                    )
                  ) : (
                    <span style={{color: '#8b949e', fontSize: '0.9rem', marginTop: '8px', display: 'block'}}>Listens to Live RPC</span>
                  )}
                </div>
              </div>
              {index < nodes.length - 1 && <div className="forge-connector">↓ AND</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChronosTester = ({ wsRef }) => {
  const [target, setTarget] = useState('');
  const [blockNum, setBlockNum] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!wsRef.current) return;
    const ws = wsRef.current;
    const handleChronosMsg = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'CHRONOS_EVENT') {
          setEvents(prev => [...prev, data.data]);
          if (data.data.type === 'COMPLETE') setIsSimulating(false);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handleChronosMsg);
    return () => ws.removeEventListener('message', handleChronosMsg);
  }, [wsRef]);

  const handleSimulate = () => {
    if (!target || !blockNum || !wsRef.current) return;
    setEvents([]);
    setIsSimulating(true);
    wsRef.current.send(JSON.stringify({ action: 'CHRONOS_SIMULATE', data: { target: target, block: blockNum } }));
  };

  return (
    <div className="chronos-container">
      <div className="chronos-header">
        <h2>⏱️ CHRONOS BACKTESTER</h2>
        <span>Historical Temporal Simulation Laboratory</span>
      </div>
      <div className="chronos-controls">
        <div className="input-group">
          <label>Target Asset Hash</label>
          <input type="text" placeholder="0x..." value={target} onChange={e => setTarget(e.target.value)} disabled={isSimulating} />
        </div>
        <div className="input-group">
          <label>Historical Block Number / Timestamp</label>
          <input type="text" placeholder="e.g. 14300000" value={blockNum} onChange={e => setBlockNum(e.target.value)} disabled={isSimulating} />
        </div>
        <button className="chronos-btn" onClick={handleSimulate} disabled={isSimulating || !target || !blockNum}>
          {isSimulating ? 'SIMULATING TIMELINE...' : 'INITIATE TEMPORAL SHIFT'}
        </button>
      </div>
      <div className="chronos-timeline">
        {events.map((ev, i) => (
          <div key={i} className="timeline-event">
            <div className="timeline-marker" style={{ backgroundColor: ev.color, boxShadow: `0 0 10px ${ev.color}` }}></div>
            <div className="timeline-content" style={{ borderColor: ev.color }}>
              <span className="event-type" style={{ color: ev.color }}>{ev.type}</span>
              <p>{ev.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
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
  const [overlordState, setOverlordState] = useState({ active: false, max_spend: 50000, min_profit: 500 });
  
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
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  
  const audioCtxRef = useRef(null);
  const soundEnabledRef = useRef(false);

  const initAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    soundEnabledRef.current = !soundEnabledRef.current;
    setSoundEnabled(soundEnabledRef.current);
  };

  const playSonar = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  const playAlert = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const playSuccess = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const playFlashZap = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const playDarkPool = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  };

  const playViralAlert = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const playTsunamiWarning = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 2.0);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2.0);
  };

  const playGlitch = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.setValueAtTime(400, ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const playRugSiren = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.6);
  };

  const playOverlordActivate = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  };

  const playGasWar = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const playAtomicZap = () => {
    if (!soundEnabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

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
          
          if (data.msg_type === 'OVERLORD_STATUS') {
            setOverlordState(data.data.state || data.data);
            return;
          }

          if (data.msg_type === 'GAS_WAR_ALERT') {
            setGasWars(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            playGasWar();
            return;
          }

          if (data.msg_type === 'LEADERBOARD_UPDATE') {
            setLeaderboard({ wallets: data.wallets, agents: data.agents });
            return;
          }

          if (data.msg_type === 'CABAL_RESULT') {
            setCabalData(data.data);
            setIsScanningCabal(false);
            if (data.data.risk_level === 'CRITICAL') playAlert();
            else playSuccess();
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
            if (data.data.overall_risk === 'CRITICAL') playAlert();
            else playSuccess();
            return;
          }

          if (data.msg_type === 'SHADOW_TRADE') {
            setShadowLogs(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 10));
            playFlashZap();
            setTransactions((prev) => {
              const newData = { time: new Date().toLocaleTimeString(), project: 'A.S.M.O.', status: 'CONFIRMED', ...data };
              return [newData, ...prev].slice(0, 150);
            });
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
            setArbitrageRoutes(prev => {
              const newRoute = { time: new Date().toLocaleTimeString(), ...data };
              return [newRoute, ...prev].slice(0, 5);
            });
            playSuccess();
            return;
          }
          
          if (data.msg_type === 'MEMPOOL_SIMULATION') {
            setMempoolSim(prev => ({
              ...prev,
              [data.network]: {
                volume: data.total_volume,
                impact: data.expected_impact,
                txs: data.high_risk_txs
              }
            }));
            return;
          }
          
          if (data.flag === 'MEV_ACTIVITY') {
            playAlert();
          } else if (data.flag === 'WHALE' || data.flag === 'PENDING_WHALE') {
            if ((data.amount * data.price_usd) >= 25000) {
              playSonar();
            }
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

  const handleOverlordToggle = (updatedState) => {
    if (!wsRef.current) return;
    const newState = updatedState || { ...overlordState, active: !overlordState.active };
    setOverlordState(newState);
    if(newState.active && !updatedState) playOverlordActivate();
    wsRef.current.send(JSON.stringify({ action: 'TOGGLE_OVERLORD', data: newState }));
  };

  const handleBackup = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'BACKUP' }));
    }
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'RESTORE', data: parsed }));
          alert("Restore command dispatched to A.S.M.O. Engine!");
        }
      } catch (err) {
        alert("Invalid or corrupted backup file!");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleAudit = () => {
    if (!auditInput || !wsRef.current) return;
    setIsAuditing(true);
    setAuditData(null);
    wsRef.current.send(JSON.stringify({ action: 'AUDIT', address: auditInput, network: auditNetwork }));
  };

  const handleDecompile = () => {
    if (!decompileInput || !wsRef.current) return;
    setIsDecompiling(true);
    setDecompileData(null);
    wsRef.current.send(JSON.stringify({ action: 'DECOMPILE', address: decompileInput, network: activeNetwork === 'ALL' ? 'ARC' : activeNetwork }));
  };

  const handleCabalScan = () => {
    if (!cabalInput || !wsRef.current) return;
    setIsScanningCabal(true);
    setCabalData(null);
    wsRef.current.send(JSON.stringify({ action: 'CABAL_SCAN', address: cabalInput, network: activeNetwork === 'ALL' ? 'ARC' : activeNetwork }));
  };

  const toggleShadow = (addr) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (shadowTargets.includes(addr)) {
      setShadowTargets(prev => prev.filter(a => a !== addr));
      wsRef.current.send(JSON.stringify({ action: 'STOP_SHADOW', address: addr }));
    } else {
      setShadowTargets(prev => [...prev, addr]);
      wsRef.current.send(JSON.stringify({ action: 'START_SHADOW', address: addr }));
    }
  };

  const executeAutoEject = (target) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      playSuccess();
      wsRef.current.send(JSON.stringify({
        action: 'EXECUTE_AUTO_EJECT',
        tx_hash: target.tx_hash,
        gas: target.est_gas_gwei * 2,
        rescued_amount: 50000 
      }));
      setAutoEjectAlerts(prev => prev.filter(t => t.tx_hash !== target.tx_hash));
    }
  };

  const executeShortDump = (target) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      playSuccess();
      wsRef.current.send(JSON.stringify({
        action: 'EXECUTE_SHORT_DUMP',
        token_addr: target.token_addr
      }));
      setVestingDumps(prev => prev.filter(t => t.tx_hash !== target.tx_hash));
    }
  };

  const executeAtomicArb = () => {
    setAtomicSimulator(prev => ({ ...prev, status: 'BRIDGING' }));
    playAtomicZap();
    setTimeout(() => {
      setAtomicSimulator(prev => ({ ...prev, status: 'SUCCESS' }));
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          action: 'EXECUTE_ATOMIC_ARB', 
          data: { route: atomicSimulator.route.route, amount: atomicSimulator.amount, spread: atomicSimulator.route.spread } 
        }));
      }
    }, 2000);
  };

  const executeFlashloan = () => {
    setFlashSimulator(prev => ({ ...prev, status: 'SIMULATING' }));
    playFlashZap();
    setTimeout(() => {
      setFlashSimulator(prev => ({ ...prev, status: 'SUCCESS' }));
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          action: 'EXECUTE_FLASHLOAN', 
          data: { amount: flashSimulator.amount, spread: flashSimulator.route.spread } 
        }));
      }
    }, 1500);
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      'Time', 'Network', 'Status', 'Type', 'Flag', 'Hash', 'Asset', 'Amount', 'Value_USD', 'From_Entity', 'To_Entity', 'Sybil_Cluster', 'Health_Factor', 'TWAP', 'Market_Trend', 'Price_Impact', 'Arbitrage_Spread', 'Agent_WinRate', 'MEV_Extracted', 'Exec_Depth', 'Realized_PnL', 'Narrative', 'Security_Label',
    ];
    const rows = transactions.map((tx) => [
      tx.time, tx.network || 'ARC', tx.status, tx.type, tx.flag || 'STANDARD', tx.tx_hash, tx.asset, tx.amount, tx.amount * (tx.price_usd || 0), tx.from_label || tx.from_addr || 'N/A', tx.to_label || tx.to_addr || 'N/A', tx.cluster || 'Isolated', tx.health_factor || 99.0, tx.twap || 0.0, tx.twap_trend || '', tx.price_impact || 0.0, tx.spread || 0.0, tx.agent_win_rate || 0.0, tx.mev_extracted || 0.0, tx.execution_depth || 1, tx.pnl || 0.0, tx.narrative || '', tx.sec_label || 'VERIFIED SAFE',
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

  const projectAnalysis = useMemo(() => {
    const projects = {};
    transactions.forEach(tx => {
      if (!tx.asset || tx.asset === 'ARC' || tx.asset === 'BASE') return;
      if (!projects[tx.asset]) projects[tx.asset] = { asset: tx.asset, volume: 0, txCount: 0, pnl: 0, wallets: new Set() };
      projects[tx.asset].volume += (tx.amount || 0) * (tx.price_usd || 0);
      projects[tx.asset].txCount += 1;
      projects[tx.asset].pnl += (tx.pnl || 0);
      projects[tx.asset].wallets.add(tx.from_addr);
      projects[tx.asset].wallets.add(tx.to_addr);
    });
    return Object.values(projects).map(p => ({ ...p, uniqueWallets: p.wallets.size })).sort((a, b) => b.volume - a.volume).slice(0, 10);
  }, [transactions]);

  const displayedTransactions = useMemo(() => {
    let filtered = transactions;
    if (activeNetwork !== 'ALL') filtered = filtered.filter((tx) => tx.network === activeNetwork);
    if (filterType !== 'ALL') filtered = filtered.filter((tx) => tx.flag === filterType || tx.type === filterType);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => tx.tx_hash?.toLowerCase().includes(term) || tx.from_addr?.toLowerCase().includes(term) || tx.to_addr?.toLowerCase().includes(term) || tx.asset?.toLowerCase().includes(term) || tx.narrative?.toLowerCase().includes(term) || tx.from_label?.toLowerCase().includes(term) || tx.to_label?.toLowerCase().includes(term));
    }
    return filtered;
  }, [transactions, activeNetwork, filterType, searchTerm]);

  const entityData = useMemo(() => {
    if (!selectedEntity) return null;
    const txs = transactions.filter(tx => tx.from_addr === selectedEntity || tx.to_addr === selectedEntity);
    let totalVol = 0, pnl = 0, mev = 0;
    const assets = {}, counterparties = {};
    let latestLabel = null;

    txs.forEach(tx => {
      const vol = (tx.amount || 0) * (tx.price_usd || 0);
      totalVol += vol;
      if (tx.from_addr === selectedEntity && tx.pnl) pnl += tx.pnl;
      if (tx.from_addr === selectedEntity && tx.mev_extracted) mev += tx.mev_extracted;
      if (tx.asset) assets[tx.asset] = (assets[tx.asset] || 0) + vol;
      const counterparty = tx.from_addr === selectedEntity ? tx.to_addr : tx.from_addr;
      counterparties[counterparty] = (counterparties[counterparty] || 0) + 1;
      if (tx.from_addr === selectedEntity && tx.from_label) latestLabel = tx.from_label;
      if (tx.to_addr === selectedEntity && tx.to_label && !latestLabel) latestLabel = tx.to_label;
    });

    const topAsset = Object.entries(assets).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topCounterparty = Object.entries(counterparties).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    let charCodeSum = 0;
    for(let i=0; i<selectedEntity.length; i++) charCodeSum += selectedEntity.charCodeAt(i);
    
    const profileTypes = ["Algorithmic HFT Bot 🤖", "Diamond Hands Accumulator 💎", "Panic Seller (Weak Hands) 🧻", "Momentum Chaser 🌊", "MEV Searcher / Sniper 🎯"];
    const sessions = ["Asia (01:00 - 06:00 UTC)", "London (08:00 - 16:00 UTC)", "New York (14:00 - 22:00 UTC)", "Continuous 24/7 (Bot)"];
    const risks = ["Extreme (Degen)", "Aggressive", "Calculated", "Risk-Averse"];

    return {
      address: selectedEntity, label: latestLabel || formatAddress(selectedEntity), txCount: txs.length, totalVolume: totalVol, netPnl: pnl, mevExtracted: mev,
      topAsset: topAsset.length > 15 ? `${topAsset.substring(0, 15)}...` : topAsset, topCounterparty: formatAddress(topCounterparty),
      biometrics: { profile: profileTypes[charCodeSum % profileTypes.length], session: sessions[(charCodeSum * 3) % sessions.length], risk: risks[(charCodeSum * 7) % risks.length], greed: (charCodeSum * 13) % 100 },
      history: txs.slice(0, 20)
    };
  }, [selectedEntity, transactions]);

  const displayMempool = useMemo(() => {
    if (activeNetwork === 'ALL') {
      const arcData = mempoolSim.ARC || { volume: 0, impact: 0, txs: [] };
      const baseData = mempoolSim.BASE || { volume: 0, impact: 0, txs: [] };
      return { volume: arcData.volume + baseData.volume, impact: Math.max(arcData.impact, baseData.impact), txs: [...arcData.txs, ...baseData.txs].sort((a, b) => b.usd_value - a.usd_value).slice(0, 5) };
    }
    return mempoolSim[activeNetwork] || { volume: 0, impact: 0, txs: [] };
  }, [mempoolSim, activeNetwork]);

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
    
    const pie = Object.keys(counts).filter((k) => counts[k] > 0).map((k) => ({ name: k.replace('_', ' '), value: counts[k] }));
    const bar = [
      { name: 'MEV Vol', value: Math.round(mevVol), fill: '#dc2626' }, { name: 'Arb Vol', value: Math.round(arbVol), fill: '#10b981' },
      { name: 'Lending Vol', value: Math.round(lendingVol), fill: '#ea580c' }, { name: 'Bridge Vol', value: Math.round(bridgeVol), fill: '#0ea5e9' },
      { name: 'Whale Vol', value: Math.round(whaleVol), fill: '#f85149' }, { name: 'AI Vol', value: Math.round(agentVol), fill: '#a371f7' },
      { name: 'DEX Vol', value: Math.round(dexVol), fill: '#db2777' }, { name: 'Standard', value: Math.round(standardVol), fill: '#3fb950' },
    ].filter((d) => d.value > 0);
    
    return { pie, bar };
  }, [displayedTransactions]);

  const networkData = useMemo(() => {
    const nodesMap = new Map();
    const links = [];
    displayedTransactions.forEach((tx) => {
      if (!tx.from_addr || !tx.to_addr || tx.from_addr === '0x00' || tx.to_addr === '0x00') return;
      [{ id: tx.from_addr, label: tx.from_label, flag: tx.flag, cluster: tx.cluster, type: tx.type }, { id: tx.to_addr, label: tx.to_label, flag: tx.flag, cluster: tx.cluster, type: tx.type }].forEach((ent) => {
        if (!nodesMap.has(ent.id)) {
          let color = '#3fb950';
          if (ent.label?.includes('Whale')) color = '#f85149';
          if (ent.label?.includes('Agent') || ent.label?.includes('Registry')) color = '#a371f7';
          if (ent.label?.includes('Pool')) color = '#db2777';
          if (ent.label?.includes('Bridge') || ent.type === 'CROSS_CHAIN') color = '#0ea5e9';
          if (ent.label?.includes('AAVE') || ent.type === 'LENDING') color = '#ea580c';
          if (ent.type === 'ARBITRAGE') color = '#10b981';
          if (ent.flag === 'MEV_ACTIVITY' || ent.label?.includes('MEV')) color = '#dc2626';
          nodesMap.set(ent.id, { id: ent.id, name: ent.label || `${ent.id.substring(0, 6)}...`, val: 4, color: color, cluster: ent.cluster });
        } else {
          nodesMap.get(ent.id).val += 1;
        }
      });
      links.push({ source: tx.from_addr, target: tx.to_addr, color: tx.flag === 'MEV_ACTIVITY' ? '#dc2626' : tx.type === 'ARBITRAGE' ? '#10b981' : tx.type === 'LENDING' ? '#ea580c' : tx.type === 'CROSS_CHAIN' ? '#0ea5e9' : tx.cluster ? '#ca8a04' : 'rgba(139, 148, 158, 0.5)' });
    });
    return { nodes: Array.from(nodesMap.values()), links };
  }, [displayedTransactions]);

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
    handleOverlordToggle, handleBackup, handleRestore, handleAudit, handleDecompile, executeAutoEject, executeShortDump, executeFlashloan, executeAtomicArb, toggleShadow, exportToCSV,
    displayMempool, projectAnalysis, networkData, chartData, entityData, fileInputRef, containerRef, cabalRef, PIE_COLORS, getRowStyle, renderNetworkBadge, renderTypeBadge, renderPnL, renderAgentBadge, renderHealthFactor, renderSecurityBadge, renderTwapBadge, renderLogicTree, formatAddress
  };

  return (
    <div className="os-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>A.S.M.O.</h1>
          <span>v5.0.0.1</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <span>📊</span> GLOBAL MATRIX
          </button>
          <button className={`nav-btn ${activeTab === 'ORACLE' ? 'active' : ''}`} onClick={() => setActiveTab('ORACLE')}>
            <span>🔮</span> THE ORACLE
          </button>
          <button className={`nav-btn ${activeTab === 'NEXUS' ? 'active' : ''}`} onClick={() => setActiveTab('NEXUS')}>
            <span>🕸️</span> NEXUS MAP
          </button>
          <button className={`nav-btn ${activeTab === 'FORGE' ? 'active' : ''}`} onClick={() => setActiveTab('FORGE')}>
            <span>🛠️</span> OVERLORD FORGE
          </button>
          <button className={`nav-btn ${activeTab === 'CHRONOS' ? 'active' : ''}`} onClick={() => setActiveTab('CHRONOS')}>
            <span>⏱️</span> CHRONOS TESTER
          </button>
          <button className="nav-btn locked" disabled>
            <span>🩸</span> DARK FORENSICS 🔒
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
        {activeTab === 'ORACLE' && <OracleMachine wsRef={wsRef} />}
        {activeTab === 'NEXUS' && <NexusCartographer wsRef={wsRef} cabalData={cabalData} isScanningCabal={isScanningCabal} setCabalData={setCabalData} activeNetwork={activeNetwork} />}
        {activeTab === 'FORGE' && <OverlordForge wsRef={wsRef} overlordState={overlordState} setOverlordState={setOverlordState} />}
        {activeTab === 'CHRONOS' && <ChronosTester wsRef={wsRef} />}
      </main>
    </div>
  );
}