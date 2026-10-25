/**
 * Agent-Based Traffic Simulation Engine
 */
import {
  DriverPersonality,
  NetworkNode,
  RoadEdge,
  SimulationMetrics,
  VehicleAgent,
  VehicleType,
} from '../types/traffic';
import {
  calculateIDMAcceleration,
  DRIVER_PROFILES,
  shouldChangeLane,
  shouldStopForYellow,
} from './idm';
import {
  distance,
  findShortestPath,
  getQuadraticBezierPoint,
  getQuadraticBezierTangent,
  getRoadLength,
  getVehicleWorldTransform,
  LANE_WIDTH,
  Point,
} from './network';
import { getSignalStateForRoad, updateIntersectionSignals } from './signals';

const VEHICLE_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
  '#06B6D4', // Cyan
  '#E2E8F0', // White/Silver
];

export class TrafficSimulationEngine {
  nodes: Map<string, NetworkNode> = new Map();
  roads: Map<string, RoadEdge> = new Map();
  vehicles: Map<string, VehicleAgent> = new Map();

  // Metrics tracking
  totalCompletedTrips = 0;
  totalTripsWaitTime = 0;
  completedTripTimestamps: number[] = [];
  speedHistory: number[] = [];
  throughputHistory: number[] = [];

  // Spawner tracking
  spawnTimers: Map<string, number> = new Map(); // roadId -> accumulated time
  globalSpawnMultiplier = 1.0;
  spawnEmergencyRequested = false;

  constructor(nodes: NetworkNode[], roads: RoadEdge[]) {
    this.resetNetwork(nodes, roads);
  }

  resetNetwork(nodes: NetworkNode[], roads: RoadEdge[]) {
    this.nodes.clear();
    this.roads.clear();
    this.vehicles.clear();
    this.spawnTimers.clear();
    this.completedTripTimestamps = [];
    this.speedHistory = [];
    this.throughputHistory = [];
    this.totalCompletedTrips = 0;
    this.totalTripsWaitTime = 0;

    nodes.forEach((n) => this.nodes.set(n.id, { ...n }));
    roads.forEach((r) => this.roads.set(r.id, { ...r }));
  }

  clearVehicles() {
    this.vehicles.clear();
  }

  /**
   * Main simulation tick.
   * @param dt Elapsed real seconds (multiplied by speed factor)
   */
  tick(dt: number) {
    if (dt <= 0) return;

    // 1. Calculate incoming road queues for traffic signals
    const queuesByRoad = this.calculateQueues();

    // 2. Update all intersection signal controllers
    const roadsList = Array.from(this.roads.values());
    this.nodes.forEach((node) => {
      if (node.isIntersection && node.intersectionConfig) {
        updateIntersectionSignals(node, roadsList, this.nodes, queuesByRoad, dt);
      }
    });

    // 3. Spawn vehicles at entrances
    this.handleSpawning(dt);

    // 4. Update each vehicle agent's behavior and position
    this.updateVehicles(dt);

    // 5. Update metrics
    this.updateMetrics();
  }

  calculateQueues(): Map<string, number> {
    const map = new Map<string, number>();
    this.roads.forEach((r) => map.set(r.id, 0));

    this.vehicles.forEach((v) => {
      if (!v.inIntersection && v.speed < 2.0) {
        const road = this.roads.get(v.currentRoadId);
        if (road) {
          const fromNode = this.nodes.get(road.fromNodeId);
          const toNode = this.nodes.get(road.toNodeId);
          if (fromNode && toNode) {
            const len = getRoadLength(road, fromNode, toNode);
            // Queued if within 60m of stop line
            if (v.positionAlongRoad > len - 60) {
              map.set(road.id, (map.get(road.id) || 0) + 1);
            }
          }
        }
      }
    });

    return map;
  }

