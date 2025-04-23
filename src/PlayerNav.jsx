// PlayerNav.jsx
import React, { useState } from 'react';
import MapboxDistanceMap from './MapboxDistanceMap'; // 👈 Make sure this is correct
import './MapboxMap.css'; // Optional: reuse your map styling

function PlayerNav({ onGoHome, onGoIndividualLeaderboard, onGoTeamLeaderboard, tournamentName }) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div style={{ padding: "5px", borderBottom: "5px solid #ccc", marginBottom: "10px", background: "" }}>
      <div style={{ marginBottom: "1px", fontWeight: "bold", fontSize: "1.5em" }}>
        {tournamentName}
      </div>
      <button onClick={onGoHome} style={{ marginRight: "10px" }}>⛳</button>
      <button onClick={onGoIndividualLeaderboard} style={{ marginRight: "10px" }}>🥇🏌️‍♂️</button>
      <button onClick={onGoTeamLeaderboard} style={{ marginRight: "10px" }}>🏆🏌️‍♂️🏌️‍♂️🏌️‍♂️</button>
      <button onClick={() => setShowMap(true)} style={{ marginRight: "10px" }}>📍 GPS Map</button>

      {/* ✅ Simple modal for the map */}
      {showMap && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "10px",
            padding: "20px",
            width: "90%",
            maxWidth: "800px",
            position: "relative"
          }}>
            {/* ❌ Close button */}
            <button
              onClick={() => setShowMap(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 9999, // ⬅️ This ensures it's above the map
                fontWeight: "bold",
                fontSize: "1.2em",
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ❌ Close
            </button>


            <MapboxDistanceMap />
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerNav;