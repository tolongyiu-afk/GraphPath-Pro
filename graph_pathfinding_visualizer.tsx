import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Plus, 
  Trash2, 
  Activity, 
  Compass, 
  Share2, 
  HelpCircle, 
  Zap, 
  Sliders, 
  Layers, 
  Info, 
  CheckCircle2,
  AlertCircle,
  Move
} from 'lucide-react';

// Preset graph topologies for immediate showcase
const PRESETS = {
  CITY_NETWORK: {
    name: 'City Logistics Network',
    nodes: [
      { id: 'A', name: 'Sydney HQ', x: 120, y: 150, color: '#3B82F6' },
      { id: 'B', name: 'Paramatta Hub', x: 300, y: 100, color: '#6366F1' },
      { id: 'C', name: 'Central Depot', x: 300, y: 280, color: '#6366F1' },
      { id: 'D', name: 'Penrith Port', x: 500, y: 120, color: '#8B5CF6' },
      { id: 'E', name: 'Airport Express', x: 520, y: 320, color: '#8B5CF6' },
      { id: 'F', name: 'Campbelltown Station', x: 700, y: 220, color: '#10B981' }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 4 },
      { id: 'e2', source: 'A', target: 'C', weight: 2 },
      { id: 'e3', source: 'B', target: 'C', weight: 1 },
      { id: 'e4', source: 'B', target: 'D', weight: 5 },
      { id: 'e5', source: 'C', target: 'E', weight: 8 },
      { id: 'e6', source: 'C', target: 'D', weight: 10 },
      { id: 'e7', source: 'D', target: 'E', weight: 2 },
      { id: 'e8', source: 'D', target: 'F', weight: 6 },
      { id: 'e9', source: 'E', target: 'F', weight: 3 }
    ],
    startNode: 'A',
    targetNode: 'F'
  },
  GRID_ROUTING: {
    name: 'Grid Network (Grid Topology)',
    nodes: [
      { id: 'N1', name: 'Node (0,0)', x: 150, y: 120 },
      { id: 'N2', name: 'Node (1,0)', x: 350, y: 120 },
      { id: 'N3', name: 'Node (2,0)', x: 550, y: 120 },
      { id: 'N4', name: 'Node (0,1)', x: 150, y: 260 },
      { id: 'N5', name: 'Node (1,1)', x: 350, y: 260 },
      { id: 'N6', name: 'Node (2,1)', x: 550, y: 260 },
      { id: 'N7', name: 'Node (0,2)', x: 150, y: 400 },
      { id: 'N8', name: 'Node (1,2)', x: 350, y: 400 },
      { id: 'N9', name: 'Node (2,2)', x: 550, y: 400 }
    ],
    edges: [
      { id: 'ge1', source: 'N1', target: 'N2', weight: 3 },
      { id: 'ge2', source: 'N1', target: 'N4', weight: 1 },
      { id: 'ge3', source: 'N2', target: 'N3', weight: 4 },
      { id: 'ge4', source: 'N2', target: 'N5', weight: 2 },
      { id: 'ge5', source: 'N3', target: 'N6', weight: 5 },
      { id: 'ge6', source: 'N4', target: 'N5', weight: 1 },
      { id: 'ge7', source: 'N4', target: 'N7', weight: 6 },
      { id: 'ge8', source: 'N5', target: 'N6', weight: 2 },
      { id: 'ge9', source: 'N5', target: 'N8', weight: 3 },
      { id: 'ge10', source: 'N6', target: 'N9', weight: 1 },
      { id: 'ge11', source: 'N7', target: 'N8', weight: 2 },
      { id: 'ge12', source: 'N8', target: 'N9', weight: 4 }
    ],
    startNode: 'N1',
    targetNode: 'N9'
  }
};

