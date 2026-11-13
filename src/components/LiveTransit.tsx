import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bus,
  MapPin,
  Navigation,
  Clock,
  Radio,
  ShieldCheck,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Phone,
  CheckCircle2,
  Users,
  AlertCircle,
  Zap,
  Info,
  Layers,
  Crosshair,
  Bell,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Send,
  Sliders,
  Check,
  X,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BusRouteInfo,
  BusStop,
  BusStudent,
  FeeTransaction,
  TransportOptInRequest,
  UserProfile,
  UserRole,
} from '../types';
import { BusMapLeaflet } from './transit/BusMapLeaflet';
import { TransportPaymentDashboard } from './transit/TransportPaymentDashboard';
import { TransportOptInPanel } from './portal/TransportOptInPanel';
import { TransportApprovalQueue } from './portal/TransportApprovalQueue';
import { soundEffects } from '../utils/audioChime';
import { MlEtaPredictor } from '../services/mlEtaPredictor';

interface LiveTransitProps {
  busRoute?: BusRouteInfo;
  isDark?: boolean;
  currentUser?: UserProfile | null;
  transportRequests?: TransportOptInRequest[];
  onNavigateToParentPortal?: () => void;
  onUpdateBusRoute?: (updated: BusRouteInfo) => void;
  onSendNotification?: (title: string, message: string, type: 'info' | 'warning' | 'alert') => void;
  onRequestTransport?: (payload: {
    userKey: string;
    userName: string;
    userRole: UserRole;
    stopId: number;
    stopName: string;
    tripType: 'both' | 'morning' | 'evening';
    remarks?: string;
  }) => void;
  onUpdateTransportRequestStatus?: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    allocatedSeat?: string
  ) => void;
  onPayTransportFee?: (requestId: string, method: FeeTransaction['paymentMethod']) => void;
}

// Real-world North Bengaluru GPS Coordinates along Route 14 Corridor
const PRIMARY_ROUTE_COORDINATES: [number, number][] = [
  [13.1007, 77.5963], // Stop 1: Yelahanka 4th Phase (NES Circle)
  [13.0975, 77.5950], // Major Sandeep Unnikrishnan Rd
  [13.0920, 77.5920], // Rail Wheel Factory approach
  [13.0865, 77.5895], // GKVK Perimeter Double Rd
  [13.0815, 77.5882], // Stop 2: Judicial Layout Gate
  [13.0760, 77.5890], // Kodigehalli Main Rd cross
  [13.0710, 77.5905], // Sahakar Nagar 60ft Rd entry
  [13.0670, 77.5915], // 14th Main approach
  [13.0623, 77.5925], // Stop 3: Sahakar Nagar Main Cross
  [13.0600, 77.5965], // Dasarahalli / Bellary Rd connector
  [13.0585, 77.6010], // Bellary Rd Underpass (NH 44)
  [13.0562, 77.6045], // Stop 4: Amruthahalli Signal Junction
  [13.0590, 77.6090], // Amruthahalli Main Rd
  [13.0625, 77.6135], // Jakkur Aerodrome perimeter
  [13.0660, 77.6160], // Jakkur Plantation Rd turn
  [13.0694, 77.6186], // Stop 5: Tattvasayam Future Academy (Gate 2)
];

const BYPASS_DETOUR_COORDINATES: [number, number][] = [
  [13.1007, 77.5963], // Stop 1: Yelahanka 4th Phase
  [13.0920, 77.5920],
  [13.0815, 77.5882], // Stop 2: Judicial Layout Gate
  [13.0710, 77.5905],
  [13.0623, 77.5925], // Stop 3: Sahakar Nagar Main Cross
  [13.0645, 77.6015], // Jakkur Aerodrome Bypass (avoids NH44 flyover bottleneck)
  [13.0662, 77.6080],
  [13.0562, 77.6045], // Stop 4: Amruthahalli Signal Junction
  [13.0625, 77.6135],
  [13.0694, 77.6186], // Stop 5: Campus Gate 2
];

// SVG Schematic Waypoints (for SVG HUD mode)
interface SchematicWaypoint {
  id: number;
  name: string;
  shortName: string;
  landmark: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  timeScheduled: string;
  zone: string;
}

const SCHEMATIC_WAYPOINTS: SchematicWaypoint[] = [
  { id: 1, name: 'Yelahanka Satellite Town (4th Phase)', shortName: 'Yelahanka 4th Phase', landmark: 'Near NES Circle / Mother Dairy', x: 110, y: 85, lat: 13.1007, lng: 77.5963, timeScheduled: '07:20 AM', zone: 'Zone North-A' },
  { id: 2, name: 'Judicial Layout Gate', shortName: 'Judicial Layout', landmark: 'GKVK Campus Perimeter Cross', x: 275, y: 155, lat: 13.0815, lng: 77.5882, timeScheduled: '07:35 AM', zone: 'Zone North-B' },
  { id: 3, name: 'Sahakar Nagar Main Cross', shortName: 'Sahakar Nagar', landmark: '14th Main Commercial Junction', x: 450, y: 220, lat: 13.0623, lng: 77.5925, timeScheduled: '07:50 AM', zone: 'Zone Central-East' },
  { id: 4, name: 'Amruthahalli Signal Junction', shortName: 'Amruthahalli Signal', landmark: 'Bellary Road Underpass Flyover', x: 620, y: 295, lat: 13.0562, lng: 77.6045, timeScheduled: '08:05 AM', zone: 'Zone Jakkur Corridor' },
  { id: 5, name: 'Tattvasayam Future Academy (Gate 2)', shortName: 'Campus Gate 2 Turnstile', landmark: 'Jakkur Plantation Road • Gate 2 Drop Zone', x: 790, y: 395, lat: 13.0694, lng: 77.6186, timeScheduled: '08:18 AM', zone: 'Academy Campus Zone' },
];

const ROUTE_SVG_PATH =
  'M 110,85 C 175,95 210,135 275,155 C 345,180 395,200 450,220 C 515,245 565,270 620,295 C 685,330 730,360 790,395';

