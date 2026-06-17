import { useMemo } from 'react';

/**
 * Decode a Google-encoded polyline string into lat/lng pairs.
 * See: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

interface RouteMapProps {
  polyline: string;
}

/**
 * Renders a decoded polyline as an SVG path.
 * Lightweight route visualization without a map library.
 */
export function RouteMap({ polyline }: RouteMapProps) {
  const { svgPath, viewBox } = useMemo(() => {
    const points = decodePolyline(polyline);
    if (points.length < 2) return { svgPath: '', viewBox: '0 0 100 100' };

    // Find bounds
    let minLat = Infinity,
      maxLat = -Infinity;
    let minLng = Infinity,
      maxLng = -Infinity;

    for (const [lat, lng] of points) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const padding = 0.1;
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    // Normalize to SVG viewport (invert Y since lat increases northward)
    const width = 300;
    const height = 200;
    const padX = width * padding;
    const padY = height * padding;
    const drawW = width - 2 * padX;
    const drawH = height - 2 * padY;

    const svgPoints = points.map(([lat, lng]) => {
      const x = padX + ((lng - minLng) / lngRange) * drawW;
      const y = padY + ((maxLat - lat) / latRange) * drawH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      svgPath: `M${svgPoints.join(' L')}`,
      viewBox: `0 0 ${width} ${height}`,
    };
  }, [polyline]);

  if (!svgPath) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Route</p>
      <svg
        viewBox={viewBox}
        className="h-40 w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={svgPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        {/* Start marker */}
        <circle
          cx={svgPath.split(' ')[0]?.replace('M', '').split(',')[0]}
          cy={svgPath.split(' ')[0]?.replace('M', '').split(',')[1]}
          r="4"
          className="fill-green-500"
        />
        {/* End marker */}
        <circle
          cx={svgPath.split(' ').pop()?.replace('L', '').split(',')[0]}
          cy={svgPath.split(' ').pop()?.replace('L', '').split(',')[1]}
          r="4"
          className="fill-red-500"
        />
      </svg>
    </div>
  );
}
