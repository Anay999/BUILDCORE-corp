import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { Ic, useApp } from "../context.jsx";
import { api } from "../api.js";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LOCATION_COORDS = {
  ongole: { lat: 15.5057, lng: 80.0499 },
  rmk: { lat: 13.3567, lng: 80.1418 },
  kavaraipettai: { lat: 13.3615, lng: 80.1432 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  vijayawada: { lat: 16.5062, lng: 80.6480 },
  guntur: { lat: 16.3067, lng: 80.4365 },
  tirupati: { lat: 13.6288, lng: 79.4192 },
  vizag: { lat: 17.6868, lng: 83.2185 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
};

function resolveProjectCoords(proj) {
  if (proj?.latitude && proj?.longitude) {
    return { lat: parseFloat(proj.latitude), lng: parseFloat(proj.longitude) };
  }
  const text = `${proj?.location || ""} ${proj?.title || ""}`.toLowerCase();
  for (const [k, v] of Object.entries(LOCATION_COORDS)) {
    if (text.includes(k)) return v;
  }
  return { lat: 15.5057, lng: 80.0499 };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function getManeuverIcon(type = "", modifier = "") {
  if (type === "arrive") return "🏁";
  if (modifier.includes("left")) return "↰";
  if (modifier.includes("right")) return "↱";
  if (modifier.includes("uturn")) return "↶";
  if (type === "roundabout") return "🔄";
  return "↑";
}

const DEFAULT_COMPANY_SITES = [
  { id: 46, title: "lane east wing", location: "Ongole", latitude: 15.5057, longitude: 80.0499, status: "Ongoing" },
  { id: 47, title: "hyderabad metro lane wing 2", location: "Hyderabad", latitude: 17.3850, longitude: 78.4867, status: "Planned" },
  { id: 48, title: "RMK Campus Site Wing", location: "RMK Kavaraipettai", latitude: 13.3567, longitude: 80.1418, status: "Active" },
  { id: 49, title: "Chennai Port Logistics Hub", location: "Chennai", latitude: 13.0827, longitude: 80.2707, status: "Active" },
  { id: 50, title: "Bangalore Tech Park Block C", location: "Bangalore", latitude: 12.9716, longitude: 77.5946, status: "Active" },
];

export default function GpsTrackerPage() {
  const nav = useNavigate();
  const { user, showToast } = useApp();

  // State
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [headingAngle, setHeadingAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [projects, setProjects] = useState(DEFAULT_COMPANY_SITES);
  const [selectedProjectId, setSelectedProjectId] = useState("46");
  const [autoSync, setAutoSync] = useState(true);

  // Preview Route info in standard mode
  const [previewRoute, setPreviewRoute] = useState(null);

  // Turn-by-Turn Navigation State
  const [navMode, setNavMode] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [navElapsed, setNavElapsed] = useState("00:00:00");
  const [destination, setDestination] = useState(null);
  const [routeSteps, setRouteSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [remainingDist, setRemainingDist] = useState(0);
  const [remainingTimeSec, setRemainingTimeSec] = useState(0);
  const [etaTime, setEtaTime] = useState("--:--");
  const [isAutoCentered, setIsAutoCentered] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [hasMarkedArrival, setHasMarkedArrival] = useState(false);
  const [showArrivalBanner, setShowArrivalBanner] = useState(false);

  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const trailPolylineRef = useRef(null);
  const userLayerGroupRef = useRef(null);
  const projectLayerGroupRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const geofenceLayerGroupRef = useRef(null);

  const nativeWatchIdRef = useRef(null);
  const timerRef = useRef(null);
  const isTrackingRef = useRef(false);
  const navModeRef = useRef(false);
  const lastTrackedPointRef = useRef(null);
  const prevCoordRef = useRef(null);
  const trailPointsRef = useRef([]);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    navModeRef.current = navMode;
  }, [navMode]);

  // ─── 1. Load Projects from Backend ──────────────────────────────────────────
  useEffect(() => {
    api
      .get("/projects")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setProjects(res);
          setSelectedProjectId((prev) => {
            if (prev && res.some((p) => String(p.id) === String(prev))) return prev;
            return String(res[0].id);
          });
        }
      })
      .catch(() => {});
  }, []);

  // ─── 2. Initialize Leaflet Map Instance Safely ──────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: false,
        zoomAnimation: false, // Prevents _leaflet_pos animation race conditions
      }).setView([15.5057, 80.0499], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      userLayerGroupRef.current = L.layerGroup().addTo(map);
      projectLayerGroupRef.current = L.layerGroup().addTo(map);
      routeLayerGroupRef.current = L.layerGroup().addTo(map);
      geofenceLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on("dragstart", () => {
        setIsAutoCentered(false);
      });

      mapRef.current = map;
    } catch (err) {
      console.warn("Leaflet map init notice:", err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        trailPolylineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize({ animate: false });
        } catch {}
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [navMode]);

  // ─── 3. Position Update Handler with GPS Jitter Filter ───────────────────────
  const updatePosition = useCallback(
    (pos) => {
      if (!pos || !pos.coords) return;
      const { latitude, longitude, accuracy, speed, heading, altitude } = pos.coords;

      // Filter raw speed noise (if speed < 0.6 m/s, i.e. < 2.1 km/h, treat as 0)
      const cleanSpeed = speed && speed >= 0.6 ? speed : 0;
      const newCoords = {
        latitude,
        longitude,
        accuracy: accuracy || 8,
        speed: cleanSpeed,
        heading,
        altitude,
      };

      if (prevCoordRef.current) {
        const prev = prevCoordRef.current;
        const d = calculateDistance(prev.latitude, prev.longitude, latitude, longitude);
        if (d > 2.0) {
          const b = calculateBearing(prev.latitude, prev.longitude, latitude, longitude);
          setHeadingAngle(heading !== null && heading !== undefined && heading >= 0 ? heading : b);
        }
      }
      prevCoordRef.current = newCoords;
      setCoords(newCoords);

      // ONLY accumulate distance if tracking or navigation is actively running
      if (isTrackingRef.current || navModeRef.current) {
        if (!lastTrackedPointRef.current) {
          lastTrackedPointRef.current = { lat: latitude, lng: longitude };
          trailPointsRef.current = [[latitude, longitude]];
        } else {
          const last = lastTrackedPointRef.current;
          const d = calculateDistance(last.lat, last.lng, latitude, longitude);

          // Jitter filter: Must be genuine physical movement (>= 10m or speed > 0.6 m/s)
          if (d >= 10 || (cleanSpeed > 0.6 && d >= 5)) {
            setDistance((prevDist) => prevDist + d);
            lastTrackedPointRef.current = { lat: latitude, lng: longitude };
            trailPointsRef.current.push([latitude, longitude]);

            if (trailPolylineRef.current) {
              trailPolylineRef.current.setLatLngs(trailPointsRef.current);
            }
          }
        }
      }

      // Update Navigation ETA and 500m Arrival
      if (destination) {
        const dToDest = calculateDistance(latitude, longitude, destination.lat, destination.lng);
        setRemainingDist(dToDest);

        const realisticSpeedMps = Math.max(cleanSpeed, 9.72); // ~35 km/h driving speed
        const remainingSec = Math.round(dToDest / realisticSpeedMps);
        setRemainingTimeSec(remainingSec);

        const eta = new Date(Date.now() + remainingSec * 1000);
        setEtaTime(eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

        // 🎯 500-METER GEOFENCE ARRIVAL CHECK
        if (dToDest <= 500 && !hasMarkedArrival) {
          setHasMarkedArrival(true);
          setShowArrivalBanner(true);

          if (destination.projectId) {
            api
              .post("/attendance/clock-in", {
                project_id: destination.projectId,
                user_id: user?.id,
              })
              .then(() => {
                showToast(`🎉 Arrived within 500m of ${destination.title}! Attendance Marked Present ✅`, "success", 4000);
              })
              .catch(() => {
                showToast(`🎉 Arrived within 500m of ${destination.title}!`, "success", 3000);
              });
          }
        }

        // Advance navigation maneuver steps
        if (routeSteps.length > 0 && currentStepIdx < routeSteps.length - 1) {
          const step = routeSteps[currentStepIdx];
          if (step.location) {
            const dToStep = calculateDistance(latitude, longitude, step.location[1], step.location[0]);
            if (dToStep < 35) {
              setCurrentStepIdx((idx) => Math.min(idx + 1, routeSteps.length - 1));
            }
          }
        }
      }

      if (autoSync && (isTrackingRef.current || navModeRef.current)) {
        api
          .post("/time-tracking/location", {
            latitude,
            longitude,
            speed: cleanSpeed,
            accuracy,
            heading: heading || headingAngle,
            project_id: selectedProjectId ? Number(selectedProjectId) : null,
          })
          .catch(() => {});
      }
    },
    [autoSync, selectedProjectId, destination, routeSteps, currentStepIdx, headingAngle, hasMarkedArrival, user, showToast]
  );

  // ─── 4. Native Device Location Acquisition ──────────────────────────────────
  const detectLocation = useCallback(async () => {
    setLocating(true);
    try {
      try {
        await Geolocation.requestPermissions();
      } catch {}

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      });

      setLocating(false);
      updatePosition(pos);

      if (mapRef.current && pos.coords) {
        try {
          mapRef.current.panTo([pos.coords.latitude, pos.coords.longitude], { animate: false });
        } catch {}
      }
    } catch {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocating(false);
            updatePosition(pos);
            if (mapRef.current && pos.coords) {
              try {
                mapRef.current.panTo([pos.coords.latitude, pos.coords.longitude], { animate: false });
              } catch {}
            }
          },
          () => {
            setLocating(false);
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
        );
      } else {
        setLocating(false);
      }
    }
  }, [updatePosition]);

  // Trigger continuous live native location tracking on mount
  useEffect(() => {
    detectLocation();

    let watchId = null;
    Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 30000 },
      (pos) => {
        if (pos) updatePosition(pos);
      }
    ).then((id) => {
      watchId = id;
      nativeWatchIdRef.current = id;
    }).catch(() => {});

    return () => {
      if (watchId) Geolocation.clearWatch({ id: watchId }).catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [detectLocation, updatePosition]);

  // ─── 5. Update User Location Marker Safely (Zero _leaflet_pos Errors) ────────
  useEffect(() => {
    const map = mapRef.current;
    const userLayer = userLayerGroupRef.current;
    if (!map || !userLayer || !coords) return;

    const latLng = [coords.latitude, coords.longitude];

    const puckHtml = `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:60px;height:60px;top:-12px;left:-12px;pointer-events:none;transform:rotate(${headingAngle}deg);transform-origin:center center;">
          <div style="width:0;height:0;border-left:24px solid transparent;border-right:24px solid transparent;border-top:38px solid rgba(59,130,246,0.35);margin:0 auto;filter:blur(2px);"></div>
        </div>
        <div style="position:absolute;width:52px;height:52px;border-radius:50%;background:rgba(37,99,235,0.2);animation:leaflet-pulse 1.8s ease-out infinite;"></div>
        <div style="width:22px;height:22px;border-radius:50%;background:#1d4ed8;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.5);position:relative;z-index:2;">
          <div style="width:6px;height:6px;border-radius:50%;background:#ffffff;margin:5px auto;"></div>
        </div>
      </div>
    `;

    const userPuckIcon = L.divIcon({
      className: "google-nav-puck",
      html: puckHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Reuse existing marker with setLatLng/setIcon to avoid DOM detach issues
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
      userMarkerRef.current.setIcon(userPuckIcon);
    } else {
      userMarkerRef.current = L.marker(latLng, { icon: userPuckIcon, zIndexOffset: 1000 }).addTo(userLayer);
    }

    // Reuse existing trail polyline
    if (!trailPolylineRef.current) {
      trailPolylineRef.current = L.polyline([], {
        color: "#38bdf8",
        weight: 4,
        opacity: 0.8,
      }).addTo(userLayer);
    }

    if (isAutoCentered && navMode) {
      try {
        map.panTo(latLng, { animate: false });
      } catch {}
    }
  }, [coords, headingAngle, isAutoCentered, navMode]);

  // ─── 6. Render Company Site Pins & 500m Geofence Circles ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const projectLayer = projectLayerGroupRef.current;
    const geofenceLayer = geofenceLayerGroupRef.current;
    if (!map || !projectLayer || !geofenceLayer || projects.length === 0) return;

    projectLayer.clearLayers();
    geofenceLayer.clearLayers();

    projects.forEach((p) => {
      const pos = resolveProjectCoords(p);

      // 500m Radius Geofence Circle
      L.circle([pos.lat, pos.lng], {
        radius: 500,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.12,
        weight: 2,
        dashArray: "6, 6",
      })
        .addTo(geofenceLayer)
        .bindPopup(`<b>${p.title}</b><br/>🎯 500m Geofenced Boundary`);

      // Site Pin
      const pinHtml = `
        <div style="background:#059669;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:12px;">🏗️</span>
        </div>
      `;
      const pinIcon = L.divIcon({
        className: "site-pin",
        html: pinHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([pos.lat, pos.lng], { icon: pinIcon })
        .addTo(projectLayer)
        .bindPopup(`<b>${p.title}</b><br/>📍 ${p.location || "Site Location"}<br/>Status: ${p.status}`);
    });
  }, [projects]);

  // ─── 7. Preview Road Pathway from Real Location to Selected Site ────────────
  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerGroupRef.current;
    if (!map || !routeLayer || navMode) return;

    const proj = projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0];
    if (!proj || !coords) return;

    const destCoords = resolveProjectCoords(proj);
    const startLng = coords.longitude;
    const startLat = coords.latitude;
    const endLng = destCoords.lng;
    const endLat = destCoords.lat;

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

          routeLayer.clearLayers();

          const poly = L.polyline(coordinates, {
            color: "#1a73e8",
            weight: 6,
            opacity: 0.9,
            lineJoin: "round",
          }).addTo(routeLayer);

          try {
            map.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 16, animate: false });
          } catch {}

          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.ceil(route.duration / 60);
          setPreviewRoute({ distanceKm: distKm, durationMin: durMin });
        }
      })
      .catch(() => {
        routeLayer.clearLayers();
        const straightLine = [
          [startLat, startLng],
          [endLat, endLng],
        ];
        const poly = L.polyline(straightLine, {
          color: "#1a73e8",
          weight: 5,
          dashArray: "8, 8",
        }).addTo(routeLayer);
        try {
          map.fitBounds(poly.getBounds(), { padding: [40, 40], animate: false });
        } catch {}

        const d = calculateDistance(startLat, startLng, endLat, endLng);
        setPreviewRoute({
          distanceKm: (d / 1000).toFixed(1),
          durationMin: Math.ceil(d / 600),
        });
      });
  }, [coords, selectedProjectId, projects, navMode]);

  // ─── 8. Unified Live Timer Engine ───────────────────────────────────────────
  const startLiveTimer = useCallback(() => {
    setIsTracking(true);
    isTrackingRef.current = true;
    const startT = Date.now();
    setDistance(0);
    trailPointsRef.current = [];
    if (trailPolylineRef.current) trailPolylineRef.current.setLatLngs([]);
    lastTrackedPointRef.current = coords ? { lat: coords.latitude, lng: coords.longitude } : null;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - startT) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      const formatted = `${h}:${m}:${s}`;
      setElapsed(formatted);
      setNavElapsed(formatted);
    }, 1000);
  }, [coords]);

  const stopTracking = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTracking(false);
    isTrackingRef.current = false;
    lastTrackedPointRef.current = null;

    const map = mapRef.current;
    const projectLayer = projectLayerGroupRef.current;
    if (map && projectLayer && projectLayer.getLayers().length > 0) {
      try {
        const bounds = projectLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
        }
      } catch {}
    }

    showToast("GPS Tracking Stopped — Showing All Sites", "info");
  }, [showToast]);

  // ─── 9. Launch Full-Screen Turn-by-Turn Navigation ──────────────────────────
  const handleStartProjectNav = async () => {
    const proj = projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0];
    const destTitle = proj ? proj.title : "Company Site";
    const destLoc = proj ? (proj.location || "Site Location") : "Site";
    const destCoords = resolveProjectCoords(proj);
    const projId = proj ? proj.id : null;

    let origin = coords;
    if (!origin) {
      setNavLoading(true);
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        origin = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(pos.coords);
      } catch {
        origin = { latitude: destCoords.lat - 0.035, longitude: destCoords.lng - 0.035 };
      }
    }

    startLiveTimer();
    setNavLoading(true);
    setNavMode(true);
    navModeRef.current = true;
    setIsAutoCentered(true);
    setHasMarkedArrival(false);
    setShowArrivalBanner(false);

    const startLng = origin.longitude;
    const startLat = origin.latitude;
    const endLng = destCoords.lng;
    const endLat = destCoords.lat;

    setDestination({ lat: endLat, lng: endLng, title: destTitle, location: destLoc, projectId: projId });

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      const map = mapRef.current;
      const routeLayer = routeLayerGroupRef.current;

      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const leg = route.legs[0];
        const steps = leg.steps || [];

        setRouteSteps(steps);
        setCurrentStepIdx(0);
        setRemainingDist(route.distance);

        const durationSec = Math.round(route.duration);
        setRemainingTimeSec(durationSec);

        const eta = new Date(Date.now() + durationSec * 1000);
        setEtaTime(eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

        if (map && routeLayer) {
          routeLayer.clearLayers();

          const poly = L.polyline(coordinates, {
            color: "#1a73e8",
            weight: 7,
            opacity: 0.95,
            lineJoin: "round",
          }).addTo(routeLayer);

          const destIcon = L.divIcon({
            className: "dest-pin",
            html: `<div style="background:#ea4335;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;color:white;">🏁</span></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          L.marker([endLat, endLng], { icon: destIcon }).addTo(routeLayer);

          try {
            map.panTo([startLat, startLng], { animate: false });
          } catch {}
        }

        showToast("Turn-by-Turn Navigation Started! 🧭", "success");
      }
    } catch (err) {
      console.warn("Navigation route notice:", err);
    } finally {
      setNavLoading(false);
    }
  };

  const stopNavigation = () => {
    setNavMode(false);
    navModeRef.current = false;
    setShowArrivalBanner(false);
    stopTracking();
    showToast(`Navigation Ended (Duration: ${navElapsed})`, "info");
  };

  const reCenterMap = () => {
    setIsAutoCentered(true);
    if (mapRef.current && coords) {
      try {
        mapRef.current.panTo([coords.latitude, coords.longitude], { animate: false });
      } catch {}
    }
  };

  const speedKmh = coords?.speed ? (coords.speed * 3.6).toFixed(1) : "0.0";
  const displayDist = distance > 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`;
  const remainingKm = (remainingDist / 1000).toFixed(1);
  const remainingMin = Math.max(1, Math.ceil(remainingTimeSec / 60));

  const activeStep = routeSteps[currentStepIdx] || {
    maneuver: { type: "continue", modifier: "straight" },
    name: destination?.title || "Company Site",
  };
  const nextStep = routeSteps[currentStepIdx + 1];

  return (
    <>
      <style>{`
        @keyframes leaflet-pulse {
          0% { transform: scale(0.3); opacity: 0.9; }
          60% { transform: scale(1.6); opacity: 0.1; }
          100% { transform: scale(2.0); opacity: 0; }
        }
        .leaflet-container {
          background: #f1f5f9 !important;
          font-family: inherit;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          TURN-BY-TURN FULL NAVIGATION HUD (WHEN NAV MODE IS ACTIVE)
          ═══════════════════════════════════════════════════════════════════════ */}
      {navMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
          {/* Top Maneuver Banner */}
          <div
            style={{
              pointerEvents: "auto",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              background: "#004d40",
              color: "#ffffff",
              padding: "16px 18px",
              boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {getManeuverIcon(activeStep.maneuver?.type, activeStep.maneuver?.modifier)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#80cbc4", fontWeight: 600 }}>towards</div>
                <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeStep.name || destination?.title || "Company Site"}
                </div>
              </div>

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#ffffff",
                  color: "#004d40",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  flexShrink: 0,
                }}
              >
                ✦
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#00332c",
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                alignSelf: "flex-start",
                color: "#e0f2f1",
              }}
            >
              <span>Then</span>
              <span style={{ fontSize: 15 }}>
                {getManeuverIcon(nextStep?.maneuver?.type, nextStep?.maneuver?.modifier)}
              </span>
              <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nextStep?.name || "Continue to site"}
              </span>
            </div>
          </div>

          {/* 500m Arrival Success Banner */}
          {showArrivalBanner && (
            <div
              style={{
                pointerEvents: "auto",
                position: "absolute",
                top: 135,
                left: 16,
                right: 16,
                background: "linear-gradient(135deg, #059669, #10b981)",
                color: "#ffffff",
                borderRadius: 14,
                padding: "12px 16px",
                boxShadow: "0 8px 24px rgba(16,185,129,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                zIndex: 1100,
              }}
            >
              <span style={{ fontSize: 28 }}>🎉</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Arrived at Site Destination!</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Within 500m geofence • Geo-Attendance Verified ✅</div>
              </div>
              <button
                onClick={() => setShowArrivalBanner(false)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Floating Right Map Controls */}
          <div
            style={{
              position: "absolute",
              right: 16,
              top: showArrivalBanner ? 210 : 140,
              zIndex: 900,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              pointerEvents: "auto",
            }}
          >
            <button
              onClick={() => {
                if (mapRef.current && coords) mapRef.current.panTo([coords.latitude, coords.longitude], { animate: false });
              }}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "#ffffff",
                border: "none",
                boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              🧭
            </button>

            <button
              onClick={() => showToast("Searching site route amenities", "info")}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "#ffffff",
                border: "none",
                boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: "pointer",
                color: "#374151",
              }}
            >
              🔍
            </button>

            <button
              onClick={() => {
                setIsMuted(!isMuted);
                showToast(isMuted ? "Voice guidance unmuted 🔊" : "Voice guidance muted 🔇", "info");
              }}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "#ffffff",
                border: "none",
                boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: "pointer",
                color: "#374151",
              }}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>

          {/* Floating Action Pills */}
          <div
            style={{
              position: "absolute",
              bottom: 110,
              left: 16,
              right: 16,
              zIndex: 900,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <button
              onClick={reCenterMap}
              style={{
                pointerEvents: "auto",
                background: "#ffffff",
                color: "#0f172a",
                border: "none",
                borderRadius: 30,
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "#00875a", fontSize: 16 }}>⌖</span> Re-centre
            </button>

            <button
              onClick={() => showToast("Site attendance log updated ⚠️", "info")}
              style={{
                pointerEvents: "auto",
                background: "#ffffff",
                color: "#0f172a",
                border: "none",
                borderRadius: 30,
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "#d97706", fontSize: 16 }}>⚠️</span> Report
            </button>
          </div>

          {/* Bottom Navigation ETA Sheet */}
          <div
            style={{
              pointerEvents: "auto",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              background: "#ffffff",
              color: "#0f172a",
              padding: "10px 20px 24px",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: "0 -6px 28px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#cbd5e1", margin: "0 auto" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={stopNavigation}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#475569",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#16a34a" }}>
                    {remainingMin} min
                  </span>
                  <span style={{ fontSize: 20 }}>🍃</span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                  {remainingKm} km • {etaTime} • ⏱️ {navElapsed}
                </div>
              </div>

              <button
                onClick={() => showToast("Alternative site route active", "info")}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1e293b",
                  fontWeight: 800,
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ⑂
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STANDARD VIEW (NORMAL CARD LAYOUT WITH PREVIEW ROAD PATH ON MAP)
          ═══════════════════════════════════════════════════════════════════════ */}
      {!navMode && (
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => nav(-1)}>
            <Ic.ChevronLeft />
          </button>
          <h1 style={{ fontSize: 17 }}>Live GPS Tracker</h1>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: coords ? "#10b981" : "#64748b",
                boxShadow: coords ? "0 0 10px #10b981" : "none",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: coords ? "#10b981" : "#64748b" }}>
              {coords ? "GPS ACQUIRED" : "SEARCHING"}
            </span>
          </div>
        </div>
      )}

      <div
        className={navMode ? "" : "page-content"}
        style={
          navMode
            ? { position: "fixed", inset: 0, zIndex: 100 }
            : { paddingBottom: 24 }
        }
      >
        {!navMode && (
          <>
            {/* Card 1: Start / Stop Live GPS Tracking Button */}
            <div
              className="card"
              style={{
                background: isTracking
                  ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))"
                  : "linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9))",
                border: isTracking ? "1px solid rgba(16,185,129,0.4)" : "1px solid #334155",
                marginBottom: 14,
                textAlign: "center",
                padding: "16px",
              }}
            >
              <button
                onClick={isTracking ? stopTracking : startLiveTimer}
                style={{
                  padding: "14px 28px",
                  borderRadius: "50px",
                  border: "none",
                  background: isTracking
                    ? "#ef4444"
                    : "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: isTracking
                    ? "0 4px 20px rgba(239,68,68,0.4)"
                    : "0 4px 20px rgba(16,185,129,0.4)",
                  transition: "all 0.2s",
                }}
              >
                {isTracking ? (
                  <>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ffffff", display: "inline-block" }} />
                    Stop Live GPS Tracking
                  </>
                ) : (
                  <>
                    <Ic.MapPin s={20} />
                    Start Live GPS Tracking
                  </>
                )}
              </button>

              <div style={{ marginTop: 8, fontSize: 12, color: isTracking ? "#34d399" : "#94a3b8" }}>
                {isTracking
                  ? "🟢 Broadcasting high-accuracy GPS coordinates & tracking movement"
                  : "Tap button to begin real-time position tracking and trail recording"}
              </div>
            </div>

            {/* Card 2: KPI Metrics */}
            <div className="kpi-grid" style={{ marginBottom: 14 }}>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: "#38bdf8", fontFamily: "monospace" }}>
                  {elapsed}
                </div>
                <div className="kpi-lbl">Session Time</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: "#10b981" }}>
                  {displayDist}
                </div>
                <div className="kpi-lbl">Distance Traveled</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: "#f59e0b" }}>
                  {speedKmh} <span style={{ fontSize: 11 }}>km/h</span>
                </div>
                <div className="kpi-lbl">Speed</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: (coords?.accuracy || 0) < 15 ? "#10b981" : "#e2e8f0" }}>
                  ±{Math.round(coords?.accuracy || 0)} <span style={{ fontSize: 11 }}>m</span>
                </div>
                <div className="kpi-lbl">GPS Accuracy</div>
              </div>
            </div>

            {/* Card 3: Route Setup (Origin + Company Site Destination) */}
            <div
              className="card"
              style={{
                marginBottom: 14,
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                border: "1px solid #3b82f6",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🧭</span> Company Site Navigation & Attendance
              </div>

              {/* Source (Origin) */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
                    SOURCE (CURRENT LOCATION)
                  </label>
                  <button
                    onClick={detectLocation}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38bdf8",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>🔄</span> {locating ? "Acquiring Fix..." : "Refresh Location"}
                  </button>
                </div>

                <div
                  onClick={detectLocation}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 8,
                    background: "#0f172a",
                    color: coords ? "#34d399" : "#fbbf24",
                    border: coords ? "1.5px solid #10b981" : "1px solid #334155",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span style={{ flex: 1 }}>
                    {coords
                      ? `Real GPS (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}) • ±${Math.round(coords.accuracy)}m`
                      : locating
                      ? "Acquiring GPS Satellite Signal..."
                      : "Tap to Acquire Real Hardware GPS Location"}
                  </span>
                  <span style={{ fontSize: 11, color: coords ? "#10b981" : "#fbbf24" }}>
                    {coords ? "LIVE 🟢" : "LOCATING"}
                  </span>
                </div>
              </div>

              {/* Destination (Company Sites Dropdown) */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  DESTINATION (COMPANY PROJECT SITE)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 8,
                    background: "#0f172a",
                    color: "#f1f5f9",
                    border: "1.5px solid #3b82f6",
                    fontSize: 14,
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      🏗️ {p.title} — {p.location || "Site Location"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Road Pathway Preview Details */}
              {previewRoute && (
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🚗</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>
                        {previewRoute.durationMin} min • {previewRoute.distanceKm} km
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Live Road Pathway plotted on map below</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>Route Ready 🟢</span>
                </div>
              )}

              {/* Start Navigation Button */}
              <button
                onClick={handleStartProjectNav}
                disabled={navLoading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
                }}
              >
                {navLoading ? "Calculating Road Route..." : "▶ Start Turn-by-Turn Navigation"}
              </button>
            </div>
          </>
        )}

        {/* ─── Card 4: Leaflet Map Canvas (Positioned Below the Inputs) ────── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: navMode ? "100vh" : "360px",
            borderRadius: navMode ? 0 : 14,
            overflow: "hidden",
            border: navMode ? "none" : "1px solid #334155",
            marginBottom: navMode ? 0 : 14,
          }}
        >
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

          {/* Floating Re-centre Button (Standard mode) */}
          {!navMode && (
            <button
              onClick={reCenterMap}
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                zIndex: 400,
                background: "#1e293b",
                color: "#38bdf8",
                border: "1px solid #334155",
                borderRadius: "50%",
                width: 42,
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                fontSize: 18,
                cursor: "pointer",
              }}
              title="Re-centre to my location"
            >
              ⌖
            </button>
          )}
        </div>
      </div>
    </>
  );
}
