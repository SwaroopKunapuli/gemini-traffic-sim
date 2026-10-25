/**
 * High-Performance Top-Down Interactive 2D Canvas for Traffic Simulation
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TrafficSimulationEngine } from '../simulation/engine';
import {
  distance,
  getQuadraticBezierPoint,
  getRoadLength,
  LANE_WIDTH,
} from '../simulation/network';
import { getSignalStateForRoad } from '../simulation/signals';
import {
  NetworkNode,
  RoadEdge,
  ToolMode,
  VehicleAgent,
} from '../types/traffic';

interface TrafficCanvasProps {
  engine: TrafficSimulationEngine;
  toolMode: ToolMode;
  selectedNodeId: string | null;
  selectedRoadId: string | null;
  selectedVehicleId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectRoad: (roadId: string | null) => void;
  onSelectVehicle: (vehicleId: string | null) => void;
  onAddRoad: (fromNodeId: string, toNodeId: string) => void;
  onAddNode: (x: number, y: number, isIntersection: boolean) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteRoad: (roadId: string) => void;
  showHeatmap: boolean;
  followVehicle: boolean;
}

export const TrafficCanvas: React.FC<TrafficCanvasProps> = ({
  engine,
  toolMode,
  selectedNodeId,
  selectedRoadId,
  selectedVehicleId,
  onSelectNode,
  onSelectRoad,
  onSelectVehicle,
  onAddRoad,
  onAddNode,
  onDeleteNode,
  onDeleteRoad,
  showHeatmap,
  followVehicle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera viewport transform
  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 60, y: 30 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Creation interaction states
  const [roadStartNodeId, setRoadStartNodeId] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Transform helpers
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      return {
        x: wx * zoom + pan.x,
        y: wy * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Follow selected vehicle camera tracking
  useEffect(() => {
    if (!followVehicle || !selectedVehicleId) return;
    const agent = engine.vehicles.get(selectedVehicleId);
    if (!agent) return;

    const pos = engine.getVehicleWorldPos(agent);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const targetPanX = canvas.width / (2 * window.devicePixelRatio) - pos.x * zoom;
    const targetPanY = canvas.height / (2 * window.devicePixelRatio) - pos.y * zoom;

    setPan((p) => ({
      x: p.x + (targetPanX - p.x) * 0.15,
      y: p.y + (targetPanY - p.y) * 0.15,
    }));
  }, [followVehicle, selectedVehicleId, engine, zoom]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear Canvas Background (Dark asphalt grid)
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw subtle background coordinate grid
      drawGrid(ctx, rect.width, rect.height, pan, zoom);

      // Apply camera view
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 1. Draw Roads
      drawRoads(ctx);

      // 2. Draw Intersections
      drawIntersections(ctx);

      // 3. Draw Vehicles
      drawVehicles(ctx);

      // 4. Draw Interactive creation aids (rubber-band road)
      drawCreationOverlays(ctx);

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pan, zoom, selectedNodeId, selectedRoadId, selectedVehicleId, roadStartNodeId, mouseWorldPos, hoveredNodeId, showHeatmap, engine]);

  // Helper: Draw coordinate grid
  function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    p: { x: number; y: number },
    z: number
  ) {
    const gridSize = 50 * z;
    const startX = p.x % gridSize;
    const startY = p.y % gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  // Helper: Draw Road Segments
  function drawRoads(ctx: CanvasRenderingContext2D) {
    const roadsList = Array.from(engine.roads.values());

    roadsList.forEach((road) => {
      const fromNode = engine.nodes.get(road.fromNodeId);
      const toNode = engine.nodes.get(road.toNodeId);
      if (!fromNode || !toNode) return;

      const isSelected = selectedRoadId === road.id;
      const roadWidth = road.lanes * LANE_WIDTH * 1.5;

      // Draw Road Base Surface (Asphalt)
      ctx.beginPath();
      if (road.controlPoint) {
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, toNode.x, toNode.y);
      } else {
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
      }

      ctx.lineCap = 'round';
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155'; // Sky-400 if selected, slate-700
      ctx.lineWidth = roadWidth + (isSelected ? 4 : 2);
      ctx.stroke();

      // Road Inner Asphalt
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = roadWidth;
      ctx.stroke();

      // Congestion Heatmap Overlay
      if (showHeatmap) {
        const vehiclesOnRoad = Array.from(engine.vehicles.values()).filter((v) => v.currentRoadId === road.id);
        const avgSpd =
          vehiclesOnRoad.length > 0
            ? vehiclesOnRoad.reduce((s, v) => s + v.speed * 3.6, 0) / vehiclesOnRoad.length
            : road.speedLimit;
        const speedRatio = Math.min(1, avgSpd / road.speedLimit);

        // Heatmap color: Red (slow) -> Amber -> Green (fast)
        const heatColor =
          speedRatio < 0.3
            ? 'rgba(239, 68, 68, 0.45)' // Red
            : speedRatio < 0.7
            ? 'rgba(245, 158, 11, 0.35)' // Amber
            : 'rgba(16, 185, 129, 0.25)'; // Emerald

        ctx.strokeStyle = heatColor;
        ctx.lineWidth = roadWidth;
        ctx.stroke();
      }

      // Lane Divider Dashed Lines (if multi-lane)
      if (road.lanes > 1) {
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        // Draw divider between lanes
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        for (let l = 1; l < road.lanes; l++) {
          const offset = (l - road.lanes / 2) * (LANE_WIDTH * 1.5);
          ctx.beginPath();
          ctx.moveTo(fromNode.x + nx * offset, fromNode.y + ny * offset);
          ctx.lineTo(toNode.x + nx * offset, toNode.y + ny * offset);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Stop Line before intersection
      if (toNode.isIntersection) {
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const stopDist = 18; // meters before junction center

        const stopX = toNode.x - (dx / len) * stopDist;
        const stopY = toNode.y - (dy / len) * stopDist;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(stopX - nx * (roadWidth / 2), stopY - ny * (roadWidth / 2));
        ctx.lineTo(stopX + nx * (roadWidth / 2), stopY + ny * (roadWidth / 2));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Zebra stripes behind stop line
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        const crossX = toNode.x - (dx / len) * (stopDist + 5);
        const crossY = toNode.y - (dy / len) * (stopDist + 5);
        ctx.beginPath();
        ctx.moveTo(crossX - nx * (roadWidth / 2), crossY - ny * (roadWidth / 2));
        ctx.lineTo(crossX + nx * (roadWidth / 2), crossY + ny * (roadWidth / 2));
        ctx.stroke();
        ctx.restore();
      }

      // Subtle directional arrow on road
      const midT = 0.5;
      const midX = fromNode.x + (toNode.x - fromNode.x) * midT;
      const midY = fromNode.y + (toNode.y - fromNode.y) * midT;
      const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);

      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-4, -3);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  // Helper: Draw Intersections & Signal Heads
  function drawIntersections(ctx: CanvasRenderingContext2D) {
    const roadsList = Array.from(engine.roads.values());

    engine.nodes.forEach((node) => {
      const isSelected = selectedNodeId === node.id;
      const isHovered = hoveredNodeId === node.id;

      if (node.isIntersection) {
        // Draw Intersection Circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? '#94a3b8' : '#475569';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Central Sense-of-Rotation Graphic
        const config = node.intersectionConfig;
        if (config && config.type === 'traffic_light') {
          ctx.save();
          ctx.translate(node.x, node.y);

          // Draw rotation indicator
          if (config.rotationSense === 'clockwise') {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 10, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            // Arrow tip
            ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(8, -4);
            ctx.lineTo(12, -4);
            ctx.closePath();
            ctx.fill();
          } else if (config.rotationSense === 'counter_clockwise') {
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 10, Math.PI / 2, -Math.PI / 2);
            ctx.stroke();
          } else if (config.rotationSense === 'opposing_pairs') {
            // Dual parallel arrows
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(0, 9);
            ctx.stroke();
          }

          // Remaining timer text in center
          let remaining = 0;
          if (config.subPhase === 'green') {
            remaining = Math.max(0, config.greenDuration - config.phaseTimer);
          } else if (config.subPhase === 'yellow') {
            remaining = Math.max(0, config.yellowDuration - config.phaseTimer);
          } else {
            remaining = Math.max(0, config.allRedDuration - config.phaseTimer);
          }

          ctx.fillStyle = config.subPhase === 'green' ? '#4ade80' : config.subPhase === 'yellow' ? '#facc15' : '#f87171';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(Math.ceil(remaining).toString(), 0, 0);
          ctx.restore();

          // Draw Approach Signal Heads on each incoming road
          const incomingRoads = roadsList.filter((r) => r.toNodeId === node.id);
          incomingRoads.forEach((road) => {
            const fromNode = engine.nodes.get(road.fromNodeId);
            if (!fromNode) return;

            const dx = node.x - fromNode.x;
            const dy = node.y - fromNode.y;
            const len = Math.hypot(dx, dy) || 1;
            const signalDist = 24; // distance from junction center
            const sx = node.x - (dx / len) * signalDist;
            const sy = node.y - (dy / len) * signalDist;

            const lightState = getSignalStateForRoad(node, road.id, roadsList, engine.nodes);

            // Signal head circular housing
            ctx.beginPath();
            ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Glowing light lamp
            const lampColor =
              lightState === 'green'
                ? '#22c55e'
                : lightState === 'yellow'
                ? '#eab308'
                : '#ef4444';

            ctx.beginPath();
            ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
            ctx.fillStyle = lampColor;
            ctx.shadowColor = lampColor;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          });
        } else if (config?.type === 'roundabout') {
          // Roundabout central island
          ctx.beginPath();
          ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#065f46'; // dark green island
          ctx.fill();
        }

        ctx.restore();
      } else {
        // Simple Endpoint / Gateway Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#38bdf8' : isHovered ? '#cbd5e1' : '#64748b';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  // Helper: Draw Vehicle Agents
  function drawVehicles(ctx: CanvasRenderingContext2D) {
    const flashTimer = (Date.now() / 300) % 2 > 1; // 300ms blink rate

    engine.vehicles.forEach((agent) => {
      const transform = engine.getVehicleWorldPos(agent);
      const isSelected = selectedVehicleId === agent.id;

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.angle);

      // 1. Headlights Beam
      ctx.save();
      const beamGrad = ctx.createRadialGradient(agent.length / 2, 0, 2, agent.length / 2 + 18, 0, 22);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(agent.length / 2, -agent.width / 2);
      ctx.lineTo(agent.length / 2 + 22, -agent.width - 4);
      ctx.lineTo(agent.length / 2 + 22, agent.width + 4);
      ctx.lineTo(agent.length / 2, agent.width / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. Selection Ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, agent.length * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Vehicle Body Chassis
      ctx.beginPath();
      const halfL = agent.length / 2;
      const halfW = agent.width / 2;
      const radius = 1.2;

      ctx.roundRect(-halfL, -halfW, agent.length, agent.width, radius);
      ctx.fillStyle = agent.color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Windshield & Roof details
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      if (agent.type === 'sedan' || agent.type === 'suv') {
        // Front windshield
        ctx.fillRect(-halfL * 0.3, -halfW * 0.75, halfL * 0.45, halfW * 1.5);
        // Rear window
        ctx.fillRect(-halfL * 0.75, -halfW * 0.7, halfL * 0.3, halfW * 1.4);
      } else if (agent.type === 'bus') {
        // Bus passenger windows
        for (let i = -halfL * 0.7; i < halfL * 0.7; i += 2.2) {
          ctx.fillRect(i, -halfW * 0.85, 1.4, halfW * 1.7);
        }
      }

      // 4. Glowing Red Brake Lights
      if (agent.brakeLight) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 6;
        ctx.fillRect(-halfL - 0.4, -halfW, 0.8, 1.2);
        ctx.fillRect(-halfL - 0.4, halfW - 1.2, 0.8, 1.2);
        ctx.shadowBlur = 0;
      }

      // 5. Flashing Amber Turn Indicators
      if (agent.turnSignal !== 'none' && flashTimer) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 5;
        const yOffset = agent.turnSignal === 'left' ? -halfW : halfW - 1.0;
        // Front blinker
        ctx.fillRect(halfL - 0.8, yOffset, 1.0, 1.0);
        // Rear blinker
        ctx.fillRect(-halfL, yOffset, 1.0, 1.0);
        ctx.shadowBlur = 0;
      }

      // 6. Emergency Siren Strobe (Ambulance)
      if (agent.sirenActive) {
        const sirenColor = flashTimer ? '#3b82f6' : '#ef4444';
        ctx.fillStyle = sirenColor;
        ctx.shadowColor = sirenColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    });
  }

  // Helper: Draw creation previews (Rubber-banding road)
  function drawCreationOverlays(ctx: CanvasRenderingContext2D) {
    if (toolMode === 'add_road' && roadStartNodeId) {
      const startNode = engine.nodes.get(roadStartNodeId);
      if (startNode) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();

        // Distance marker
        const dist = Math.round(distance(startNode, mouseWorldPos));
        const midX = (startNode.x + mouseWorldPos.x) / 2;
        const midY = (startNode.y + mouseWorldPos.y) / 2;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(midX - 18, midY - 9, 36, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${dist}m`, midX, midY);
        ctx.restore();
      }
    }
  }

  // Canvas Mouse & Interaction Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (e.button === 1 || e.shiftKey || toolMode === 'pan') {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button === 0) {
      // Find clicked node
      const clickedNode = Array.from(engine.nodes.values()).find(
        (n) => distance(n, world) <= (n.isIntersection ? 24 : 14)
      );

      // Find clicked road
      const clickedRoad = Array.from(engine.roads.values()).find((r) => {
        const fn = engine.nodes.get(r.fromNodeId);
        const tn = engine.nodes.get(r.toNodeId);
        if (!fn || !tn) return false;
        const total = distance(fn, tn);
        const d1 = distance(fn, world);
        const d2 = distance(world, tn);
        return d1 + d2 <= total + 4;
      });

      // Find clicked vehicle
      const clickedVehicle = Array.from(engine.vehicles.values()).find((v) => {
        const pos = engine.getVehicleWorldPos(v);
        return distance(pos, world) <= v.length + 3;
      });

      if (toolMode === 'select') {
        if (clickedVehicle) {
          onSelectVehicle(clickedVehicle.id);
          onSelectNode(null);
          onSelectRoad(null);
        } else if (clickedNode) {
          onSelectNode(clickedNode.id);
          onSelectVehicle(null);
          onSelectRoad(null);
        } else if (clickedRoad) {
          onSelectRoad(clickedRoad.id);
          onSelectNode(null);
          onSelectVehicle(null);
        } else {
          onSelectNode(null);
          onSelectRoad(null);
          onSelectVehicle(null);
        }
      } else if (toolMode === 'add_road') {
        if (roadStartNodeId) {
          if (clickedNode && clickedNode.id !== roadStartNodeId) {
            onAddRoad(roadStartNodeId, clickedNode.id);
            setRoadStartNodeId(null);
          } else if (!clickedNode) {
            // Clicked empty space: create new endpoint and connect
            onAddNode(Math.round(world.x), Math.round(world.y), false);
            // Engine will update nodes, next click can connect
            setRoadStartNodeId(null);
          }
        } else {
          if (clickedNode) {
            setRoadStartNodeId(clickedNode.id);
          } else {
            // Create initial node
            onAddNode(Math.round(world.x), Math.round(world.y), false);
          }
        }
      } else if (toolMode === 'add_junction') {
        onAddNode(Math.round(world.x), Math.round(world.y), true);
      } else if (toolMode === 'spawn_agent') {
        if (clickedRoad) {
          engine.spawnVehicleOnRoad(clickedRoad, false);
        } else {
          engine.spawnVehicleRandom(false);
        }
      } else if (toolMode === 'delete') {
        if (clickedNode) {
          onDeleteNode(clickedNode.id);
        } else if (clickedRoad) {
          onDeleteRoad(clickedRoad.id);
        } else if (clickedVehicle) {
          engine.vehicles.delete(clickedVehicle.id);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    setMouseWorldPos(world);

    if (isDraggingRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    // Node hovering
    const hovered = Array.from(engine.nodes.values()).find(
      (n) => distance(n, world) <= (n.isIntersection ? 24 : 14)
    );
    setHoveredNodeId(hovered ? hovered.id : null);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newZoom = Math.max(0.3, Math.min(3.5, zoom * zoomFactor));

    // Zoom centered on cursor
    setPan({
      x: sx - (sx - pan.x) * (newZoom / zoom),
      y: sy - (sy - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating Canvas Controls (Zoom & Center) */}
      <div className="absolute bottom-5 right-5 flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-700/80 rounded-lg backdrop-blur-md shadow-xl text-xs font-mono text-slate-300">
        <button
          onClick={() => setZoom((z) => Math.min(3.5, z * 1.2))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <span className="px-1 text-slate-400 tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <div className="w-px h-4 bg-slate-700 mx-0.5" />
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 80, y: 50 });
          }}
          className="px-2.5 h-7 flex items-center justify-center rounded hover:bg-slate-800 transition-colors text-slate-300"
          title="Reset Viewport"
        >
          Reset
        </button>
      </div>

      {/* Tool hint callout */}
      {toolMode === 'add_road' && roadStartNodeId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sky-950/90 border border-sky-500/50 px-4 py-1.5 rounded-full text-xs text-sky-200 backdrop-blur-md shadow-lg pointer-events-none">
          Click target node to connect road, or click empty space to place a new endpoint
        </div>
      )}
    </div>
  );
};
