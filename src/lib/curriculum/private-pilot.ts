import type { Curriculum } from "./types";

export const PRIVATE_PILOT_CURRICULUM: Curriculum = {
  id: "ppl-standard",
  title: "Private Pilot Certificate",
  description:
    "FAA Part 141/61 Private Pilot Airplane Single-Engine Land curriculum. Covers all ACS areas of operation from pre-solo through checkride preparation.",
  totalMinHours: 40,
  certificateType: "private",
  stages: [
    // ----------------------------------------------------------------
    // Stage 1 — Pre-Solo
    // ----------------------------------------------------------------
    {
      id: "stage-1-presolo",
      stageNumber: 1,
      title: "Pre-Solo",
      description:
        "Fundamental flight skills, aircraft familiarization, and solo readiness. The student builds proficiency in basic maneuvers, takeoffs, landings, and pattern operations.",
      requiredHours: 7,
      objectives: [
        "Demonstrate the four fundamentals of flight",
        "Perform normal and crosswind takeoffs and landings",
        "Execute slow flight, stalls, and steep turns to ACS standards",
        "Operate safely within the traffic pattern with proper radio communications",
      ],
      lessons: [
        {
          id: "L1",
          title: "Introduction to Flight",
          description:
            "Aircraft familiarization, cockpit organization, preflight inspection, engine start/shutdown, taxi, and the four fundamentals: climbs, descents, turns, and straight-and-level flight.",
          flightType: "local",
          dualHours: 1.5,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Identify all cockpit instruments and controls",
            "Perform a thorough preflight inspection using the checklist",
            "Demonstrate straight-and-level flight within ±100 ft and ±10°",
            "Execute gentle climbs, descents, and medium-bank turns",
          ],
          references: ["PHAK Ch. 3", "PHAK Ch. 5"],
          completionStandards: [
            "Student can complete a preflight inspection with minimal instructor prompting",
            "Maintains straight-and-level within ±200 ft altitude and ±20° heading",
            "Demonstrates understanding of the four fundamentals of flight",
          ],
        },
        {
          id: "L2",
          title: "Basic Maneuvers",
          description:
            "Slow flight, power-off stalls, power-on stalls, and steep turns. Introduction to stall recognition and recovery techniques.",
          flightType: "local",
          dualHours: 1.5,
          soloHours: 0,
          groundHours: 0.5,
          objectives: [
            "Configure and fly in slow flight at minimum controllable airspeed",
            "Recognize and recover from power-off stalls",
            "Recognize and recover from power-on stalls",
            "Perform steep turns at 45° bank within ACS tolerances",
          ],
          references: ["AFH Ch. 4"],
          completionStandards: [
            "Maintains slow flight within ±10 kts of target airspeed",
            "Recovers from stalls with minimal altitude loss and no secondary stall",
            "Completes steep turns within ±100 ft altitude and rolls out within ±10° of entry heading",
          ],
        },
        {
          id: "L3",
          title: "Takeoffs & Landings",
          description:
            "Normal and crosswind takeoff and landing techniques, go-around procedures, and approach speed management.",
          flightType: "local",
          dualHours: 1.5,
          soloHours: 0,
          groundHours: 0.5,
          objectives: [
            "Perform normal takeoffs with proper rotation speed and climb profile",
            "Execute stabilized approaches and normal landings",
            "Demonstrate crosswind correction during takeoff and landing",
            "Perform a go-around from any point in the approach",
          ],
          references: ["AFH Ch. 9"],
          completionStandards: [
            "Lands within 400 ft of the designated touchdown point",
            "Maintains centerline during takeoff roll and landing rollout",
            "Executes go-arounds promptly with correct procedure when directed",
          ],
        },
        {
          id: "L4",
          title: "Pattern Work & Solo Prep",
          description:
            "Traffic pattern entries and departures, radio communications with ATC/CTAF, emergency procedures review, and first solo readiness evaluation.",
          flightType: "local",
          dualHours: 1.5,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Enter and depart the traffic pattern correctly at towered and non-towered airports",
            "Make proper radio calls on CTAF and with tower",
            "Demonstrate emergency procedures including engine failure on takeoff",
            "Pass pre-solo knowledge test and readiness check",
          ],
          references: ["AFH Ch. 8", "AFH Ch. 9", "AIM 4-3"],
          completionStandards: [
            "Performs three consecutive landings to ACS standards without instructor intervention",
            "Communicates correctly with ATC/on CTAF without prompting",
            "Demonstrates appropriate emergency actions for engine failure in the pattern",
            "Passes the pre-solo written test per 14 CFR 61.87",
          ],
        },
      ],
    },

    // ----------------------------------------------------------------
    // Stage 2 — Solo
    // ----------------------------------------------------------------
    {
      id: "stage-2-solo",
      stageNumber: 2,
      title: "Solo",
      description:
        "First solo flight and subsequent solo practice to build confidence, proficiency, and independent decision-making skills.",
      requiredHours: 3.5,
      objectives: [
        "Complete first supervised solo flight",
        "Build proficiency through independent pattern work",
        "Practice maneuvers and ground reference maneuvers solo",
      ],
      lessons: [
        {
          id: "L5",
          title: "First Solo",
          description:
            "Supervised solo flight in the traffic pattern. Three full-stop landings with the instructor observing from the ground.",
          flightType: "local",
          dualHours: 0,
          soloHours: 1,
          groundHours: 0,
          objectives: [
            "Perform three full-stop solo landings in the traffic pattern",
            "Maintain safe airspeeds and altitudes throughout all phases of flight",
            "Make correct radio calls without instructor assistance",
          ],
          references: ["14 CFR 61.87"],
          completionStandards: [
            "Completes three full-stop landings without incident",
            "Maintains pattern altitude within ±100 ft",
            "Demonstrates sound aeronautical decision-making throughout the flight",
          ],
        },
        {
          id: "L6",
          title: "Solo Practice — Pattern",
          description:
            "Independent pattern work to build confidence and consistency. Focus on landing precision and energy management.",
          flightType: "local",
          dualHours: 0,
          soloHours: 1,
          groundHours: 0,
          objectives: [
            "Perform multiple pattern circuits with consistent technique",
            "Manage approach energy for stabilized approaches",
            "Build confidence operating as pilot-in-command",
          ],
          references: [],
          completionStandards: [
            "Lands consistently within 200 ft of target touchdown point",
            "All approaches are stabilized by 500 ft AGL",
            "Student debriefs and self-identifies areas for improvement",
          ],
        },
        {
          id: "L7",
          title: "Solo Practice — Practice Area",
          description:
            "Solo practice of maneuvers and ground reference maneuvers in the local practice area. Reinforces skills learned in Stage 1.",
          flightType: "local",
          dualHours: 0,
          soloHours: 1.5,
          groundHours: 0,
          objectives: [
            "Practice slow flight and stall recovery without instructor present",
            "Perform ground reference maneuvers: turns around a point, S-turns",
            "Navigate to and from the practice area independently",
          ],
          references: ["AFH Ch. 6"],
          completionStandards: [
            "Completes all assigned maneuvers safely and returns within allotted time",
            "Ground reference maneuvers maintain altitude within ±100 ft",
            "Student demonstrates situational awareness and proper see-and-avoid techniques",
          ],
        },
      ],
    },

    // ----------------------------------------------------------------
    // Stage 3 — Cross-Country
    // ----------------------------------------------------------------
    {
      id: "stage-3-xc",
      stageNumber: 3,
      title: "Cross-Country",
      description:
        "Cross-country flight planning, navigation by pilotage, dead reckoning, and VOR/GPS. Includes both dual and solo cross-country requirements.",
      requiredHours: 10.5,
      objectives: [
        "Plan and execute cross-country flights using pilotage and dead reckoning",
        "Navigate using VOR and GPS systems",
        "Complete the required long dual and solo cross-country flights",
        "Obtain and use flight following from ATC",
      ],
      lessons: [
        {
          id: "L8",
          title: "XC Planning & Dual XC",
          description:
            "Cross-country flight planning fundamentals: navigation log preparation, weather briefing, fuel planning, weight & balance. First dual cross-country flight using pilotage and dead reckoning.",
          flightType: "xc",
          dualHours: 2,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Complete a full navigation log with checkpoints, headings, and fuel burn",
            "Obtain and interpret a standard weather briefing",
            "Navigate by pilotage and dead reckoning to a destination airport",
            "Perform a landing at an unfamiliar airport",
          ],
          references: ["PHAK Ch. 16"],
          completionStandards: [
            "Navigation log is complete and accurate within ±5 minutes of actual times",
            "Identifies at least 80% of visual checkpoints en route",
            "Arrives at destination within 5 nm of planned course",
          ],
        },
        {
          id: "L9",
          title: "Long Dual XC",
          description:
            "Dual cross-country flight of at least 150 nautical miles total distance with landings at a minimum of three points. VOR and GPS navigation techniques.",
          flightType: "xc",
          dualHours: 3,
          soloHours: 0,
          groundHours: 0.5,
          objectives: [
            "Plan and fly a 150+ nm cross-country route with three landing points",
            "Demonstrate VOR tracking and GPS direct-to navigation",
            "Manage fuel and time en route over a multi-leg flight",
            "Communicate with approach/departure control for flight following",
          ],
          references: ["PHAK Ch. 16", "AIM Ch. 1"],
          completionStandards: [
            "Total distance meets the 150 nm requirement with three full-stop landings",
            "Tracks VOR radials within ±5° and maintains GPS course within 2 nm",
            "Fuel management keeps reserves above legal minimums at all times",
          ],
        },
        {
          id: "L10",
          title: "Solo XC",
          description:
            "Student solo cross-country flight. Independent flight planning, decision-making, and navigation. Flight following with ATC.",
          flightType: "xc",
          dualHours: 0,
          soloHours: 2,
          groundHours: 0,
          objectives: [
            "Plan and execute a solo cross-country flight independently",
            "Request and utilize VFR flight following",
            "Make aeronautical decisions regarding weather and fuel without instructor input",
          ],
          references: ["14 CFR 61.93"],
          completionStandards: [
            "Completes the flight safely and arrives at all planned destinations",
            "Maintains course within 5 nm of planned route",
            "Demonstrates sound go/no-go decision-making for the solo flight",
          ],
        },
        {
          id: "L11",
          title: "Long Solo XC",
          description:
            "Solo cross-country flight of at least 150 nautical miles total distance with full-stop landings at three points, one of which is at least 50 nm from the original departure point.",
          flightType: "xc",
          dualHours: 0,
          soloHours: 3,
          groundHours: 0,
          objectives: [
            "Plan and execute a 150+ nm solo XC with three landing points",
            "Demonstrate independent fuel management and time planning",
            "Navigate using a combination of pilotage, dead reckoning, and electronic aids",
          ],
          references: ["14 CFR 61.109"],
          completionStandards: [
            "Total distance meets the 150 nm requirement with the 50 nm leg",
            "All three full-stop landings are completed safely",
            "Student arrives within ±15 minutes of planned ETE at each leg",
          ],
        },
      ],
    },

    // ----------------------------------------------------------------
    // Stage 4 — Instrument & Night
    // ----------------------------------------------------------------
    {
      id: "stage-4-instrument-night",
      stageNumber: 4,
      title: "Instrument & Night",
      description:
        "Basic attitude instrument flying, instrument navigation, and night operations. Meets the 3-hour instrument and night flight requirements.",
      requiredHours: 8,
      objectives: [
        "Fly by reference to instruments in simulated IMC",
        "Navigate using VOR, GPS, and holding patterns under the hood",
        "Perform night takeoffs, landings, and a night cross-country flight",
      ],
      lessons: [
        {
          id: "L12",
          title: "Basic Instrument",
          description:
            "Introduction to attitude instrument flying. Primary and supporting instruments, instrument scan, straight-and-level, turns, climbs, and descents by reference to instruments. Unusual attitude recovery.",
          flightType: "instrument",
          dualHours: 1.5,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Maintain straight-and-level flight by instrument reference within ACS tolerances",
            "Perform standard-rate turns, climbs, and descents by instruments",
            "Recover from unusual attitudes using proper instrument scan",
            "Identify the primary and supporting instruments for each maneuver",
          ],
          references: ["PHAK Ch. 8"],
          completionStandards: [
            "Maintains altitude within ±200 ft and heading within ±20° under the hood",
            "Recovers from unusual attitudes promptly without exceeding aircraft limitations",
            "Demonstrates a functional instrument scan without fixating on a single instrument",
          ],
        },
        {
          id: "L13",
          title: "Instrument Navigation",
          description:
            "VOR radial tracking and interception, GPS direct-to and flight plan mode, holding pattern entries and procedures under simulated instrument conditions.",
          flightType: "instrument",
          dualHours: 1.5,
          soloHours: 0,
          groundHours: 0.5,
          objectives: [
            "Track VOR radials inbound and outbound within ±5°",
            "Intercept a VOR radial at a specified angle",
            "Program and fly a GPS direct-to course",
            "Enter and fly a standard holding pattern",
          ],
          references: ["PHAK Ch. 8", "AIM Ch. 1"],
          completionStandards: [
            "Tracks VOR radials within half-scale CDI deflection",
            "Holding pattern entries are correct for the assigned holding fix",
            "Maintains assigned altitude within ±200 ft throughout instrument navigation",
          ],
        },
        {
          id: "L14",
          title: "Night Operations",
          description:
            "Night takeoffs and landings, visual illusions at night, airport lighting systems, and a night cross-country flight segment. Meets 14 CFR 61.109 night requirements.",
          flightType: "night",
          dualHours: 2,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Perform night takeoffs and full-stop landings",
            "Identify and use airport lighting systems (VASI/PAPI, runway lights, beacon)",
            "Navigate a night cross-country segment using pilotage and electronic navigation",
            "Recognize and mitigate visual illusions specific to night flying",
          ],
          references: ["AFH Ch. 11"],
          completionStandards: [
            "Completes the required 10 night takeoffs and landings including full-stop",
            "Correctly identifies airport lighting and uses VASI/PAPI for glidepath guidance",
            "Navigates the night XC segment arriving within 5 nm of planned course",
            "Demonstrates awareness of night-specific hazards and physiological factors",
          ],
        },
      ],
    },

    // ----------------------------------------------------------------
    // Stage 5 — Checkride Prep
    // ----------------------------------------------------------------
    {
      id: "stage-5-checkride",
      stageNumber: 5,
      title: "Checkride Prep",
      description:
        "Final review of all ACS maneuvers, simulated practical test, and final preparation for the FAA Private Pilot checkride.",
      requiredHours: 9.5,
      objectives: [
        "Perform all ACS maneuvers to practical test standards",
        "Complete a full mock oral and practical checkride",
        "Review weak areas and finalize all required endorsements and paperwork",
      ],
      lessons: [
        {
          id: "L15",
          title: "Maneuvers Review",
          description:
            "Comprehensive review of all ACS areas of operation. Slow flight, stalls, steep turns, ground reference, emergency procedures, and instrument maneuvers — all to checkride standards.",
          flightType: "checkride",
          dualHours: 2,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Perform all ACS slow flight and stall maneuvers within practical test standards",
            "Execute steep turns, ground reference, and emergency procedures to standard",
            "Demonstrate basic instrument maneuvers to ACS tolerances",
            "Identify and remediate any remaining weak areas",
          ],
          references: ["Private Pilot ACS (FAA-S-ACS-6B)"],
          completionStandards: [
            "All maneuvers meet or exceed ACS standards on the first attempt",
            "Student self-evaluates performance accurately",
            "Instructor identifies no more than two areas requiring additional practice",
          ],
        },
        {
          id: "L16",
          title: "Mock Checkride",
          description:
            "Full simulated practical test including oral examination and flight maneuvers. Conducted as closely as possible to the actual checkride experience.",
          flightType: "checkride",
          dualHours: 2.5,
          soloHours: 0,
          groundHours: 2,
          objectives: [
            "Pass a simulated oral examination covering all ACS knowledge areas",
            "Perform all required flight maneuvers to practical test standards",
            "Complete a full weather briefing, flight plan, and weight & balance",
            "Demonstrate aeronautical decision-making under simulated checkride pressure",
          ],
          references: ["Private Pilot ACS (FAA-S-ACS-6B)", "14 CFR 61.103-61.109"],
          completionStandards: [
            "Achieves a satisfactory result on the simulated oral with no unsatisfactory areas",
            "All flight maneuvers meet ACS tolerances",
            "Completes the mock checkride within the allotted time frame",
            "Instructor endorses the student as checkride-ready",
          ],
        },
        {
          id: "L17",
          title: "Final Prep",
          description:
            "Last flight before the checkride. Focus on any weak areas identified in the mock checkride, final endorsements, IACRA application, and paperwork review.",
          flightType: "checkride",
          dualHours: 1,
          soloHours: 0,
          groundHours: 1,
          objectives: [
            "Remediate any weak areas from the mock checkride",
            "Verify all logbook endorsements are complete and correct",
            "Review IACRA application and required documents",
            "Confirm go/no-go decision for the checkride",
          ],
          references: ["14 CFR 61.103-61.109"],
          completionStandards: [
            "All previously identified weak areas now meet ACS standards",
            "Logbook endorsements are complete per 14 CFR 61.103",
            "Student can articulate the checkride flow and expectations",
            "Both student and instructor agree on checkride readiness",
          ],
        },
      ],
    },
  ],
};

export const AVAILABLE_CURRICULA: Curriculum[] = [PRIVATE_PILOT_CURRICULUM];