export default function App() {
  // Graph Data State
  const [nodes, setNodes] = useState(PRESETS.CITY_NETWORK.nodes);
  const [edges, setEdges] = useState(PRESETS.CITY_NETWORK.edges);
  const [startNode, setStartNode] = useState(PRESETS.CITY_NETWORK.startNode);
  const [targetNode, setTargetNode] = useState(PRESETS.CITY_NETWORK.targetNode);
  
  // Selection & Canvas State
  const [selectedNode, setSelectedNode] = useState(null);
  const [edgeSource, setEdgeSource] = useState(null);
  const [mode, setMode] = useState('select'); // 'select', 'addNode', 'addEdge', 'delete'
  const [algorithm, setAlgorithm] = useState('dijkstra'); // 'dijkstra' | 'astar'

  // Animation & Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const [speed, setSpeed] = useState(600); // ms per step
  const [log, setLog] = useState([]);
  
  // UI Tabs / Modals
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'logs' | 'docs'
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Dragging support
  const [draggingNode, setDraggingNode] = useState(null);
  const canvasRef = useRef(null);

  // --- ALGORITHM EXECUTION (Dijkstra & A*) ---
  const calculateEuclideanHeuristic = (nodeA, nodeB) => {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    // Scale distance to match relative edge weights
    return Math.round(Math.sqrt(dx * dx + dy * dy) / 40);
  };

  const generateAlgorithmSteps = useCallback(() => {
    if (!startNode || !targetNode) return;

    const newSteps = [];
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    const gScores = {}; // for A*
    const fScores = {}; // for A*

    nodes.forEach(n => {
      distances[n.id] = Infinity;
      gScores[n.id] = Infinity;
      fScores[n.id] = Infinity;
      previous[n.id] = null;
      unvisited.add(n.id);
    });

    distances[startNode] = 0;
    gScores[startNode] = 0;
    
    const targetNodeObj = nodes.find(n => n.id === targetNode);
    const startNodeObj = nodes.find(n => n.id === startNode);
    
    if (algorithm === 'astar' && targetNodeObj && startNodeObj) {
      fScores[startNode] = calculateEuclideanHeuristic(startNodeObj, targetNodeObj);
    }

    const visitedOrder = [];
    const stepLogs = [];

    stepLogs.push(`Initialized ${algorithm.toUpperCase()} algorithm from ${startNode} to ${targetNode}.`);
    newSteps.push({
      visited: [],
      current: null,
      distances: { ...distances },
      previous: { ...previous },
      path: [],
      activeEdge: null,
      message: `Starting node ${startNode} initialized with distance 0.`
    });

    while (unvisited.size > 0) {
      // Pick node with minimum distance (or min fScore for A*)
      let current = null;
      let minVal = Infinity;

      unvisited.forEach(nodeId => {
        const val = algorithm === 'dijkstra' ? distances[nodeId] : fScores[nodeId];
        if (val < minVal) {
          minVal = val;
          current = nodeId;
        }
      });

      if (current === null || distances[current] === Infinity) {
        stepLogs.push("Target unreachable or remaining nodes disconnected.");
        break;
      }

      unvisited.delete(current);
      visitedOrder.push(current);

      newSteps.push({
        visited: [...visitedOrder],
        current: current,
        distances: { ...distances },
        previous: { ...previous },
        path: [],
        activeEdge: null,
        message: `Visiting Node ${current} (Current Min Distance/Score: ${distances[current]})`
      });

      if (current === targetNode) {
        stepLogs.push(`Target node ${targetNode} reached! Reconstructing shortest path.`);
        break;
      }

      // Check neighbors
      const neighborEdges = edges.filter(e => e.source === current || e.target === current);

      for (let edge of neighborEdges) {
        const neighborId = edge.source === current ? edge.target : edge.source;
        
        if (unvisited.has(neighborId)) {
          const tentativeG = distances[current] + edge.weight;

          newSteps.push({
            visited: [...visitedOrder],
            current: current,
            distances: { ...distances },
            previous: { ...previous },
            path: [],
            activeEdge: edge.id,
            message: `Evaluating edge ${current} -> ${neighborId} (Weight: ${edge.weight})`
          });

          if (tentativeG < distances[neighborId]) {
            distances[neighborId] = tentativeG;
            previous[neighborId] = current;
            
            if (algorithm === 'astar') {
              const neighborObj = nodes.find(n => n.id === neighborId);
              const h = calculateEuclideanHeuristic(neighborObj, targetNodeObj);
              fScores[neighborId] = tentativeG + h;
            }

            newSteps.push({
              visited: [...visitedOrder],
              current: current,
              distances: { ...distances },
              previous: { ...previous },
              path: [],
              activeEdge: edge.id,
              message: `Updated distance for ${neighborId}: ${tentativeG}`
            });
          }
        }
      }
    }

    // Reconstruct final path
    const shortestPath = [];
    let curr = targetNode;
    if (previous[curr] || curr === startNode) {
      while (curr) {
        shortestPath.unshift(curr);
        curr = previous[curr];
      }
    }

    newSteps.push({
      visited: [...visitedOrder],
      current: null,
      distances: { ...distances },
      previous: { ...previous },
      path: shortestPath,
      activeEdge: null,
      message: shortestPath.length > 0 
        ? `Shortest Path Found: ${shortestPath.join(' → ')} (Total Cost: ${distances[targetNode]})` 
        : `No valid path exists between ${startNode} and ${targetNode}.`
    });

    setSteps(newSteps);
    setLog(stepLogs);
    setCurrentStepIndex(0);
  }, [nodes, edges, startNode, targetNode, algorithm]);

  // Reset or regenerate steps on graph/algorithm change
  useEffect(() => {
    setIsRunning(false);
    generateAlgorithmSteps();
  }, [nodes, edges, startNode, targetNode, algorithm, generateAlgorithmSteps]);

  // Animation Loop
  useEffect(() => {
    let timer;
    if (isRunning && currentStepIndex < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 1000 - speed);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsRunning(false);
    }
    return () => clearTimeout(timer);
  }, [isRunning, currentStepIndex, steps.length, speed]);

  // Handlers for Canvas Interaction
  const handleCanvasClick = (e) => {
    if (mode !== 'addNode') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const newNodeId = `N${nodes.length + 1}`;
    const newNode = {
      id: newNodeId,
      name: `Node ${newNodeId}`,
      x,
      y,
      color: '#3B82F6'
    };

    setNodes([...nodes, newNode]);
    setMode('select');
  };

  const handleNodeClick = (nodeId, e) => {
    e.stopPropagation();
    if (mode === 'delete') {
      setNodes(nodes.filter(n => n.id !== nodeId));
      setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
      if (startNode === nodeId) setStartNode(null);
      if (targetNode === nodeId) setTargetNode(null);
      return;
    }

    if (mode === 'addEdge') {
      if (!edgeSource) {
        setEdgeSource(nodeId);
      } else if (edgeSource !== nodeId) {
        // Prevent duplicate edge
        const existing = edges.find(
          e => (e.source === edgeSource && e.target === nodeId) || 
               (e.source === nodeId && e.target === edgeSource)
        );
        if (!existing) {
          const newEdge = {
            id: `e_${Date.now()}`,
            source: edgeSource,
            target: nodeId,
            weight: 3
          };
          setEdges([...edges, newEdge]);
        }
        setEdgeSource(null);
        setMode('select');
      }
      return;
    }

    setSelectedNode(nodeId);
  };

  // Node Dragging
  const handleMouseDown = (nodeId, e) => {
    if (mode === 'select') {
      setDraggingNode(nodeId);
    }
  };

  const handleMouseMove = (e) => {
    if (!draggingNode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
    const y = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));

    setNodes(nodes.map(n => n.id === draggingNode ? { ...n, x, y } : n));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  // Preset Loaders
  const loadPreset = (presetKey) => {
    const p = PRESETS[presetKey];
    if (p) {
      setNodes(p.nodes);
      setEdges(p.edges);
      setStartNode(p.startNode);
      setTargetNode(p.targetNode);
      setCurrentStepIndex(0);
      setIsRunning(false);
    }
  };

  // Get Visual State for current step
  const currentStep = steps[currentStepIndex] || {
    visited: [],
    current: null,
    distances: {},
    path: [],
    activeEdge: null,
    message: ''
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* HEADER NAVBAR */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
              GraphPath Pro
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Network Routing & Algorithmic Visualizer
            </p>
          </div>
        </div>

        {/* Algorithm Picker */}
        <div className="flex items-center space-x-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setAlgorithm('dijkstra')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              algorithm === 'dijkstra'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dijkstra
          </button>
          <button
            onClick={() => setAlgorithm('astar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              algorithm === 'astar'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            A* Search
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Algorithm Specs"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR / CONTROL PANEL */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-10 shrink-0 hidden md:flex">
          <div className="p-4 space-y-5 overflow-y-auto">
            {/* Presets Selection */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Presets Topology
              </label>
              <div className="grid grid-cols-1 gap-2">
                {Object.keys(PRESETS).map(key => (
                  <button
                    key={key}
                    onClick={() => loadPreset(key)}
                    className="text-left px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs font-medium text-slate-300 transition hover:border-blue-500/50"
                  >
                    {PRESETS[key].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Controls */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Canvas Tools
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('select')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                    mode === 'select'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" /> Move Node
                </button>
                <button
                  onClick={() => setMode('addNode')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                    mode === 'addNode'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Node
                </button>
                <button
                  onClick={() => { setMode('addEdge'); setEdgeSource(null); }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                    mode === 'addEdge'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" /> Add Edge
                </button>
                <button
                  onClick={() => setMode('delete')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                    mode === 'delete'
                      ? 'bg-red-600/20 border-red-500 text-red-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>

            {/* Routing Endpoints */}
            <div className="space-y-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" /> Route Config
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Start (Source):</span>
                  <select
                    value={startNode || ''}
                    onChange={(e) => setStartNode(e.target.value)}
                    className="bg-slate-800 text-xs text-slate-200 rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.id} ({n.name})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Target (Destination):</span>
                  <select
                    value={targetNode || ''}
                    onChange={(e) => setTargetNode(e.target.value)}
                    className="bg-slate-800 text-xs text-slate-200 rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.id} ({n.name})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Node Details & Weight Editor */}
            {selectedNode && (
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Selected Node: {selectedNode}</span>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
                </div>
                <div className="text-xs text-slate-400">
                  Connected Edges & Weights:
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {edges.filter(e => e.source === selectedNode || e.target === selectedNode).map(edge => {
                    const neighbor = edge.source === selectedNode ? edge.target : edge.source;
                    return (
                      <div key={edge.id} className="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded text-xs">
                        <span className="text-slate-300">Target: {neighbor}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[10px]">W:</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={edge.weight}
                            onChange={(e) => {
                              const w = parseInt(e.target.value) || 1;
                              setEdges(edges.map(item => item.id === edge.id ? { ...item, weight: w } : item));
                            }}
                            className="w-12 bg-slate-800 text-center text-slate-200 rounded border border-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-slate-800 text-center">
            <div className="text-[11px] text-slate-500">
              Built for CS Portfolio & Mobile Porting
            </div>
          </div>
        </div>

        {/* CANVAS CANVAS VISUALIZER */}
        <div className="flex-1 flex flex-col bg-slate-950 relative">
          {/* Top Status Banner */}
          <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-mono">
                {currentStep.message || 'Ready to run algorithm.'}
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-4 text-slate-400">
              <span>Nodes: <strong className="text-slate-200">{nodes.length}</strong></span>
              <span>Edges: <strong className="text-slate-200">{edges.length}</strong></span>
              <span>
                Cost:{' '}
                <strong className="text-emerald-400">
                  {currentStep.distances[targetNode] !== undefined && currentStep.distances[targetNode] !== Infinity
                    ? currentStep.distances[targetNode]
                    : '∞'}
                </strong>
              </span>
            </div>
          </div>

          {/* Interactive Graph Canvas */}
          <div 
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="flex-1 relative overflow-hidden cursor-crosshair bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
          >
            {/* SVG Layer for Edges */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </defs>

              {edges.map(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNodeObj = nodes.find(n => n.id === edge.target);

                if (!sourceNode || !targetNodeObj) return null;

                // Check edge highlight status
                const isPathEdge = currentStep.path.length > 0 && 
                  currentStep.path.some((nid, idx) => {
                    if (idx === 0) return false;
                    const prev = currentStep.path[idx - 1];
                    return (prev === edge.source && nid === edge.target) || 
                           (prev === edge.target && nid === edge.source);
                  });

                const isActiveEvaluated = currentStep.activeEdge === edge.id;

                let strokeColor = '#334155'; // default slate-700
                let strokeWidth = 2;

                if (isPathEdge) {
                  strokeColor = '#10B981'; // emerald-500
                  strokeWidth = 4;
                } else if (isActiveEvaluated) {
                  strokeColor = '#F59E0B'; // amber-500
                  strokeWidth = 3;
                }

                // Midpoint for weight text label
                const midX = (sourceNode.x + targetNodeObj.x) / 2;
                const midY = (sourceNode.y + targetNodeObj.y) / 2;

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNodeObj.x}
                      y2={targetNodeObj.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isActiveEvaluated ? '4' : 'none'}
                      className="transition-all duration-300"
                    />
                    <circle cx={midX} cy={midY} r="11" fill="#0f172a" stroke={strokeColor} strokeWidth="1" />
                    <text
                      x={midX}
                      y={midY + 4}
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {edge.weight}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* HTML Layer for Rendered Nodes */}
            {nodes.map(node => {
              const isStart = node.id === startNode;
              const isTarget = node.id === targetNode;
              const isCurrent = currentStep.current === node.id;
              const isVisited = currentStep.visited.includes(node.id);
              const isInPath = currentStep.path.includes(node.id);

              let nodeBg = 'bg-slate-800 border-slate-600 text-slate-200';

              if (isStart) {
                nodeBg = 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50 ring-2 ring-blue-400';
              } else if (isTarget) {
                nodeBg = 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400';
              } else if (isInPath) {
                nodeBg = 'bg-emerald-500 border-emerald-300 text-white shadow-md';
              } else if (isCurrent) {
                nodeBg = 'bg-amber-500 border-amber-300 text-slate-950 font-bold scale-110 shadow-lg shadow-amber-500/50';
              } else if (isVisited) {
                nodeBg = 'bg-indigo-900/80 border-indigo-500 text-indigo-200';
              }

              const distVal = currentStep.distances[node.id];

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onClick={(e) => handleNodeClick(node.id, e)}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 select-none ${nodeBg}`}
                >
                  <span className="text-xs font-bold leading-none">{node.id}</span>
                  <span className="text-[9px] opacity-75 mt-0.5 font-mono">
                    {distVal === Infinity || distVal === undefined ? '∞' : distVal}
                  </span>

                  {/* Node Label Tooltip */}
                  <div className="absolute top-12 whitespace-nowrap px-1.5 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-[10px] text-slate-300 pointer-events-none">
                    {node.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTTOM PLAYBACK CONTROLS BAR */}
          <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Playback Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                disabled={steps.length <= 1}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? 'Pause' : 'Play Execution'}
              </button>

              <button
                onClick={() => {
                  setIsRunning(false);
                  setCurrentStepIndex(0);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                title="Reset Animation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsRunning(false);
                  setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
                }}
                disabled={currentStepIndex >= steps.length - 1}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition disabled:opacity-50"
                title="Step Forward"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress Slider */}
            <div className="flex-1 max-w-xs mx-2 flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">
                {currentStepIndex + 1}/{steps.length || 1}
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(0, steps.length - 1)}
                value={currentStepIndex}
                onChange={(e) => {
                  setIsRunning(false);
                  setCurrentStepIndex(parseInt(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Speed Control Slider */}
            <div className="flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-400">Speed:</span>
              <input
                type="range"
                min="100"
                max="950"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* INFO / EXPLANATION MODAL */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" /> Algorithm Specifications
              </h3>
              <button 
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <div>
                <h4 className="font-bold text-blue-400 mb-1">Dijkstra's Algorithm</h4>
                <p className="text-slate-400">
                  Guarantees the shortest path in non-negative weighted graphs by systematically expanding the node with the current lowest tentative distance.
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  Time Complexity: O((V + E) log V) with Priority Queue.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="font-bold text-indigo-400 mb-1">A* Search Algorithm</h4>
                <p className="text-slate-400">
                  An informed heuristic search that optimizes search space by calculating <code className="text-amber-300">f(n) = g(n) + h(n)</code>, where <code className="text-amber-300">g(n)</code> is path cost and <code className="text-amber-300">h(n)</code> is Euclidean distance to goal.
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  Time Complexity: Dependent on heuristic quality; up to O(E).
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1">Portfolio & Mobile Portability</h4>
                <p className="text-slate-400">
                  Designed cleanly with modular React hooks and SVG canvas overlay. Ready to wrap with <strong>React Native WebView</strong> or <strong>Capacitor</strong> for iOS/Android App Store distribution.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}