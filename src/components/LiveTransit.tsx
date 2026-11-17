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
  Lock,
  EyeOff,
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
import { AuthService, ApiAccessError } from '../services/authService';
import { AccessDeniedView } from './AccessDeniedView';
import {
  PRIMARY_ROAD_COORDINATES,
  BYPASS_ROAD_COORDINATES,
  JAKKUR_DEPOT_COORDS,
  interpolateAlongRoad,
  computeStopRoadProgresses,
  fetchOsrmRoadRoute,
  evaluateRoute14Geofence,
} from '../services/roadRoutingService';

interface LiveTransitProps {
  busRoute?: BusRouteInfo;
  isDark?: boolean;
  currentUser?: UserProfile | null;
  transportRequests?: TransportOptInRequest[];
  onNavigateToParentPortal?: () => void;
  onNavigateHome?: () => void;
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

// Real-world OpenStreetMap road-snapped corridors provided by roadRoutingService.ts

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
  { id: 5, name: 'Tattvaswayam Future Academy (Gate 2)', shortName: 'Campus Gate 2 Turnstile', landmark: '#2060, Sampigehalli, Jakkur • Gate 2 Drop Zone', x: 790, y: 395, lat: 13.0694, lng: 77.6186, timeScheduled: '08:18 AM', zone: 'Academy Campus Zone' },
];

const ROUTE_SVG_PATH =
  'M 110,85 C 175,95 210,135 275,155 C 345,180 395,200 450,220 C 515,245 565,270 620,295 C 685,330 730,360 790,395';

