/**
 * Intelligent Driver Model (IDM) & Vehicle Microscopic Dynamics
 */
import { DriverPersonality, DriverProfile, VehicleAgent } from '../types/traffic';

export const DRIVER_PROFILES: Record<DriverPersonality, DriverProfile> = {
  cautious: {
    name: 'cautious',
    desiredSpeed: 42,        // km/h
    timeHeadway: 2.1,        // seconds
    minDistance: 3.5,        // meters
    maxAcceleration: 1.4,    // m/s^2
    comfortableDecel: 2.0,   // m/s^2
    politeness: 0.85,
    reactionLatency: 0.35,
  },
  normal: {
    name: 'normal',
    desiredSpeed: 52,        // km/h
    timeHeadway: 1.4,        // seconds
    minDistance: 2.5,        // meters
    maxAcceleration: 2.2,    // m/s^2
    comfortableDecel: 2.6,   // m/s^2
    politeness: 0.5,
    reactionLatency: 0.2,
  },
  aggressive: {
    name: 'aggressive',
    desiredSpeed: 68,        // km/h
    timeHeadway: 0.95,       // seconds
    minDistance: 1.8,        // meters
    maxAcceleration: 3.4,    // m/s^2
    comfortableDecel: 3.8,   // m/s^2
    politeness: 0.15,
    reactionLatency: 0.1,
  },
  emergency: {
    name: 'emergency',
    desiredSpeed: 75,        // km/h
    timeHeadway: 0.8,        // seconds
    minDistance: 1.5,        // meters
    maxAcceleration: 3.8,    // m/s^2
    comfortableDecel: 4.5,   // m/s^2
    politeness: 0.0,
    reactionLatency: 0.05,
  },
};

/**
 * Calculates IDM acceleration.
 * @param speed Current agent speed in m/s
 * @param desiredSpeed Desired free-flow speed in m/s (min of driver desired and road limit)
 * @param gap Net distance to front vehicle / stop line in meters (null if free road)
 * @param leadSpeed Speed of leading obstacle in m/s (0 for red light)
 * @param profile Driver profile parameters
 */
export function calculateIDMAcceleration(
  speed: number,
  desiredSpeed: number,
  gap: number | null,
  leadSpeed: number = 0,
  profile: DriverProfile
): number {
  const v = Math.max(0, speed);
  const v0 = Math.max(1, desiredSpeed);
  const a = profile.maxAcceleration;
  const b = profile.comfortableDecel;
  const s0 = profile.minDistance;
  const T = profile.timeHeadway;

  // Free road term
  const freeTerm = 1 - Math.pow(v / v0, 4);

  if (gap === null || gap > 200) {
    // Free acceleration towards target velocity
    return a * freeTerm;
  }

  // Net effective distance
  const s = Math.max(0.1, gap);
  const deltaV = v - leadSpeed;

  // Desired dynamic distance s*
  const dynamicDistance = s0 + v * T + (v * deltaV) / (2 * Math.sqrt(a * b));
  const sStar = Math.max(s0, dynamicDistance);

  // Interaction braking term
  const interactionTerm = Math.pow(sStar / s, 2);

  // Resulting acceleration
  let acc = a * (freeTerm - interactionTerm);

  // Maximum braking clamp (avoid unrealistic infinite deceleration)
  const maxBraking = -8.5; // m/s^2
  if (acc < maxBraking) {
    acc = maxBraking;
  }

  return acc;
}

/**
 * Evaluates whether a driver approaching a yellow signal should stop or proceed (Dilemma zone logic)
 */
export function shouldStopForYellow(
  speedMps: number,
  distanceToStopLineMeters: number,
  profile: DriverProfile
): boolean {
  if (distanceToStopLineMeters <= 2) return false; // Already entering intersection

  // Calculate minimum stopping distance at comfortable deceleration
  const comfortableStoppingDist = (speedMps * speedMps) / (2 * profile.comfortableDecel);

  // If we can comfortably stop before the line, stop. Otherwise clear intersection.
  return distanceToStopLineMeters >= comfortableStoppingDist * 0.9;
}

/**
 * Evaluates lane change decision using simplified MOBIL logic
 */
export function shouldChangeLane(
  agent: VehicleAgent,
  currentGapFront: number | null,
  currentFrontSpeed: number,
  targetGapFront: number | null,
  targetFrontSpeed: number,
  targetGapBack: number | null,
  targetBackSpeed: number
): boolean {
  // Never change lane if already in intersection or right at the stop line
  if (agent.inIntersection) return false;

  const safetyDistance = agent.profile.minDistance * 1.5;
  // Safety criterion: Must have enough room behind in target lane
  if (targetGapBack !== null && targetGapBack < safetyDistance) {
    return false;
  }

  // Must have enough room in front in target lane
  if (targetGapFront !== null && targetGapFront < safetyDistance) {
    return false;
  }

  // Incentive criterion: Is target lane significantly more open / faster?
  const currentImpedance = currentGapFront !== null && currentGapFront < 35 && currentFrontSpeed < agent.speed * 0.85;
  const targetBetter = (targetGapFront === null || targetGapFront > (currentGapFront || 0) + 15);

  if (currentImpedance && targetBetter) {
    // Probability / politeness factor check
    return Math.random() > agent.profile.politeness * 0.6;
  }

  return false;
}
