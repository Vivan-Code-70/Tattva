/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  Compass,
  AlertCircle,
  Users,
  UserCheck,
  Building2,
  BookOpen,
  Shield,
  Layers,
  Thermometer,
  Wind,
  Volume2,
  X,
  ChevronRight,
  Sparkles,
  MapPin,
  Maximize2,
  CloudSun,
  Sun,
  CloudRain,
  Droplets,
  Gauge,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { errorReportingService } from '../services/errorService';
import { weatherService, JakkurWeatherData } from '../services/weatherService';

interface CampusHologramProps {
  isDark?: boolean;
}

export interface CampusHotspot {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  category: 'Classrooms & STEM' | 'Library & Hub' | 'Administration' | 'Robotics & Labs' | 'Gate & Safety';
  coords: [number, number, number];
  cameraAngle: number;
  occupancy: {
    current: number;
    max: number;
    percentage: number;
    status: 'Optimal' | 'High' | 'Moderate';
  };
  staffPresent: Array<{
    name: string;
    role: string;
    room: string;
    status: 'In Session' | 'Available' | 'On Duty';
  }>;
  activeClassrooms: Array<{
    room: string;
    grade: string;
    subject: string;
    teacher: string;
    students: number;
  }>;
  environment: {
    temp: string;
    aqi: string;
    noise: string;
    hvac: string;
  };
  summary: string;
}

