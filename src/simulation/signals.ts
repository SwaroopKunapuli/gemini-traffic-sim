/**
 * Traffic Junction Signal State Machine & Rotation Dynamics
 */
import {
  IntersectionConfig,
  LightState,
  NetworkNode,
  RoadEdge,
} from '../types/traffic';
import { getSortedApproachesForJunction } from './network';

export interface JunctionSignalStatus {
  junctionId: string;
  subPhase: 'green' | 'yellow' | 'all_red';
  activeRoadIds: string[];
  remainingSeconds: number;
  phaseIndex: number;
  totalPhases: number;
  rotationSense: string;
  approaches: {
    roadId: string;
    state: LightState;
    angle: number;
    queueCount: number;
  }[];
}

/**
 * Updates an intersection's signal timing state machine by dt (seconds)
 */
export function updateIntersectionSignals(
  junctionNode: NetworkNode,
  allRoads: RoadEdge[],
  allNodes: Map<string, NetworkNode>,
  queuesByRoad: Map<string, number>,
  dt: number
): void {
  const config = junctionNode.intersectionConfig;
  if (!config || config.type !== 'traffic_light') return;

  // If user has manually locked a green approach, hold it
  if (config.manualGreenApproach) {
    config.subPhase = 'green';
    return;
  }

  const sortedApproaches = getSortedApproachesForJunction(junctionNode, allRoads, allNodes);
  const numApproaches = sortedApproaches.length;
  if (numApproaches === 0) return;

  config.phaseTimer += dt;

  // Determine phases count based on rotation scheme
  const numPhases = getNumberOfPhases(config.rotationSense, numApproaches);
  if (config.currentPhaseIndex >= numPhases) {
    config.currentPhaseIndex = 0;
  }

  const greenTime = Math.max(3, config.greenDuration);
  const yellowTime = Math.max(1.5, config.yellowDuration);
  const allRedTime = Math.max(0, config.allRedDuration);

  // Phase transitions: Green -> Yellow -> All-Red -> Next Phase
  if (config.subPhase === 'green') {
    // Actuated logic: if sensor actuated and current green approach queue is cleared but other approach has long queue, allow early transition
    let effectiveGreen = greenTime;
    if (config.rotationSense === 'sensor_actuated') {
      const activeRoads = getActiveRoadsForPhase(config.currentPhaseIndex, config.rotationSense, sortedApproaches);
      const activeQueue = activeRoads.reduce((sum, rId) => sum + (queuesByRoad.get(rId) || 0), 0);
      if (activeQueue === 0 && config.phaseTimer >= 4) {
        // Queue cleared early; shorten phase to let other waiting cars go
        effectiveGreen = 4;
      }
    }

    if (config.phaseTimer >= effectiveGreen) {
      config.subPhase = 'yellow';
      config.phaseTimer = 0;
    }
  } else if (config.subPhase === 'yellow') {
    if (config.phaseTimer >= yellowTime) {
      if (allRedTime > 0) {
        config.subPhase = 'all_red';
        config.phaseTimer = 0;
      } else {
        advanceToNextPhase(config, numPhases);
      }
    }
  } else if (config.subPhase === 'all_red') {
    if (config.phaseTimer >= allRedTime) {
      advanceToNextPhase(config, numPhases);
    }
  }
}

function advanceToNextPhase(config: IntersectionConfig, totalPhases: number) {
  config.subPhase = 'green';
  config.phaseTimer = 0;

  if (config.rotationSense === 'counter_clockwise') {
    config.currentPhaseIndex = (config.currentPhaseIndex - 1 + totalPhases) % totalPhases;
  } else {
    // Clockwise, opposing pairs, split phase, actuated
    config.currentPhaseIndex = (config.currentPhaseIndex + 1) % totalPhases;
  }
}

export function getNumberOfPhases(sense: string, numApproaches: number): number {
  if (numApproaches <= 1) return 1;
  if (sense === 'opposing_pairs') {
    // 2 phases for standard 4-way, or ceil(numApproaches / 2)
    return Math.max(2, Math.ceil(numApproaches / 2));
  }
  return numApproaches;
}

