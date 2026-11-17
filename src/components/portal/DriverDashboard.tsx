/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Bus,
  Navigation,
  MapPin,
  Check,
  X,
  Users,
  Radio,
  Clock,
  Gauge,
  Phone,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Zap,
  Lock,
  EyeOff,
} from 'lucide-react';
import {
  UserProfile,
  BusRouteInfo,
  BusStudent,
  BusStop,
  PassengerCategory,
  LeaveRequest,
  TransportOptInRequest,
} from '../../types';
import { soundEffects } from '../../utils/audioChime';
import { MlEtaPredictor } from '../../services/mlEtaPredictor';
import { BusMapLeaflet } from '../transit/BusMapLeaflet';
import {
  PRIMARY_ROAD_COORDINATES,
  BYPASS_ROAD_COORDINATES,
  JAKKUR_DEPOT_COORDS,
  interpolateAlongRoad,
  computeStopRoadProgresses,
  fetchOsrmRoadRoute,
  evaluateRoute14Geofence,
} from '../../services/roadRoutingService';

interface DriverDashboardProps {
  user: UserProfile;
  busRoute: BusRouteInfo;
  leaveRequests?: LeaveRequest[];
  transportRequests?: TransportOptInRequest[];
  onUpdateBusRoute: (updated: BusRouteInfo) => void;
  onSendNotification?: (title: string, message: string, type: 'info' | 'warning' | 'alert') => void;
  isDark?: boolean;
}

// Road-snapped OSM corridors provided by roadRoutingService.ts

const COMMUTE_DAYS = [
  { id: 'Today', label: 'Today (Live)', date: '2026-10-30' },
  { id: 'Mon', label: 'Monday', date: '2026-10-26' },
  { id: 'Tue', label: 'Tuesday', date: '2026-10-27' },
  { id: 'Wed', label: 'Wednesday', date: '2026-10-28' },
  { id: 'Thu', label: 'Thursday', date: '2026-10-29' },
  { id: 'Fri', label: 'Friday', date: '2026-10-30' },
];