export const CAMPUS_HOTSPOTS: CampusHotspot[] = [
  {
    id: 'academic-core',
    name: 'Academic Central Block (Classrooms & STEM)',
    shortName: 'Classrooms Block',
    badge: 'Main Academic Block',
    category: 'Classrooms & STEM',
    coords: [0, 18.2, 0],
    cameraAngle: -0.5,
    occupancy: {
      current: 142,
      max: 160,
      percentage: 88.8,
      status: 'High',
    },
    staffPresent: [
      {
        name: 'Ms. Susmita',
        role: 'Senior Faculty, Physics & Mathematics',
        room: 'Room 302 (3rd Floor)',
        status: 'In Session',
      },
      {
        name: 'Dr. K. Ramesh',
        role: 'Head of Chemistry & Materials Science',
        room: 'STEM Lab 201',
        status: 'Available',
      },
      {
        name: 'Ms. Ananya Rao',
        role: 'Humanities & English Fellow',
        room: 'Room 204 (2nd Floor)',
        status: 'In Session',
      },
      {
        name: 'Mr. Pradeep Kumar',
        role: 'Senior Kannada & Linguistics Faculty',
        room: 'Room 105 (1st Floor)',
        status: 'Available',
      },
    ],
    activeClassrooms: [
      {
        room: 'Room 302',
        grade: 'Grade 10-A',
        subject: 'Physics: Wave Mechanics & Optics',
        teacher: 'Ms. Susmita',
        students: 28,
      },
      {
        room: 'Room 204',
        grade: 'Grade 8-B',
        subject: 'Mathematics: Coordinate Geometry',
        teacher: 'Ms. Ananya Rao',
        students: 32,
      },
      {
        room: 'STEM Lab 201',
        grade: 'Grade 9',
        subject: 'Chemistry: Molecular Thermodynamics',
        teacher: 'Dr. K. Ramesh',
        students: 26,
      },
      {
        room: 'Room 105',
        grade: 'Grade 7',
        subject: 'Biology: Cell Division & Genetics',
        teacher: 'Mr. Pradeep Kumar',
        students: 24,
      },
    ],
    environment: {
      temp: '23.8°C',
      aqi: '42 AQI (Good)',
      noise: '44 dB (Study Mode)',
      hvac: 'Central VAV Level 2 Active',
    },
    summary:
      'Core 4-storey academic building housing secondary cohorts, multimedia classrooms, digital blackboards, and STEM experimental pods.',
  },
  {
    id: 'resource-centre',
    name: 'Open Learning Resource Centre & Library',
    shortName: 'Library & Resource Hub',
    badge: 'Library & Digital Media',
    category: 'Library & Hub',
    coords: [-1.7, 8.5, 7.5],
    cameraAngle: -0.5,
    occupancy: {
      current: 38,
      max: 50,
      percentage: 76,
      status: 'Optimal',
    },
    staffPresent: [
      {
        name: 'Mr. Raghavan N.',
        role: 'Head Librarian & Archivist',
        room: 'Circulation & Reference Desk',
        status: 'Available',
      },
      {
        name: 'Ms. Kavita Sundaram',
        role: 'Digital Learning & VR Curator',
        room: 'Holo-Pod Media Lab',
        status: 'Available',
      },
    ],
    activeClassrooms: [
      {
        room: 'Holo-Pods 1–4',
        grade: 'Grade 10-A',
        subject: '3D Spatial Biology Simulation',
        teacher: 'Ms. Kavita Sundaram',
        students: 8,
      },
      {
        room: 'Silent Reading Bay',
        grade: 'Cohort Mixed',
        subject: 'Independent Research & Study',
        teacher: 'Mr. Raghavan N.',
        students: 18,
      },
      {
        room: 'Terracotta Balcony Alcove',
        grade: 'Grade 8-B',
        subject: 'Philosophy Discussion Circle',
        teacher: 'Peer Study Lead',
        students: 12,
      },
    ],
    environment: {
      temp: '22.2°C',
      aqi: '38 AQI (Pristine)',
      noise: '32 dB (Whisper Quiet)',
      hvac: 'Quiet Flow Filter Active',
    },
    summary:
      'Terracotta jali-screened learning hub featuring 10,000+ volumes, 4 VR holographic study pods, and peer discussion lounges.',
  },
  {
    id: 'admin-pavilion',
    name: 'Administrative & Academic Directorate',
    shortName: 'Administration Suite',
    badge: 'Operations & Leadership',
    category: 'Administration',
    coords: [14, 4.0, 6],
    cameraAngle: -1.75,
    occupancy: {
      current: 14,
      max: 20,
      percentage: 70,
      status: 'Optimal',
    },
    staffPresent: [
      {
        name: 'Ms. Sandhya',
        role: 'Super Admin, Director of Academics',
        room: 'Director Suite 101',
        status: 'Available',
      },
      {
        name: 'Ms. Amrita',
        role: 'Head of Operations & Admissions',
        room: 'Operations Suite 102',
        status: 'Available',
      },
      {
        name: 'Ms. Bharthi',
        role: 'Support Coordinator & Desk Officer',
        room: 'Support Desk 104',
        status: 'On Duty',
      },
    ],
    activeClassrooms: [
      {
        room: 'Admissions Bay',
        grade: 'Incoming Cohort',
        subject: 'Parent Counseling & Virtual Tours',
        teacher: 'Ms. Amrita',
        students: 4,
      },
      {
        room: 'Operations Suite',
        grade: 'Staff Conference',
        subject: '12-Hour Timetable Scheduling Review',
        teacher: 'Ms. Bharthi',
        students: 6,
      },
      {
        room: 'Directorate',
        grade: 'Administration',
        subject: 'Supervision & Academic Audit Sync',
        teacher: 'Ms. Sandhya',
        students: 4,
      },
    ],
    environment: {
      temp: '23.0°C',
      aqi: '40 AQI (Good)',
      noise: '48 dB (Normal)',
      hvac: 'Eco-Smart Cooling On',
    },
    summary:
      'Executive pavilion housing the academic directorate, super admin console, coordinator triage desk, and visitor reception.',
  },
  {
    id: 'research-tower',
    name: 'Neural Robotics & Applied Science Annex',
    shortName: 'Robotics & STEM Annex',
    badge: 'Research Labs',
    category: 'Robotics & Labs',
    coords: [-17, 10.2, -8],
    cameraAngle: 1.75,
    occupancy: {
      current: 48,
      max: 60,
      percentage: 80,
      status: 'Optimal',
    },
    staffPresent: [
      {
        name: 'Prof. Devendra Joshi',
        role: 'Dean of Neural Computing & Robotics',
        room: 'Robotics Bay 401',
        status: 'In Session',
      },
      {
        name: 'Ms. Shilpa M.',
        role: 'Molecular Biotech Lab Scientist',
        room: 'Cleanroom Lab A',
        status: 'Available',
      },
    ],
    activeClassrooms: [
      {
        room: 'Robotics Bay 401',
        grade: 'Grade 10 Olympiad',
        subject: 'Autonomous Robotics & Kinematics',
        teacher: 'Prof. Devendra Joshi',
        students: 22,
      },
      {
        room: 'Cleanroom Lab A',
        grade: 'Grade 9 Honors',
        subject: 'Gene Expression & CRISPR Modeling',
        teacher: 'Ms. Shilpa M.',
        students: 14,
      },
      {
        room: 'Rapid Prototyping',
        grade: 'Makerspace Team',
        subject: '3D Laser Sintering & Drone Aerodynamics',
        teacher: 'Lab Assistant',
        students: 12,
      },
    ],
    environment: {
      temp: '21.5°C',
      aqi: '28 AQI (HEPA Ultra Clean)',
      noise: '52 dB (Lab Equipment)',
      hvac: 'Cleanroom Positive Pressure Active',
    },
    summary:
      'Advanced scientific tower equipped with robotic arms, automated microscopes, laser cutters, and computational physics clusters.',
  },
  {
    id: 'gate2-security',
    name: 'Campus South Arrival Kiosk (Gate 2)',
    shortName: 'Gate 2 Arrival Kiosk',
    badge: 'Security & Access Control',
    category: 'Gate & Safety',
    coords: [0, 3.2, 13.5],
    cameraAngle: 0,
    occupancy: {
      current: 15,
      max: 25,
      percentage: 60,
      status: 'Moderate',
    },
    staffPresent: [
      {
        name: 'Mr. Sai',
        role: 'Gate 2 Senior Security Officer',
        room: 'Gate 2 Kiosk Booth',
        status: 'On Duty',
      },
      {
        name: 'Officer Anand V.',
        role: 'Visitor Logistics & Perimeter Safety',
        room: 'NFC Verification Lane',
        status: 'On Duty',
      },
    ],
    activeClassrooms: [
      {
        room: 'NFC Lane 1',
        grade: 'Student Arrival',
        subject: 'Gate 2 Digital Check-In Tap',
        teacher: 'Mr. Sai',
        students: 8,
      },
      {
        room: 'Visitor Kiosk',
        grade: 'Guests / Parents',
        subject: 'Digital Pass Authentication',
        teacher: 'Officer Anand V.',
        students: 7,
      },
    ],
    environment: {
      temp: '26.4°C',
      aqi: '48 AQI (Acceptable)',
      noise: '58 dB (Campus Roadway)',
      hvac: 'Outdoor Air Velocity 1.8 m/s',
    },
    summary:
      'Perimeter security outpost with dual NFC smart turnstiles, parent notification beacons, and real-time transit logs.',
  },
];