/**
 * Returns road IDs that have right-of-way (green) during this phase
 */
export function getActiveRoadsForPhase(
  phaseIndex: number,
  sense: string,
  sortedApproaches: { road: RoadEdge; angle: number }[]
): string[] {
  const n = sortedApproaches.length;
  if (n === 0) return [];
  if (n === 1) return [sortedApproaches[0].road.id];

  if (sense === 'opposing_pairs') {
    // Approaches across from each other go together
    // For 4 approaches (0, 1, 2, 3), Phase 0 -> (0, 2), Phase 1 -> (1, 3)
    const primary = phaseIndex % n;
    const opposing = (primary + Math.floor(n / 2)) % n;
    const res = [sortedApproaches[primary].road.id];
    if (opposing !== primary && sortedApproaches[opposing]) {
      res.push(sortedApproaches[opposing].road.id);
    }
    return res;
  }

  // Single approach green (Clockwise, Counter-Clockwise, Split-Phase, Actuated)
  const idx = Math.min(n - 1, Math.max(0, phaseIndex % n));
  return [sortedApproaches[idx].road.id];
}

/**
 * Calculates signal state ('green', 'yellow', 'red') for a specific incoming road
 */
export function getSignalStateForRoad(
  junctionNode: NetworkNode,
  roadId: string,
  allRoads: RoadEdge[],
  allNodes: Map<string, NetworkNode>
): LightState {
  const config = junctionNode.intersectionConfig;
  if (!config) return 'green'; // Uncontrolled
  if (config.type !== 'traffic_light') return 'green'; // Priority/yield handled by agent yield logic

  if (config.manualGreenApproach) {
    return config.manualGreenApproach === roadId ? 'green' : 'red';
  }

  const sortedApproaches = getSortedApproachesForJunction(junctionNode, allRoads, allNodes);
  const activeRoads = getActiveRoadsForPhase(config.currentPhaseIndex, config.rotationSense, sortedApproaches);

  const isActive = activeRoads.includes(roadId);

  if (isActive) {
    if (config.subPhase === 'green') return 'green';
    if (config.subPhase === 'yellow') return 'yellow';
    return 'red'; // all-red clearance interval
  }

  return 'red';
}

/**
 * Compiles a live snapshot of an intersection's signal status for UI inspection
 */
export function getJunctionSignalSnapshot(
  junctionNode: NetworkNode,
  allRoads: RoadEdge[],
  allNodes: Map<string, NetworkNode>,
  queuesByRoad: Map<string, number>
): JunctionSignalStatus | null {
  const config = junctionNode.intersectionConfig;
  if (!config) return null;

  const sortedApproaches = getSortedApproachesForJunction(junctionNode, allRoads, allNodes);
  const activeRoads = getActiveRoadsForPhase(config.currentPhaseIndex, config.rotationSense, sortedApproaches);

  let remaining = 0;
  if (config.subPhase === 'green') {
    remaining = Math.max(0, config.greenDuration - config.phaseTimer);
  } else if (config.subPhase === 'yellow') {
    remaining = Math.max(0, config.yellowDuration - config.phaseTimer);
  } else {
    remaining = Math.max(0, config.allRedDuration - config.phaseTimer);
  }

  const approaches = sortedApproaches.map((app) => ({
    roadId: app.road.id,
    state: getSignalStateForRoad(junctionNode, app.road.id, allRoads, allNodes),
    angle: app.angle,
    queueCount: queuesByRoad.get(app.road.id) || 0,
  }));

  return {
    junctionId: junctionNode.id,
    subPhase: config.subPhase,
    activeRoadIds: activeRoads,
    remainingSeconds: Math.round(remaining * 10) / 10,
    phaseIndex: config.currentPhaseIndex,
    totalPhases: getNumberOfPhases(config.rotationSense, sortedApproaches.length),
    rotationSense: config.rotationSense,
    approaches,
  };
}
