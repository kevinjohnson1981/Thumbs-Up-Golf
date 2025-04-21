import React from 'react';

function SetupOptions({
  tournamentName,
  setTournamentName,
  numTeams,
  setNumTeams,
  playersPerTeam,
  setPlayersPerTeam,
  eventCode,                // ✅ ADD THIS
  setEventCode,             // ✅ AND THIS
  onContinue,
  goBack
}) {
  return (
    <div style={{ padding: "0.1rem" }}>
      <h2>📝 Tournament Setup</h2>

      <div style={{ marginBottom: "0.1rem" }}>
        <label>Tournament Name:<br />
        <input
          type="text"
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder="e.g. Thumbs Up Golf Classic"
          style={{ width: "75%", padding: "0.5rem", marginTop: "" }}
        />
        </label>
      </div>

      <div className="form-row">
        <label htmlFor="numTeams">Number of Teams:</label>
        <select
          id="numTeams"
          value={numTeams}
          onChange={(e) => setNumTeams(parseInt(e.target.value))}
        >
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="playersPerTeam">Players Per Team:</label>
        <select
          id="playersPerTeam"
          value={playersPerTeam}
          onChange={(e) => setPlayersPerTeam(parseInt(e.target.value))}
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>



      <form onSubmit={(e) => e.preventDefault()}>
  <label>
    Event Code<br />
    <input
      type="text"
      value={eventCode ?? ""}
      onChange={(e) => setEventCode(e.target.value)}
      placeholder="Leave blank for auto-generated"
      style={{ width: "50%", padding: "0.5rem", marginTop: "" }}
    /><br />
    <small style={{ fontSize: "0.8em", color: "" }}>
    Code can be changed. <br />
    If left unchanged, code above will be used.
    </small>
  </label>

  <button type="button" onClick={onContinue}>
    Continue
  </button>
</form>

{goBack && (
  <button onClick={goBack} style={{ marginTop: "1rem", backgroundColor: "" }}>
    ⬅️ Back
  </button>
)}


    </div>
  );
}

export default SetupOptions;