export const LiveTransit: React.FC<LiveTransitProps> = ({
  busRoute,
  isDark = false,
  currentUser,
  transportRequests = [],
  onNavigateToParentPortal,
  onNavigateHome,
  onUpdateBusRoute,
  onSendNotification,
  onRequestTransport,
  onUpdateTransportRequestStatus,
  onPayTransportFee,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'gps' | 'payments' | 'optin'>('gps');
  const [busScopeInfo, setBusScopeInfo] = useState<{
    scopeDescription: string;
    allowedPassengerKeys: string[];
  } | null>(null);
  const [loadingAccess, setLoadingAccess] = useState<boolean>(true);
  const [accessError, setAccessError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!currentUser) {
      setLoadingAccess(false);
      return;
    }

    setLoadingAccess(true);
    setAccessError(null);
    AuthService.fetchBusTracker()
      .then((res) => {
        if (!active) return;
        const passengers = res.busTracker?.passengers || [];
        setBusScopeInfo({
          scopeDescription: res.busTracker?.scopeDescription || 'Route 14 Scope',
          allowedPassengerKeys: passengers
            .map((p: any) => (p.userKey || '').toLowerCase())
            .filter(Boolean),
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiAccessError) {
          setAccessError({ status: err.status, message: err.message });
        } else {
          setAccessError({ status: 403, message: 'Access denied to Bus Tracker.' });
        }
      })
      .finally(() => {
        if (active) setLoadingAccess(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.roles?.join(',')]);
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
        { id: 5, name: 'Tattvaswayam Future Academy, Gate 2', shortName: 'Campus Gate 2 Turnstile', landmark: '#2060, Sampigehalli, Jakkur', lat: 13.0694, lng: 77.6186, timeScheduled: '08:18 AM', eta: '08:18 AM', status: 'upcoming' },
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
  const fallbackRoadCoordinates =
    activeRouteVariant === 'traffic_bypass_detour'
      ? BYPASS_ROAD_COORDINATES
      : PRIMARY_ROAD_COORDINATES;

  const [snappedRoadCoordinates, setSnappedRoadCoordinates] = useState<[number, number][] | null>(null);

  const stopWaypoints = useMemo<[number, number][]>(
    () =>
      currentRoute.stops
        .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
        .map((s) => [s.lat as number, s.lng as number]),
    [currentRoute.stops]
  );

  const stopWaypointKey = useMemo(
    () => stopWaypoints.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';'),
    [stopWaypoints]
  );

  useEffect(() => {
    let cancelled = false;

    if (stopWaypoints.length < 2) {
      setSnappedRoadCoordinates(null);
      return;
    }

    const waypointsWithDetour: [number, number][] =
      activeRouteVariant === 'traffic_bypass_detour' && stopWaypoints.length >= 3
        ? [
            ...stopWaypoints.slice(0, 2),
            [13.0695, 77.5865], // Interior Sahakaranagar Railway Parallel Road bypass
            ...stopWaypoints.slice(2),
          ]
        : stopWaypoints;

    fetchOsrmRoadRoute(waypointsWithDetour, fallbackRoadCoordinates).then((coords) => {
      if (!cancelled) {
        setSnappedRoadCoordinates(coords);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeRouteVariant, stopWaypointKey]);

  const activeRouteCoordinates = snappedRoadCoordinates || fallbackRoadCoordinates;

  const stopRoadProgresses = useMemo(
    () => computeStopRoadProgresses(activeRouteCoordinates, currentRoute.stops),
    [activeRouteCoordinates, currentRoute.stops]
  );

  const svgPathRef = useRef<SVGPathElement | null>(null);
  const lastReportedStopRef = useRef<number>(-1);

  // Compute precise Lat/Lng and Heading strictly along the road polyline by arc length
  const liveCoordinates = useMemo(
    () => interpolateAlongRoad(activeRouteCoordinates, progress),
    [progress, activeRouteCoordinates]
  );

  const isDriverOffDuty = currentRoute.dutyStatus === 'OFF_DUTY';
  const isSimulatedOffRoute = Boolean(currentRoute.isSimulatedOffRoute);
  const effectiveVehicleLat = isSimulatedOffRoute ? 13.0435 : liveCoordinates.lat;
  const effectiveVehicleLng = isSimulatedOffRoute ? 77.641 : liveCoordinates.lng;

  const geofenceEvaluation = useMemo(
    () =>
      evaluateRoute14Geofence(
        effectiveVehicleLat,
        effectiveVehicleLng,
        activeRouteCoordinates,
        JAKKUR_DEPOT_COORDS
      ),
    [effectiveVehicleLat, effectiveVehicleLng, activeRouteCoordinates]
  );

  const isOutsideAuthorizedGeofence = !isDriverOffDuty && !geofenceEvaluation.isAuthorizedZone;
  const isLocationSharingActive =
    !isDriverOffDuty &&
    !isOutsideAuthorizedGeofence &&
    currentRoute.isLocationSharingActive !== false;
  const isLocationMasked = isDriverOffDuty || isOutsideAuthorizedGeofence || !isLocationSharingActive;

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

  // Live Speed simulation (fluctuates realistically, slows near junctions; strictly 0 when masked/off duty)
  const currentSpeed = useMemo(() => {
    if (isLocationMasked) return 0;
    if (!isPlaying && progress !== 0) return 0;
    const baseSpeed = progress > 0.45 && progress < 0.65 ? 26 : 35;
    const noise = Math.sin(telemetryPulse * 0.4) * 4;
    return Math.max(12, Math.round(baseSpeed + noise));
  }, [progress, isPlaying, telemetryPulse, isLocationMasked]);

  // Derived speed governor alert (> 40 km/h)
  const speedWarning = !isLocationMasked && currentSpeed > 40;

  // Machine Learning ETA Prediction based on real-time GPS & historical congestion patterns
  const mlPrediction = useMemo(() => {
    return MlEtaPredictor.predict(
      currentRoute,
      Math.round(progress * 100),
      currentSpeed || 30,
      currentRoute.delayMinutes || 0,
      undefined,
      undefined,
      activeRouteVariant
    );
  }, [currentRoute, progress, currentSpeed, activeRouteVariant]);

  // Progress animation interval — strictly paused when Off Duty or outside authorized Route 14 geofence
  useEffect(() => {
    if (!isPlaying || isDriverOffDuty || isOutsideAuthorizedGeofence) return;

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
  }, [isPlaying, speedMultiplier, isDriverOffDuty, isOutsideAuthorizedGeofence]);

  // Calculate stops status based on actual road progress & ML predicted ETAs
  const updatedStops = useMemo<BusStop[]>(() => {
    return currentRoute.stops.map((stop, i) => {
      const stopProgress = stopRoadProgresses[i] ?? i / Math.max(1, currentRoute.stops.length - 1);
      let status: 'passed' | 'current' | 'upcoming' = 'upcoming';

      if (progress >= stopProgress + 0.08) {
        status = 'passed';
      } else if (progress >= stopProgress - 0.08 && progress < stopProgress + 0.08) {
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
  }, [currentRoute.stops, progress, mlPrediction, stopRoadProgresses]);

  // Active stop index
  const activeStopIndex = useMemo(() => {
    const idx = updatedStops.findIndex((s) => s.status === 'current');
    if (idx !== -1) return idx;
    if (progress >= 0.9) return 4;
    return Math.min(Math.floor(progress * 4), 3);
  }, [updatedStops, progress]);

  const activeStop = updatedStops[activeStopIndex] || updatedStops[0];
  const nextUpcomingStop = updatedStops.find((s) => s.status === 'upcoming') || updatedStops[4];

  // Sync to parent application only when On Duty, inside Geofence, and entering a NEW station milestone
  useEffect(() => {
    if (isDriverOffDuty || isOutsideAuthorizedGeofence || !isLocationSharingActive) return;

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
          geofenceStatus: geofenceEvaluation.status,
          geofenceDistanceMeters: geofenceEvaluation.corridorDistanceMeters,
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
            isMasked: false,
          },
        });
      }
    }
  }, [activeStopIndex, activeStop.status, isDriverOffDuty, isOutsideAuthorizedGeofence, isLocationSharingActive]);

  // Selected stop details
  const selectedStop = useMemo(() => {
    return updatedStops.find((s) => s.id === selectedStopId) || updatedStops[2];
  }, [updatedStops, selectedStopId]);

  // Selected student geofence info (scoped to current parent/student when applicable)
  const studentGeofenceInfo = useMemo(() => {
    const targetStudentKey =
      currentUser?.linkedStudentKey ||
      currentUser?.childrenKeys?.[0] ||
      currentUser?.child ||
      'vivan';
    const isKrishvika = targetStudentKey === 'krishvika';
    const targetStop = isKrishvika ? updatedStops[2] : updatedStops[3];
    const stopLat = targetStop?.lat || (isKrishvika ? 13.0623 : 13.0562);
    const stopLng = targetStop?.lng || (isKrishvika ? 77.5925 : 77.6045);

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
    const stopPassedThreshold = isKrishvika ? 0.58 : 0.78;
    if (progress > stopPassedThreshold) {
      etaMins = 0; // Already passed
    }

    return {
      studentName: isKrishvika ? 'Krishvika (Grade 8-B)' : 'Vivan (Grade 10-A)',
      parentName: isKrishvika ? 'Parent of Krishvika' : 'Parent of Vivan',
      parentPhone: isKrishvika ? '+91 98450 91735' : '+91 98450 99881',
      stopName: targetStop?.name || 'Sahakar Nagar Main Cross',
      distMeters,
      isInsideGeofence,
      isApproaching,
      isPassed: progress > stopPassedThreshold,
      isBoarded: progress >= stopPassedThreshold - 0.06,
      etaMins,
    };
  }, [liveCoordinates, progress, updatedStops, currentUser]);

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
    const nextIdx = Math.min(activeStopIndex + 1, Math.max(0, currentRoute.stops.length - 1));
    const targetProgress = stopRoadProgresses[nextIdx] ?? nextIdx / Math.max(1, currentRoute.stops.length - 1);
    setProgress(targetProgress);
    setSelectedStopId(nextIdx + 1);
  };

  const totalRoadDistanceKm = activeRouteVariant === 'traffic_bypass_detour' ? 15.4 : 13.9;
  const remainingKm = Math.max(0, (1 - progress) * totalRoadDistanceKm).toFixed(1);
  const remainingCampusMinutes =
    activeRouteVariant === 'traffic_bypass_detour'
      ? mlPrediction.detourRouteEtaMinutes
      : mlPrediction.primaryRouteEtaMinutes;

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

  const handleSetDutyStatus = (nextDuty: 'ON_DUTY' | 'OFF_DUTY') => {
    if (nextDuty === 'OFF_DUTY') {
      soundEffects.playAlertChime();
      setTestNotificationToast('Privacy Protected: Location sharing is paused while off duty.');
      setTimeout(() => setTestNotificationToast(null), 5000);
      if (onUpdateBusRoute) {
        onUpdateBusRoute({
          ...currentRoute,
          dutyStatus: 'OFF_DUTY',
          isLocationSharingActive: false,
          currentSpeedKmH: 0,
          isEngineRunning: false,
          locationSharingStartedAt: undefined,
          telemetry: {
            speedKmH: 0,
            headingDeg: 0,
            fuelPercent: currentRoute.telemetry?.fuelPercent ?? 84,
            engineStatus: 'OFF',
            gpsSignal: 'MASKED_OFF_DUTY',
            satelliteCount: 0,
            doorStatus: 'CLOSED',
            acStatus: 'OFF',
            speedLimitKmH: 40,
            lastPingTime: 'Paused (Off Duty)',
            currentLat: 0,
            currentLng: 0,
            isMasked: true,
          },
        });
      }
      return;
    }

    const canBroadcast = geofenceEvaluation.isAuthorizedZone;
    soundEffects.playSuccessChime();
    setTestNotificationToast(
      canBroadcast
        ? 'On Duty: Route 14 Active inside authorized corridor. Live tracking enabled.'
        : 'On Duty active, but vehicle is outside Jakkur Depot / Route 14 corridor — live broadcast stays masked.'
    );
    setTimeout(() => setTestNotificationToast(null), 5000);
    if (onUpdateBusRoute) {
      onUpdateBusRoute({
        ...currentRoute,
        dutyStatus: 'ON_DUTY',
        isLocationSharingActive: canBroadcast,
        currentSpeedKmH: canBroadcast ? 34 : 0,
        isEngineRunning: true,
        geofenceStatus: geofenceEvaluation.status,
        geofenceDistanceMeters: geofenceEvaluation.corridorDistanceMeters,
        locationSharingStartedAt: canBroadcast
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
      });
    }
  };

  const handleToggleLocationSharing = () => {
    if (isDriverOffDuty) {
      soundEffects.playAlertChime();
      setTestNotificationToast('Privacy Protected: Switch driver status to On Duty before starting live sharing.');
      setTimeout(() => setTestNotificationToast(null), 4000);
      return;
    }
    if (!geofenceEvaluation.isAuthorizedZone) {
      soundEffects.playAlertChime();
      setTestNotificationToast('Geofence Protection: Live broadcast only runs inside Jakkur Campus Depot or Route 14 corridor.');
      setTimeout(() => setTestNotificationToast(null), 4000);
      return;
    }

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

  const userRoles = currentUser?.roles || (currentUser ? [currentUser.role] : []);
  const isOperationalStaff = userRoles.some(
    (r) => r === 'admin' || r === 'principal' || r === 'support' || r === 'driver' || r === 'security'
  );

  if (!currentUser) {
    return (
      <AccessDeniedView
        title="Sign In Required for Bus Tracker"
        message="Live Bus Tracker is only available to signed-in parents, students, and authorized transport staff."
        statusCode={401}
        onNavigateHome={onNavigateHome || (() => {})}
        onNavigateLogin={onNavigateToParentPortal}
        showLoginAction
      />
    );
  }

  if (loadingAccess) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center space-y-2">
        <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Verifying Route 14 access permissions…
        </p>
      </div>
    );
  }

  if (accessError) {
    return (
      <AccessDeniedView
        title="Bus Tracker Access Denied"
        message={accessError.message}
        statusCode={accessError.status}
        onNavigateHome={onNavigateHome || (() => {})}
        onNavigateLogin={onNavigateToParentPortal}
      />
    );
  }

  const scopedStopStudents = (selectedStop.students || []).filter((st) => {
    if (isOperationalStaff) return true;
    const allowedKeys = busScopeInfo?.allowedPassengerKeys || [];
    if (allowedKeys.length === 0) return false;
    return Boolean(st.userKey && allowedKeys.includes(st.userKey.toLowerCase()));
  });

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

        <div className="flex items-center gap-2 px-2">
          {busScopeInfo?.scopeDescription && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              {busScopeInfo.scopeDescription}
            </span>
          )}
          <span className="text-[11px] font-mono text-stone-500 hidden md:inline">
            Route 14 · {activeRouteVariant === 'traffic_bypass_detour' ? 'Jakkur Bypass Detour' : 'NH44 Primary'}
          </span>
        </div>
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

      {/* Driver Cabin Location Sharing & Shift Privacy Console Bar */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          isDriverOffDuty
            ? 'bg-slate-900 border-emerald-500/40 text-white'
            : isOutsideAuthorizedGeofence
            ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
            : isLocationSharingActive
            ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isDriverOffDuty
                ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                : isLocationSharingActive
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isDriverOffDuty ? (
              <EyeOff className="w-5 h-5" />
            ) : isLocationSharingActive ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-stone-850 shadow-2xs text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                Driver Shift & Geofence Status
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isDriverOffDuty
                    ? 'bg-slate-700 text-emerald-300 border border-emerald-500/30'
                    : isLocationSharingActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-amber-600 text-white shadow-2xs'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLocationSharingActive ? 'bg-white animate-ping' : 'bg-white/80'
                  }`}
                />
                {isDriverOffDuty
                  ? 'Off Duty • Privacy Protected'
                  : isOutsideAuthorizedGeofence
                  ? 'Outside Corridor Geofence'
                  : isLocationSharingActive
                  ? 'On Duty: Route 14 Active'
                  : 'Location Paused'}
              </span>
              {currentRoute.locationSharingStartedAt && isLocationSharingActive && (
                <span className="text-[10px] text-stone-400 font-mono">
                  Started at {currentRoute.locationSharingStartedAt}
                </span>
              )}
            </div>
            <p className={`text-xs font-medium ${isDriverOffDuty ? 'text-slate-200' : 'text-stone-700 dark:text-stone-300'}`}>
              {isDriverOffDuty
                ? 'Privacy Protected: Location sharing is paused while off duty. All live GPS pings and coordinates are masked during personal time.'
                : isOutsideAuthorizedGeofence
                ? `Geofence Privacy Active: Vehicle is ${geofenceEvaluation.corridorDistanceMeters.toLocaleString()}m outside the Route 14 corridor and Jakkur Depot. Live parent broadcast is paused.`
                : isLocationSharingActive
                ? `Driver Mr. Manjunath Gowda is On Duty inside ${geofenceEvaluation.zoneLabel}. Parents on Route 14 can follow live arrival ETAs.`
                : `Live broadcast is temporarily paused. Parents see the scheduled Route 14 timetable until resumed.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-auto">
          {currentUser?.role === 'driver' && (
            <button
              type="button"
              onClick={() => handleSetDutyStatus(isDriverOffDuty ? 'ON_DUTY' : 'OFF_DUTY')}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                isDriverOffDuty
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isDriverOffDuty ? 'Go On Duty (Route 14)' : 'Switch to Off Duty'}</span>
            </button>
          )}

          {!isDriverOffDuty && (
            <button
              type="button"
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
                  <span>Pause Location Share</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-emerald-200 animate-pulse" />
                  <span>Start Trip & Share Live Location</span>
                </>
              )}
            </button>
          )}
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
              Live satellite positioning: Yelahanka 4th Phase ⇄ Tattvaswayam Gate 2 • Speed governor, geofencing & student turnstile manifest.
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
                followBus={!isLocationMasked && followBus}
                onToggleFollowBus={() => setFollowBus(!followBus)}
                routeCoordinates={activeRouteCoordinates}
                isLocationMasked={isLocationMasked}
                maskedReason={isDriverOffDuty ? 'off_duty' : isOutsideAuthorizedGeofence ? 'geofence' : 'paused'}
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

                {/* Animated Bus Glyph (hidden when privacy masked) */}
                {!isLocationMasked && (
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
                )}
              </svg>
              {isLocationMasked && (
                <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4">
                  <p className="px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 text-xs font-bold shadow-lg">
                    Privacy Protected: Location sharing is paused while off duty.
                  </p>
                </div>
              )}
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
                    {isOperationalStaff ? 'Assigned Scholars' : 'Your Authorized Commuters'} ({scopedStopStudents.length})
                  </span>
                  <span className="text-[10px] font-medium text-stone-500">
                    {isOperationalStaff ? 'Tap to toggle status' : 'Privacy scoped'}
                  </span>
                </div>

                {scopedStopStudents.length > 0 ? (
                  <div className="space-y-2">
                    {scopedStopStudents.map((student) => {
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

                          {isOperationalStaff ? (
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
                          ) : (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {isBoarded ? 'Boarded' : isAbsent ? 'Absent' : 'Waiting'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-stone-400 text-xs">
                    {isOperationalStaff
                      ? 'Campus Gate 2 Turnstile • All 28 scholars disembark here'
                      : 'No assigned commuter for your family at this stop. Other families are hidden for privacy.'}
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
                  Student: {studentGeofenceInfo.studentName}
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
                <div className="h-[130px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

            {/* Live Route Simulation Controls */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span>Live Route Playback & Simulation</span>
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
                disabled={isDriverOffDuty}
                onChange={(e) => setProgress(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-600 disabled:opacity-50"
              />

              {/* Transport Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={isDriverOffDuty}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 ${
                      isPlaying && !isDriverOffDuty
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:bg-amber-200'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {isPlaying && !isDriverOffDuty ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isDriverOffDuty ? 'Paused (Off Duty)' : isPlaying ? 'Pause' : 'Resume Trip'}</span>
                  </button>

                  <button
                    onClick={handleAdvanceToNextStop}
                    disabled={isDriverOffDuty}
                    className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1 transition disabled:opacity-50"
                    title="Jump to Next Stop"
                  >
                    <span>Next Station</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setProgress(0.0)}
                    disabled={isDriverOffDuty}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition disabled:opacity-50"
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

            {/* Vehicle Safety & Status Diagnostics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
                <span className="text-[10px] font-mono text-stone-400 uppercase block">GPS Status</span>
                <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                  {isDriverOffDuty ? 'Masked (Off Duty)' : isOutsideAuthorizedGeofence ? 'Geofence Paused' : '14 Locked (5G)'}
                </span>
                <span className={`text-[10px] block ${isLocationMasked ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isLocationMasked ? 'Zero background pings' : '±1.2m Accuracy'}
                </span>
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