export const CampusHologram: React.FC<CampusHologramProps> = ({ isDark = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [cameraView, setCameraView] = useState<'front' | 'right' | 'back' | 'left' | 'custom'>('front');
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [fps, setFps] = useState(60);
  const [selectedHotspot, setSelectedHotspot] = useState<CampusHotspot | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);

  // Real-time Jakkur campus local weather state
  const [weather, setWeather] = useState<JakkurWeatherData>(() => weatherService.getCached());
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [showWeatherDiagnostics, setShowWeatherDiagnostics] = useState<boolean>(false);

  // Live Jakkur Weather Fetching & 60s background sync
  const fetchWeather = async () => {
    setIsWeatherLoading(true);
    try {
      const data = await weatherService.fetchJakkurWeather();
      setWeather(data);
    } catch (err) {
      console.warn('Weather fetch error in CampusHologram:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const timer = setInterval(fetchWeather, 60000);
    return () => clearInterval(timer);
  }, []);

  // References for animation
  const stateRef = useRef<{
    scene: THREE.Scene | null;
    renderer: THREE.WebGLRenderer | null;
    camera: THREE.PerspectiveCamera | null;
    group: THREE.Group | null;
    ring: THREE.Mesh | null;
    curAngle: number;
    tgtAngle: number;
    isDragging: boolean;
    lastMouseX: number;
    pointerDownPos: { x: number; y: number };
    autoRotate: boolean;
    animFrameId: number | null;
    hotspotMeshes: THREE.Object3D[];
  }>({
    scene: null,
    renderer: null,
    camera: null,
    group: null,
    ring: null,
    curAngle: -0.55,
    tgtAngle: -0.55,
    isDragging: false,
    lastMouseX: 0,
    pointerDownPos: { x: 0, y: 0 },
    autoRotate: true,
    animFrameId: null,
    hotspotMeshes: [],
  });

  useEffect(() => {
    stateRef.current.autoRotate = isRotating;
  }, [isRotating]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL not supported by graphics hardware or browser');
      }
    } catch (e: any) {
      setWebGlSupported(false);
      errorReportingService.report({
        message: 'WebGL context initialization failed on 3D Campus Hologram viewport',
        severity: 'HIGH',
        category: 'RENDER_CRASH',
        stack: e?.stack,
      });
      return;
    }

    const P = Math.PI;
    const scene = new THREE.Scene();
    const bgColor = isDark ? 0x1c120b : 0xfff7ed;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.011);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch (err: any) {
      setWebGlSupported(false);
      errorReportingService.report({
        message: 'WebGLRenderer instantiation threw runtime exception',
        severity: 'CRITICAL',
        category: 'RENDER_CRASH',
      });
      return;
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0xcfe8ff, 0.9);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.95);
    sun.position.set(20, 30, 25);
    scene.add(sun);
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x15803d, 0.4);
    scene.add(hemi);

    const G = new THREE.Group();
    scene.add(G);

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.35,
    });

    const createMat = (color: number, opacity = 1) =>
      new THREE.MeshLambertMaterial({
        color,
        transparent: opacity < 1,
        opacity,
      });

    const addBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      c: number,
      o = 1,
      edges = true
    ) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, createMat(c, o));
      mesh.position.set(x, y, z);
      if (edges) {
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      }
      G.add(mesh);
      return mesh;
    };

    const createCanvasTexture = (
      w: number,
      h: number,
      draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
    ) => {
      const cvs = document.createElement('canvas');
      cvs.width = w;
      cvs.height = h;
      const ctx = cvs.getContext('2d');
      if (ctx) draw(ctx, w, h);
      return new THREE.CanvasTexture(cvs);
    };

    const addPlane = (
      w: number,
      h: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      ry = 0
    ) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      plane.position.set(x, y, z);
      if (ry) plane.rotation.y = ry;
      G.add(plane);
    };

    // Building Main Structure
    addBox(10.4, 0.8, 12.4, 0, 0.4, 0, 0x4b5262, 0.95); // Foundation plinth
    addBox(10, 16.5, 12, 0, 9.05, 0, 0x8c95a6, 0.95); // Core building mass
    addBox(10.6, 0.4, 12.6, 0, 17.5, 0, 0xb5452f, 0.95); // Terracotta roof parapet

    // Corner roof accents
    [
      [-4.8, -5.8],
      [4.8, -5.8],
      [-4.8, 5.8],
      [4.8, 5.8],
    ].forEach(([px, pz]) => {
      addBox(0.2, 1.8, 0.2, px, 18.6, pz, 0xb5452f, 0.9);
    });

    // Window facade texture
    const facadeTex = createCanvasTexture(432, 594, (x, w, h) => {
      x.fillStyle = '#8c95a6';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        const y = h - (i + 1) * 118.8;
        x.fillStyle = '#6f7889';
        x.fillRect(0, y, w, 5);
        for (let k = 0; k < 3; k++) {
          const wx = 50 + k * 125;
          x.fillStyle = '#c3cad6';
          x.fillRect(wx - 4, y + 38, 58, 6);
          x.fillStyle = '#1c2638';
          x.fillRect(wx, y + 44, 50, 50);
        }
      }
      x.fillStyle = '#b4bcc9';
      x.fillRect(w - 46, 0, 9, h);
      x.fillRect(w - 30, 0, 9, h);
    });
    const facadeMat = new THREE.MeshLambertMaterial({ map: facadeTex });

    addPlane(12, 16.5, facadeMat, 5.03, 9.05, 0, P / 2);
    addPlane(12, 16.5, facadeMat, -5.03, 9.05, 0, -P / 2);
    addPlane(10, 16.5, facadeMat, 0, 9.05, -6.03, P);

    // Decorative Terracotta Jali Screen
    const jaliTex = createCanvasTexture(272, 1320, (x, w, h) => {
      x.fillStyle = '#c4623e';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#e58b63';
      for (let j = 0; j < h; j += 16) {
        for (let i = 0; i < w; i += 16) {
          x.fillRect(i + 1, j + 1, 14, 2);
          x.fillRect(i + 1, j + 1, 2, 14);
        }
      }
      x.globalCompositeOperation = 'destination-out';
      for (let j = 0; j < h; j += 16) {
        for (let i = 0; i < w; i += 16) {
          x.beginPath();
          x.moveTo(i + 8, j + 3);
          x.lineTo(i + 13, j + 8);
          x.lineTo(i + 8, j + 13);
          x.lineTo(i + 3, j + 8);
          x.closePath();
          x.fill();
        }
      }
      // Arch cutout
      x.beginPath();
      x.moveTo(36, h);
      x.lineTo(36, h - 140);
      x.arc(136, h - 140, 100, P, 0);
      x.lineTo(236, h);
      x.closePath();
      x.fill();

      // Pill cutout
      x.beginPath();
      x.arc(136, 420, 100, P, 0);
      x.arc(136, 540, 100, 0, P);
      x.closePath();
      x.fill();

      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = '#4b5262';
      x.lineWidth = 9;
      x.stroke();
    });

    addBox(3.4, 16.5, 0.1, 3.3, 9.05, 6.02, 0x0a1018, 1, false);
    addBox(2.5, 0.9, 0.05, 3.3, 9.85, 6.07, 0x3b4558, 0.9);
    addPlane(
      3.4,
      16.5,
      new THREE.MeshBasicMaterial({
        map: jaliTex,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
      }),
      3.3,
      9.05,
      6.12
    );

    // Balconies
    const balustradeTex = createCanvasTexture(64, 32, (x, w, h) => {
      x.fillStyle = '#cfd6e2';
      x.fillRect(0, 0, w, 4);
      x.fillRect(0, h - 4, w, 4);
      x.fillRect(0, h / 2 - 1, w, 2);
      for (let i = 6; i < w; i += 14) x.fillRect(i, 0, 3, h);
    });
    balustradeTex.wrapS = THREE.RepeatWrapping;
    balustradeTex.repeat.set(24, 1);
    const balustradeMat = new THREE.MeshBasicMaterial({
      map: balustradeTex,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });

    for (let f = 0; f < 5; f++) {
      const y0 = 0.8 + f * 3.3;
      addBox(6.6, f ? 0.28 : 0.12, 1.6, -1.7, y0 + (f ? 0 : 0.06), 6.8, 0x6b7385, 0.95);
      addPlane(6.6, 1, balustradeMat, -1.7, y0 + 0.6, 7.6);
      addBox(6.4, 2.2, 0.08, -1.7, y0 + 1.7, 6.05, 0x5ec8e8, 0.3); // Tinted glass
    }

    // Academy Entrance Arch Sign
    const signTex = createCanvasTexture(920, 100, (x, w, h) => {
      x.fillStyle = '#f4f1ea';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#c0262d';
      x.font = 'bold 38px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('TATTVASAYAM • OPEN LEARNING RESOURCE CENTRE', w / 2, h / 2);
    });
    addPlane(
      4.6,
      0.5,
      new THREE.MeshBasicMaterial({ map: signTex }),
      -2.4,
      3.75,
      6.1
    );

    // Entrance Stairway & LED Amber Steps
    addBox(3, 0.8, 1.8, 3.3, 0.4, 7, 0x6b7385, 0.95);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const railMat = new THREE.MeshBasicMaterial({ color: 0xff5e3a });

    for (let s = 0; s < 3; s++) {
      const stepH = 0.6 - s * 0.2;
      const stepX = 5.025 + s * 0.45;
      addBox(0.45, stepH, 1.8, stepX, stepH / 2, 7, 0x6b7385, 0.95);
      const stepLight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 1.8), ledMat);
      stepLight.position.set(stepX + 0.19, stepH + 0.015, 7);
      G.add(stepLight);
    }

    // Railings
    const addRail = (w: number, x: number, y: number, rz: number) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), railMat);
      r.position.set(x, y, 7.9);
      r.rotation.z = rz;
      G.add(r);
    };
    addRail(3, 3.3, 1.72, 0);
    addRail(1.45, 5.475, 1.42, -0.42);

    [1.8, 3.3, 4.8, 6.15].forEach((px, i) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, i < 3 ? 0.9 : 0.45, 0.05), railMat);
      post.position.set(px, i < 3 ? 1.25 : 0.5, 7.9);
      G.add(post);
    });

    // Campus Grounds, Roadway & Trees
    const ground = new THREE.Mesh(new THREE.CircleGeometry(32, 64), createMat(0x4a3a2b));
    ground.rotation.x = -P / 2;
    ground.position.y = -0.02;
    G.add(ground);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(50, 6), createMat(0x2a303b));
    road.rotation.x = -P / 2;
    road.position.set(0, 0.02, 13);
    G.add(road);

    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xffb800 });
    for (let d = -10; d <= 10; d++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), roadLineMat);
      dash.rotation.x = -P / 2;
      dash.position.set(d * 2.3, 0.03, 13);
      G.add(dash);
    }

    // Surrounding boundary & structures
    addBox(0.25, 2.2, 17, 8.4, 1.1, 0.5, 0xaeb4bf, 0.9);
    addBox(4, 2.6, 3, 14, 1.3, 6, 0x2f7fd1, 0.9); // East Pavilion (Admin)
    addBox(5, 9, 6, -17, 4.5, -8, 0xe8ecf2, 0.9); // West Tower (STEM Annex)

    // Palm trees
    const createPalm = (x: number, z: number, s: number) => {
      const palmGroup = new THREE.Group();
      const h = 7 * s;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17 * s, 0.3 * s, h, 6),
        createMat(0x6e5237)
      );
      trunk.position.y = h / 2;
      palmGroup.add(trunk);

      for (let i = 0; i < 8; i++) {
        const frondGroup = new THREE.Group();
        frondGroup.position.y = h;
        frondGroup.rotation.y = (i * P) / 4;
        const frond = new THREE.Mesh(
          new THREE.ConeGeometry(0.35 * s, 3.4 * s, 4),
          createMat(0x1f8a4c)
        );
        frond.scale.z = 0.25;
        frond.rotation.z = -1.35;
        frond.position.set(1.4 * s, -0.15 * s, 0);
        frondGroup.add(frond);
        palmGroup.add(frondGroup);
      }
      palmGroup.position.set(x, 0, z);
      G.add(palmGroup);
    };

    [
      [10, -3, 1.1],
      [14.5, 1.5, 1.25],
      [-11, 2, 1.05],
      [-15, -5, 1.15],
      [19, -6, 1],
    ].forEach(([tx, tz, ts]) => createPalm(tx, tz, ts));

    // Futuristic Holographic Grid & Ring
    const grid = new THREE.GridHelper(60, 60, 0xea580c, 0xfed7aa);
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(29.5, 30, 96), ringMat);
    ring.rotation.x = -P / 2;
    ring.position.y = 0.05;
    scene.add(ring);

    // -------------------------------------------------------------
    // INTERACTIVE 3D HOTSPOT BEACONS
    // -------------------------------------------------------------
    const hotspotMeshes: THREE.Object3D[] = [];
    const beaconObjects: Array<{
      group: THREE.Group;
      sphere: THREE.Mesh;
      ring: THREE.Mesh;
      baseY: number;
      hotspotId: string;
      index: number;
    }> = [];

    CAMPUS_HOTSPOTS.forEach((spot, idx) => {
      const spotGroup = new THREE.Group();
      spotGroup.position.set(spot.coords[0], spot.coords[1], spot.coords[2]);

      // Vertical holographic energy stem
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
      const stemMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 1.2;
      spotGroup.add(stem);

      // Glowing pulsing base target ring
      const baseRingGeo = new THREE.RingGeometry(0.6, 0.9, 24);
      const baseRingMat = new THREE.MeshBasicMaterial({
        color: 0xea580c,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.rotation.x = -P / 2;
      baseRing.position.y = 0.05;
      spotGroup.add(baseRing);

      // Top glowing spherical beacon (interactive clickable object)
      const sphereGeo = new THREE.SphereGeometry(0.65, 16, 16);
      const sphereMat = new THREE.MeshLambertMaterial({
        color: 0xff6b00,
        emissive: 0xff5500,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.95,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 2.4;
      sphere.userData = { isHotspot: true, hotspotId: spot.id };
      spotGroup.add(sphere);

      // Invisible larger hit sphere for effortless touch and mouse raycasting
      const hitGeo = new THREE.SphereGeometry(1.4, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitSphere = new THREE.Mesh(hitGeo, hitMat);
      hitSphere.position.y = 2.2;
      hitSphere.userData = { isHotspot: true, hotspotId: spot.id };
      spotGroup.add(hitSphere);

      G.add(spotGroup);
      hotspotMeshes.push(sphere, hitSphere);

      beaconObjects.push({
        group: spotGroup,
        sphere,
        ring: baseRing,
        baseY: 2.4,
        hotspotId: spot.id,
        index: idx,
      });
    });

    stateRef.current.hotspotMeshes = hotspotMeshes;
    stateRef.current.scene = scene;
    stateRef.current.renderer = renderer;
    stateRef.current.camera = camera;
    stateRef.current.group = G;
    stateRef.current.ring = ring;

    // Handle Resizing
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 450;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.set(0, 9, w / h < 1 ? 64 : 46);
      camera.lookAt(0, 8, 0);
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    handleResize();

    // Raycaster for click and hover interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getCanvasMouse = (e: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    // Mouse / Touch Drag & Raycast Handlers
    const onPointerDown = (e: PointerEvent) => {
      stateRef.current.isDragging = true;
      stateRef.current.lastMouseX = e.clientX;
      stateRef.current.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      // Drag rotation
      if (stateRef.current.isDragging) {
        const deltaX = e.clientX - stateRef.current.lastMouseX;
        stateRef.current.tgtAngle += deltaX * 0.009;
        stateRef.current.lastMouseX = e.clientX;
        setCameraView('custom');
      }

      // Hover Raycasting
      const coords = getCanvasMouse(e);
      mouse.set(coords.x, coords.y);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hotspotMeshes, false);

      if (hits.length > 0) {
        const hitId = hits[0].object.userData.hotspotId;
        setHoveredHotspotId(hitId);
        container.style.cursor = 'pointer';
      } else {
        setHoveredHotspotId(null);
        container.style.cursor = stateRef.current.isDragging ? 'grabbing' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const downPos = stateRef.current.pointerDownPos;
      const dragDist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);

      // If user clicked without dragging (distance < 6px), it's a hotspot click!
      if (dragDist < 6) {
        const coords = getCanvasMouse(e);
        mouse.set(coords.x, coords.y);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(hotspotMeshes, false);

        if (hits.length > 0) {
          const hitId = hits[0].object.userData.hotspotId;
          const found = CAMPUS_HOTSPOTS.find((h) => h.id === hitId);
          if (found) {
            setSelectedHotspot(found);
            errorReportingService.addBreadcrumb(
              'ui.click',
              `User clicked 3D campus hotspot: ${found.name}`
            );
          }
        }
      }

      stateRef.current.isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Animation Loop with FPS counter and bobbing hotspots
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      stateRef.current.animFrameId = requestAnimationFrame(animate);

      // FPS Calculation
      const now = performance.now();
      const elapsedSec = now / 1000;
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      if (stateRef.current.autoRotate && !stateRef.current.isDragging) {
        stateRef.current.tgtAngle += 0.0035;
      }

      stateRef.current.curAngle += (stateRef.current.tgtAngle - stateRef.current.curAngle) * 0.12;
      G.rotation.y = stateRef.current.curAngle;

      if (ring) {
        ringMat.opacity = 0.35 + 0.25 * Math.sin(now / 500);
      }

      // Animate hotspot beacons (pulsing and floating bobbing motion)
      beaconObjects.forEach((b) => {
        const bob = Math.sin(elapsedSec * 3 + b.index) * 0.25;
        b.sphere.position.y = b.baseY + bob;

        const pulseScale = 1 + 0.12 * Math.sin(elapsedSec * 4 + b.index);
        b.ring.scale.set(pulseScale, pulseScale, 1);
        (b.ring.material as THREE.Material).opacity = 0.5 + 0.3 * Math.sin(elapsedSec * 4 + b.index);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (stateRef.current.animFrameId) {
        cancelAnimationFrame(stateRef.current.animFrameId);
      }
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [isDark]);

  const setPresetAngle = (angle: number, viewName: 'front' | 'right' | 'back' | 'left') => {
    const P = Math.PI;
    const cur = stateRef.current.curAngle;
    stateRef.current.tgtAngle = angle + 2 * P * Math.round((cur - angle) / (2 * P));
    setCameraView(viewName);
    errorReportingService.addBreadcrumb('ui.click', `Rotated campus hologram to ${viewName} preset`);
  };

  const handleSelectHotspot = (spot: CampusHotspot) => {
    setSelectedHotspot(spot);
    const P = Math.PI;
    const cur = stateRef.current.curAngle;
    stateRef.current.tgtAngle = spot.cameraAngle + 2 * P * Math.round((cur - spot.cameraAngle) / (2 * P));
    errorReportingService.addBreadcrumb('ui.click', `Selected hotspot pill: ${spot.name}`);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-orange-200 dark:border-amber-900 bg-orange-50/50 dark:bg-stone-950/70 shadow-sm transition-all duration-300">
      {/* Hologram Header Overlay */}
      <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/85 dark:bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-orange-200 dark:border-amber-900 shadow-sm text-xs text-orange-950 dark:text-orange-200 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <span className="font-bold">Jakkur Campus Holographic Digital Twin</span>
          <span className="text-stone-400 dark:text-stone-500">•</span>
          <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400">{fps} FPS</span>
        </div>

        {/* Real-Time Weather Status Indicator for Jakkur Campus */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowWeatherDiagnostics((prev) => !prev)}
            title="Click to view full Jakkur campus microclimate and environmental diagnostics"
            className="flex items-center gap-2 bg-white/90 dark:bg-stone-900/90 hover:bg-orange-50/90 dark:hover:bg-stone-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-orange-200 dark:border-amber-900 shadow-sm text-xs font-semibold text-stone-800 dark:text-stone-200 transition group cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {weather.weatherCode >= 51 ? (
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
              ) : weather.weatherCode >= 1 ? (
                <CloudSun className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-45 transition-transform" />
              )}
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="font-extrabold text-orange-600 dark:text-orange-400 text-xs">
                {weather.temperature}°C
              </span>
              <span className="text-stone-300 dark:text-stone-600">|</span>
              <span className="text-[11px] font-sans font-medium text-stone-700 dark:text-stone-300 hidden sm:inline">
                {weather.condition}
              </span>
              <span className="text-stone-300 dark:text-stone-600 hidden sm:inline">|</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                <Droplets className="w-2.5 h-2.5" />
                {weather.humidity}%
              </span>
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300">
              Jakkur Live
            </span>
          </button>

          <button
            onClick={fetchWeather}
            disabled={isWeatherLoading}
            title="Refresh live environmental sensors"
            className="p-1.5 bg-white/90 dark:bg-stone-900/90 hover:bg-orange-50 dark:hover:bg-stone-800 backdrop-blur-md rounded-xl border border-orange-200 dark:border-amber-900 shadow-sm text-stone-500 hover:text-orange-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Quick Hotspots Pill Bar */}
      <div className="absolute top-14 left-4 right-4 z-10 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pointer-events-auto">
        <span className="text-[10px] font-black uppercase tracking-wider text-orange-900 dark:text-orange-200 px-2 py-1 rounded-lg bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-orange-200 dark:border-stone-800 shrink-0 flex items-center gap-1 shadow-2xs">
          <Sparkles className="w-3 h-3 text-orange-600" />
          <span>Hotspots:</span>
        </span>
        {CAMPUS_HOTSPOTS.map((spot) => {
          const isSelected = selectedHotspot?.id === spot.id;
          const isHovered = hoveredHotspotId === spot.id;
          return (
            <button
              key={spot.id}
              onClick={() => handleSelectHotspot(spot)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs backdrop-blur-md ${
                isSelected
                  ? 'bg-orange-600 text-white border border-orange-500'
                  : isHovered
                  ? 'bg-orange-100 dark:bg-stone-800 text-orange-950 dark:text-orange-200 border border-orange-400'
                  : 'bg-white/80 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 border border-orange-200 dark:border-stone-800 hover:bg-orange-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span>{spot.shortName}</span>
              <span className="text-[10px] opacity-80 font-mono">({spot.occupancy.percentage}%)</span>
            </button>
          );
        })}
      </div>

      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[440px] sm:h-[540px] cursor-grab active:cursor-grabbing touch-pan-y"
      />

      {!webGlSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-orange-50/90 dark:bg-stone-950/90 backdrop-blur-md text-center z-20">
          <AlertCircle className="w-12 h-12 text-amber-600 mb-2" />
          <h4 className="font-semibold text-stone-900 dark:text-stone-100">WebGL Acceleration Not Active</h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mt-1">
            Your browser or environment has restricted 3D hardware acceleration. The real-time error telemetry service has logged this diagnostic event.
          </p>
        </div>
      )}

      {/* REAL-TIME WEATHER & ENVIRONMENTAL DIAGNOSTICS MODAL */}
      {showWeatherDiagnostics && (
        <div className="absolute top-14 sm:top-14 right-3 sm:right-4 w-[calc(100%-24px)] sm:w-[400px] max-h-[82%] overflow-y-auto z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-2xl border-2 border-orange-400 dark:border-amber-900 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-stone-900 dark:text-stone-100">
          <div className="flex items-start justify-between gap-2 border-b border-orange-100 dark:border-stone-800 pb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sensor Feed
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Open-Meteo v1</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-tight">
                Jakkur Campus Atmospheric Conditions
              </h3>
              <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-orange-600" />
                <span>13.0784° N, 77.5906° E • 920m ASL • Bengaluru</span>
              </p>
            </div>
            <button
              onClick={() => setShowWeatherDiagnostics(false)}
              aria-label="Close weather diagnostics"
              className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Ambient Highlight */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200 dark:border-amber-950 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                Current Condition
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-stone-900 dark:text-stone-100 tracking-tight">
                {weather.temperature}°C
              </div>
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                Feels like {weather.apparentTemperature}°C • {weather.condition}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 dark:bg-stone-850 shadow-sm border border-orange-200 dark:border-stone-800 text-amber-500">
              {weather.weatherCode >= 51 ? (
                <CloudRain className="w-8 h-8 text-blue-500" />
              ) : weather.weatherCode >= 1 ? (
                <CloudSun className="w-8 h-8 text-amber-500" />
              ) : (
                <Sun className="w-8 h-8 text-amber-500 animate-spin-slow" />
              )}
            </div>
          </div>

          {/* Detailed Environmental Sensors Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
              <div className="text-stone-500 flex items-center gap-1.5 text-[11px] font-medium">
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
                <span>Relative Humidity</span>
              </div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                {weather.humidity}%
              </div>
              <div className="text-[10px] text-stone-400">Optimal comfort range</div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
              <div className="text-stone-500 flex items-center gap-1.5 text-[11px] font-medium">
                <Wind className="w-3.5 h-3.5 text-emerald-500" />
                <span>Wind Velocity</span>
              </div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                {weather.windSpeed} km/h
              </div>
              <div className="text-[10px] text-stone-400">Gentle campus breeze</div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
              <div className="text-stone-500 flex items-center gap-1.5 text-[11px] font-medium">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                <span>Surface Pressure</span>
              </div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                {weather.pressure} hPa
              </div>
              <div className="text-[10px] text-stone-400">Deccan plateau baseline</div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-1">
              <div className="text-stone-500 flex items-center gap-1.5 text-[11px] font-medium">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                <span>Air Quality (AQI)</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {weather.airQualityEstimate}
              </div>
              <div className="text-[10px] text-stone-400">Jakkur Green Canopy</div>
            </div>
          </div>

          {/* Cloud Cover & Precipitation row */}
          <div className="p-2.5 rounded-xl bg-orange-50/60 dark:bg-stone-850 border border-orange-200 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-600 dark:text-stone-300 font-medium">
              Cloud Cover: <strong className="text-stone-900 dark:text-stone-100">{weather.cloudCover}%</strong>
            </span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span className="text-stone-600 dark:text-stone-300 font-medium">
              Precipitation: <strong className="text-stone-900 dark:text-stone-100">{weather.precipitation} mm</strong>
            </span>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 border-t border-orange-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-stone-400 font-mono">
              Synced: {weather.lastUpdated}
            </span>
            <button
              onClick={fetchWeather}
              disabled={isWeatherLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin' : ''}`} />
              <span>{isWeatherLoading ? 'Fetching...' : 'Refresh Feed'}</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING LIVE HOTSPOT INFORMATION MODAL */}
      {selectedHotspot && (
        <div className="absolute bottom-16 sm:bottom-16 left-3 right-3 sm:left-auto sm:right-4 sm:w-[420px] max-h-[80%] overflow-y-auto z-20 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border-2 border-orange-400 dark:border-amber-900 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-stone-900 dark:text-stone-100">
          {/* Header with Title, Badge, and Close Button */}
          <div className="flex items-start justify-between gap-2 border-b border-orange-100 dark:border-stone-800 pb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-stone-800 text-[10px] font-extrabold text-orange-800 dark:text-orange-300 uppercase tracking-wider">
                  {selectedHotspot.badge}
                </span>
                <span className="text-[10px] text-stone-500 font-semibold">• Live Telemetry</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-tight">
                {selectedHotspot.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedHotspot(null)}
              aria-label="Close building details"
              className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Classroom Occupancy Section */}
          <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-stone-850 border border-orange-200 dark:border-amber-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-600" />
                <span>Current Classroom Occupancy</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedHotspot.occupancy.status === 'High'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {selectedHotspot.occupancy.status} Capacity
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
                  {selectedHotspot.occupancy.current}
                </span>
                <span className="text-xs text-stone-500 font-semibold">
                  / {selectedHotspot.occupancy.max} seats capacity
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">
                {selectedHotspot.occupancy.percentage}% filled
              </span>
            </div>

            {/* Visual occupancy bar */}
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${selectedHotspot.occupancy.percentage}%` }}
              />
            </div>
          </div>

          {/* Names of Staff Members Present in Building */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-stone-900 dark:text-stone-100">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Staff Present in Building ({selectedHotspot.staffPresent.length})</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Real-Time Badges</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {selectedHotspot.staffPresent.map((staff, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 truncate">
                      {staff.name}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {staff.role} • <span className="font-medium text-stone-600 dark:text-stone-300">{staff.room}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      staff.status === 'In Session'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : staff.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {staff.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Classrooms & Cohorts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-stone-900 dark:text-stone-100">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Active Classes & Cohorts</span>
              </span>
              <span className="text-[10px] text-stone-400 font-mono">12-Hour Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {selectedHotspot.activeClassrooms.map((cls, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-750 text-[11px]"
                >
                  <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                    <span>{cls.grade}</span>
                    <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400">{cls.room}</span>
                  </div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 truncate mt-0.5">
                    {cls.subject}
                  </div>
                  <div className="text-[9px] text-stone-400 mt-1 flex items-center justify-between">
                    <span>{cls.teacher}</span>
                    <span>{cls.students} students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Sensors */}
          <div className="pt-2 border-t border-orange-100 dark:border-stone-800 grid grid-cols-2 gap-2 text-[10px] text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/50">
              <Thermometer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Temp: <strong className="text-stone-900 dark:text-stone-100">{selectedHotspot.environment.temp}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/50">
              <Wind className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Air: <strong className="text-stone-900 dark:text-stone-100">{selectedHotspot.environment.aqi}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Camera Controls Bar */}
      <div className="absolute bottom-3 left-0 right-0 z-10 flex flex-wrap justify-center items-center gap-1.5 px-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-xl border border-orange-200 dark:border-amber-900 shadow-md">
          <button
            onClick={() => setPresetAngle(-0.5, 'front')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              cameraView === 'front'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-800'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setPresetAngle(-1.75, 'right')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              cameraView === 'right'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-800'
            }`}
          >
            Right Wing
          </button>
          <button
            onClick={() => setPresetAngle(3.14, 'back')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              cameraView === 'back'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-800'
            }`}
          >
            Rear Facade
          </button>
          <button
            onClick={() => setPresetAngle(1.75, 'left')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              cameraView === 'left'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-800'
            }`}
          >
            Left Wing
          </button>

          <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            onClick={() => setIsRotating((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            {isRotating ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Auto-Orbit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
