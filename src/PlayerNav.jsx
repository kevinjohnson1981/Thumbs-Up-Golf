// PlayerNav.jsx
import React, { useState } from 'react';
import MapboxDistanceMap from './MapboxDistanceMap'; // 👈 Make sure this is correct
import './MapboxMap.css'; // Optional: reuse your map styling

function PlayerNav({ onGoHome, onGoIndividualLeaderboard, onGoTeamLeaderboard, onShowRules, tournamentName, showTeamLeaderboard = true }) {
  const [showMap, setShowMap] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="player-nav-shell">
      <div className="player-nav-title-block">
        <div className="player-nav-title">
          {tournamentName}
        </div>
      </div>
      <div className="player-nav-actions">
        <button onClick={onGoHome}>⛳ Home</button>
        <div className="player-nav-menu-wrap">
          <button
            className="player-nav-menu-button"
            onClick={() => setShowMenu((current) => !current)}
          >
            ≡ Menu
          </button>
          {showMenu && (
            <div className="player-nav-menu-panel">
              <button
                className="player-nav-menu-item"
                onClick={() => {
                  setShowMenu(false);
                  onGoIndividualLeaderboard();
                }}
              >
                🥇 Individual Leaderboard
              </button>
              {showTeamLeaderboard && (
                <button
                  className="player-nav-menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    onGoTeamLeaderboard();
                  }}
                >
                  🏆 Team Leaderboard
                </button>
              )}
              <button
                className="player-nav-menu-item"
                onClick={() => {
                  setShowMenu(false);
                  onShowRules();
                }}
              >
                📋 Rules
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setShowMap(true)}>📍 GPS Map</button>
      </div>

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
          <div className="player-nav-modal">
            <button
              className="player-nav-modal-close"
              onClick={() => setShowMap(false)}
            >
              Close
            </button>


            <MapboxDistanceMap />
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerNav;
