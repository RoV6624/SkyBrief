import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Layers, Locate, Navigation } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { RouteWaypoint } from "@/lib/route/types";
import type { FlightCategory } from "@/lib/api/types";

type MapType = "hybridFlyover" | "mutedStandard";

interface RouteMapVisualizationProps {
  waypoints: RouteWaypoint[];
  /** Map ICAO to flight category for coloring markers */
  categoryMap?: Record<string, FlightCategory>;
  /** Set of ICAO identifiers that are hazard stations */
  hazardStations?: Set<string>;
}

const categoryColors: Record<FlightCategory, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

// Lazy-load react-native-maps to avoid crash when native module isn't built
const mapsModule = (() => {
  try {
    const m = require("react-native-maps");
    // Verify the native module actually exists (not just the JS shim)
    if (m?.default) return m;
    return null;
  } catch {
    return null;
  }
})();

export function RouteMapVisualization({
  waypoints,
  categoryMap = {},
  hazardStations = new Set(),
}: RouteMapVisualizationProps) {
  const { isDark } = useTheme();
  const mapRef = useRef<any>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [mapType, setMapType] = useState<MapType>("hybridFlyover");

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const coordinates = useMemo(
    () =>
      waypoints.map((wp) => ({
        latitude: wp.lat,
        longitude: wp.lon,
      })),
    [waypoints]
  );

  // Compute initial camera centered on route with 3D pitch
  const initialCamera = useMemo(() => {
    if (coordinates.length < 2) return undefined;
    const lats = coordinates.map((c) => c.latitude);
    const lons = coordinates.map((c) => c.longitude);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    // Rough altitude based on route spread (degrees → meters)
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lonSpread = Math.max(...lons) - Math.min(...lons);
    const spread = Math.max(latSpread, lonSpread);
    const altitude = Math.min(Math.max(spread * 111_000 * 1.5, 8_000), 100_000);

    return {
      center: { latitude: centerLat, longitude: centerLon },
      pitch: 45,
      heading: 0,
      altitude,
    };
  }, [coordinates]);

  const fitToRoute = useCallback(() => {
    if (!mapRef.current || coordinates.length < 2) return;

    // Step 1: Instant fit to get correct zoom/region (no animation to avoid pitch reset)
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: false,
    });

    // Step 2: Read back computed camera and re-apply with 3D pitch
    const t1 = setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current
        .getCamera()
        .then((camera: any) => {
          mapRef.current.animateCamera(
            {
              center: camera.center,
              pitch: 45,
              heading: camera.heading ?? 0,
              altitude: Math.min(camera.altitude ?? 100_000, 100_000),
            },
            { duration: 500 }
          );
        })
        .catch(() => {
          // Fallback if getCamera isn't supported
          mapRef.current?.animateCamera({ pitch: 45 }, { duration: 300 });
        });
    }, 100);
    timersRef.current.push(t1);
  }, [coordinates]);

  const toggleMapType = useCallback(() => {
    setMapType((prev) =>
      prev === "hybridFlyover" ? "mutedStandard" : "hybridFlyover"
    );
  }, []);

  const onMapReady = useCallback(() => {
    // Fit to route after map is ready (500ms for tile rendering)
    const t2 = setTimeout(fitToRoute, 500);
    timersRef.current.push(t2);
  }, [fitToRoute]);

  if (waypoints.length < 2) return null;

  // Fallback when react-native-maps native module is not available
  if (!mapsModule) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "rgba(15,15,20,0.8)" : "rgba(240,245,250,0.9)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          },
        ]}
      >
        <Navigation
          size={28}
          color={colors.stratus[500]}
          strokeWidth={1.5}
          style={{ marginBottom: 12 }}
        />
        <Text
          style={{
            fontSize: 13,
            fontFamily: "JetBrainsMono_700Bold",
            color: isDark ? "#94a3b8" : colors.stratus[600],
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Map requires native rebuild
        </Text>

        {/* Show waypoints as text list */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
          {waypoints.map((wp, i) => {
            const cat = categoryMap[wp.icao];
            const isHazard = hazardStations.has(wp.icao);
            const dotColor = isHazard
              ? colors.alert.red
              : cat
              ? categoryColors[cat]
              : colors.stratus[500];

            return (
              <View
                key={wp.icao}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "rgba(30,30,40,0.7)" : "rgba(255,255,255,0.8)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: dotColor,
                    marginRight: 5,
                  }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "JetBrainsMono_700Bold",
                    color: isDark ? "#e2e8f0" : "#083f6e",
                  }}
                >
                  {wp.icao}
                </Text>
                {i < waypoints.length - 1 && (
                  <Text style={{ color: colors.stratus[400], marginLeft: 4, fontSize: 10 }}>→</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const { default: MapView, Polyline, Marker, PROVIDER_DEFAULT } = mapsModule;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        mapType={mapType}
        style={styles.map}
        camera={initialCamera}
        onMapReady={onMapReady}
        cameraZoomRange={{ maxCenterCoordinateDistance: 120_000 }}
        showsCompass={false}
        showsScale
        pitchEnabled
        rotateEnabled
        scrollEnabled
        zoomEnabled
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? "dark" : "light"}
      >
        {/* Route Polyline */}
        <Polyline
          coordinates={coordinates}
          strokeColor={colors.stratus[500]}
          strokeWidth={3}
          lineDashPattern={[0]}
        />

        {/* Waypoint Markers */}
        {waypoints.map((wp, i) => {
          const cat = categoryMap[wp.icao];
          const isHazard = hazardStations.has(wp.icao);
          const markerColor = isHazard
            ? colors.alert.red
            : cat
            ? categoryColors[cat]
            : colors.stratus[500];
          const isEndpoint = i === 0 || i === waypoints.length - 1;

          return (
            <Marker
              key={wp.icao}
              coordinate={{ latitude: wp.lat, longitude: wp.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    isEndpoint ? styles.endpointDot : styles.waypointDot,
                    { backgroundColor: markerColor },
                  ]}
                />
                <Text
                  style={[
                    styles.markerLabel,
                    {
                      color: isDark ? "#ffffff" : "#083f6e",
                    },
                  ]}
                >
                  {wp.icao}
                </Text>
                {isHazard && <Text style={styles.hazardIcon}>!</Text>}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Overlay Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={toggleMapType}
          style={[
            styles.controlButton,
            {
              backgroundColor: isDark
                ? "rgba(30,30,35,0.85)"
                : "rgba(255,255,255,0.9)",
            },
          ]}
        >
          <Layers
            size={18}
            color={isDark ? "#ffffff" : colors.stratus[700]}
            strokeWidth={1.8}
          />
        </Pressable>
        <Pressable
          onPress={fitToRoute}
          style={[
            styles.controlButton,
            {
              backgroundColor: isDark
                ? "rgba(30,30,35,0.85)"
                : "rgba(255,255,255,0.9)",
            },
          ]}
        >
          <Locate
            size={18}
            color={isDark ? "#ffffff" : colors.stratus[700]}
            strokeWidth={1.8}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 360,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
  },
  map: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    right: 12,
    top: 12,
    gap: 8,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerContainer: {
    alignItems: "center",
  },
  endpointDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  waypointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  markerLabel: {
    fontSize: 9,
    fontFamily: "JetBrainsMono_700Bold",
    marginTop: 2,
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  hazardIcon: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ef4444",
    marginTop: -2,
  },
});