  handleSpawning(dt: number) {
    // Check emergency ambulance request
    if (this.spawnEmergencyRequested) {
      this.spawnEmergencyRequested = false;
      this.spawnVehicleRandom(true);
    }

    const roadsList = Array.from(this.roads.values()).filter((r) => r.spawnRate > 0);
    roadsList.forEach((road) => {
      const fromNode = this.nodes.get(road.fromNodeId);
      const toNode = this.nodes.get(road.toNodeId);
      if (!fromNode || !toNode) return;

      const ratePerMinute = road.spawnRate * this.globalSpawnMultiplier;
      if (ratePerMinute <= 0) return;

      const intervalSeconds = 60 / ratePerMinute;
      let timer = (this.spawnTimers.get(road.id) || 0) + dt;

      if (timer >= intervalSeconds) {
        timer -= intervalSeconds;

        // Check if lane 0 entry has sufficient space
        const hasBlocker = Array.from(this.vehicles.values()).some(
          (v) => v.currentRoadId === road.id && v.positionAlongRoad < 14
        );

        if (!hasBlocker) {
          this.spawnVehicleOnRoad(road, false);
        }
      }
      this.spawnTimers.set(road.id, timer);
    });
  }

  spawnVehicleOnRoad(road: RoadEdge, isEmergency = false): VehicleAgent | null {
    const personalities: DriverPersonality[] = isEmergency
      ? ['emergency']
      : ['cautious', 'normal', 'normal', 'aggressive'];
    const p = personalities[Math.floor(Math.random() * personalities.length)];
    const profile = DRIVER_PROFILES[p];

    const types: VehicleType[] = isEmergency
      ? ['ambulance']
      : ['sedan', 'sedan', 'suv', 'truck', 'bus', 'motorcycle'];
    const type = types[Math.floor(Math.random() * types.length)];

    let length = 4.6;
    let width = 2.0;
    if (type === 'bus') {
      length = 10.0;
      width = 2.5;
    } else if (type === 'truck') {
      length = 8.5;
      width = 2.4;
    } else if (type === 'motorcycle') {
      length = 2.2;
      width = 1.0;
    } else if (type === 'ambulance') {
      length = 6.0;
      width = 2.2;
    }

    const color = isEmergency
      ? '#FFFFFF'
      : VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];

    // Pick random target node from other endpoints
    const otherNodes = Array.from(this.nodes.values()).filter((n) => n.id !== road.fromNodeId);
    const destNode = otherNodes[Math.floor(Math.random() * otherNodes.length)];
    const path = destNode
      ? findShortestPath(road.toNodeId, destNode.id, Array.from(this.roads.values()), this.nodes)
      : [];

    const agent: VehicleAgent = {
      id: 'veh_' + Math.random().toString(36).substring(2, 9),
      type,
      personality: p,
      profile,
      color,
      length,
      width,
      currentRoadId: road.id,
      laneIndex: Math.floor(Math.random() * road.lanes),
      positionAlongRoad: 1.0,
      speed: (profile.desiredSpeed * 0.7) / 3.6, // start at 70% speed
      acceleration: 0,
      originNodeId: road.fromNodeId,
      destinationNodeId: destNode ? destNode.id : '',
      routeRoadIds: [road.id, ...path],
      routeIndex: 0,
      turnSignal: 'none',
      brakeLight: false,
      sirenActive: isEmergency,
      inIntersection: false,
      turnProgress: 0,
      totalWaitTime: 0,
      totalTripTime: 0,
      distanceTraveled: 0,
    };