export const LiveTransit: React.FC<LiveTransitProps> = ({
  busRoute,
  isDark = false,
  currentUser,
  transportRequests = [],
  onNavigateToParentPortal,
  onUpdateBusRoute,
  onSendNotification,
  onRequestTransport,
  onUpdateTransportRequestStatus,
  onPayTransportFee,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'gps' | 'payments' | 'optin'>('gps');
  // Current route state fallback
  const currentRoute = useMemo<BusRouteInfo>(() => {
    if (busRoute && busRoute.stops && busRoute.stops.length > 0) {
      return busRoute;
    }
    return {
      routeNumber: 'Route 14',
      routeName: 'North Bengaluru Express • Yelahanka – Jakkur',
      driverName: 'Mr. Manjunath Gowda',
      driverPhone: '+91 98450 44210',
      conductorName: 'Mr. Ramesh Babu',
      conductorPhone: '+91 98451 88320',
      vehicleNumber: 'KA-04-FA-2026',
      currentSpeedKmH: 34,
      currentLocationName: 'Approaching Sahakar Nagar 14th Main',
      nextStop: 'Sahakar Nagar Main Cross',
      liveStatus: 'ON_SCHEDULE',
      currentStopIndex: 2,
      progressPercent: 48,
      isEngineRunning: true,
      activeTrip: 'morning_inbound',
      studentsBoardedCount: 16,
      totalStudentsCount: 28,
      delayMinutes: 0,
      activeRouteVariant: 'primary_corridor',
      stops: [
        { id: 1, name: 'Yelahanka Satellite Town 4th Phase', shortName: 'Yelahanka 4th Phase', landmark: 'Near NES Circle', lat: 13.1007, lng: 77.5963, timeScheduled: '07:20 AM', eta: 'Departed', status: 'passed' },
        { id: 2, name: 'Judicial Layout Gate', shortName: 'Judicial Layout', landmark: 'GKVK Campus Perimeter', lat: 13.0815, lng: 77.5882, timeScheduled: '07:35 AM', eta: 'Departed', status: 'passed' },
        { id: 3, name: 'Sahakar Nagar Main Cross', shortName: 'Sahakar Nagar', landmark: '14th Main Commercial Junction', lat: 13.0623, lng: 77.5925, timeScheduled: '07:50 AM', eta: '07:49 AM', status: 'current' },
        { id: 4, name: 'Amruthahalli Signal Junction', shortName: 'Amruthahalli Signal', landmark: 'Bellary Road Flyover', lat: 13.0562, lng: 77.6045, timeScheduled: '08:05 AM', eta: '08:05 AM', status: 'upcoming' },
        { id: 5, name: 'Tattvasayam Future Academy, Gate 2', shortName: 'Campus Gate 2 Turnstile', landmark: 'Jakkur Plantation Road', lat: 13.0694, lng: 77.6186, timeScheduled: '08:18 AM', eta: '08:18 AM', status: 'upcoming' },
      ],
    };
  }, [busRoute]);

  // View presentation mode: Real-world GPS Map vs SVG HUD
  const [viewMode, setViewMode] = useState<'map' | 'hud'>('map');
  const [mapTileMode, setMapTileMode] = useState<'street' | 'satellite' | 'dark'>('street');
  const [followBus, setFollowBus] = useState<boolean>(true);

  // Simulation telemetry state
  const [progress, setProgress] = useState<number>(currentRoute.progressPercent ? currentRoute.progressPercent / 100 : 0.48);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 4>(1);
  const [selectedStopId, setSelectedStopId] = useState<number>(3);
  const [selectedStudentForGeofence, setSelectedStudentForGeofence] = useState<string>('st-7'); // Vivan by default
  const [telemetryPulse, setTelemetryPulse] = useState<number>(0);
  const [testNotificationToast, setTestNotificationToast] = useState<string | null>(null);
  const [localRouteVariant, setLocalRouteVariant] = useState<'primary_corridor' | 'traffic_bypass_detour'>(
    currentRoute.activeRouteVariant || 'primary_corridor'
  );

  const activeRouteVariant = currentRoute.activeRouteVariant || localRouteVariant;
  const activeRouteCoordinates =
    activeRouteVariant === 'traffic_bypass_detour'
      ? BYPASS_DETOUR_COORDINATES
      : PRIMARY_ROUTE_COORDINATES;

  const svgPathRef = useRef<SVGPathElement | null>(null);
  const lastReportedStopRef = useRef<number>(-1);

  // Compute precise Lat/Lng and Heading by interpolating along the active GPS polyline
  const liveCoordinates = useMemo(() => {
    const coords = activeRouteCoordinates;
    const totalSegments = coords.length - 1;
    const scaledProgress = Math.max(0, Math.min(1, progress)) * totalSegments;
    const segIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
    const segFraction = scaledProgress - segIndex;

    const p1 = coords[segIndex];
    const p2 = coords[segIndex + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
    const lng = p1[1] + (p2[1] - p1[1]) * segFraction;

    // Heading in degrees
    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];
    let heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    if (heading < 0) heading += 360;

    return { lat, lng, heading: Math.round(heading) };
  }, [progress, activeRouteCoordinates]);

  // Compute SVG position for the HUD view
  const svgPosition = useMemo(() => {
    if (!svgPathRef.current) {
      const x = 110 + progress * (790 - 110);
      const y = 85 + progress * (395 - 85);
      return { x, y, angle: 30 };
    }
    try {
      const totalLen = svgPathRef.current.getTotalLength();
      const currentDist = progress * totalLen;
      const pt = svgPathRef.current.getPointAtLength(currentDist);
      const nextDist = Math.min(currentDist + 4, totalLen);
      const nextPt = svgPathRef.current.getPointAtLength(nextDist);
      const dx = nextPt.x - pt.x;
      const dy = nextPt.y - pt.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return { x: pt.x, y: pt.y, angle };
    } catch {
      return { x: 450, y: 220, angle: 25 };
    }
  }, [progress]);

  // Live Speed simulation (fluctuates realistically, slows near junctions)
  const currentSpeed = useMemo(() => {
    if (!isPlaying && progress !== 0) return 0;
    const baseSpeed = progress > 0.45 && progress < 0.65 ? 26 : 35;
    const noise = Math.sin(telemetryPulse * 0.4) * 4;
    return Math.max(12, Math.round(baseSpeed + noise));
  }, [progress, isPlaying, telemetryPulse]);

  // Derived speed governor alert (> 40 km/h)
  const speedWarning = currentSpeed > 40;

  // Machine Learning ETA Prediction based on real-time GPS telemetry & historical congestion patterns
  const mlPrediction = useMemo(() => {
    return MlEtaPredictor.predict(
      currentRoute,
      Math.round(progress * 100),
      currentSpeed,
      currentRoute.delayMinutes || 0,
      undefined,
      undefined,
      activeRouteVariant
    );
  }, [currentRoute, progress, currentSpeed, activeRouteVariant]);

  // Progress animation interval
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const step = 0.0016 * speedMultiplier;
        const next = prev + step;
        if (next >= 1.0) {
          return 0.0; // cycle back
        }
        return next;
      });
      setTelemetryPulse((p) => (p + 1) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  // Calculate stops status based on current progress & ML predicted ETAs
  const updatedStops = useMemo<BusStop[]>(() => {
    const thresholds = [0.0, 0.25, 0.50, 0.75, 1.0];

    return currentRoute.stops.map((stop, i) => {
      const stopProgress = thresholds[i];
      let status: 'passed' | 'current' | 'upcoming' = 'upcoming';

      if (progress >= stopProgress + 0.12) {
        status = 'passed';
      } else if (progress >= stopProgress - 0.12 && progress < stopProgress + 0.12) {
        status = 'current';
      } else {
        status = 'upcoming';
      }

      const mlStopPred = mlPrediction.stopPredictions[i];

      // Drive dynamic ETA directly from ML Predictor
      let etaStr = stop.eta;
      if (status === 'passed') {
        etaStr = `Departed (${stop.timeScheduled})`;
      } else if (status === 'current') {
        etaStr = `At Station Now`;
      } else if (mlStopPred) {
        etaStr = `${mlStopPred.predictedEta} (In ${mlStopPred.predictedMinutes}m)`;
      }

      // Automatically mark students boarded if stop passed or current
      const updatedStudents: BusStudent[] = (stop.students || []).map((st) => {
        if (status === 'passed' || status === 'current') {
          return {
            ...st,
            status: (st.status === 'absent' ? 'absent' : 'boarded') as BusStudent['status'],
            boardedTime: st.boardedTime || stop.timeScheduled,
          };
        }
        return st;
      });

      return {
        ...stop,
        status,
        eta: etaStr,
        mlPredictedMinutes: mlStopPred?.predictedMinutes,
        mlPredictedEta: mlStopPred?.predictedEta,
        mlConfidenceScore: mlStopPred?.confidencePercent,
        students: updatedStudents,
      };
    });
  }, [currentRoute.stops, progress, mlPrediction]);

  // Active stop index
  const activeStopIndex = useMemo(() => {
    const idx = updatedStops.findIndex((s) => s.status === 'current');
    if (idx !== -1) return idx;
    if (progress >= 0.9) return 4;
    return Math.min(Math.floor(progress * 4), 3);
  }, [updatedStops, progress]);

  const activeStop = updatedStops[activeStopIndex] || updatedStops[0];
  const nextUpcomingStop = updatedStops.find((s) => s.status === 'upcoming') || updatedStops[4];

  // Sync to parent application only when the bus enters a NEW station milestone
  useEffect(() => {
    if (activeStop.status === 'current' && lastReportedStopRef.current !== activeStopIndex) {
      lastReportedStopRef.current = activeStopIndex;
      soundEffects.playSuccessChime();

      if (onSendNotification) {
        onSendNotification(
          `Bus 14 at ${activeStop.shortName || activeStop.name}`,
          `Route 14 bus has arrived at station. Scholar pickup and turnstile check-in active.`,
          'info'
        );
      }

      if (onUpdateBusRoute) {
        let boardedCount = 0;
        let totalCount = 0;
        updatedStops.forEach((st) => {
          (st.students || []).forEach((stud) => {
            totalCount++;
            if (stud.status === 'boarded') boardedCount++;
          });
        });

        onUpdateBusRoute({
          ...currentRoute,
          currentSpeedKmH: currentSpeed,
          currentLocationName: `At ${activeStop.name}`,
          nextStop: nextUpcomingStop.name,
          currentStopIndex: activeStopIndex,
          progressPercent: Math.round(progress * 100),
          stops: updatedStops,
          studentsBoardedCount: Math.max(16, boardedCount),
          totalStudentsCount: Math.max(28, totalCount),
          telemetry: {
            speedKmH: currentSpeed,
            headingDeg: liveCoordinates.heading,
            fuelPercent: 84,
            engineStatus: 'RUNNING',
            gpsSignal: 'STRONG_5G',
            satelliteCount: 14,
            doorStatus: 'OPEN',
            acStatus: 'ON',
            speedLimitKmH: 40,
            lastPingTime: 'Just now',
            currentLat: liveCoordinates.lat,
            currentLng: liveCoordinates.lng,
            cabinTempC: 23.5,
          },
        });
      }
    }
  }, [activeStopIndex, activeStop.status]);

  // Selected stop details
  const selectedStop = useMemo(() => {
    return updatedStops.find((s) => s.id === selectedStopId) || updatedStops[2];
  }, [updatedStops, selectedStopId]);

  // Selected student geofence info (e.g. Vivan)
  const studentGeofenceInfo = useMemo(() => {
    // Vivan is at stop 4 (Amruthahalli Signal)
    const targetStop = updatedStops[3]; // Stop 4
    const stopLat = targetStop.lat || 13.0562;
    const stopLng = targetStop.lng || 77.6045;

    // Approximate distance in km using haversine formula
    const R = 6371; // km
    const dLat = ((stopLat - liveCoordinates.lat) * Math.PI) / 180;
    const dLng = ((stopLng - liveCoordinates.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((liveCoordinates.lat * Math.PI) / 180) *
        Math.cos((stopLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = R * c;
    const distMeters = Math.round(distKm * 1000);

    const isInsideGeofence = distMeters <= 500;
    const isApproaching = distMeters > 500 && distMeters <= 1800;

    let etaMins = Math.max(1, Math.round(distKm / 0.5));
    if (progress > 0.78) {
      etaMins = 0; // Already passed
    }

    return {
      studentName: 'Vivan (Grade 10-A)',
      parentName: 'Mr. Rajesh & Mrs. Sunita',
      parentPhone: '+91 98450 99881',
      stopName: targetStop.name,
      distMeters,
      isInsideGeofence,
      isApproaching,
      isPassed: progress > 0.78,
      isBoarded: progress >= 0.72,
      etaMins,
    };
  }, [liveCoordinates, progress, updatedStops]);

  // Actions
  const handleReportTrafficDelay = (delayMins: number) => {
    if (!onUpdateBusRoute) return;
    const newDelay = (currentRoute.delayMinutes || 0) + delayMins;
    const status = newDelay >= 10 ? 'DELAYED_10_MIN' : 'DELAYED_5_MIN';
    onUpdateBusRoute({
      ...currentRoute,
      delayMinutes: newDelay,
      liveStatus: status,
    });
    soundEffects.playAlertChime();
    setTestNotificationToast(`Reported +${delayMins} min traffic delay. All stop ETAs updated.`);
    setTimeout(() => setTestNotificationToast(null), 4000);
  };

  const handleClearDelay = () => {
    if (!onUpdateBusRoute) return;
    onUpdateBusRoute({
      ...currentRoute,
      delayMinutes: 0,
      liveStatus: 'ON_SCHEDULE',
    });
    setTestNotificationToast(`Cleared delay status. Route 14 marked On Schedule.`);
    setTimeout(() => setTestNotificationToast(null), 3000);
  };

  const handleEmergencySOS = () => {
    soundEffects.playAlertChime();
    if (onUpdateBusRoute) {
      onUpdateBusRoute({
        ...currentRoute,
        liveStatus: 'EMERGENCY_HALT',
        currentSpeedKmH: 0,
      });
    }
    setIsPlaying(false);
    setTestNotificationToast(`CRITICAL: Emergency SOS dispatched to Gate 2 security and Principal.`);
    setTimeout(() => setTestNotificationToast(null), 5000);
  };

  const handleToggleStudentStatus = (stopId: number, studentId: string, newStatus: 'boarded' | 'absent' | 'waiting') => {
    if (!onUpdateBusRoute) return;
    const modifiedStops = currentRoute.stops.map((stop) => {
      if (stop.id === stopId) {
        return {
          ...stop,
          students: (stop.students || []).map((st) => {
            if (st.id === studentId) {
              return {
                ...st,
                status: newStatus,
                boardedTime: newStatus === 'boarded' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              };
            }
            return st;
          }),
        };
      }
      return stop;
    });

    onUpdateBusRoute({
      ...currentRoute,
      stops: modifiedStops,
    });
    soundEffects.playSuccessChime();
  };

  const handleSendParentPing = () => {
    soundEffects.playSuccessChime();
    setTestNotificationToast(
      `SMS/Push sent to ${studentGeofenceInfo.parentName} (${studentGeofenceInfo.parentPhone}): "Route 14 is ${studentGeofenceInfo.distMeters}m away from ${studentGeofenceInfo.stopName}. ETA: ${studentGeofenceInfo.etaMins} mins."`
    );
    setTimeout(() => setTestNotificationToast(null), 5000);
  };

  const handleAdvanceToNextStop = () => {
    const nextIdx = Math.min(activeStopIndex + 1, 4);
    const thresholds = [0.0, 0.25, 0.50, 0.75, 0.98];
    setProgress(thresholds[nextIdx]);
    setSelectedStopId(nextIdx + 1);
  };

  const remainingKm = Math.max(0, (1 - progress) * 11.4).toFixed(1);
  const remainingCampusMinutes =
    activeRouteVariant === 'traffic_bypass_detour'
      ? mlPrediction.detourRouteEtaMinutes
      : mlPrediction.primaryRouteEtaMinutes;

  const isLocationSharingActive = currentRoute.isLocationSharingActive !== false;

  const handleSwitchRouteVariant = (variant: 'primary_corridor' | 'traffic_bypass_detour') => {
    setLocalRouteVariant(variant);
    soundEffects.playNoticeChime();
    if (onUpdateBusRoute) {
      onUpdateBusRoute({
        ...currentRoute,
        activeRouteVariant: variant,
      });
    }
    setTestNotificationToast(
      variant === 'traffic_bypass_detour'
        ? `Engaged Jakkur Plantation Bypass Detour. Saving ~${Math.max(3, mlPrediction.detourTimeSavedMinutes)} minutes by avoiding NH44 flyover traffic.`
        : 'Restored Primary Route 14 Corridor via NH44 Underpass.'
    );
    setTimeout(() => setTestNotificationToast(null), 4000);
  };

  const handleToggleLocationSharing = () => {
    const nextSharingState = !isLocationSharingActive;
    if (nextSharingState) {
      soundEffects.playSuccessChime();
      setTestNotificationToast('Driver broadcast started! Live GPS tracking, speed, and real-time ETAs are now visible to parents.');
      if (onSendNotification) {
        onSendNotification(
          'Bus 14 Location Sharing Started',
          'Driver Mr. Manjunath Gowda has started sharing real-time GPS tracking for Route 14.',
          'info'
        );
      }
    } else {
      soundEffects.playAlertChime();
      setTestNotificationToast('Driver broadcast stopped. Live tracking is now hidden from parents (showing scheduled timetable).');
      if (onSendNotification) {
        onSendNotification(
          'Bus 14 Location Sharing Paused',
          'Real-time GPS tracking paused by driver. Parents will see scheduled timetable timings.',
          'warning'
        );
      }
    }
    setTimeout(() => setTestNotificationToast(null), 5000);

    if (onUpdateBusRoute) {
      onUpdateBusRoute({
        ...currentRoute,
        isLocationSharingActive: nextSharingState,
        locationSharingStartedAt: nextSharingState
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
      });
    }
  };

  const approvedTransportCount = transportRequests.filter((r) => r.status === 'APPROVED').length;
  const pendingApprovalCount = transportRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* LiveTransit Module Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('gps')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeSubTab === 'gps'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Live GPS & ML ETA Prediction</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeSubTab === 'payments'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Payment Compliance Dashboard</span>
            {approvedTransportCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                  activeSubTab === 'payments'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {approvedTransportCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('optin')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeSubTab === 'optin'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Bus Opt-In & Approvals</span>
            {pendingApprovalCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                  activeSubTab === 'optin'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                {pendingApprovalCount} Pending
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] font-mono text-stone-500 px-2 hidden md:inline">
          Route 14 · Corridor: {activeRouteVariant === 'traffic_bypass_detour' ? 'Jakkur Bypass Detour' : 'NH44 Primary'}
        </span>
      </div>

      {activeSubTab === 'payments' && (
        <TransportPaymentDashboard
          transportRequests={transportRequests}
          busRoute={currentRoute}
          currentUser={currentUser}
          onPayTransportFee={onPayTransportFee}
          onUpdateTransportRequestStatus={onUpdateTransportRequestStatus}
          isDark={isDark}
        />
      )}

      {activeSubTab === 'optin' && (
        <div className="space-y-6">
          {currentUser ? (
            <TransportOptInPanel
              user={currentUser}
              busRoute={currentRoute}
              transportRequests={transportRequests}
              onRequestTransport={onRequestTransport}
              onPayTransportFee={onPayTransportFee}
            />
          ) : (
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-stone-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                  Sign in to Request Bus Transport Opt-In
                </h4>
                <p className="text-stone-500 mt-0.5">
                  Students, Parents, Teachers, Staff, and Administrators can submit Route 14 opt-in requests from their portal or right here after signing in.
                </p>
              </div>
              {onNavigateToParentPortal && (
                <button
                  onClick={onNavigateToParentPortal}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shrink-0"
                >
                  Open Portal Login
                </button>
              )}
            </div>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'support' || currentUser?.role === 'principal') && (
            <TransportApprovalQueue
              transportRequests={transportRequests}
              onUpdateTransportRequestStatus={onUpdateTransportRequestStatus}
              reviewerLabel={`${currentUser.name} (${currentUser.title})`}
            />
          )}
        </div>
      )}

      {activeSubTab === 'gps' && (
      <div className="space-y-6">
      {/* Toast Confirmation */}
      {testNotificationToast && (
        <div className="p-3.5 rounded-2xl bg-stone-900 text-white text-xs font-semibold shadow-xl border border-orange-500/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
            <span>{testNotificationToast}</span>
          </div>
          <button onClick={() => setTestNotificationToast(null)} className="p-1 hover:bg-stone-800 rounded-lg text-stone-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Speed Warning Alarm Banner if exceeding 40km/h */}
      {speedWarning && (
        <div className="p-3 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
            <span>
              SPEED GOVERNOR ALARM: Bus traveling at {currentSpeed} km/h! School zone safety threshold is 40 km/h. Governor braking engaged.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-white/20 font-mono text-[10px] uppercase">
            Audible Warning Active
          </span>
        </div>
      )}

      {/* Driver Cabin Location Sharing Console Bar */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isLocationSharingActive
            ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isLocationSharingActive ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {isLocationSharingActive ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-stone-850 shadow-2xs text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                Driver Cabin GPS Terminal
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isLocationSharingActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-amber-600 text-white shadow-2xs'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLocationSharingActive ? 'bg-white animate-ping' : 'bg-white/80'
                  }`}
                />
                {isLocationSharingActive ? 'Broadcasting Live to Parents' : 'Location Hidden from Parents'}
              </span>
              {currentRoute.locationSharingStartedAt && isLocationSharingActive && (
                <span className="text-[10px] text-stone-400 font-mono">
                  Started at {currentRoute.locationSharingStartedAt}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
              {isLocationSharingActive
                ? `Driver Mr. Manjunath Gowda is currently broadcasting real-time GPS telemetry. Registered parents on Route 14 can view live vehicle movements, speed, and turnstile check-ins.`
                : `Driver has not initiated trip broadcast yet. Parents visiting their portal are shown "Waiting for Driver to Share Location" with the scheduled timetable.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={handleToggleLocationSharing}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
              isLocationSharingActive
                ? 'bg-white dark:bg-stone-850 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLocationSharingActive ? (
              <>
                <Pause className="w-4 h-4 text-rose-600" />
                <span>Stop Sharing Location (Go Private)</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span>Start Trip & Share Live Location</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-md overflow-hidden transition-all">
        {/* Top Header & Telemetry Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-50 via-amber-50/50 to-orange-100/30 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border-b border-orange-200/80 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white font-mono text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Radio className="w-3 h-3 animate-pulse text-amber-200" />
                <span>Real-Time Fleet GPS Active</span>
              </span>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                • Route 14 North Bengaluru Corridor
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-display flex items-center gap-2.5 flex-wrap">
              <span>{currentRoute.routeNumber}: {currentRoute.routeName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-extrabold border border-emerald-300 dark:border-emerald-800">
                {currentRoute.vehicleNumber}
              </span>
            </h3>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              Live satellite positioning: Yelahanka 4th Phase ⇄ Tattvasayam Gate 2 • Speed governor, geofencing & student turnstile manifest.
            </p>
          </div>

          {/* Quick Metrics & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs text-xs font-bold">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'map'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Real Map</span>
              </button>
              <button
                onClick={() => setViewMode('hud')}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'hud'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Vector HUD</span>
              </button>
            </div>

            {/* Speed Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs text-xs flex items-center gap-2">
              <Gauge className="w-4 h-4 text-orange-600" />
              <div>
                <span className="text-[10px] text-stone-400 block font-mono uppercase">Speed</span>
                <span className={`font-bold font-mono ${currentSpeed > 40 ? 'text-rose-600' : 'text-stone-900 dark:text-stone-100'}`}>
                  {currentSpeed} km/h
                </span>
              </div>
            </div>

            {/* Gate 2 ETA */}
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-[10px] text-stone-400 block font-mono uppercase">Gate 2 ETA</span>
                <span className="font-bold font-mono text-orange-600 dark:text-orange-400">
                  {remainingCampusMinutes} min ({remainingKm} km)
                </span>
              </div>
            </div>

            {/* Status Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono uppercase">Status</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-200">
                  {currentRoute.liveStatus === 'ON_SCHEDULE'
                    ? 'On Schedule'
                    : currentRoute.liveStatus === 'DELAYED_10_MIN'
                    ? '+10m Delay'
                    : currentRoute.liveStatus === 'DELAYED_5_MIN'
                    ? '+5m Delay'
                    : 'Emergency Halt'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAP OR HUD VIEWPORT ================= */}
        <div className="p-4 sm:p-6 bg-stone-50 dark:bg-stone-950 space-y-3">
          {!isLocationSharingActive && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Driver Location Sharing is OFF:</strong> Parents visiting the Parent Portal cannot see this live GPS movement, speed, or real-time ETAs. They are shown the "Waiting for Driver to Share Location" screen.
                </span>
              </div>
              <button
                onClick={handleToggleLocationSharing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shrink-0 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Enable Broadcast</span>
              </button>
            </div>
          )}

          {viewMode === 'map' ? (
            /* REAL LEAFLET INTERACTIVE MAP */
            <div className="space-y-2">
              <BusMapLeaflet
                busRoute={currentRoute}
                currentLat={liveCoordinates.lat}
                currentLng={liveCoordinates.lng}
                headingDeg={liveCoordinates.heading}
                selectedStopId={selectedStopId}
                onSelectStop={(id) => setSelectedStopId(id)}
                isDark={isDark}
                mapTileMode={mapTileMode}
                onChangeMapTileMode={(m) => setMapTileMode(m)}
                followBus={followBus}
                onToggleFollowBus={() => setFollowBus(!followBus)}
                routeCoordinates={activeRouteCoordinates}
              />
            </div>
          ) : (
            /* SCHEMATIC VECTOR HUD MAP */
            <div className="relative w-full rounded-2xl bg-[#fdfbf7] dark:bg-[#15100c] border border-orange-200/70 dark:border-stone-800 overflow-hidden shadow-inner">
              <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:24px_24px]" />

              <svg
                viewBox="0 0 900 480"
                className="w-full h-auto min-h-[340px] max-h-[500px] select-none block"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>

                  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Road Network Lines */}
                <line x1="80" y1="30" x2="840" y2="280" stroke={isDark ? '#3d2e24' : '#e2d8cd'} strokeWidth="12" strokeLinecap="round" />
                <line x1="80" y1="30" x2="840" y2="280" stroke={isDark ? '#261b14' : '#fff'} strokeWidth="2" strokeDasharray="6 6" />
                <line x1="420" y1="40" x2="490" y2="450" stroke={isDark ? '#36281e' : '#ede5db'} strokeWidth="8" strokeLinecap="round" />
                <line x1="600" y1="280" x2="830" y2="440" stroke={isDark ? '#47362a' : '#ded1c2'} strokeWidth="10" strokeLinecap="round" />

                {/* Main Route Ribbon */}
                <path d={ROUTE_SVG_PATH} fill="none" stroke="#ea580c" strokeWidth="10" strokeLinecap="round" opacity="0.2" />
                <path d={ROUTE_SVG_PATH} fill="none" stroke="url(#routeGradient)" strokeWidth="5" strokeLinecap="round" />
                <path ref={svgPathRef} d={ROUTE_SVG_PATH} fill="none" stroke="transparent" strokeWidth="1" />
                <path d={ROUTE_SVG_PATH} fill="none" stroke="#fed7aa" strokeWidth="2" strokeDasharray="8 12" strokeLinecap="round" className="animate-pulse" />

                {/* Waypoints */}
                {SCHEMATIC_WAYPOINTS.map((wp) => {
                  const isSelected = selectedStopId === wp.id;
                  const isDestination = wp.id === 5;
                  const isOrigin = wp.id === 1;
                  return (
                    <g key={wp.id} className="cursor-pointer" onClick={() => setSelectedStopId(wp.id)}>
                      <circle cx={wp.x} cy={wp.y} r="22" fill="transparent" />
                      {isSelected && (
                        <circle cx={wp.x} cy={wp.y} r="18" fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="3 3" className="animate-spin" />
                      )}
                      <circle
                        cx={wp.x}
                        cy={wp.y}
                        r={isDestination ? 12 : 9}
                        fill={isDestination ? '#ea580c' : isOrigin ? '#f59e0b' : '#ffffff'}
                        stroke={isDestination ? '#ffffff' : '#ea580c'}
                        strokeWidth={2.5}
                      />
                      {!isDestination && <circle cx={wp.x} cy={wp.y} r="4" fill="#ea580c" />}
                      <g transform={`translate(${wp.x}, ${wp.y + (wp.id % 2 === 0 ? -18 : 22)})`}>
                        <rect x="-65" y="-11" width="130" height="20" rx="10" fill={isSelected ? '#ea580c' : isDark ? '#261b14' : '#ffffff'} stroke={isSelected ? '#ea580c' : '#fed7aa'} strokeWidth="1.2" />
                        <text x="0" y="3" fontSize="9.5" fontWeight="bold" fill={isSelected ? '#ffffff' : isDark ? '#fed7aa' : '#7c2d12'} textAnchor="middle">
                          {wp.shortName}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Animated Bus Glyph */}
                <g transform={`translate(${svgPosition.x}, ${svgPosition.y}) rotate(${svgPosition.angle})`} filter="url(#glow)">
                  <circle cx="0" cy="0" r="16" fill="#ea580c" opacity="0.25" className="animate-ping" />
                  <circle cx="0" cy="0" r="11" fill="#ea580c" opacity="0.4" />
                  <g transform="translate(-14, -8)">
                    <rect x="0" y="0" width="28" height="16" rx="4" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
                    <rect x="20" y="2" width="5" height="12" rx="1.5" fill="#38bdf8" />
                    <rect x="5" y="2" width="4" height="4" rx="1" fill="#0f172a" />
                    <rect x="11" y="2" width="4" height="4" rx="1" fill="#0f172a" />
                    <rect x="5" y="10" width="4" height="4" rx="1" fill="#0f172a" />
                    <rect x="11" y="10" width="4" height="4" rx="1" fill="#0f172a" />
                    <text x="11" y="9.5" fontSize="5" fontWeight="black" fill="#78350f" textAnchor="middle">14</text>
                  </g>
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* ================= DUAL PANELS: DISPATCH & OPERATIONS CONSOLE ================= */}
        <div className="p-5 sm:p-6 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Selected Waypoint & Conductor Turnstile Check-in (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-700 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Station Inspector & Manifest
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-orange-100 dark:bg-stone-800 text-orange-700 dark:text-orange-300 font-bold">
                  Stop {selectedStop.id || 3} of 5
                </span>
              </div>

              <div>
                <span className="text-base font-extrabold text-stone-900 dark:text-stone-100 block">
                  {selectedStop.name}
                </span>
                <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3 h-3 text-stone-400" />
                  <span>{selectedStop.landmark || 'Route 14 Station'}</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750">
                  <span className="text-[10px] text-stone-400 block uppercase font-sans">Scheduled</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{selectedStop.timeScheduled}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750">
                  <span className="text-[10px] text-stone-400 block uppercase font-sans">Live ETA</span>
                  <span className="font-bold text-orange-600">{selectedStop.eta}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750">
                  <span className="text-[10px] text-stone-400 block uppercase font-sans">Status</span>
                  <span className="font-bold capitalize text-stone-800 dark:text-stone-200">{selectedStop.status}</span>
                </div>
              </div>

              {/* Scholar Boarding Manifest */}
              <div className="space-y-2 pt-2 border-t border-stone-200/80 dark:border-stone-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Assigned Scholars ({selectedStop.students?.length || 0})
                  </span>
                  <span className="text-[10px] font-medium text-stone-500">Tap to toggle status</span>
                </div>

                {selectedStop.students && selectedStop.students.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStop.students.map((student) => {
                      const isBoarded = student.status === 'boarded';
                      const isAbsent = student.status === 'absent';
                      return (
                        <div
                          key={student.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <span>{student.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 font-mono text-stone-500">
                                {student.grade}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400">
                              Seat: {student.seatNumber || 'Unassigned'} • Parent: {student.parentName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleStudentStatus(selectedStop.id || 1, student.id, isBoarded ? 'waiting' : 'boarded')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                                isBoarded
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 hover:bg-emerald-50'
                              }`}
                              title="Mark Boarded"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isBoarded ? 'Boarded' : 'Board'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleStudentStatus(selectedStop.id || 1, student.id, isAbsent ? 'waiting' : 'absent')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                                isAbsent
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 hover:bg-rose-50'
                              }`}
                              title="Mark Absent"
                            >
                              <X className="w-3 h-3" />
                              <span>{isAbsent ? 'Absent' : 'Skip'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-stone-400 text-xs">
                    Campus Gate 2 Turnstile • All 28 scholars disembark here
                  </div>
                )}
              </div>
            </div>

            {/* Parent Geofence & Proximity Card (Live tracking for Vivan) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-stone-850/80 border border-amber-200/90 dark:border-amber-900/60 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-stone-700 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Parent Proximity & Geofence Alert
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold">
                  Student: Vivan (Gr 10-A)
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Pickup Location:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{studentGeofenceInfo.stopName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Current Distance:</span>
                  <span className="font-mono font-extrabold text-orange-600">
                    {studentGeofenceInfo.distMeters} meters away
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Estimated Arrival:</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    {studentGeofenceInfo.isPassed ? 'Passed' : `~${studentGeofenceInfo.etaMins} minutes`}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${studentGeofenceInfo.isInsideGeofence ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  <span>
                    {studentGeofenceInfo.isInsideGeofence
                      ? 'INSIDE 400m GEOFENCE - BOARDING NOW'
                      : studentGeofenceInfo.isApproaching
                      ? 'APPROACHING (< 1.8 km)'
                      : studentGeofenceInfo.isPassed
                      ? 'BOARDED & EN ROUTE TO CAMPUS'
                      : 'EN ROUTE'}
                  </span>
                </span>

                <button
                  onClick={handleSendParentPing}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Test SMS Ping</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Operations Console, Delay Reporter & Diagnostics (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Driver & Cabin Contact Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                    {currentRoute.driverName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    Commercial DL Verified
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Phone: <span className="font-mono">{currentRoute.driverPhone}</span> • Conductor: <span className="font-semibold">{currentRoute.conductorName || 'Mr. Ramesh'}</span> ({currentRoute.conductorPhone || '+91 98451 88320'})
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${currentRoute.driverPhone}`}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-orange-50 font-bold text-stone-800 dark:text-stone-200 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-orange-600" />
                  <span>Call Cabin</span>
                </a>

                {onNavigateToParentPortal && (
                  <button
                    onClick={onNavigateToParentPortal}
                    className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-xs flex items-center gap-1"
                  >
                    <span>Parent Portal</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Machine Learning-Based ETA Prediction & Dynamic Rerouting Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-stone-50 dark:from-stone-850 dark:via-stone-900 dark:to-stone-850 border border-orange-200/90 dark:border-stone-750 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-200/60 dark:border-stone-750 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-900 dark:text-stone-100 font-display">
                      ML Predictive Arrival Engine (Gradient Boosted Spatial-Temporal)
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Trained on 1,240 North Bengaluru runs • Diurnal rush factor: 1.38x • Speed weight: 38%
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                    Confidence: {mlPrediction.overallConfidencePercent}%
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                    MAE: ±{mlPrediction.meanAbsoluteErrorMinutes}m
                  </span>
                </div>
              </div>

              {/* Station Predictions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {mlPrediction.stopPredictions.map((pred) => (
                  <div
                    key={pred.stopId}
                    className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-stone-400">Stop #{pred.stopId}</span>
                      <span className={`text-[9px] font-extrabold ${
                        pred.congestionLevel === 'CRITICAL' ? 'text-rose-600' : pred.congestionLevel === 'HEAVY' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {pred.congestionLevel}
                      </span>
                    </div>
                    <span className="font-bold text-stone-800 dark:text-stone-200 text-[11px] block truncate">
                      {pred.stopName.split(' ')[0]} {pred.stopName.split(' ')[1] || ''}
                    </span>
                    <div className="font-mono pt-0.5">
                      <span className="text-[10px] text-stone-400 block">ML ETA ({pred.trafficCongestionFactor}x):</span>
                      <span className="font-extrabold text-orange-600 dark:text-orange-400 text-xs">
                        {pred.predictedEta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Historical Pattern vs Real-Time ML ETA Recharts Mini-Chart */}
              <div className="p-3 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    Historical Baseline vs Real-Time ML Predicted Minutes Remaining
                  </span>
                  <span className="font-mono text-stone-400">
                    Traffic Index: {Math.round(mlPrediction.currentTrafficIndex * 100)}% ({mlPrediction.activeCorridorCongestion})
                  </span>
                </div>
                <div className="h-[130px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mlPrediction.stopPredictions.map((p) => ({
                        stop: `#${p.stopId} ${p.stopName.split(' ')[0]}`,
                        historicalMin: p.historicalBaseMinutes,
                        mlPredictedMin: p.predictedMinutes,
                      }))}
                      margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#292524' : '#e7e5e4'} vertical={false} />
                      <XAxis dataKey="stop" tick={{ fontSize: 10, fill: isDark ? '#a8a29e' : '#78716c' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: isDark ? '#a8a29e' : '#78716c' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1c1917' : '#ffffff',
                          borderRadius: '10px',
                          fontSize: '11px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="historicalMin" name="Historical Base (min)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="mlPredictedMin" name="ML Predicted (min)" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dynamic Traffic Detour Comparison & Recommendation */}
              <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      Dynamic Corridor Re-routing Evaluator:
                    </span>
                    {activeRouteVariant === 'traffic_bypass_detour' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold font-mono">
                        Jakkur Bypass Detour Active
                      </span>
                    ) : mlPrediction.detourTimeSavedMinutes > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold font-mono">
                        Detour Saves {mlPrediction.detourTimeSavedMinutes} min
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold font-mono">
                        Primary Route Optimal
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Primary Route (NH44): {mlPrediction.primaryRouteEtaMinutes}m • Jakkur Bypass Detour: {mlPrediction.detourRouteEtaMinutes}m
                  </p>
                </div>

                {activeRouteVariant === 'traffic_bypass_detour' ? (
                  <button
                    onClick={() => handleSwitchRouteVariant('primary_corridor')}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-extrabold text-xs shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Primary NH44 Route</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSwitchRouteVariant('traffic_bypass_detour')}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-200" />
                    <span>
                      {mlPrediction.detourTimeSavedMinutes > 0
                        ? `Engage Detour (${mlPrediction.detourTimeSavedMinutes}m faster)`
                        : 'Switch to Jakkur Bypass'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Movement & Telemetry Scrubber */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span>Live GPS Movement Simulation Engine</span>
                </span>
                <span className="font-mono text-[11px] text-stone-500 font-bold">
                  Route Progress: {Math.round(progress * 100)}% ({remainingKm} km left)
                </span>
              </div>

              {/* Range Scrubber */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={progress}
                onChange={(e) => setProgress(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />

              {/* Transport Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-xs ${
                      isPlaying
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:bg-amber-200'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Resume Trip'}</span>
                  </button>

                  <button
                    onClick={handleAdvanceToNextStop}
                    className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1 transition"
                    title="Jump to Next Stop"
                  >
                    <span>Next Station</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setProgress(0.0)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition"
                    title="Restart trip at Yelahanka"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Multipliers */}
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                  {([1, 2, 4] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSpeedMultiplier(spd)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition ${
                        speedMultiplier === spd
                          ? 'bg-white dark:bg-stone-700 text-orange-600 shadow-xs'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Traffic Delay & Dispatch Tools */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-orange-600" />
                  <span>Dispatcher Tools & Incident Reporting</span>
                </span>
                <span className="text-[10px] text-stone-500">Instant parent notification triggers</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-bold">
                <button
                  onClick={() => handleReportTrafficDelay(5)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 transition text-center shadow-2xs"
                >
                  +5m Traffic Delay
                </button>
                <button
                  onClick={() => handleReportTrafficDelay(10)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 transition text-center shadow-2xs"
                >
                  +10m Traffic Delay
                </button>
                <button
                  onClick={handleClearDelay}
                  className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 transition text-center"
                >
                  Clear Delays
                </button>
                <button
                  onClick={handleEmergencySOS}
                  className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 text-rose-700 dark:text-rose-300 transition text-center flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Emergency SOS</span>
                </button>
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
                <span className="text-[10px] font-mono text-stone-400 uppercase block">GPS Sats</span>
                <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">14 Locked (5G)</span>
                <span className="text-[10px] text-emerald-600 block">±1.2m Accuracy</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
                <span className="text-[10px] font-mono text-stone-400 uppercase block">Fuel / Battery</span>
                <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">84% Capacity</span>
                <span className="text-[10px] text-stone-500 block">Est range: 180 km</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
                <span className="text-[10px] font-mono text-stone-400 uppercase block">Speed Governor</span>
                <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">40 km/h Limit</span>
                <span className="text-[10px] text-emerald-600 block">Governor Active</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
                <span className="text-[10px] font-mono text-stone-400 uppercase block">Scholars on Board</span>
                <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                  {currentRoute.studentsBoardedCount || 16} / {currentRoute.totalStudentsCount || 28}
                </span>
                <span className="text-[10px] text-stone-500 block">RFID Turnstile Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
