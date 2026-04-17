import React from 'react';
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

function PlayerSetup({ players, setPlayers, goNext, goBack, tournamentName, selectedTournamentId }) {
  const addPlayer = () => {
    setPlayers((prev) => [
      ...prev,
      { name: '', handicap: '', color: '#8c8170' }
    ]);
  };

  const removePlayer = (playerIndex) => {
    setPlayers((prev) => prev.filter((_, index) => index !== playerIndex));
  };

  const handleContinue = async () => {
    try {
      const tournamentRef = doc(db, "tournaments", selectedTournamentId);
      await setDoc(tournamentRef, {
        name: tournamentName,
        players
      }, { merge: true });
      goNext();
    } catch (error) {
      console.error("Error saving individual tournament players:", error);
    }
  };

  return (
    <div className="admin-page-shell">
      <section className="admin-hero-card compact">
        <div className="admin-hero-copy">
          <p className="admin-eyebrow">Player Setup</p>
          <h2>Build your individual field</h2>
          <p>Add the players, handicaps, and colors you want to carry through the leaderboard and scorecard.</p>
        </div>
      </section>

      <section className="admin-section-card">
        <div className="player-setup-grid">
          {players.map((player, index) => (
            <article key={index} className="team-setup-card player-setup-card">
              <div className="team-setup-card-header">
                <div>
                  <h3>Player {index + 1} Details</h3>
                </div>
              </div>

              <div className="players-block">
                <div className="player-setup-row">
                  <input
                    type="text"
                    className="player-name-input"
                    placeholder={`Player ${index + 1} Name`}
                    value={player.name}
                    onChange={(e) => {
                      const updatedPlayers = [...players];
                      updatedPlayers[index].name = e.target.value;
                      setPlayers(updatedPlayers);
                    }}
                  />
                  <select
                    className="player-handicap-input"
                    value={player.handicap ?? ""}
                    onChange={(e) => {
                      const updatedPlayers = [...players];
                      updatedPlayers[index].handicap = e.target.value;
                      setPlayers(updatedPlayers);
                    }}
                  >
                    <option value="">HCP</option>
                    {Array.from({ length: 51 }, (_, handicap) => (
                      <option key={handicap} value={handicap}>
                        {handicap}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="player-setup-color-row">
                  <label htmlFor={`player-color-${index}`}>Player Color</label>
                  <input
                    id={`player-color-${index}`}
                    type="color"
                    value={player.color || "#8c8170"}
                    onChange={(e) => {
                      const updatedPlayers = [...players];
                      updatedPlayers[index].color = e.target.value;
                      setPlayers(updatedPlayers);
                    }}
                    className="team-color-input"
                  />
                  {players.length > 2 && (
                    <button
                      type="button"
                      className="admin-danger-button player-setup-remove-button"
                      onClick={() => removePlayer(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="player-setup-add-row">
          <button type="button" className="admin-secondary-button" onClick={addPlayer}>
            Add Player
          </button>
        </div>

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

export default PlayerSetup;