    this.vehicles.set(agent.id, agent);
    return agent;
  }

  spawnVehicleRandom(isEmergency = false) {
    const roadsList = Array.from(this.roads.values());
    if (roadsList.length === 0) return;
    const road = roadsList[Math.floor(Math.random() * roadsList.length)];
    this.spawnVehicleOnRoad(road, isEmergency);
  }

  updateVehicles(dt: number) {
    const roadsList = Array.from(this.roads.values());
    const vehiclesList = Array.from(this.vehicles.values());

    vehiclesList.forEach((agent) => {
      agent.totalTripTime += dt;
      if (agent.speed < 0.5) {
        agent.totalWaitTime += dt;
      }

      // Check intersection turn execution
      if (agent.inIntersection) {
        this.updateIntersectionTurn(agent, dt);
        return;
      }

      const road = this.roads.get(agent.currentRoadId);
      if (!road) {
        this.vehicles.delete(agent.id);
        return;
      }

      const fromNode = this.nodes.get(road.fromNodeId);
      const toNode = this.nodes.get(road.toNodeId);
      if (!fromNode || !toNode) {
        this.vehicles.delete(agent.id);
        return;
      }

      const roadLength = getRoadLength(road, fromNode, toNode);

      // --- 1. Find leading vehicle in same lane ---
      let leadGap: number | null = null;
      let leadSpeed = 0;

      vehiclesList.forEach((other) => {
        if (other.id === agent.id) return;
        if (other.currentRoadId === agent.currentRoadId && other.laneIndex === agent.laneIndex) {
          const gap = other.positionAlongRoad - other.length - agent.positionAlongRoad;
          if (gap > 0) {
            if (leadGap === null || gap < leadGap) {
              leadGap = gap;
              leadSpeed = other.speed;
            }
          }
        }
      });

      // --- 2. Check traffic signal / stop line at end of road ---
      const distToStopLine = Math.max(0, roadLength - agent.positionAlongRoad);

      if (toNode.isIntersection) {
        const signalState = getSignalStateForRoad(toNode, road.id, roadsList, this.nodes);

        if (distToStopLine < 70) {
          if (signalState === 'red') {
            // Virtual stationary barrier at stop line
            if (leadGap === null || distToStopLine < leadGap) {
              leadGap = distToStopLine;
              leadSpeed = 0;
            }
          } else if (signalState === 'yellow') {
            const mustStop = shouldStopForYellow(agent.speed, distToStopLine, agent.profile);
            if (mustStop) {
              if (leadGap === null || distToStopLine < leadGap) {
                leadGap = distToStopLine;
                leadSpeed = 0;
              }
            }
          } else if (toNode.intersectionConfig?.type === 'roundabout' || toNode.intersectionConfig?.type === 'priority_yield') {
            // Yield check: inspect if any car is currently circulating or crossing
            const isConflict = this.hasConflictingTrafficInIntersection(toNode, agent);
            if (isConflict && distToStopLine < 25) {
              if (leadGap === null || distToStopLine < leadGap) {
                leadGap = distToStopLine;
                leadSpeed = 0;
              }
            }
          }
        }
      }

      // --- 3. Evaluate Lane Change if multi-lane ---
      if (road.lanes > 1 && !agent.inIntersection) {
        const canLeft = agent.laneIndex < road.lanes - 1;
        const canRight = agent.laneIndex > 0;
        const targetLane = canLeft ? agent.laneIndex + 1 : canRight ? agent.laneIndex - 1 : null;

        if (targetLane !== null) {
          // Check target lane gaps
          let targetGapFront: number | null = null;
          let targetFrontSpeed = 0;
          let targetGapBack: number | null = null;
          let targetBackSpeed = 0;

          vehiclesList.forEach((other) => {
            if (other.id === agent.id) return;
            if (other.currentRoadId === road.id && other.laneIndex === targetLane) {
              const gap = other.positionAlongRoad - agent.positionAlongRoad;
              if (gap > 0 && (targetGapFront === null || gap < targetGapFront)) {
                targetGapFront = gap - other.length;
                targetFrontSpeed = other.speed;
              } else if (gap < 0 && (targetGapBack === null || Math.abs(gap) < targetGapBack)) {
                targetGapBack = Math.abs(gap) - agent.length;
                targetBackSpeed = other.speed;
              }
            }
          });

          if (shouldChangeLane(agent, leadGap, leadSpeed, targetGapFront, targetFrontSpeed, targetGapBack, targetBackSpeed)) {
            agent.laneIndex = targetLane;
          }
        }
      }

      // --- 4. Calculate IDM Acceleration ---
      const desiredSpeedMps = Math.min(agent.profile.desiredSpeed, road.speedLimit) / 3.6;
      const acc = calculateIDMAcceleration(agent.speed, desiredSpeedMps, leadGap, leadSpeed, agent.profile);
      agent.acceleration = acc;

      // Brake light illuminates when decelerating notably
      agent.brakeLight = acc < -0.6;

      // Update turn indicator before intersection
      if (distToStopLine < 45 && toNode.isIntersection) {
        const nextRoad = this.getNextRoadForAgent(agent, toNode);
        if (nextRoad) {
          agent.turnSignal = this.determineTurnSignal(road, nextRoad, fromNode, toNode);
        }
      } else {
        agent.turnSignal = 'none';
      }

      // --- 5. Integrate Velocity & Position ---
      agent.speed = Math.max(0, agent.speed + acc * dt);
      const deltaX = agent.speed * dt;
      agent.positionAlongRoad += deltaX;
      agent.distanceTraveled += deltaX;

      // --- 6. Road End Transition ---
      if (agent.positionAlongRoad >= roadLength) {
        if (!toNode.isIntersection) {
          // Reached destination endpoint / network boundary
          this.recordTripCompletion(agent);
          this.vehicles.delete(agent.id);
        } else {
          // Enter intersection turn maneuver
          this.enterIntersectionTurn(agent, road, toNode);
        }
      }
    });
  }

  determineTurnSignal(
    inRoad: RoadEdge,
    outRoad: RoadEdge,
    fromNode: NetworkNode,
    junctionNode: NetworkNode
  ): 'left' | 'right' | 'none' {
    const toNode = this.nodes.get(outRoad.toNodeId);
    if (!toNode) return 'none';

    // Incoming vector
    const inV = { x: junctionNode.x - fromNode.x, y: junctionNode.y - fromNode.y };
    // Outgoing vector
    const outV = { x: toNode.x - junctionNode.x, y: toNode.y - junctionNode.y };

    // Cross product to find left/right turn
    const cross = inV.x * outV.y - inV.y * outV.x;
    if (cross > 800) return 'right';
    if (cross < -800) return 'left';
    return 'none';
  }

  hasConflictingTrafficInIntersection(junctionNode: NetworkNode, agent: VehicleAgent): boolean {
    // Check if any other vehicle is already in the intersection center
    for (const other of this.vehicles.values()) {
      if (other.id !== agent.id && other.inIntersection) {
        // Approximate distance to junction center
        return true;
      }
    }
    return false;
  }

  getNextRoadForAgent(agent: VehicleAgent, junctionNode: NetworkNode): RoadEdge | null {
    // Check if planned route has a next road
    if (agent.routeIndex + 1 < agent.routeRoadIds.length) {
      const nextId = agent.routeRoadIds[agent.routeIndex + 1];
      const road = this.roads.get(nextId);
      if (road && road.fromNodeId === junctionNode.id) {
        return road;
      }
    }

    // Otherwise select valid outgoing road that doesn't immediately U-turn to previous node
    const outgoing = Array.from(this.roads.values()).filter(
      (r) => r.fromNodeId === junctionNode.id && r.toNodeId !== agent.originNodeId
    );

    if (outgoing.length === 0) {
      // Fallback: any outgoing
      const anyOut = Array.from(this.roads.values()).filter((r) => r.fromNodeId === junctionNode.id);
      return anyOut.length > 0 ? anyOut[0] : null;
    }

    return outgoing[Math.floor(Math.random() * outgoing.length)];
  }

  enterIntersectionTurn(agent: VehicleAgent, currentRoad: RoadEdge, junctionNode: NetworkNode) {
    const nextRoad = this.getNextRoadForAgent(agent, junctionNode);
    if (!nextRoad) {
      this.recordTripCompletion(agent);
      this.vehicles.delete(agent.id);
      return;
    }

    const fromNode = this.nodes.get(currentRoad.fromNodeId)!;
    const nextToNode = this.nodes.get(nextRoad.toNodeId);
    if (!nextToNode) {
      this.recordTripCompletion(agent);
      this.vehicles.delete(agent.id);
      return;
    }

    // Calculate exit point on current road
    const startTransform = getVehicleWorldTransform(
      currentRoad,
      fromNode,
      junctionNode,
      getRoadLength(currentRoad, fromNode, junctionNode),
      agent.laneIndex
    );

    // Calculate entrance point on next road
    const targetLane = Math.min(agent.laneIndex, nextRoad.lanes - 1);
    const endTransform = getVehicleWorldTransform(
      nextRoad,
      junctionNode,
      nextToNode,
      0,
      targetLane
    );

    // Control point for smooth curved turn
    const midX = (startTransform.x + endTransform.x) / 2;
    const midY = (startTransform.y + endTransform.y) / 2;
    // Bias towards junction center
    const controlPoint = {
      x: midX * 0.4 + junctionNode.x * 0.6,
      y: midY * 0.4 + junctionNode.y * 0.6,
    };

    agent.inIntersection = true;
    agent.turnProgress = 0;
    agent.turnStartPos = { x: startTransform.x, y: startTransform.y };
    agent.turnEndPos = { x: endTransform.x, y: endTransform.y };
    agent.turnControlPos = controlPoint;
    agent.currentRoadId = nextRoad.id;
    agent.laneIndex = targetLane;
    agent.routeIndex += 1;
  }

  updateIntersectionTurn(agent: VehicleAgent, dt: number) {
    if (!agent.turnStartPos || !agent.turnEndPos || !agent.turnControlPos) {
      agent.inIntersection = false;
      return;
    }

    // Turn arc length approximation
    const arcLength =
      distance(agent.turnStartPos, agent.turnControlPos) +
      distance(agent.turnControlPos, agent.turnEndPos);
    const speed = Math.max(3.0, agent.speed);

    const progressStep = (speed * dt) / Math.max(1, arcLength);
    agent.turnProgress += progressStep;
    agent.distanceTraveled += speed * dt;

    if (agent.turnProgress >= 1.0) {
      // Completed turn through intersection
      agent.inIntersection = false;
      agent.turnProgress = 0;
      agent.positionAlongRoad = 1.0;
      agent.turnSignal = 'none';
      delete agent.turnStartPos;
      delete agent.turnEndPos;
      delete agent.turnControlPos;
    }
  }

  recordTripCompletion(agent: VehicleAgent) {
    this.totalCompletedTrips++;
    this.totalTripsWaitTime += agent.totalWaitTime;
    this.completedTripTimestamps.push(Date.now());
  }

  updateMetrics() {
    // Keep throughput for last 60 seconds
    const now = Date.now();
    this.completedTripTimestamps = this.completedTripTimestamps.filter((t) => now - t <= 60000);

    const vehiclesList = Array.from(this.vehicles.values());
    const totalSpeed = vehiclesList.reduce((sum, v) => sum + v.speed * 3.6, 0);
    const avgSpeed = vehiclesList.length > 0 ? totalSpeed / vehiclesList.length : 0;

    // Push into rolling history (max 30 points)
    if (this.speedHistory.length > 30) this.speedHistory.shift();
    this.speedHistory.push(Math.round(avgSpeed));

    const currentThroughput = this.completedTripTimestamps.length;
    if (this.throughputHistory.length > 30) this.throughputHistory.shift();
    this.throughputHistory.push(currentThroughput);
  }

  getMetrics(): SimulationMetrics {
    const vehiclesList = Array.from(this.vehicles.values());
    const totalSpeed = vehiclesList.reduce((sum, v) => sum + v.speed * 3.6, 0);
    const avgSpeed = vehiclesList.length > 0 ? Math.round((totalSpeed / vehiclesList.length) * 10) / 10 : 0;

    const totalDelay = vehiclesList.reduce((sum, v) => sum + v.totalWaitTime, 0);
    const avgDelay = vehiclesList.length > 0 ? Math.round((totalDelay / vehiclesList.length) * 10) / 10 : 0;

    const queuedCount = vehiclesList.filter((v) => v.speed < 2.0).length;
    const congestionPercent = vehiclesList.length > 0 ? Math.round((queuedCount / vehiclesList.length) * 100) : 0;

    return {
      activeVehicles: vehiclesList.length,
      completedTrips: this.totalCompletedTrips,
      averageSpeedKmh: avgSpeed,
      averageDelaySeconds: avgDelay,
      throughputPerMinute: this.completedTripTimestamps.length,
      congestionIndexPercent: congestionPercent,
      speedHistory: [...this.speedHistory],
      throughputHistory: [...this.throughputHistory],
    };
  }

  getVehicleWorldPos(agent: VehicleAgent): { x: number; y: number; angle: number } {
    if (agent.inIntersection && agent.turnStartPos && agent.turnEndPos && agent.turnControlPos) {
      const pos = getQuadraticBezierPoint(
        agent.turnStartPos,
        agent.turnControlPos,
        agent.turnEndPos,
        agent.turnProgress
      );
      const tangent = getQuadraticBezierTangent(
        agent.turnStartPos,
        agent.turnControlPos,
        agent.turnEndPos,
        agent.turnProgress
      );
      return {
        x: pos.x,
        y: pos.y,
        angle: Math.atan2(tangent.y, tangent.x),
      };
    }

    const road = this.roads.get(agent.currentRoadId);
    if (!road) return { x: 0, y: 0, angle: 0 };
    const fromNode = this.nodes.get(road.fromNodeId);
    const toNode = this.nodes.get(road.toNodeId);
    if (!fromNode || !toNode) return { x: 0, y: 0, angle: 0 };

    return getVehicleWorldTransform(
      road,
      fromNode,
      toNode,
      agent.positionAlongRoad,
      agent.laneIndex
    );
  }
}
