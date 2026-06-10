import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ForceGraph3D from 'react-force-graph-3d';
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

function App() {
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
  
  const [auditInput, setAuditInput] = useState('');
  const [auditNetwork, setAuditNetwork] = useState('BASE');
  const [auditData, setAuditData] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  
  const [mempoolSim, setMempoolSim] = useState({
    ARC: { volume: 0, impact: 0, txs: [] },
    BASE: { volume: 0, impact: 0, txs: [] }
  });
  
  const [arbitrageRoutes, setArbitrageRoutes] = useState([]);
  const [flashSimulator, setFlashSimulator] = useState({ isOpen: false, route: null, amount: 50000, status: 'IDLE', result: null });
  
  const wsRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  
  const audioCtxRef = useRef(null);
  const soundEnabledRef = useRef(false);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
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
            if (data.hype_score > 90) playViralAlert();
            return;
          }

          if (data.msg_type === 'DARK_POOL_ALERT') {
            setDarkPoolAlerts(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            playDarkPool();
            return;
          }
          
          if (data.msg_type === 'ZERO_BLOCK_SNIPER') {
            setSnipeTargets(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 5));
            playSnipe();
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

          if (data.msg_type === 'BACKUP_READY') {
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ASMO_Disaster_Recovery_${new Date().getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
          }
          
          if (data.msg_type === 'AUDIT_RESULT') {
            setAuditData(data.data);
            setIsAuditing(false);
            if (data.data.score < 50) playAlert();
            else playSuccess();
            return;
          }
          
          if (data.flag === 'MEV_ACTIVITY') {
            playAlert();
          } else if (data.flag === 'WHALE' || data.flag === 'PENDING_WHALE') {
            if ((data.amount * data.price_usd) >= 25000) {
              playSonar();
            }
          } else if (data.flag === 'ARBITRAGE_ACTIVITY') {
            playSuccess();
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
          alert("Geri Yükleme Komutu A.S.M.O. Motoruna İletildi!");
        }
      } catch (err) {
        alert("Geçersiz veya bozuk yedekleme dosyası!");
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

  const flashMath = useMemo(() => {
    if (!flashSimulator.route) return null;
    const amount = flashSimulator.amount;
    const spread = flashSimulator.route.spread;
    const grossProfit = amount * (spread / 100);
    const fee = amount * 0.0005; 
    const gas = 85.50; 
    const slippagePercent = (amount / 5000000) * 1.5; 
    const slippageCost = amount * (slippagePercent / 100);
    const netProfit = grossProfit - fee - gas - slippageCost;
    const isProfitable = netProfit > 0;
    
    return { grossProfit, fee, gas, slippagePercent, slippageCost, netProfit, isProfitable };
  }, [flashSimulator.amount, flashSimulator.route]);

  const executeFlashloan = () => {
    setFlashSimulator(prev => ({ ...prev, status: 'SIMULATING' }));
    playFlashZap();
    setTimeout(() => {
      setFlashSimulator(prev => ({ ...prev, status: 'SUCCESS' }));
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          action: 'EXECUTE_FLASHLOAN', 
          data: { amount: flashSimulator.amount, netProfit: flashMath.netProfit, spread: flashSimulator.route.spread } 
        }));
      }
    }, 1500);
  };

  const projectAnalysis = useMemo(() => {
    const projects = {};
    transactions.forEach(tx => {
      if (!tx.asset || tx.asset === 'ARC' || tx.asset === 'BASE') return;
      if (!projects[tx.asset]) {
        projects[tx.asset] = { asset: tx.asset, volume: 0, txCount: 0, pnl: 0, wallets: new Set() };
      }
      projects[tx.asset].volume += (tx.amount || 0) * (tx.price_usd || 0);
      projects[tx.asset].txCount += 1;
      projects[tx.asset].pnl += (tx.pnl || 0);
      projects[tx.asset].wallets.add(tx.from_addr);
      projects[tx.asset].wallets.add(tx.to_addr);
    });
    return Object.values(projects)
      .map(p => ({ ...p, uniqueWallets: p.wallets.size }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  }, [transactions]);

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

  const entityData = useMemo(() => {
    if (!selectedEntity) return null;
    const txs = transactions.filter(tx => tx.from_addr === selectedEntity || tx.to_addr === selectedEntity);
    let totalVol = 0;
    let pnl = 0;
    let mev = 0;
    const assets = {};
    const counterparties = {};
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

    return {
      address: selectedEntity,
      label: latestLabel || formatAddress(selectedEntity),
      txCount: txs.length,
      totalVolume: totalVol,
      netPnl: pnl,
      mevExtracted: mev,
      topAsset: topAsset.length > 15 ? `${topAsset.substring(0, 15)}...` : topAsset,
      topCounterparty: formatAddress(topCounterparty),
      history: txs.slice(0, 20)
    };
  }, [selectedEntity, transactions]);

  const displayMempool = useMemo(() => {
    if (activeNetwork === 'ALL') {
      const arcData = mempoolSim.ARC || { volume: 0, impact: 0, txs: [] };
      const baseData = mempoolSim.BASE || { volume: 0, impact: 0, txs: [] };
      const allTxs = [...arcData.txs, ...baseData.txs].sort((a, b) => b.usd_value - a.usd_value).slice(0, 5);
      return {
        volume: arcData.volume + baseData.volume,
        impact: Math.max(arcData.impact, baseData.impact),
        txs: allTxs
      };
    }
    return mempoolSim[activeNetwork] || { volume: 0, impact: 0, txs: [] };
  }, [mempoolSim, activeNetwork]);

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
            val: 4,
            color: color,
            cluster: ent.cluster,
          });
        } else {
          nodesMap.get(ent.id).val += 1;
        }
      });
      
      links.push({
        source: tx.from_addr,
        target: tx.to_addr,
        color: tx.flag === 'MEV_ACTIVITY' ? '#dc2626' : tx.type === 'ARBITRAGE' ? '#10b981' : tx.type === 'LENDING' ? '#ea580c' : tx.type === 'CROSS_CHAIN' ? '#0ea5e9' : tx.cluster ? '#ca8a04' : 'rgba(139, 148, 158, 0.5)',
      });
    });
    
    return { nodes: Array.from(nodesMap.values()), links };
  }, [displayedTransactions]);

  const PIE_COLORS = ['#a371f7', '#db2777', '#10b981', '#ea580c', '#0ea5e9', '#3fb950', '#fb8f44', '#dc2626'];

  return (
    <div className="dashboard-container">
      {flashSimulator.isOpen && flashSimulator.route && (
        <div className="modal-overlay" onClick={() => setFlashSimulator({ ...flashSimulator, isOpen: false })}>
          <div className="flash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flash-header">
              <h2>⚡ Flashloan Attack Simulator</h2>
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

              {flashMath && (
                <div className="flash-results">
                  <div className="flash-res-item">
                    <span>Gross Profit</span>
                    <span style={{color: '#c9d1d9'}}>${flashMath.grossProfit.toFixed(2)}</span>
                  </div>
                  <div className="flash-res-item">
                    <span>AAVE Fee (0.05%)</span>
                    <span style={{color: '#f85149'}}>-${flashMath.fee.toFixed(2)}</span>
                  </div>
                  <div className="flash-res-item">
                    <span>Network Gas</span>
                    <span style={{color: '#f85149'}}>-${flashMath.gas.toFixed(2)}</span>
                  </div>
                  <div className="flash-res-item">
                    <span>Est. Slippage ({flashMath.slippagePercent.toFixed(3)}%)</span>
                    <span style={{color: '#ea580c'}}>-${flashMath.slippageCost.toFixed(2)}</span>
                  </div>
                  <hr style={{borderColor: '#30363d', margin: '12px 0'}} />
                  <div className="flash-res-item" style={{fontSize: '1.2rem'}}>
                    <span>Net Extractable Value</span>
                    <span style={{color: flashMath.isProfitable ? '#3fb950' : '#dc2626', fontWeight: 'bold'}}>
                      {flashMath.isProfitable ? '+' : ''}${flashMath.netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flash-action">
                {flashSimulator.status === 'IDLE' && (
                  <button 
                    className="flash-btn pulse" 
                    style={{backgroundColor: flashMath.isProfitable ? '#10b981' : '#dc2626'}}
                    onClick={executeFlashloan}
                  >
                    {flashMath.isProfitable ? '⚡ EXECUTE ATTACK' : '⚠️ REVERT WARNING'}
                  </button>
                )}
                {flashSimulator.status === 'SIMULATING' && (
                  <button className="flash-btn" style={{backgroundColor: '#eab308', color: '#000'}} disabled>
                    ⏳ BROADCASTING TO MEMPOOL...
                  </button>
                )}
                {flashSimulator.status === 'SUCCESS' && (
                  <button className="flash-btn" style={{backgroundColor: flashMath.isProfitable ? '#3fb950' : '#f85149'}} onClick={() => setFlashSimulator({ ...flashSimulator, isOpen: false })}>
                    {flashMath.isProfitable ? '✓ ATTACK SUCCESSFUL (CHECK MATRIX)' : '✕ TX REVERTED'}
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
                <h2>🕵️‍♂️ X-Ray Profiler: {entityData.label}</h2>
                <span style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '8px', display: 'block' }}>{entityData.address}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedEntity(null)}>✕</button>
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
              <h4 style={{ color: '#e6edf3', marginTop: 0, borderBottom: '1px solid #30363d', paddingBottom: '12px' }}>Recent Activity Fingerprint</h4>
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
              {selectedTx.decoded_payload && (
                <div className="modal-card">
                  <h4>🕵️‍♂️ Payload X-Ray</h4>
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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className={`sound-btn ${soundEnabled ? 'sound-active' : ''}`} onClick={initAudio}>
            {soundEnabled ? '🔊 Sonar Active' : '🔇 Sonar Muted'}
          </button>
          <div className="status-indicator" style={{ color: isConnected ? '#3fb950' : '#f85149' }}>
            <span className={isConnected ? 'pulse' : ''}>{isConnected ? '🟢' : '🔴'}</span> {isConnected ? 'Engine Linked' : 'Engine Offline'}
          </div>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.wallets.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#8b949e', fontStyle: 'italic', padding: '16px' }}>Accumulating P&L Data...</td></tr>
                ) : (
                  leaderboard.wallets.map((w, i) => (
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.agents.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#8b949e', fontStyle: 'italic', padding: '16px' }}>Analyzing Agent Workflows...</td></tr>
                ) : (
                  leaderboard.agents.map((a, i) => (
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
                  ))
                )}
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
                  {shadowLogs.length === 0 && (
                    <tr><td colSpan="5" className="empty-state">No shadow trades executed yet. Waiting for target movement...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel sentiment-panel" style={{ marginBottom: '24px', borderColor: '#8b5cf6', boxShadow: 'inset 0 0 20px rgba(139, 92, 246, 0.05)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#8b5cf6' }}>🧠 Farcaster & Social Sentiment Matrix</h2>
            <span className="pulse-text" style={{ color: '#8b5cf6' }}>Cross-Referencing On-Chain Vol w/ Off-Chain Hype...</span>
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
                  <th>Action</th>
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
                    <td>
                      <button className="export-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#8b5cf6' }}>Track Trend</button>
                    </td>
                  </tr>
                ))}
                {sentimentData.length === 0 && (
                  <tr><td colSpan="8" className="empty-state">No anomalous social narratives detected correlating with current on-chain flows.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '24px', borderColor: '#64748b', boxShadow: 'inset 0 0 20px rgba(100, 116, 139, 0.15)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#9ca3af' }}>🌪️ Dark Pool Forensics (Aklama Dedektifi)</h2>
            <span className="pulse-text" style={{ color: '#9ca3af' }}>Tracing Shadow OTC & Mixers...</span>
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
                  <th>Action</th>
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
                    <td>
                      <button className="export-btn pulse" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#475569', border: '1px solid #94a3b8' }}>
                        INITIATE TRACE
                      </button>
                    </td>
                  </tr>
                ))}
                {darkPoolAlerts.length === 0 && (
                  <tr><td colSpan="7" className="empty-state">No active laundering or Dark Pool flows detected currently.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '24px', borderColor: '#a371f7', boxShadow: 'inset 0 0 20px rgba(163, 113, 247, 0.05)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#a371f7' }}>🚀 Zero-Block Sniper (New Pair Radar)</h2>
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
                  <th>Action</th>
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
                    <td>
                      <button className="export-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: target.score >= 80 ? '#3fb950' : '#30363d', cursor: target.score >= 80 ? 'pointer' : 'not-allowed' }}>
                        {target.score >= 80 ? 'EXECUTE SNIPE' : 'LOCKED'}
                      </button>
                    </td>
                  </tr>
                ))}
                {snipeTargets.length === 0 && (
                  <tr><td colSpan="8" className="empty-state">No new liquidity pools detected in recent blocks. Sniper standing by...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel sentinel-panel" style={{ marginBottom: '24px', borderColor: '#3b82f6', boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.05)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#3b82f6' }}>🛡️ Smart Contract Sentinel (Manual Audit)</h2>
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

        <div className="panel" style={{ marginBottom: '24px', borderColor: '#ef4444', boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.05)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#ef4444' }}>🩸 DeFi Liquidation Kill-Zone (Heatmap)</h2>
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
                  <th>Action</th>
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
                    <td><button className="export-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#dc2626' }}>Flash Liquidate</button></td>
                  </tr>
                ))}
                {killZone.length === 0 && (
                  <tr><td colSpan="7" className="empty-state">All monitored entities are currently over-collateralized. No immediate liquidation risks.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '24px', borderColor: '#ca8a04', boxShadow: 'inset 0 0 20px rgba(202, 138, 4, 0.05)' }}>
          <div className="panel-header">
            <h2 style={{ color: '#eab308' }}>🕷️ Sybil Hunter (Klon Cüzdan Ağ Örümceği)</h2>
            <span className="pulse-text" style={{ color: '#eab308' }}>Detecting Wash Trading & Sybil Rings...</span>
          </div>
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Sybil Cluster ID</th>
                  <th>Connected Entities</th>
                  <th>Network Dominance (PnL)</th>
                  <th>Risk Profile</th>
                  <th>Action</th>
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
                    <td>
                      <button className="export-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#ca8a04' }} onClick={() => {
                        const addresses = cluster.wallets.join('\n');
                        navigator.clipboard.writeText(addresses);
                        alert('Sybil cüzdan adresleri panoya kopyalandı:\n\n' + addresses.substring(0, 100) + '...');
                      }}>
                        Extract Addrs
                      </button>
                    </td>
                  </tr>
                ))}
                {sybilClusters.length === 0 && (
                  <tr><td colSpan="5" className="empty-state">No active Sybil rings detected in the current matrix state.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h2 style={{ color: '#10b981' }}>🌉 Cross-Chain Arbitrage Radar</h2>
            <span className="pulse-text" style={{ color: '#10b981' }}>Scanning Inter-Chain Spreads...</span>
          </div>
          <div className="table-container">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Detection Time</th>
                  <th>Target Asset</th>
                  <th>Execution Route</th>
                  <th>Entry Price</th>
                  <th>Exit Price</th>
                  <th>Spread %</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {arbitrageRoutes.map((route, idx) => (
                  <tr key={idx} style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                    <td style={{ color: '#8b949e' }}>{route.time}</td>
                    <td style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{route.asset}</td>
                    <td style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{route.route}</td>
                    <td>${route.buy_price.toFixed(4)}</td>
                    <td>${route.sell_price.toFixed(4)}</td>
                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>+{route.spread}%</td>
                    <td>
                      <button 
                        className="export-btn pulse" 
                        style={{ padding: '4px 12px', fontSize: '0.75rem', backgroundColor: '#10b981', color: '#000', fontWeight: 'bold' }}
                        onClick={() => setFlashSimulator({ isOpen: true, route: route, amount: 50000, status: 'IDLE', result: null })}
                      >
                        ⚡ SIMULATE
                      </button>
                    </td>
                  </tr>
                ))}
                {arbitrageRoutes.length === 0 && (
                  <tr><td colSpan="7" className="empty-state">Ağlar arası kârlı spread bekleniyor...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel mempool-panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h2 style={{ color: '#eab308' }}>🔮 Taktiksel Mempool Simülatörü (Next-Block Prediction)</h2>
            <span className="pulse-text">Live Mempool Scanning...</span>
          </div>
          <div className="mempool-grid">
            <div className="mempool-stat-card">
              <h4>Pending Block Volume</h4>
              <div className="mempool-value">${displayMempool.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className="mempool-stat-card">
              <h4>Expected Price Impact</h4>
              <div className={`mempool-value ${displayMempool.impact > 1 ? 'impact-high' : ''}`}>{displayMempool.impact.toFixed(2)}%</div>
            </div>
            <div className="mempool-stat-card">
              <h4>Volatility Forecast</h4>
              <div className="mempool-value" style={{ color: displayMempool.impact > 2 ? '#f85149' : '#3fb950' }}>
                {displayMempool.impact > 2 ? '⚠️ HIGH VOLATILITY' : '🌊 STABLE FLOW'}
              </div>
            </div>
          </div>
          <table className="accounting-table mempool-table">
            <thead>
              <tr>
                <th>Vanguard Hash</th>
                <th>From Entity</th>
                <th>To Entity</th>
                <th>Projected Size (USD)</th>
                <th>Est. Impact</th>
              </tr>
            </thead>
            <tbody>
              {displayMempool.txs.map((t, i) => (
                <tr key={i} className="mempool-row">
                  <td className="mempool-hash">{t.tx_hash.substring(0, 15)}...</td>
                  <td>{formatAddress(t.from_addr)}</td>
                  <td>{formatAddress(t.to_addr)}</td>
                  <td style={{ color: '#eab308', fontWeight: 'bold' }}>${t.usd_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>{t.impact}%</td>
                </tr>
              ))}
              {displayMempool.txs.length === 0 && (
                <tr><td colSpan="5" className="empty-state">No significant vanguard flows detected in current mempool...</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h2 style={{ color: '#58a6ff' }}>🗄️ Proje Analiz Paneli & Felaket Kurtarma</h2>
          </div>
          <div className="project-analysis-grid">
            <div className="table-container" style={{ flex: 2, marginRight: '16px' }}>
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Project / Asset Contract</th>
                    <th>Total Volume (USD)</th>
                    <th>Tx Count</th>
                    <th>Unique Wallets</th>
                    <th>Net PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {projectAnalysis.map((p, i) => (
                    <tr key={i}>
                      <td style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{p.asset.length > 20 ? `${p.asset.substring(0, 17)}...` : p.asset}</td>
                      <td>${p.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>{p.txCount}</td>
                      <td>{p.uniqueWallets}</td>
                      <td>{renderPnL(p.pnl)}</td>
                    </tr>
                  ))}
                  {projectAnalysis.length === 0 && (
                    <tr><td colSpan="5" className="empty-state">Proje verisi bekleniyor...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="recovery-card" style={{ flex: 1 }}>
              <h3 style={{ marginTop: 0, color: '#e6edf3' }}>Sistem Yedekleme & Geri Yükleme</h3>
              <p style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '16px' }}>A.S.M.O. veritabanını şifreli JSON formatında dışa aktarın veya mevcut bir yedeği anında motora enjekte edin.</p>
              
              <button className="recovery-btn backup-btn" onClick={handleBackup}>
                📥 A.S.M.O. Veritabanını Yedekle
              </button>
              
              <div style={{ marginTop: '24px' }}>
                <button className="recovery-btn restore-btn" onClick={() => fileInputRef.current.click()}>
                  📤 Sistem Geri Yükle (Restore)
                </button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleRestore} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h2>Orbital Liquidity Map ({activeNetwork})</h2>
            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>3D Deep Space View. Particles indicate live transaction flow and direction.</span>
          </div>
          <div className="graph-container" ref={containerRef} style={{ height: '400px', backgroundColor: '#010409', borderRadius: '8px', overflow: 'hidden', border: '1px solid #30363d' }}>
            {networkData.nodes.length > 0 ? (
              <ForceGraph3D
                width={graphDimensions.width}
                height={graphDimensions.height}
                graphData={networkData}
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={6}
                linkColor="color"
                linkWidth={1}
                linkDirectionalParticles={3}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.006}
                backgroundColor="#010409"
                onNodeClick={(node) => setSelectedEntity(node.id)}
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