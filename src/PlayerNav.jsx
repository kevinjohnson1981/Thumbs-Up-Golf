// PlayerNav.jsx
import React from 'react';

function PlayerNav({ onGoHome, onGoIndividualLeaderboard, onGoTeamLeaderboard, tournamentName }) {
  return (
    <div style={{ padding: "5px", borderBottom: "5px solid #ccc", marginBottom: "10px", background: "" }}>
      <div style={{ marginBottom: "1px", fontWeight: "bold", fontSize: "1.5em" }}>
        {tournamentName}
      </div>
      <button onClick={onGoHome} style={{ marginRight: "20px" }}>⛳</button>
      <button onClick={onGoIndividualLeaderboard} style={{ marginRight: "20px" }}>🥇🏌️‍♂️</button>
      <button onClick={onGoTeamLeaderboard}>🏆🏌️‍♂️🏌️‍♂️🏌️‍♂️</button>
    </div>
  );
}

export default PlayerNav;
