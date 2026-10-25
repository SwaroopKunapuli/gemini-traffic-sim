/**
 * Pre-configured Simulation Scenarios & Road Networks
 */
import { NetworkNode, RoadEdge } from '../types/traffic';

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  nodes: NetworkNode[];
  roads: RoadEdge[];
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'four_way_junction',
    name: '4-Way Signalized Intersection',
    description: 'High-volume 2-lane intersection. Perfect for testing Clockwise vs Counter-Clockwise vs Opposing green phases.',
    nodes: [
      {
        id: 'center',
        x: 400,
        y: 350,
        isIntersection: true,
        name: 'Grand & Main',
        intersectionConfig: {
          id: 'center',
          type: 'traffic_light',
          greenDuration: 12,
          yellowDuration: 3,
          allRedDuration: 1.5,
          rotationSense: 'opposing_pairs',
          currentPhaseIndex: 0,
          phaseTimer: 0,
          subPhase: 'green',
        },
      },
      { id: 'north', x: 400, y: 80, isIntersection: false, name: 'North Blvd Entry' },
      { id: 'south', x: 400, y: 620, isIntersection: false, name: 'South Blvd Entry' },
      { id: 'west', x: 100, y: 350, isIntersection: false, name: 'West Ave Entry' },
      { id: 'east', x: 700, y: 350, isIntersection: false, name: 'East Ave Entry' },
    ],
    roads: [
      // North approach & departure
      { id: 'r_n_to_c', fromNodeId: 'north', toNodeId: 'center', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 18, name: 'Northbound In' },
      { id: 'r_c_to_n', fromNodeId: 'center', toNodeId: 'north', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Northbound Out' },
      // South approach & departure
      { id: 'r_s_to_c', fromNodeId: 'south', toNodeId: 'center', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 16, name: 'Southbound In' },
      { id: 'r_c_to_s', fromNodeId: 'center', toNodeId: 'south', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Southbound Out' },
      // West approach & departure
      { id: 'r_w_to_c', fromNodeId: 'west', toNodeId: 'center', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 14, name: 'Eastbound In' },
      { id: 'r_c_to_w', fromNodeId: 'center', toNodeId: 'west', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Westbound Out' },
      // East approach & departure
      { id: 'r_e_to_c', fromNodeId: 'east', toNodeId: 'center', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 15, name: 'Westbound In' },
      { id: 'r_c_to_e', fromNodeId: 'center', toNodeId: 'east', lanes: 2, speedLimit: 50, isOneWay: true, spawnRate: 0, name: 'Eastbound Out' },
    ],
  },
  {
    id: 'green_wave_corridor',
    name: '3-Junction Arterial Corridor',
    description: 'Triple coordinated signals along a major boulevard. Test progression, green wave synchronization, and side-street delays.',
    nodes: [
      // Central Boulevard Junctions
      {
        id: 'j1',
        x: 220,
        y: 350,
        isIntersection: true,
        name: '1st St Junction',
        intersectionConfig: {
          id: 'j1',
          type: 'traffic_light',
          greenDuration: 14,
          yellowDuration: 3,
          allRedDuration: 1,
          rotationSense: 'opposing_pairs',
          currentPhaseIndex: 0,
          phaseTimer: 0,
          subPhase: 'green',
        },
      },
      {
        id: 'j2',
        x: 440,
        y: 350,
        isIntersection: true,
        name: '2nd St Junction',
        intersectionConfig: {
          id: 'j2',
          type: 'traffic_light',
          greenDuration: 14,
          yellowDuration: 3,
          allRedDuration: 1,
          rotationSense: 'opposing_pairs',
          currentPhaseIndex: 0,
          phaseTimer: 4, // phase offset for green wave
          subPhase: 'green',
        },
      },
      {
        id: 'j3',
        x: 660,
        y: 350,
        isIntersection: true,
        name: '3rd St Junction',
        intersectionConfig: {
          id: 'j3',
          type: 'traffic_light',
          greenDuration: 14,
          yellowDuration: 3,
          allRedDuration: 1,
          rotationSense: 'opposing_pairs',
          currentPhaseIndex: 0,
          phaseTimer: 8, // phase offset for green wave
          subPhase: 'green',
        },
      },
      // Boulevard Ends
      { id: 'b_west', x: 60, y: 350, isIntersection: false, name: 'Blvd West Gate' },
      { id: 'b_east', x: 820, y: 350, isIntersection: false, name: 'Blvd East Gate' },
      // Side street gates
      { id: 's1_n', x: 220, y: 150, isIntersection: false },
      { id: 's1_s', x: 220, y: 550, isIntersection: false },
      { id: 's2_n', x: 440, y: 150, isIntersection: false },
      { id: 's2_s', x: 440, y: 550, isIntersection: false },
      { id: 's3_n', x: 660, y: 150, isIntersection: false },
      { id: 's3_s', x: 660, y: 550, isIntersection: false },
    ],
    roads: [
      // Main boulevard segments (Eastbound)
      { id: 'r_bw_j1', fromNodeId: 'b_west', toNodeId: 'j1', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 24 },
      { id: 'r_j1_j2', fromNodeId: 'j1', toNodeId: 'j2', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 0 },
      { id: 'r_j2_j3', fromNodeId: 'j2', toNodeId: 'j3', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 0 },
      { id: 'r_j3_be', fromNodeId: 'j3', toNodeId: 'b_east', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 0 },
      // Main boulevard segments (Westbound)
      { id: 'r_be_j3', fromNodeId: 'b_east', toNodeId: 'j3', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 22 },
      { id: 'r_j3_j2', fromNodeId: 'j3', toNodeId: 'j2', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 0 },
      { id: 'r_j2_j1', fromNodeId: 'j2', toNodeId: 'j1', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 0 },
      { id: 'r_j1_bw', fromNodeId: 'j1', toNodeId: 'b_west', lanes: 2, speedLimit: 55, isOneWay: true, spawnRate: 0 },
      // Side streets
      { id: 'r_s1n_j1', fromNodeId: 's1_n', toNodeId: 'j1', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 8 },
      { id: 'r_j1_s1n', fromNodeId: 'j1', toNodeId: 's1_n', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },
      { id: 'r_s1s_j1', fromNodeId: 's1_s', toNodeId: 'j1', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 7 },
      { id: 'r_j1_s1s', fromNodeId: 'j1', toNodeId: 's1_s', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },

      { id: 'r_s2n_j2', fromNodeId: 's2_n', toNodeId: 'j2', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 8 },
      { id: 'r_j2_s2n', fromNodeId: 'j2', toNodeId: 's2_n', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },
      { id: 'r_s2s_j2', fromNodeId: 's2_s', toNodeId: 'j2', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 7 },
      { id: 'r_j2_s2s', fromNodeId: 'j2', toNodeId: 's2_s', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },

      { id: 'r_s3n_j3', fromNodeId: 's3_n', toNodeId: 'j3', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 8 },
      { id: 'r_j3_s3n', fromNodeId: 'j3', toNodeId: 's3_n', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },
      { id: 'r_s3s_j3', fromNodeId: 's3_s', toNodeId: 'j3', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },
      { id: 'r_j3_s3s', fromNodeId: 'j3', toNodeId: 's3_s', lanes: 1, speedLimit: 40, isOneWay: true, spawnRate: 0 },
    ],
  },
  {
    id: 'roundabout_circle',
    name: 'Modern 4-Leg Roundabout',
    description: 'Circular junction with priority to circulating traffic. Observe continuous self-organizing vehicle gap acceptance.',
    nodes: [
      // 4 ring nodes forming the roundabout
      { id: 'rb_n', x: 400, y: 260, isIntersection: true, name: 'North Arc', intersectionConfig: { id: 'rb_n', type: 'roundabout', greenDuration: 10, yellowDuration: 2, allRedDuration: 0, rotationSense: 'clockwise', currentPhaseIndex: 0, phaseTimer: 0, subPhase: 'green' } },
      { id: 'rb_e', x: 490, y: 350, isIntersection: true, name: 'East Arc', intersectionConfig: { id: 'rb_e', type: 'roundabout', greenDuration: 10, yellowDuration: 2, allRedDuration: 0, rotationSense: 'clockwise', currentPhaseIndex: 0, phaseTimer: 0, subPhase: 'green' } },
      { id: 'rb_s', x: 400, y: 440, isIntersection: true, name: 'South Arc', intersectionConfig: { id: 'rb_s', type: 'roundabout', greenDuration: 10, yellowDuration: 2, allRedDuration: 0, rotationSense: 'clockwise', currentPhaseIndex: 0, phaseTimer: 0, subPhase: 'green' } },
      { id: 'rb_w', x: 310, y: 350, isIntersection: true, name: 'West Arc', intersectionConfig: { id: 'rb_w', type: 'roundabout', greenDuration: 10, yellowDuration: 2, allRedDuration: 0, rotationSense: 'clockwise', currentPhaseIndex: 0, phaseTimer: 0, subPhase: 'green' } },
      // External feeder endpoints
      { id: 'feeder_n', x: 400, y: 80, isIntersection: false },
      { id: 'feeder_e', x: 720, y: 350, isIntersection: false },
      { id: 'feeder_s', x: 400, y: 620, isIntersection: false },
      { id: 'feeder_w', x: 80, y: 350, isIntersection: false },
    ],
    roads: [
      // Circulating ring roads (counter-clockwise traffic flow)
      { id: 'ring_w_to_n', fromNodeId: 'rb_w', toNodeId: 'rb_n', lanes: 2, speedLimit: 35, isOneWay: true, spawnRate: 0, controlPoint: { x: 330, y: 280 } },
      { id: 'ring_n_to_e', fromNodeId: 'rb_n', toNodeId: 'rb_e', lanes: 2, speedLimit: 35, isOneWay: true, spawnRate: 0, controlPoint: { x: 470, y: 280 } },
      { id: 'ring_e_to_s', fromNodeId: 'rb_e', toNodeId: 'rb_s', lanes: 2, speedLimit: 35, isOneWay: true, spawnRate: 0, controlPoint: { x: 470, y: 420 } },
      { id: 'ring_s_to_w', fromNodeId: 'rb_s', toNodeId: 'rb_w', lanes: 2, speedLimit: 35, isOneWay: true, spawnRate: 0, controlPoint: { x: 330, y: 420 } },

      // Entry ramps
      { id: 'entry_n', fromNodeId: 'feeder_n', toNodeId: 'rb_n', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 14 },
      { id: 'entry_e', fromNodeId: 'feeder_e', toNodeId: 'rb_e', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 14 },
      { id: 'entry_s', fromNodeId: 'feeder_s', toNodeId: 'rb_s', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 14 },
      { id: 'entry_w', fromNodeId: 'feeder_w', toNodeId: 'rb_w', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 14 },

      // Exit ramps
      { id: 'exit_n', fromNodeId: 'rb_n', toNodeId: 'feeder_n', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'exit_e', fromNodeId: 'rb_e', toNodeId: 'feeder_e', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'exit_s', fromNodeId: 'rb_s', toNodeId: 'feeder_s', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'exit_w', fromNodeId: 'rb_w', toNodeId: 'feeder_w', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
    ],
  },
  {
    id: 'downtown_grid',
    name: 'Downtown 2x2 Urban Grid',
    description: 'Dense commercial grid. Demonstrates signal coordination, bottleneck spillbacks, and multi-intersection traffic dynamics.',
    nodes: [
      { id: 'nw', x: 260, y: 220, isIntersection: true, name: 'North-West', intersectionConfig: { id: 'nw', type: 'traffic_light', greenDuration: 10, yellowDuration: 3, allRedDuration: 1, rotationSense: 'clockwise', currentPhaseIndex: 0, phaseTimer: 0, subPhase: 'green' } },
      { id: 'ne', x: 540, y: 220, isIntersection: true, name: 'North-East', intersectionConfig: { id: 'ne', type: 'traffic_light', greenDuration: 10, yellowDuration: 3, allRedDuration: 1, rotationSense: 'counter_clockwise', currentPhaseIndex: 0, phaseTimer: 2, subPhase: 'green' } },
      { id: 'sw', x: 260, y: 480, isIntersection: true, name: 'South-West', intersectionConfig: { id: 'sw', type: 'traffic_light', greenDuration: 10, yellowDuration: 3, allRedDuration: 1, rotationSense: 'clockwise', currentPhaseIndex: 0, phaseTimer: 4, subPhase: 'green' } },
      { id: 'se', x: 540, y: 480, isIntersection: true, name: 'South-East', intersectionConfig: { id: 'se', type: 'traffic_light', greenDuration: 10, yellowDuration: 3, allRedDuration: 1, rotationSense: 'sensor_actuated', currentPhaseIndex: 0, phaseTimer: 0, subPhase: 'green' } },

      // Perimeter Gates
      { id: 'g_n1', x: 260, y: 70, isIntersection: false },
      { id: 'g_n2', x: 540, y: 70, isIntersection: false },
      { id: 'g_s1', x: 260, y: 630, isIntersection: false },
      { id: 'g_s2', x: 540, y: 630, isIntersection: false },
      { id: 'g_w1', x: 90, y: 220, isIntersection: false },
      { id: 'g_w2', x: 90, y: 480, isIntersection: false },
      { id: 'g_e1', x: 710, y: 220, isIntersection: false },
      { id: 'g_e2', x: 710, y: 480, isIntersection: false },
    ],
    roads: [
      // Internal Grid Crossings (Bidirectional)
      { id: 'r_nw_ne', fromNodeId: 'nw', toNodeId: 'ne', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_ne_nw', fromNodeId: 'ne', toNodeId: 'nw', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_sw_se', fromNodeId: 'sw', toNodeId: 'se', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_se_sw', fromNodeId: 'se', toNodeId: 'sw', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },

      { id: 'r_nw_sw', fromNodeId: 'nw', toNodeId: 'sw', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_sw_nw', fromNodeId: 'sw', toNodeId: 'nw', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_ne_se', fromNodeId: 'ne', toNodeId: 'se', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_se_ne', fromNodeId: 'se', toNodeId: 'ne', lanes: 2, speedLimit: 45, isOneWay: true, spawnRate: 0 },

      // Perimeter Feeders
      { id: 'r_gn1_nw', fromNodeId: 'g_n1', toNodeId: 'nw', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 12 },
      { id: 'r_nw_gn1', fromNodeId: 'nw', toNodeId: 'g_n1', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_gn2_ne', fromNodeId: 'g_n2', toNodeId: 'ne', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 12 },
      { id: 'r_ne_gn2', fromNodeId: 'ne', toNodeId: 'g_n2', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },

      { id: 'r_gs1_sw', fromNodeId: 'g_s1', toNodeId: 'sw', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 12 },
      { id: 'r_sw_gs1', fromNodeId: 'sw', toNodeId: 'g_s1', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_gs2_se', fromNodeId: 'g_s2', toNodeId: 'se', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 12 },
      { id: 'r_se_gs2', fromNodeId: 'se', toNodeId: 'g_s2', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },

      { id: 'r_gw1_nw', fromNodeId: 'g_w1', toNodeId: 'nw', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 11 },
      { id: 'r_nw_gw1', fromNodeId: 'nw', toNodeId: 'g_w1', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_gw2_sw', fromNodeId: 'g_w2', toNodeId: 'sw', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 11 },
      { id: 'r_sw_gw2', fromNodeId: 'sw', toNodeId: 'g_w2', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },

      { id: 'r_ge1_ne', fromNodeId: 'g_e1', toNodeId: 'ne', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 11 },
      { id: 'r_ne_ge1', fromNodeId: 'ne', toNodeId: 'g_e1', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
      { id: 'r_ge2_se', fromNodeId: 'g_e2', toNodeId: 'se', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 11 },
      { id: 'r_se_ge2', fromNodeId: 'se', toNodeId: 'g_e2', lanes: 1, speedLimit: 45, isOneWay: true, spawnRate: 0 },
    ],
  },
];
