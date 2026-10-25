/**
 * AgentFlow Traffic Simulation Application
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExportModal } from './components/ExportModal';
import { GuideModal } from './components/GuideModal';
import { JunctionInspector } from './components/JunctionInspector';
import { MetricsBar } from './components/MetricsBar';
import { PresetsModal } from './components/PresetsModal';
import { RoadInspector } from './components/RoadInspector';
import { Toolbar } from './components/Toolbar';
import { TopNav } from './components/TopNav';
import { TrafficCanvas } from './components/TrafficCanvas';
import { VehicleInspector } from './components/VehicleInspector';
import { TrafficSimulationEngine } from './simulation/engine';
import { PRESET_SCENARIOS, PresetScenario } from './simulation/presets';
import {
  NetworkNode,
  RoadEdge,
  SimulationMetrics,
  ToolMode,
} from './types/traffic';

export default function App() {
  const initialPreset = PRESET_SCENARIOS[0];
  const engineRef = useRef<TrafficSimulationEngine>(
    new TrafficSimulationEngine(initialPreset.nodes, initialPreset.roads)
  );
  const engine = engineRef.current;

  // Simulation controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [trafficDensity, setTrafficDensity] = useState<number>(1.0);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [followVehicle, setFollowVehicle] = useState<boolean>(false);

  // Selection states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('center');
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Modals
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Metrics state
  const [metrics, setMetrics] = useState<SimulationMetrics>(() => engine.getMetrics());

  // Force re-render helper for UI panels when engine state changes
  const [, setTickCounter] = useState(0);
  const forceUpdate = useCallback(() => setTickCounter((c) => c + 1), []);

  // Update global spawn multiplier on engine
  useEffect(() => {
    engine.globalSpawnMultiplier = trafficDensity;
  }, [engine, trafficDensity]);

  // Main Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let metricsTimer = 0;

    const loop = (currentTime: number) => {
      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;

      // Clamp deltaMs to prevent huge jumps when tab was in background
      const dt = Math.min(0.1, deltaMs / 1000);

      if (isPlaying) {
        engine.tick(dt * simSpeed);
      }

      // Update metrics every 250ms
      metricsTimer += dt;
      if (metricsTimer >= 0.25) {
        metricsTimer = 0;
        setMetrics(engine.getMetrics());
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [engine, isPlaying, simSpeed]);

  // Tool Handlers
  const handleAddNode = (x: number, y: number, isIntersection: boolean) => {
    const id = (isIntersection ? 'j_' : 'n_') + Math.random().toString(36).substring(2, 7);
    const newNode: NetworkNode = {
      id,
      x,
      y,
      name: isIntersection ? `Junction ${id}` : `Node ${id}`,
      isIntersection,
      ...(isIntersection
        ? {
            intersectionConfig: {
              id,
              type: 'traffic_light',
              greenDuration: 12,
              yellowDuration: 3,
              allRedDuration: 1.5,
              rotationSense: 'clockwise',
              currentPhaseIndex: 0,
              phaseTimer: 0,
              subPhase: 'green',
            },
          }
        : {}),
    };

    engine.nodes.set(id, newNode);
    setSelectedNodeId(id);
    setSelectedRoadId(null);
    setSelectedVehicleId(null);
    forceUpdate();
  };

  const handleAddRoad = (fromId: string, toId: string) => {
    const fromNode = engine.nodes.get(fromId);
    const toNode = engine.nodes.get(toId);
    if (!fromNode || !toNode) return;

    const roadId = `r_${fromId}_${toId}_${Math.random().toString(36).substring(2, 5)}`;
    const newRoad: RoadEdge = {
      id: roadId,
      fromNodeId: fromId,
      toNodeId: toId,
      lanes: 2,
      speedLimit: 50,
      isOneWay: true,
      spawnRate: !fromNode.isIntersection ? 14 : 0,
      name: `${fromNode.name || fromId} → ${toNode.name || toId}`,
    };

    engine.roads.set(roadId, newRoad);
    setSelectedRoadId(roadId);
    setSelectedNodeId(null);
    setSelectedVehicleId(null);
    forceUpdate();
  };

  const handleDeleteNode = (nodeId: string) => {
    engine.nodes.delete(nodeId);
    // Remove connected roads
    const toRemoveRoads: string[] = [];
    engine.roads.forEach((r, rId) => {
      if (r.fromNodeId === nodeId || r.toNodeId === nodeId) {
        toRemoveRoads.push(rId);
      }
    });
    toRemoveRoads.forEach((rId) => engine.roads.delete(rId));

    // Remove orphaned vehicles
    const toRemoveVehicles: string[] = [];
    engine.vehicles.forEach((v, vId) => {
      if (toRemoveRoads.includes(v.currentRoadId)) {
        toRemoveVehicles.push(vId);
      }
    });
    toRemoveVehicles.forEach((vId) => engine.vehicles.delete(vId));

    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    forceUpdate();
  };

  const handleDeleteRoad = (roadId: string) => {
    engine.roads.delete(roadId);
    // Remove vehicles on this road
    const toRemoveVehicles: string[] = [];
    engine.vehicles.forEach((v, vId) => {
      if (v.currentRoadId === roadId) {
        toRemoveVehicles.push(vId);
      }
    });
    toRemoveVehicles.forEach((vId) => engine.vehicles.delete(vId));

    if (selectedRoadId === roadId) setSelectedRoadId(null);
    forceUpdate();
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    engine.resetNetwork(preset.nodes, preset.roads);
    const firstJunction = preset.nodes.find((n) => n.isIntersection);
    setSelectedNodeId(firstJunction ? firstJunction.id : null);
    setSelectedRoadId(null);
    setSelectedVehicleId(null);
    forceUpdate();
  };

  const handleNewNetwork = () => {
    // Fresh blank starter layout with 1 junction and 4 incoming/outgoing roads
    const blankPreset: PresetScenario = {
      id: 'blank',
      name: 'Custom Intersection Sandbox',
      description: 'Start fresh with an editable 4-way junction.',
      nodes: [
        {
          id: 'j_main',
          x: 400,
          y: 350,
          isIntersection: true,
          name: 'Main Junction',
          intersectionConfig: {
            id: 'j_main',
            type: 'traffic_light',
            greenDuration: 10,
            yellowDuration: 3,
            allRedDuration: 1,
            rotationSense: 'clockwise',
            currentPhaseIndex: 0,
            phaseTimer: 0,
            subPhase: 'green',
          },
        },
        { id: 'ep_n', x: 400, y: 100, isIntersection: false, name: 'North Gate' },
        { id: 'ep_s', x: 400, y: 600, isIntersection: false, name: 'South Gate' },
        { id: 'ep_w', x: 150, y: 350, isIntersection: false, name: 'West Gate' },
        { id: 'ep_e', x: 650, y: 350, isIntersection: false, name: 'East Gate' },
      ],
      roads: [
        { id: 'r_n_j', fromNodeId: 'ep_n', toNodeId: 'j_main', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 15, name: 'Northbound In' },
        { id: 'r_j_n', fromNodeId: 'j_main', toNodeId: 'ep_n', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Northbound Out' },
        { id: 'r_s_j', fromNodeId: 'ep_s', toNodeId: 'j_main', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 15, name: 'Southbound In' },
        { id: 'r_j_s', fromNodeId: 'j_main', toNodeId: 'ep_s', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Southbound Out' },
        { id: 'r_w_j', fromNodeId: 'ep_w', toNodeId: 'j_main', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 15, name: 'Eastbound In' },
        { id: 'r_j_w', fromNodeId: 'j_main', toNodeId: 'ep_w', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Westbound Out' },
        { id: 'r_e_j', fromNodeId: 'ep_e', toNodeId: 'j_main', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 15, name: 'Westbound In' },
        { id: 'r_j_e', fromNodeId: 'j_main', toNodeId: 'ep_e', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Eastbound Out' },
      ],
    };
    handleSelectPreset(blankPreset);
  };

  const handleImportNetwork = (nodes: NetworkNode[], roads: RoadEdge[]) => {
    engine.resetNetwork(nodes, roads);
    const firstJ = nodes.find((n) => n.isIntersection);
    setSelectedNodeId(firstJ ? firstJ.id : null);
    setSelectedRoadId(null);
    setSelectedVehicleId(null);
    forceUpdate();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Top Navigation Bar */}
      <TopNav
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onExport={() => setIsExportOpen(true)}
        onNewNetwork={handleNewNetwork}
      />

      {/* 2. Simulation & Design Toolbar */}
      <Toolbar
        toolMode={toolMode}
        onSetToolMode={(mode) => setToolMode(mode)}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          if (!isPlaying) {
            engine.tick(0.1);
            forceUpdate();
          }
        }}
        simSpeed={simSpeed}
        onSetSimSpeed={(s) => setSimSpeed(s)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        trafficDensity={trafficDensity}
        onSetTrafficDensity={(d) => setTrafficDensity(d)}
        onSpawnEmergency={() => {
          engine.spawnEmergencyRequested = true;
          forceUpdate();
        }}
        onClearVehicles={() => {
          engine.clearVehicles();
          setSelectedVehicleId(null);
          forceUpdate();
        }}
      />

      {/* 3. Main Stage: Interactive Canvas & Floating Inspector Deck */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <TrafficCanvas
          engine={engine}
          toolMode={toolMode}
          selectedNodeId={selectedNodeId}
          selectedRoadId={selectedRoadId}
          selectedVehicleId={selectedVehicleId}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            if (id) {
              setSelectedRoadId(null);
              setSelectedVehicleId(null);
            }
          }}
          onSelectRoad={(id) => {
            setSelectedRoadId(id);
            if (id) {
              setSelectedNodeId(null);
              setSelectedVehicleId(null);
            }
          }}
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            if (id) {
              setSelectedNodeId(null);
              setSelectedRoadId(null);
            }
          }}
          onAddRoad={handleAddRoad}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onDeleteRoad={handleDeleteRoad}
          showHeatmap={showHeatmap}
          followVehicle={followVehicle}
        />

        {/* Floating Inspector Panel (Top Right) */}
        <div className="absolute top-4 right-4 z-20 pointer-events-auto">
          {selectedNodeId && engine.nodes.get(selectedNodeId)?.isIntersection && (
            <JunctionInspector
              nodeId={selectedNodeId}
              engine={engine}
              onClose={() => setSelectedNodeId(null)}
              onUpdate={forceUpdate}
            />
          )}

          {selectedRoadId && engine.roads.has(selectedRoadId) && (
            <RoadInspector
              roadId={selectedRoadId}
              engine={engine}
              onClose={() => setSelectedRoadId(null)}
              onUpdate={forceUpdate}
              onDelete={() => handleDeleteRoad(selectedRoadId)}
            />
          )}

          {selectedVehicleId && engine.vehicles.has(selectedVehicleId) && (
            <VehicleInspector
              vehicleId={selectedVehicleId}
              engine={engine}
              followVehicle={followVehicle}
              onToggleFollow={() => setFollowVehicle(!followVehicle)}
              onClose={() => {
                setSelectedVehicleId(null);
                setFollowVehicle(false);
              }}
              onRemove={() => {
                engine.vehicles.delete(selectedVehicleId);
                setSelectedVehicleId(null);
                setFollowVehicle(false);
                forceUpdate();
              }}
            />
          )}
        </div>
      </main>

      {/* 4. Bottom Real-Time Analytics Bar */}
      <MetricsBar metrics={metrics} />

      {/* Modals */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        engine={engine}
        onImportNetwork={handleImportNetwork}
      />
    </div>
  );
}
