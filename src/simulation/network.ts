/**
 * Road Network Topology, Geometry & Routing
 */
import { NetworkNode, RoadEdge } from '../types/traffic';

export const LANE_WIDTH = 4.0; // meters (canvas units)

export interface Point {
  x: number;
  y: number;
}

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates length of a road edge in meters
 */
export function getRoadLength(road: RoadEdge, fromNode: NetworkNode, toNode: NetworkNode): number {
  if (road.controlPoint) {
    // Quadratic bezier length approximation (sample 10 segments)
    let total = 0;
    let prev = { x: fromNode.x, y: fromNode.y };
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const pt = getQuadraticBezierPoint(
        { x: fromNode.x, y: fromNode.y },
        road.controlPoint,
        { x: toNode.x, y: toNode.y },
        t
      );
      total += distance(prev, pt);
      prev = pt;
    }
    return total;
  }
  return distance(fromNode, toNode);
}

export function getQuadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const inv = 1 - t;
  return {
    x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
    y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
  };
}

export function getQuadraticBezierTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

/**
 * Computes world coordinates and angle for a vehicle on a road at given distance and lane index
 */
export function getVehicleWorldTransform(
  road: RoadEdge,
  fromNode: NetworkNode,
  toNode: NetworkNode,
  distanceAlongRoad: number,
  laneIndex: number
): { x: number; y: number; angle: number } {
  const roadLength = Math.max(1, getRoadLength(road, fromNode, toNode));
  const t = Math.max(0, Math.min(1, distanceAlongRoad / roadLength));

  let pos: Point;
  let dir: Point;

  if (road.controlPoint) {
    pos = getQuadraticBezierPoint(
      { x: fromNode.x, y: fromNode.y },
      road.controlPoint,
      { x: toNode.x, y: toNode.y },
      t
    );
    dir = getQuadraticBezierTangent(
      { x: fromNode.x, y: fromNode.y },
      road.controlPoint,
      { x: toNode.x, y: toNode.y },
      t
    );
  } else {
    pos = {
      x: fromNode.x + (toNode.x - fromNode.x) * t,
      y: fromNode.y + (toNode.y - fromNode.y) * t,
    };
    dir = {
      x: toNode.x - fromNode.x,
      y: toNode.y - fromNode.y,
    };
  }

  const len = Math.hypot(dir.x, dir.y) || 1;
  const nx = -dir.y / len; // Normal vector pointing to the right of travel direction
  const ny = dir.x / len;

  // Offset based on lanes:
  // For a road with N lanes, rightmost is 0, leftmost is N-1
  // If road is bidirectional or standard, lanes sit offset to the right side of center line
  const totalLanes = road.lanes;
  const laneOffset = (laneIndex - (totalLanes - 1) / 2) * LANE_WIDTH + (road.isOneWay ? 0 : LANE_WIDTH * 0.8);

  const angle = Math.atan2(dir.y, dir.x);

  return {
    x: pos.x + nx * laneOffset,
    y: pos.y + ny * laneOffset,
    angle,
  };
}

/**
 * Gets incoming roads to a junction sorted by geometric angle around the junction center (0 to 2*PI)
 */
export function getSortedApproachesForJunction(
  junctionNode: NetworkNode,
  allRoads: RoadEdge[],
  allNodes: Map<string, NetworkNode>
): { road: RoadEdge; fromNode: NetworkNode; angle: number }[] {
  const incoming = allRoads.filter((r) => r.toNodeId === junctionNode.id);

  const withAngles = incoming.map((road) => {
    const fromNode = allNodes.get(road.fromNodeId);
    if (!fromNode) return { road, fromNode: junctionNode, angle: 0 };
    // Vector from junction to incoming source
    const dx = fromNode.x - junctionNode.x;
    const dy = fromNode.y - junctionNode.y;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;
    return { road, fromNode, angle };
  });

  // Sort ascending angle (counter-clockwise on screen if standard Cartesian, clockwise in standard screen Y-down)
  return withAngles.sort((a, b) => a.angle - b.angle);
}

/**
 * Simple Dijkstra shortest path across road network
 */
export function findShortestPath(
  startNodeId: string,
  targetNodeId: string,
  roads: RoadEdge[],
  nodes: Map<string, NetworkNode>
): string[] {
  if (startNodeId === targetNodeId) return [];

  const distances = new Map<string, number>();
  const previousEdge = new Map<string, RoadEdge>();
  const unvisited = new Set<string>();

  nodes.forEach((_, id) => {
    distances.set(id, Infinity);
    unvisited.add(id);
  });
  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let shortest = Infinity;
    for (const id of unvisited) {
      const d = distances.get(id)!;
      if (d < shortest) {
        shortest = d;
        currentId = id;
      }
    }

    if (!currentId || shortest === Infinity || currentId === targetNodeId) break;
    unvisited.delete(currentId);

    const currentNode = nodes.get(currentId)!;
    const outgoing = roads.filter((r) => r.fromNodeId === currentId);

    for (const road of outgoing) {
      const neighborNode = nodes.get(road.toNodeId);
      if (!neighborNode) continue;
      const edgeCost = getRoadLength(road, currentNode, neighborNode);
      const newDist = shortest + edgeCost;

      if (newDist < distances.get(road.toNodeId)!) {
        distances.set(road.toNodeId, newDist);
        previousEdge.set(road.toNodeId, road);
      }
    }
  }

  // Reconstruct path of road IDs
  const path: string[] = [];
  let curr = targetNodeId;
  while (previousEdge.has(curr)) {
    const edge = previousEdge.get(curr)!;
    path.unshift(edge.id);
    curr = edge.fromNodeId;
  }

  return path;
}
