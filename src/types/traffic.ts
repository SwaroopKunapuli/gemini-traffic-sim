/**
 * Core type definitions for AgentFlow Traffic Simulation
 */

export type JunctionType = 'traffic_light' | 'priority_yield' | 'all_way_stop' | 'roundabout';

export type RotationSense = 
  | 'clockwise'           // N -> E -> S -> W
  | 'counter_clockwise'   // N -> W -> S -> E
  | 'opposing_pairs'      // (N+S) then (E+W)
  | 'split_phase'         // Individual protected legs
  | 'sensor_actuated';    // Dynamic based on detected queues

export type LightState = 'green' | 'yellow' | 'red';

export interface ApproachSignal {
  roadId: string;
  angle: number;           // Angle in radians from intersection center
  state: LightState;
  queueCount: number;
}

export interface IntersectionConfig {
  id: string;
  type: JunctionType;
  // Signal timings (seconds)
  greenDuration: number;
  yellowDuration: number;
  allRedDuration: number;
  rotationSense: RotationSense;
  
  // Dynamic runtime state
  currentPhaseIndex: number;
  phaseTimer: number;      // Elapsed seconds in current phase
  subPhase: 'green' | 'yellow' | 'all_red';
  manualGreenApproach?: string | null; // Road ID forced green
}

export interface NetworkNode {
  id: string;
  x: number;
  y: number;
  name?: string;
  isIntersection: boolean;
  intersectionConfig?: IntersectionConfig;
}

export interface RoadEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lanes: number;           // 1 to 3
  speedLimit: number;      // km/h (e.g. 50)
  isOneWay: boolean;
  spawnRate: number;       // vehicles per minute from this road's entry (if source is edge/endpoint)
  name?: string;
  // For rendering curved roads (e.g. roundabouts or curved highway ramps)
  controlPoint?: { x: number; y: number };
}

export type DriverPersonality = 'cautious' | 'normal' | 'aggressive' | 'emergency';
export type VehicleType = 'sedan' | 'suv' | 'truck' | 'bus' | 'motorcycle' | 'ambulance';

export interface DriverProfile {
  name: DriverPersonality;
  desiredSpeed: number;     // km/h
  timeHeadway: number;      // seconds (safe following time T)
  minDistance: number;      // meters (s0)
  maxAcceleration: number;  // m/s^2 (a)
  comfortableDecel: number; // m/s^2 (b)
  politeness: number;       // 0 to 1 for lane changing
  reactionLatency: number;  // seconds
}

export interface VehicleAgent {
  id: string;
  type: VehicleType;
  personality: DriverPersonality;
  profile: DriverProfile;
  color: string;
  length: number;           // meters
  width: number;            // meters

  // Current position on the network
  currentRoadId: string;
  laneIndex: number;        // 0 is rightmost / outer lane
  positionAlongRoad: number;// meters from start of road
  speed: number;            // m/s
  acceleration: number;     // m/s^2

  // Navigation route
  originNodeId: string;
  destinationNodeId: string;
  routeRoadIds: string[];
  routeIndex: number;
  
  // Turn indicator & state
  turnSignal: 'left' | 'right' | 'none';
  brakeLight: boolean;
  sirenActive: boolean;

  // Turn maneuver in intersection
  inIntersection: boolean;
  turnProgress: number;     // 0 to 1 if traversing an intersection turn arc
  turnStartPos?: { x: number; y: number };
  turnEndPos?: { x: number; y: number };
  turnControlPos?: { x: number; y: number };

  // Agent metrics
  totalWaitTime: number;    // seconds stopped (speed < 1 km/h)
  totalTripTime: number;    // seconds active
  distanceTraveled: number; // meters
}

export interface SimulationMetrics {
  activeVehicles: number;
  completedTrips: number;
  averageSpeedKmh: number;
  averageDelaySeconds: number;
  throughputPerMinute: number;
  congestionIndexPercent: number;
  speedHistory: number[];
  throughputHistory: number[];
}

export type ToolMode = 
  | 'select'
  | 'add_road'
  | 'add_junction'
  | 'spawn_agent'
  | 'delete'
  | 'pan';
