import React, { useEffect, useState } from 'react';

function SetupOptions({
  tournamentName,
  setTournamentName,
  numTeams,
  setNumTeams,
  playersPerTeam,
  setPlayersPerTeam,
  eventCode,
  setEventCode,
  rules,
  setRules,
  selectedLogoFile,
  setSelectedLogoFile,
  currentLogoUrl,
  onRemoveLogo,
  selectedTheme,
  setSelectedTheme,
  themeOptions,
  onContinue,
  goBack
}) {

  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!selectedLogoFile) {
      setPreviewUrl("");
      return;
    }
  
    const objectUrl = URL.createObjectURL(selectedLogoFile);
    setPreviewUrl(objectUrl);
  
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedLogoFile]);

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
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
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

  <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
    <label>
      Tournament Rules / Weekend Notes
      <br />
      <textarea
        value={rules ?? ""}
        onChange={(e) => setRules(e.target.value)}
        placeholder="Enter tournament rules, scoring notes, side games, payouts, or weekend schedule..."
        rows={8}
        style={{
          width: "75%",
          padding: "0.5rem",
          marginTop: "0.5rem",
          borderRadius: "8px"
        }}
      />
      <br />
      <small style={{ fontSize: "0.8em" }}>
        Add any rules, format notes, or weekend information players should see.
      </small>
    </label>
  </div>

  <div style={{ marginTop: "1rem", marginBottom: "1rem", textAlign: "center" }}>
    <label>
      Color Scheme
      <br />
      <select
        value={selectedTheme}
        onChange={(e) => setSelectedTheme(e.target.value)}
        style={{ marginTop: "0.5rem", padding: "0.5rem", width: "220px" }}
      >
        <option value="defaultGray">Default Gray</option>
        <option value="classicBlue">America</option>
        <option value="mastersGreen">Masters Green</option>
        <option value="sunsetGold">Sunset Gold</option>
        <option value="midnight">Midnight</option>
      </select>
    </label>
  </div>

  <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
  <label>
    Tournament Logo<br />
    <input
      type="file"
      accept="image/*"
      onChange={(e) => setSelectedLogoFile(e.target.files[0] || null)}
      style={{ marginTop: "0.5rem" }}
    />
    <br />
    <small style={{ fontSize: "0.8em" }}>
      Upload an image to use as this tournament's logo.
    </small>
  </label>

  {selectedLogoFile && (
  <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
    <div>Selected file: {selectedLogoFile.name}</div>

    {previewUrl && (
      <img
        src={previewUrl}
        alt="Logo preview"
        style={{
          marginTop: "0.5rem",
          maxWidth: "150px",
          maxHeight: "150px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      />
    )}
  </div>
)}

  {currentLogoUrl && !selectedLogoFile && (
  <div style={{ marginTop: "1rem" }}>
    <div style={{ marginBottom: "0.5rem" }}>Current Logo:</div>
    <img
      src={currentLogoUrl}
      alt="Current tournament logo"
      style={{ maxWidth: "150px", maxHeight: "150px", display: "block", marginBottom: "0.5rem" }}
    />
    <button type="button" onClick={onRemoveLogo}>
      Remove Logo
    </button>
  </div>
)}
</div>

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
