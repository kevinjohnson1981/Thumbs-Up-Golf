import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './MapboxMap.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5qb2huc29uMTk4MSIsImEiOiJjbTl1MWhkY3EwNHk0MnFtd3AzOHdhODd4In0.j8Zo70d8nUYpM2f7OINoBw';

function MapboxDistanceMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userLocationRef = useRef(null); // ✅ useRef for guaranteed access
  const [distance, setDistance] = useState(null);

  const metersToYards = (m) => (m * 1.09361).toFixed(0);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  };

  useEffect(() => {
    if (map.current) return;

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const userCoords = { lat: latitude, lng: longitude };
      userLocationRef.current = userCoords;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [longitude, latitude],
        zoom: 17,
      });

      new mapboxgl.Marker({ color: 'blue' })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        console.log("🧭 Clicked at:", lat, lng);

        if (!userLocationRef.current) return;

        const distMeters = calculateDistance(
          userLocationRef.current.lat,
          userLocationRef.current.lng,
          lat,
          lng
        );
        const distYards = metersToYards(distMeters);
        setDistance(distYards);

        // Remove old marker
        if (map.current._clickMarker) {
          map.current._clickMarker.remove();
        }

        // Add new ❌ marker
        const el = document.createElement('div');
        el.innerHTML = 'O';
        el.style.fontSize = '20px';
        el.style.color = 'red';
        el.style.fontWeight = 'bold';
        el.style.textShadow = '0 0 3px white';

        const redMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current);

        map.current._clickMarker = redMarker;

      // ➕ Draw a line to the clicked point
      const lineCoords = [
        [userLocationRef.current.lng, userLocationRef.current.lat],
        [lng, lat]
      ];

      const lineId = 'distance-line';

      if (map.current.getSource(lineId)) {
        map.current.removeLayer(lineId);
        map.current.removeSource(lineId);
      }

      map.current.addSource(lineId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: lineCoords
          }
        }
      });

      map.current.addLayer({
        id: lineId,
        type: 'line',
        source: lineId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': 'yellow',
          'line-width': 3,
          'line-dasharray': [0, 2000], // creates a dashed line
        }
      });

      let dashOffset = 0;

      function animateLine() {
        if (!map.current.getLayer('distance-line')) return;
      
        dashOffset = (dashOffset + 1.0) % 100;
      
        // This line simulates the animation by changing dash pattern
        map.current.setPaintProperty('distance-line', 'line-dasharray', [2, 4, dashOffset]);
      
        requestAnimationFrame(animateLine);
      }
      
      animateLine();
      

    });
  });
  }, []);

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
      {distance && (
        <p style={{ marginTop: '10px', fontWeight: 'bold', textAlign: 'center' }}>
          📏 Distance to point: {distance} yards
        </p>
      )}
    </div>
  );
}

export default MapboxDistanceMap;