function mapOptInRoleToCategory(role: string): PassengerCategory {
  if (role === 'student' || role === 'parent') return 'student';
  if (role === 'teacher') return 'teacher';
  if (role === 'admin' || role === 'principal') return 'admin';
  return 'staff';
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  user,
  busRoute,
  leaveRequests = [],
  transportRequests = [],
  onUpdateBusRoute,
  onSendNotification,
  isDark = false,
}) => {
  const [selectedStationFilter, setSelectedStationFilter] = useState<'all' | number>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PassengerCategory>('all');
  const [selectedDayId, setSelectedDayId] = useState<string>('Today');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-30');
  const [tripWindow, setTripWindow] = useState<'morning' | 'evening'>('morning');
  const [autoAdaptiveReroute, setAutoAdaptiveReroute] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number>(busRoute.currentStopIndex ? busRoute.currentStopIndex + 1 : 3);
  const [mapTileMode, setMapTileMode] = useState<'street' | 'dark' | 'satellite'>('street');
  const [followBus, setFollowBus] = useState<boolean>(true);
  const [activeRouteVariant, setActiveRouteVariant] = useState<'primary_corridor' | 'traffic_bypass_detour'>(
    busRoute.activeRouteVariant || 'primary_corridor'
  );

  const stops = busRoute.stops || [];
  const dutyStatus: 'ON_DUTY' | 'OFF_DUTY' = busRoute.dutyStatus === 'OFF_DUTY' ? 'OFF_DUTY' : 'ON_DUTY';
  const isOffDuty = dutyStatus === 'OFF_DUTY';
  const isSimulatedOffRoute = Boolean(busRoute.isSimulatedOffRoute);
  const currentSpeed = isOffDuty ? 0 : busRoute.currentSpeedKmH || 32;
  const progressPercent = busRoute.progressPercent ?? 48;
  const delayMinutes = busRoute.delayMinutes || 0;
  const isLocationSharingActive = !isOffDuty && !isSimulatedOffRoute && busRoute.isLocationSharingActive !== false;

  // Run real-time ML ETA Prediction based on current GPS telemetry & active corridor variant
  const mlPrediction = useMemo(() => {
    return MlEtaPredictor.predict(
      busRoute,
      progressPercent,
      currentSpeed,
      delayMinutes,
      undefined,
      undefined,
      activeRouteVariant
    );
  }, [busRoute, progressPercent, currentSpeed, delayMinutes, activeRouteVariant]);

  // Build merged manifest from busRoute.stops AND approved transportRequests (Students, Teachers, Staff, Admin)
  const allPassengers = useMemo(() => {
    const list: (BusStudent & {
      stopIndex: number;
      tripType?: 'both' | 'morning' | 'evening';
      isOnApprovedLeave?: boolean;
      leaveReason?: string;
      comingOnSelectedDay?: boolean;
    })[] = [];
    const seenKeys = new Set<string>();

    const checkLeaveForDate = (userKey?: string, name?: string) => {
      return leaveRequests.find((l) => {
        if (l.status !== 'APPROVED') return false;
        const matchesUser =
          (userKey && l.studentKey?.toLowerCase() === userKey.toLowerCase()) ||
          (name && l.studentName?.toLowerCase() === name.toLowerCase());
        if (!matchesUser) return false;
        return selectedDate >= l.from && selectedDate <= l.to;
      });
    };

    stops.forEach((stop, idx) => {
      (stop.students || []).forEach((stud) => {
        const keyId = (stud.userKey || stud.name).toLowerCase();
        seenKeys.add(keyId);
        const matchingOptIn = transportRequests.find(
          (tr) =>
            tr.status === 'APPROVED' &&
            (tr.userKey.toLowerCase() === keyId || tr.userName.toLowerCase() === stud.name.toLowerCase())
        );
        const tripType = matchingOptIn?.tripType || 'both';
        const leave = checkLeaveForDate(stud.userKey, stud.name);
        const tripMatches = tripType === 'both' || tripType === tripWindow;
        const comingOnSelectedDay = tripMatches && !leave && stud.status !== 'absent';

        list.push({
          ...stud,
          stopIndex: idx,
          tripType,
          isOnApprovedLeave: Boolean(leave),
          leaveReason: leave?.reason,
          comingOnSelectedDay,
        });
      });
    });

    // Include any newly approved transport opt-ins that aren't already in stops
    transportRequests
      .filter((tr) => tr.status === 'APPROVED')
      .forEach((tr) => {
        const keyId = tr.userKey.toLowerCase();
        if (seenKeys.has(keyId) || seenKeys.has(tr.userName.toLowerCase())) return;
        const stopIdx = Math.max(0, (tr.stopId || 1) - 1);
        const leave = checkLeaveForDate(tr.userKey, tr.userName);
        const tripMatches = tr.tripType === 'both' || tr.tripType === tripWindow;
        list.push({
          id: `opt-${tr.id}`,
          name: tr.userName,
          grade: tr.userRole === 'student' ? 'Opted Scholar' : `${tr.userRole.toUpperCase()} Commuter`,
          category: mapOptInRoleToCategory(tr.userRole),
          userKey: tr.userKey,
          stopId: tr.stopId,
          stopName: tr.stopName,
          status: leave ? 'absent' : 'waiting',
          seatNumber: tr.allocatedSeat || 'Assigned',
          optedTransport: true,
          transportFeePaid: tr.isFeePaid,
          stopIndex: stopIdx,
          tripType: tr.tripType,
          isOnApprovedLeave: Boolean(leave),
          leaveReason: leave?.reason,
          comingOnSelectedDay: tripMatches && !leave,
        });
      });

    return list;
  }, [stops, transportRequests, leaveRequests, selectedDate, tripWindow]);

  // Metrics required by driver:
  // 1. Students Picked Up + Faculty/Staff/Admin On Board
  // 2. Students To Be Dropped + Total To Be Dropped at Gate 2
  // 3. Waiting at Next Stops
  // 4. Coming Today vs Absent/Leave on selected date
  const studentPassengers = useMemo(
    () => allPassengers.filter((p) => (p.category || 'student') === 'student'),
    [allPassengers]
  );
  const nonStudentPassengers = useMemo(
    () => allPassengers.filter((p) => (p.category || 'student') !== 'student'),
    [allPassengers]
  );

  const studentsPickedUpCount = useMemo(
    () => studentPassengers.filter((p) => p.status === 'boarded').length,
    [studentPassengers]
  );
  const staffPickedUpCount = useMemo(
    () => nonStudentPassengers.filter((p) => p.status === 'boarded').length,
    [nonStudentPassengers]
  );
  const pickedUpCount = studentsPickedUpCount + staffPickedUpCount;

  // Students remaining to be dropped = boarded students + waiting students not yet dropped off
  const studentsToDropCount = useMemo(
    () => studentPassengers.filter((p) => p.status === 'boarded' || p.status === 'waiting').length,
    [studentPassengers]
  );
  const toDropCount = useMemo(
    () => allPassengers.filter((p) => p.status === 'boarded').length,
    [allPassengers]
  );

  const waitingCount = useMemo(
    () => allPassengers.filter((p) => p.status === 'waiting' && p.comingOnSelectedDay !== false).length,
    [allPassengers]
  );

  const absentCount = useMemo(
    () => allPassengers.filter((p) => p.status === 'absent' || p.isOnApprovedLeave).length,
    [allPassengers]
  );

  const comingOnDayCount = useMemo(
    () => allPassengers.filter((p) => p.comingOnSelectedDay !== false).length,
    [allPassengers]
  );

  // Current active stop & next stop
  const currentStopIndex = Math.min(
    stops.length - 1,
    Math.max(0, busRoute.currentStopIndex ?? Math.floor((progressPercent / 100) * (stops.length - 1)))
  );
  const currentStation = stops[currentStopIndex] || stops[0];
  const nextStation = stops[Math.min(stops.length - 1, currentStopIndex + 1)] || stops[stops.length - 1];

  // Road-snapped coordinates for current route variant
  const fallbackRoadPolyline =
    activeRouteVariant === 'traffic_bypass_detour'
      ? BYPASS_ROAD_COORDINATES
      : PRIMARY_ROAD_COORDINATES;

  const [snappedRoadPolyline, setSnappedRoadPolyline] = useState<[number, number][] | null>(null);

  const stopWaypoints = useMemo<[number, number][]>(
    () =>
      stops
        .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
        .map((s) => [s.lat as number, s.lng as number]),
    [stops]
  );

  const stopWaypointKey = useMemo(
    () => stopWaypoints.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';'),
    [stopWaypoints]
  );

  useEffect(() => {
    let cancelled = false;

    if (stopWaypoints.length < 2) {
      setSnappedRoadPolyline(null);
      return;
    }

    const waypointsWithDetour: [number, number][] =
      activeRouteVariant === 'traffic_bypass_detour' && stopWaypoints.length >= 3
        ? [
            ...stopWaypoints.slice(0, 2),
            [13.0695, 77.5865],
            ...stopWaypoints.slice(2),
          ]
        : stopWaypoints;

    fetchOsrmRoadRoute(waypointsWithDetour, fallbackRoadPolyline).then((coords) => {
      if (!cancelled) setSnappedRoadPolyline(coords);
    });

    return () => {
      cancelled = true;
    };
  }, [activeRouteVariant, stopWaypointKey]);

  const activePolyline = snappedRoadPolyline || fallbackRoadPolyline;

  const stopRoadProgresses = useMemo(
    () => computeStopRoadProgresses(activePolyline, stops),
    [activePolyline, stops]
  );

  const roadPosition = useMemo(
    () => interpolateAlongRoad(activePolyline, progressPercent / 100),
    [activePolyline, progressPercent]
  );

  // Off-route verification coordinate (~2.8 km outside Route 14 corridor near Nagawara ORR)
  const effectiveVehicleLat = isSimulatedOffRoute ? 13.0435 : roadPosition.lat;
  const effectiveVehicleLng = isSimulatedOffRoute ? 77.641 : roadPosition.lng;
  const currentGpsHeading = roadPosition.heading;

  // Automated Jakkur Campus Depot & Route 14 Corridor Geofence Evaluation
  const geofenceEvaluation = useMemo(
    () =>
      evaluateRoute14Geofence(
        effectiveVehicleLat,
        effectiveVehicleLng,
        activePolyline,
        JAKKUR_DEPOT_COORDS
      ),
    [effectiveVehicleLat, effectiveVehicleLng, activePolyline]
  );

  const isOutsideAuthorizedGeofence = !isOffDuty && !geofenceEvaluation.isAuthorizedZone;
  const isTelemetryMasked = isOffDuty || isOutsideAuthorizedGeofence || !isLocationSharingActive;

  // Filtered passenger roster for the selected day
  const filteredPassengers = useMemo(() => {
    return allPassengers.filter((p) => {
      if (selectedStationFilter !== 'all' && p.stopId !== selectedStationFilter) {
        return false;
      }
      if (categoryFilter !== 'all') {
        const cat = p.category || 'student';
        if (cat !== categoryFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchStop = p.stopName.toLowerCase().includes(q);
        const matchSeat = (p.seatNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchStop && !matchSeat) return false;
      }
      return true;
    });
  }, [allPassengers, selectedStationFilter, categoryFilter, searchQuery]);

  // Actions
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleSetDutyStatus = (nextDuty: 'ON_DUTY' | 'OFF_DUTY') => {
    if (nextDuty === dutyStatus) return;

    if (nextDuty === 'OFF_DUTY') {
      soundEffects.playAlertChime();
      showToast('Privacy Protected: Location sharing and background GPS pings paused for personal time.');
      if (onSendNotification) {
        onSendNotification(
          'Driver Off Duty — Privacy Active',
          `${busRoute.driverName} switched Route 14 to Off Duty / Personal Time. Live GPS sharing is paused.`,
          'info'
        );
      }
      onUpdateBusRoute({
        ...busRoute,
        dutyStatus: 'OFF_DUTY',
        isLocationSharingActive: false,
        currentSpeedKmH: 0,
        isEngineRunning: false,
        locationSharingStartedAt: undefined,
        telemetry: {
          speedKmH: 0,
          headingDeg: busRoute.telemetry?.headingDeg ?? 0,
          fuelPercent: busRoute.telemetry?.fuelPercent ?? 84,
          engineStatus: 'OFF',
          gpsSignal: 'MASKED_OFF_DUTY',
          satelliteCount: 0,
          doorStatus: 'CLOSED',
          acStatus: 'OFF',
          speedLimitKmH: busRoute.telemetry?.speedLimitKmH ?? 40,
          lastPingTime: 'Paused (Off Duty)',
          currentLat: 0,
          currentLng: 0,
          cabinTempC: busRoute.telemetry?.cabinTempC ?? 24,
          isMasked: true,
        },
      });
      return;
    }

    // Switching back ON_DUTY: automatically verify Jakkur Depot & Route 14 Geofence
    const insideAuthorizedZone = geofenceEvaluation.isAuthorizedZone;
    soundEffects.playSuccessChime();
    if (!insideAuthorizedZone) {
      showToast('On Duty active — Vehicle is outside Route 14 corridor geofence, so live broadcast stays paused.');
    } else {
      showToast(`On Duty: Route 14 Active (${geofenceEvaluation.zoneLabel}). Live tracking enabled.`);
    }

    onUpdateBusRoute({
      ...busRoute,
      dutyStatus: 'ON_DUTY',
      isLocationSharingActive: insideAuthorizedZone,
      currentSpeedKmH: insideAuthorizedZone ? 34 : 0,
      isEngineRunning: true,
      geofenceStatus: geofenceEvaluation.status,
      geofenceDistanceMeters: geofenceEvaluation.corridorDistanceMeters,
      locationSharingStartedAt: insideAuthorizedZone
        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
      telemetry: {
        speedKmH: insideAuthorizedZone ? 34 : 0,
        headingDeg: roadPosition.heading,
        fuelPercent: busRoute.telemetry?.fuelPercent ?? 84,
        engineStatus: 'RUNNING',
        gpsSignal: insideAuthorizedZone ? 'STRONG_5G' : 'PAUSED_GEOFENCE',
        satelliteCount: 14,
        doorStatus: 'CLOSED',
        acStatus: 'ON',
        speedLimitKmH: busRoute.telemetry?.speedLimitKmH ?? 40,
        lastPingTime: insideAuthorizedZone ? 'Just now' : 'Paused (Outside Geofence)',
        currentLat: insideAuthorizedZone ? roadPosition.lat : 0,
        currentLng: insideAuthorizedZone ? roadPosition.lng : 0,
        cabinTempC: busRoute.telemetry?.cabinTempC ?? 23.5,
        isMasked: !insideAuthorizedZone,
      },
    });
  };

  const handleToggleOffRouteSimulation = () => {
    const nextOffRoute = !isSimulatedOffRoute;
    const simulatedLat = nextOffRoute ? 13.0435 : roadPosition.lat;
    const simulatedLng = nextOffRoute ? 77.641 : roadPosition.lng;
    const evalResult = evaluateRoute14Geofence(
      simulatedLat,
      simulatedLng,
      activePolyline,
      JAKKUR_DEPOT_COORDS
    );

    if (nextOffRoute) {
      soundEffects.playAlertChime();
      showToast(
        `Geofence Triggered: Vehicle ${evalResult.corridorDistanceMeters}m outside Route 14 corridor — live parent broadcast paused & masked.`
      );
    } else {
      soundEffects.playSuccessChime();
      showToast(
        `Entered ${evalResult.zoneLabel} — Route 14 corridor geofence verified.`
      );
    }

    const canBroadcast = dutyStatus === 'ON_DUTY' && evalResult.isAuthorizedZone;
    onUpdateBusRoute({
      ...busRoute,
      isSimulatedOffRoute: nextOffRoute,
      geofenceStatus: evalResult.status,
      geofenceDistanceMeters: evalResult.corridorDistanceMeters,
      isLocationSharingActive: canBroadcast,
      telemetry: {
        speedKmH: canBroadcast ? currentSpeed : 0,
        headingDeg: roadPosition.heading,
        fuelPercent: busRoute.telemetry?.fuelPercent ?? 84,
        engineStatus: dutyStatus === 'OFF_DUTY' ? 'OFF' : 'RUNNING',
        gpsSignal: dutyStatus === 'OFF_DUTY' ? 'MASKED_OFF_DUTY' : evalResult.isAuthorizedZone ? 'STRONG_5G' : 'PAUSED_GEOFENCE',
        satelliteCount: dutyStatus === 'OFF_DUTY' ? 0 : 14,
        doorStatus: 'CLOSED',
        acStatus: dutyStatus === 'OFF_DUTY' ? 'OFF' : 'ON',
        speedLimitKmH: busRoute.telemetry?.speedLimitKmH ?? 40,
        lastPingTime: canBroadcast ? 'Just now' : 'Paused (Outside Geofence)',
        currentLat: canBroadcast ? roadPosition.lat : 0,
        currentLng: canBroadcast ? roadPosition.lng : 0,
        cabinTempC: busRoute.telemetry?.cabinTempC ?? 23.5,
        isMasked: !canBroadcast,
      },
    });
  };

  const handleToggleLocationSharing = () => {
    if (isOffDuty) {
      soundEffects.playAlertChime();
      showToast('Switch Shift Duty to "On Duty: Route 14 Active" before starting live location sharing.');
      return;
    }
    if (!geofenceEvaluation.isAuthorizedZone) {
      soundEffects.playAlertChime();
      showToast('Geofence Protection: Live broadcast only starts inside Jakkur Campus Depot or Route 14 corridor.');
      return;
    }

    const nextState = !isLocationSharingActive;
    if (nextState) {
      soundEffects.playSuccessChime();
      showToast('GPS Broadcast Live: Registered parents on Route 14 can now see your live bus tracking.');
      if (onSendNotification) {
        onSendNotification(
          'Driver Broadcast Live',
          `Mr. Manjunath has initiated live location sharing for Route 14.`,
          'info'
        );
      }
    } else {
      soundEffects.playAlertChime();
      showToast('Location Sharing Paused: Live updates are paused for parents (showing scheduled timetable).');
      if (onSendNotification) {
        onSendNotification(
          'Driver Broadcast Paused',
          `Driver has temporarily paused location sharing.`,
          'warning'
        );
      }
    }

    onUpdateBusRoute({
      ...busRoute,
      isLocationSharingActive: nextState,
      geofenceStatus: geofenceEvaluation.status,
      geofenceDistanceMeters: geofenceEvaluation.corridorDistanceMeters,
      locationSharingStartedAt: nextState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    });
  };

  const handleUpdatePassengerStatus = (
    stopId: number,
    passengerId: string,
    newStatus: 'boarded' | 'waiting' | 'absent' | 'dropped_off'
  ) => {
    soundEffects.playSuccessChime();
    const updatedStops = stops.map((st) => {
      if (st.id === stopId) {
        return {
          ...st,
          students: (st.students || []).map((p) => {
            if (p.id === passengerId) {
              return {
                ...p,
                status: newStatus,
                boardedTime: newStatus === 'boarded' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : p.boardedTime,
                droppedTime: newStatus === 'dropped_off' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              };
            }
            return p;
          }),
        };
      }
      return st;
    });

    const targetPassenger = allPassengers.find((p) => p.id === passengerId);
    if (newStatus === 'boarded') {
      showToast(`Passenger Checked In: ${targetPassenger?.name} (${targetPassenger?.grade || targetPassenger?.category}) boarded at Seat ${targetPassenger?.seatNumber || 'N/A'}`);
    } else if (newStatus === 'dropped_off') {
      showToast(`Passenger Disembarked: ${targetPassenger?.name} dropped off at Gate 2.`);
    } else if (newStatus === 'absent') {
      showToast(`Marked Absent: ${targetPassenger?.name} skipped for today's morning trip.`);
    }

    onUpdateBusRoute({
      ...busRoute,
      stops: updatedStops,
      studentsBoardedCount: updatedStops.reduce((acc, st) => acc + (st.students || []).filter((p) => p.status === 'boarded').length, 0),
    });
  };

  const handleDropAllBoardedPassengers = () => {
    soundEffects.playSuccessChime();
    const updatedStops = stops.map((st) => ({
      ...st,
      students: (st.students || []).map((p) => {
        if (p.status === 'boarded') {
          return {
            ...p,
            status: 'dropped_off' as const,
            droppedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return p;
      }),
    }));

    showToast(`All ${pickedUpCount} boarded scholars & faculty safely dropped off at Gate 2 Drop Zone.`);
    onUpdateBusRoute({
      ...busRoute,
      stops: updatedStops,
      studentsBoardedCount: 0,
      liveStatus: 'ARRIVED_CAMPUS',
    });
  };

  const handleSwitchRouteVariant = (variant: 'primary_corridor' | 'traffic_bypass_detour') => {
    soundEffects.playNoticeChime();
    setActiveRouteVariant(variant);
    const msg =
      variant === 'traffic_bypass_detour'
        ? 'Engaged Jakkur Plantation Bypass Detour. Bypassing NH44 Bellary underpass traffic (ML Predicted ETA: 08:13 AM - Saves 5 min).'
        : 'Restored Primary NH44 Corridor route.';
    showToast(msg);
    onUpdateBusRoute({
      ...busRoute,
      activeRouteVariant: variant,
    });
  };

  const handleAdvanceToNextStop = () => {
    if (isOffDuty) {
      soundEffects.playAlertChime();
      showToast('Switch Shift Duty to "On Duty: Route 14 Active" before advancing stops.');
      return;
    }

    soundEffects.playSuccessChime();
    const nextIdx = Math.min(stops.length - 1, currentStopIndex + 1);
    const roadFraction = stopRoadProgresses[nextIdx] ?? nextIdx / Math.max(1, stops.length - 1);
    const stepProgress = Math.round(roadFraction * 100);
    const nextPos = interpolateAlongRoad(activePolyline, roadFraction);

    const updatedStops: BusStop[] = stops.map((st, i) => {
      if (i < nextIdx) return { ...st, status: 'passed' as const };
      if (i === nextIdx) return { ...st, status: 'current' as const };
      return { ...st, status: 'upcoming' as const };
    });

    const canBroadcast = !isOutsideAuthorizedGeofence && isLocationSharingActive;

    onUpdateBusRoute({
      ...busRoute,
      currentStopIndex: nextIdx,
      progressPercent: stepProgress,
      currentLocationName: canBroadcast ? `At ${stops[nextIdx].name}` : 'Paused (Privacy Protected)',
      nextStop: stops[Math.min(stops.length - 1, nextIdx + 1)].name,
      stops: updatedStops,
      telemetry: {
        speedKmH: canBroadcast ? currentSpeed : 0,
        headingDeg: nextPos.heading,
        fuelPercent: busRoute.telemetry?.fuelPercent ?? 84,
        engineStatus: busRoute.telemetry?.engineStatus ?? 'RUNNING',
        gpsSignal: canBroadcast ? (busRoute.telemetry?.gpsSignal ?? 'STRONG_5G') : 'PAUSED_GEOFENCE',
        satelliteCount: busRoute.telemetry?.satelliteCount ?? 14,
        doorStatus: 'OPEN',
        acStatus: busRoute.telemetry?.acStatus ?? 'ON',
        speedLimitKmH: busRoute.telemetry?.speedLimitKmH ?? 40,
        lastPingTime: canBroadcast ? 'Just now' : 'Paused (Outside Geofence)',
        currentLat: canBroadcast ? nextPos.lat : 0,
        currentLng: canBroadcast ? nextPos.lng : 0,
        cabinTempC: busRoute.telemetry?.cabinTempC ?? 23.5,
        isMasked: !canBroadcast,
      },
    });

    showToast(`Navigating to Stop #${nextIdx + 1}: ${stops[nextIdx].name}`);
  };

  const handleReportTrafficDelay = (mins: number) => {
    soundEffects.playAlertChime();
    const newDelay = (busRoute.delayMinutes || 0) + mins;
    const nextVariant =
      autoAdaptiveReroute && newDelay >= 5
        ? 'traffic_bypass_detour'
        : activeRouteVariant;

    if (nextVariant !== activeRouteVariant) {
      setActiveRouteVariant(nextVariant);
      showToast(
        `Heavy NH44 traffic detected (+${newDelay}m delay) — Auto-rerouted via Jakkur Plantation Bypass to optimize ETA.`
      );
    } else {
      showToast(`Logged +${mins} min traffic delay. ML ETA recalculation triggered.`);
    }

    onUpdateBusRoute({
      ...busRoute,
      delayMinutes: newDelay,
      currentSpeedKmH: Math.max(16, (busRoute.currentSpeedKmH || 34) - 6),
      liveStatus: newDelay >= 10 ? 'DELAYED_10_MIN' : 'DELAYED_5_MIN',
      activeRouteVariant: nextVariant,
    });
  };

  const handleClearTraffic = () => {
    soundEffects.playSuccessChime();
    setActiveRouteVariant('primary_corridor');
    showToast('Traffic cleared on NH44 corridor. Restored Primary Route 14 & normal speed.');
    onUpdateBusRoute({
      ...busRoute,
      delayMinutes: 0,
      currentSpeedKmH: 34,
      liveStatus: 'ON_SCHEDULE',
      activeRouteVariant: 'primary_corridor',
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-stone-900 text-white font-bold text-xs flex items-center justify-between gap-3 shadow-2xl border border-amber-500/50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= DRIVER CABIN HEADER & SHIFT DUTY TERMINAL ================= */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white shadow-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOffDuty ? 'bg-slate-400' : isOutsideAuthorizedGeofence ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-400">
                Driver Pilot Terminal • Cabin Console
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                {busRoute.vehicleNumber} (Route 14 Express)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
              <span>Welcome, {user.name}</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Live turn-by-turn navigation, real-time passenger pickup/drop tally, daily passenger attendance manifest, and privacy-first shift geofencing.
            </p>
          </div>

          {/* Shift Duty Toggle + Broadcast Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Prominent Shift Duty Segmented Toggle Switch */}
            <div
              role="radiogroup"
              aria-label="Driver Shift Duty Toggle"
              className="p-1 rounded-2xl bg-slate-950/80 border border-slate-700 flex items-center gap-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={isOffDuty}
                onClick={() => handleSetDutyStatus('OFF_DUTY')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isOffDuty
                    ? 'bg-slate-700 text-white shadow-sm border border-slate-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Off Duty / Personal Time</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!isOffDuty}
                onClick={() => handleSetDutyStatus('ON_DUTY')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  !isOffDuty
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${!isOffDuty ? 'animate-pulse' : ''}`} />
                <span>On Duty: Route 14 Active</span>
              </button>
            </div>

            {!isOffDuty && (
              <button
                type="button"
                onClick={handleToggleLocationSharing}
                className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                  isLocationSharingActive
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/40'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                }`}
              >
                <Radio className={`w-4 h-4 ${isLocationSharingActive ? 'animate-pulse' : ''}`} />
                <span>
                  {isLocationSharingActive
                    ? 'Live Tracking On'
                    : isOutsideAuthorizedGeofence
                    ? 'Outside Geofence'
                    : 'Start Live Share'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Off-Duty Privacy Banner */}
        {isOffDuty && (
          <div
            role="status"
            className="p-4 sm:p-5 rounded-2xl bg-slate-800/90 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">
                  Privacy Protected: Location sharing is paused while off duty.
                </p>
                <p className="text-xs text-slate-300">
                  All live GPS coordinate transmission and background location pings are paused and masked during personal time. Switch to <strong>On Duty: Route 14 Active</strong> at Jakkur Campus depot to begin your school run.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSetDutyStatus('ON_DUTY')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Resume Route 14 Duty
            </button>
          </div>
        )}

        {/* Automated Geofence Privacy Banner when On Duty but Outside Corridor */}
        {isOutsideAuthorizedGeofence && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-amber-200">
                  Geofence Protection Active: Vehicle Outside Route 14 & Jakkur Depot
                </p>
                <p className="text-xs text-amber-100/80">
                  Vehicle is {geofenceEvaluation.corridorDistanceMeters.toLocaleString()}m from the Route 14 corridor. Live parent broadcast is automatically masked until returning to an authorized school corridor or Jakkur Campus depot.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleOffRouteSimulation}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Return to Route 14 Corridor
            </button>
          </div>
        )}

        {/* ================= VITAL COUNTERS REQUIRED BY DRIVER ================= */}
        {/* 1. Students & Staff Picked Up, 2. Students & Total To Be Dropped, 3. Waiting, 4. Coming vs Absent */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* 1. Students Picked Up */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] text-emerald-400 font-mono uppercase block font-bold">
              1. Students Picked Up
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
                {studentsPickedUpCount}
              </span>
              <span className="text-[11px] text-emerald-300">
                (+{staffPickedUpCount} Staff/Faculty)
              </span>
            </div>
            <span className="text-[10px] text-stone-400 block truncate">
              {pickedUpCount} total passengers on board
            </span>
          </div>

          {/* 2. Students To Be Dropped */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
            <span className="text-[10px] text-amber-400 font-mono uppercase block font-bold">
              2. Students To Be Dropped
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
                {studentsToDropCount}
              </span>
              <span className="text-[11px] text-amber-300">
                ({toDropCount} on board now)
              </span>
            </div>
            <span className="text-[10px] text-stone-400 block truncate">
              Gate 2 ML ETA: {mlPrediction.stopPredictions[4]?.predictedEta || '08:18 AM'}
            </span>
          </div>

          {/* 3. Coming By Bus Today / Next Stops */}
          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-1">
            <span className="text-[10px] text-sky-400 font-mono uppercase block font-bold">
              3. Coming By Bus ({selectedDayId})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
                {comingOnDayCount}
              </span>
              <span className="text-[11px] text-sky-300">
                ({waitingCount} awaiting stop)
              </span>
            </div>
            <span className="text-[10px] text-stone-400 block truncate">
              Next Stop: {nextStation.shortName || nextStation.name}
            </span>
          </div>

          {/* 4. Absent / Approved Leave */}
          <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700 space-y-1">
            <span className="text-[10px] text-stone-400 font-mono uppercase block font-bold">
              4. Absent / Leave ({selectedDayId})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
                {absentCount}
              </span>
              <span className="text-[11px] text-stone-400">not riding</span>
            </div>
            <span className="text-[10px] text-stone-500 block truncate">
              Synced with leave registry
            </span>
          </div>
        </div>
      </div>

      {/* ================= DYNAMIC ROUTE TO GO & ML TRAFFIC REROUTING ================= */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-stone-800 shadow-md p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-orange-600" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                Route To Go & Machine Learning Navigation
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              The navigation path adapts dynamically according to live arterial congestion and ML predicted ETAs.
            </p>
          </div>

          {/* Route Variant Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold">
            <button
              onClick={() => handleSwitchRouteVariant('primary_corridor')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeRouteVariant === 'primary_corridor'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Primary (via NH44 Underpass)
            </button>
            <button
              onClick={() => handleSwitchRouteVariant('traffic_bypass_detour')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activeRouteVariant === 'traffic_bypass_detour'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>ML Detour (Jakkur Bypass)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Detour Recommendation Alert if Traffic High */}
        {mlPrediction.recommendedRouteVariant === 'traffic_bypass_detour' && activeRouteVariant !== 'traffic_bypass_detour' && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400 text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-extrabold font-display block text-sm">
                  ML Dynamic Detour Recommended: Heavy Congestion on NH 44 Underpass
                </span>
                <p className="text-[11px] text-stone-600 dark:text-amber-300/80">
                  Switching to the Jakkur Plantation Bypass saves ~{mlPrediction.detourTimeSavedMinutes} minutes (Predicted Gate 2 Arrival: {mlPrediction.detourRouteEtaMinutes}m vs {mlPrediction.primaryRouteEtaMinutes}m).
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSwitchRouteVariant('traffic_bypass_detour')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition shrink-0 cursor-pointer"
            >
              Engage ML Detour Route
            </button>
          </div>
        )}

        {/* Current Active Waypoint Banner */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold font-mono text-sm shadow-xs shrink-0">
              {currentStopIndex + 1}
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-mono uppercase block font-bold">
                Current Heading & Station
              </span>
              <span className="text-base font-extrabold text-stone-900 dark:text-stone-100 font-display">
                {currentStation.name}
              </span>
              <span className="text-[11px] text-stone-500 block">
                Next: {nextStation.name} • Speed Limit: 40 km/h
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAdvanceToNextStop}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Arrived at Station</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {currentStopIndex === stops.length - 1 && pickedUpCount > 0 && (
              <button
                onClick={handleDropAllBoardedPassengers}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Drop All {pickedUpCount} at Gate 2</span>
              </button>
            )}

            <button
              onClick={() => handleReportTrafficDelay(5)}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-amber-50 text-stone-700 dark:text-stone-300 font-semibold text-xs transition"
            >
              +5m Traffic Surge
            </button>

            {(busRoute.delayMinutes || 0) > 0 && (
              <button
                onClick={handleClearTraffic}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition"
              >
                Clear Traffic
              </button>
            )}

            <button
              type="button"
              onClick={() => setAutoAdaptiveReroute((v) => !v)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                autoAdaptiveReroute
                  ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300'
                  : 'border-stone-200 dark:border-stone-700 text-stone-500'
              }`}
            >
              Auto-Reroute: {autoAdaptiveReroute ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Automated Jakkur Depot & Route 14 Geofence Monitor */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOffDuty
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : geofenceEvaluation.isAuthorizedZone
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Automated Geofence: {isOffDuty ? 'Masked (Off Duty)' : geofenceEvaluation.zoneLabel}
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {isOffDuty
                    ? 'GPS Ping: Paused'
                    : `Corridor offset: ${geofenceEvaluation.corridorDistanceMeters}m · Depot: ${(geofenceEvaluation.depotDistanceMeters / 1000).toFixed(2)} km`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Jakkur Campus depot (500m radius) and Route 14 corridor (650m buffer) enforce privacy-first automatic broadcast gating.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleOffRouteSimulation}
            disabled={isOffDuty}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isSimulatedOffRoute
                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isSimulatedOffRoute ? 'Return to Route 14 Corridor' : 'Test Outside-Corridor Geofence'}
          </button>
        </div>

        {/* Real GPS Map View for Driver (with Privacy Masking when Off Duty or Outside Geofence) */}
        <div className="space-y-2">
          <BusMapLeaflet
            busRoute={busRoute}
            currentLat={roadPosition.lat}
            currentLng={roadPosition.lng}
            headingDeg={currentGpsHeading}
            selectedStopId={selectedStopId}
            onSelectStop={(id) => setSelectedStopId(id)}
            isDark={isDark}
            mapTileMode={mapTileMode}
            onChangeMapTileMode={setMapTileMode}
            followBus={!isTelemetryMasked && followBus}
            onToggleFollowBus={() => setFollowBus((f) => !f)}
            routeCoordinates={activePolyline}
            isLocationMasked={isTelemetryMasked}
            maskedReason={isOffDuty ? 'off_duty' : isOutsideAuthorizedGeofence ? 'geofence' : 'paused'}
          />
        </div>

        {/* ML Predicted Station ETAs Strip */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Machine Learning ETA Station Arrival Matrix ({mlPrediction.algorithm})</span>
            </span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              Confidence: {mlPrediction.overallConfidencePercent}% • MAE: ±{mlPrediction.meanAbsoluteErrorMinutes}m
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {mlPrediction.stopPredictions.map((pred, idx) => (
              <div
                key={pred.stopId}
                className={`p-3 rounded-xl border text-xs space-y-1 transition ${
                  idx === currentStopIndex
                    ? 'bg-orange-50 dark:bg-stone-850 border-orange-300 dark:border-orange-800'
                    : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-750'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-stone-400 font-bold">Stop #{pred.stopId}</span>
                  <span className={`text-[10px] font-bold ${
                    pred.congestionLevel === 'CRITICAL'
                      ? 'text-rose-600'
                      : pred.congestionLevel === 'HEAVY'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {pred.congestionLevel}
                  </span>
                </div>
                <span className="font-bold text-stone-800 dark:text-stone-200 block truncate" title={pred.stopName}>
                  {pred.stopName.split(' ')[0]} {pred.stopName.split(' ')[1] || ''}
                </span>
                <div className="flex items-baseline justify-between font-mono pt-1">
                  <span className="text-[10px] text-stone-400">ML ETA:</span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-400 text-xs">
                    {pred.predictedEta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= DAILY PASSENGER MANIFEST (STUDENTS, TEACHERS, STAFF, ADMIN) ================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-stone-800 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                Who Is Coming By Bus • {selectedDayId} ({selectedDate})
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {comingOnDayCount} confirmed riders across Students, Teachers, Staff & Admin • Cross-checked with approved leave & trip schedules.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passenger or seat..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Roles ({allPassengers.length})</option>
              <option value="student">Students Only ({studentPassengers.length})</option>
              <option value="teacher">Teachers / Faculty</option>
              <option value="staff">Staff & Security</option>
              <option value="admin">Administration</option>
            </select>

            {/* Stop Filter */}
            <select
              value={selectedStationFilter}
              onChange={(e) => setSelectedStationFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Stations (5 Stops)</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  Stop #{s.id}: {s.shortName || s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Particular Day & Trip Window Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {COMMUTE_DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDayId(d.id);
                  setSelectedDate(d.date);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  selectedDayId === d.id
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-orange-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedDayId(e.target.value);
              }}
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono"
            />
            <div className="flex items-center p-0.5 rounded-lg bg-stone-200/70 dark:bg-stone-900">
              {(['morning', 'evening'] as const).map((tw) => (
                <button
                  key={tw}
                  type="button"
                  onClick={() => setTripWindow(tw)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition ${
                    tripWindow === tw
                      ? 'bg-white dark:bg-stone-700 text-orange-600 shadow-2xs'
                      : 'text-stone-500'
                  }`}
                >
                  {tw} Run
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Passenger Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPassengers.map((passenger) => {
            const isBoarded = passenger.status === 'boarded';
            const isAbsent = passenger.status === 'absent';
            const isDropped = passenger.status === 'dropped_off';
            const isWaiting = passenger.status === 'waiting';
            const cat = passenger.category || 'student';

            return (
              <div
                key={passenger.id}
                className={`p-4 rounded-2xl border transition text-xs space-y-3 ${
                  isBoarded
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                    : isAbsent
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-80'
                    : isDropped
                    ? 'bg-stone-100 dark:bg-stone-800/60 border-stone-300 dark:border-stone-700'
                    : 'bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-750'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {passenger.name}
                      </span>
                      {/* Role Pill */}
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                          cat === 'teacher'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : cat === 'staff'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : cat === 'admin'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                        }`}
                      >
                        {cat}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Seat {passenger.seatNumber || 'Unassigned'}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-500">
                      {passenger.grade || passenger.department} • Pickup: <span className="font-semibold text-stone-700 dark:text-stone-300">{passenger.stopName}</span>
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase font-mono ${
                      isBoarded
                        ? 'bg-emerald-600 text-white'
                        : isAbsent
                        ? 'bg-rose-600 text-white'
                        : isDropped
                        ? 'bg-stone-600 text-white'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {isBoarded
                      ? `Boarded (${passenger.boardedTime || 'Live'})`
                      : isDropped
                      ? 'Dropped Off'
                      : isAbsent
                      ? 'Absent Today'
                      : 'Waiting at Stop'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5">
                    {passenger.parentPhone && (
                      <a
                        href={`tel:${passenger.parentPhone}`}
                        className="hover:text-orange-600 flex items-center gap-1 font-semibold"
                      >
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{passenger.parentName || 'Contact'}: {passenger.parentPhone}</span>
                      </a>
                    )}
                  </div>

                  {/* Driver Actions: Board, Mark Absent, Drop Off */}
                  <div className="flex items-center gap-1.5">
                    {!isBoarded && !isDropped && (
                      <button
                        onClick={() => handleUpdatePassengerStatus(passenger.stopId, passenger.id, 'boarded')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        title="Check-in scholar upon boarding"
                      >
                        <Check className="w-3 h-3" />
                        <span>Board</span>
                      </button>
                    )}

                    {isBoarded && (
                      <button
                        onClick={() => handleUpdatePassengerStatus(passenger.stopId, passenger.id, 'dropped_off')}
                        className="px-2.5 py-1 rounded-lg bg-stone-700 hover:bg-stone-800 text-white font-bold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        title="Mark dropped off at campus"
                      >
                        <span>Drop Off</span>
                      </button>
                    )}

                    {!isAbsent && !isBoarded && !isDropped && (
                      <button
                        onClick={() => handleUpdatePassengerStatus(passenger.stopId, passenger.id, 'absent')}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-rose-100 text-stone-600 dark:text-stone-400 hover:text-rose-700 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="Mark passenger absent for today"
                      >
                        <X className="w-3 h-3" />
                        <span>Absent</span>
                      </button>
                    )}

                    {(isBoarded || isAbsent || isDropped) && (
                      <button
                        onClick={() => handleUpdatePassengerStatus(passenger.stopId, passenger.id, 'waiting')}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                        title="Reset status to Waiting"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPassengers.length === 0 && (
            <div className="col-span-full py-12 text-center text-stone-400 text-xs">
              No passengers matched the selected station or category filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
