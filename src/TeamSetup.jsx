import React from 'react';
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

function TeamSetup({ teams, setTeams, goNext, goBack, tournamentName, selectedTournamentId }) {
  const handleContinue = async () => {
    try {
      const tournamentRef = doc(db, "tournaments", selectedTournamentId);
      await setDoc(tournamentRef, {
        name: tournamentName,
        teams: teams
      }, { merge: true });
      goNext();
    } catch (error) {
      console.error("Error saving tournament:", error);
    }
  };

  return (
    <div className="admin-page-shell">
      <section className="admin-hero-card compact">
        <div className="admin-hero-copy">
          <p className="admin-eyebrow">Team Setup</p>
          <h2>Build your teams and player list</h2>
          <p>Name each team, assign a color, and add the players and handicaps for the event.</p>
        </div>
      </section>

      <section className="admin-section-card">
        {teams.length > 0 ? (
          <div className="team-setup-grid">
            {teams.map((team, index) => (
              <article key={index} className="team-setup-card">
                <div className="team-setup-card-header">
                  <div>
                    <p className="admin-eyebrow">Team {index + 1}</p>
                    <h3>Team Details</h3>
                  </div>
                </div>

                <div
                  className="team-inline-field"
                >
                  <label htmlFor={`team-name-${index}`} style={{ marginBottom: 0 }}>Team Name</label>
                  <input
                    id={`team-name-${index}`}
                    type="text"
                    placeholder={`Team ${index + 1} Name`}
                    value={team.name}
                    onChange={(e) => {
                      const updatedTeams = [...teams];
                      updatedTeams[index].name = e.target.value;
                      setTeams(updatedTeams);
                    }}
                    style={{ marginBottom: 0 }}
                  />
                </div>

                <div
                  className="team-inline-field compact"
                >
                  <label htmlFor={`team-color-${index}`} style={{ marginBottom: 0 }}>Team Color</label>
                  <input
                    id={`team-color-${index}`}
                    type="color"
                    value={team.color || "#808080"}
                    onChange={(e) => {
                      const updatedTeams = [...teams];
                      updatedTeams[index].color = e.target.value;
                      setTeams(updatedTeams);
                    }}
                    className="team-color-input"
                    style={{ marginBottom: 0 }}
                  />
                </div>

                <div className="players-block">
                  <div className="players-block-header">
                    <h4>Players</h4>
                    <p>Add names and handicaps for this team.</p>
                  </div>

                  <div className="team-player-grid-header">
                    <span>Name</span>
                    <span>Handicap</span>
                  </div>

                  {team.players.map((player, pIndex) => (
                    <div
                      key={pIndex}
                      className="player-info-row polished"
                      style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: "10px", alignItems: "center" }}
                    >
                      <input
                        type="text"
                        className="player-name-input"
                        placeholder={`Player ${pIndex + 1} Name`}
                        value={player.name}
                        onChange={(e) => {
                          const updatedTeams = [...teams];
                          updatedTeams[index].players[pIndex].name = e.target.value;
                          setTeams(updatedTeams);
                        }}
                        style={{ width: "100%", maxWidth: "100%", marginBottom: 0, textAlign: "left", height: "42px", padding: "10px" }}
                      />
                      <select
                        className="player-handicap-input"
                        value={player.handicap ?? ""}
                        onChange={(e) => {
                          const updatedTeams = [...teams];
                          updatedTeams[index].players[pIndex].handicap = e.target.value;
                          setTeams(updatedTeams);
                        }}
                        style={{ width: "96px", maxWidth: "96px", marginBottom: 0, textAlign: "center", height: "42px", padding: "0 8px" }}
                      >
                        <option value="">HCP</option>
                        {Array.from({ length: 51 }, (_, handicap) => (
                          <option key={handicap} value={handicap}>
                            {handicap}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <h4>Teams are not ready yet</h4>
            <p>Go back to tournament setup first so the app can generate the right number of teams and players.</p>
          </div>
        )}

        <div className="setup-actions">
          <button className="admin-secondary-button" onClick={goBack}>
            Back
          </button>
          <button className="admin-primary-button" onClick={handleContinue}>
            Continue to Match Setup
          </button>
        </div>
      </section>
    </div>
  );
}

export default TeamSetup;
