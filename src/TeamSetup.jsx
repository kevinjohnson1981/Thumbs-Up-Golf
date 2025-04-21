import React, { useEffect, useState } from 'react';
import { db } from "./firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

function TeamSetup({ teams, setTeams, goNext, goBack, tournamentName, selectedTournamentId }) {

  console.log("🧠 TEAMS LOADED INTO COMPONENT:", teams);


  useEffect(() => {
    if (teams.length > 0) return; // Don't fetch if already set up
  
    const fetchTeams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        const fetchedTeams = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("Loaded Teams from Firebase:", fetchedTeams);
        setTeams(fetchedTeams);
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
  }, [setTeams]);

  const handleContinue = async () => {
    try {
      const tournamentRef = doc(db, "tournaments", selectedTournamentId);
      await setDoc(tournamentRef, {
        name: tournamentName,
        teams: teams
      }, { merge: true });
      console.log("✅ Tournament data saved!");
      goNext();
    } catch (error) {
      console.error("Error saving tournament:", error);
    }
  };

  return (
    <div>
      <h2>Team Setup</h2>

      {teams.length > 0 ? (
        teams.map((team, index) => (
          <div key={index} style={{ border: "1px solid black", padding: "20px", margin: "10px 50px" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <label>Team {index + 1} Name:</label>
              <input
                type="text"
                placeholder={`Team ${index + 1} Name`}
                value={team.name}
                onChange={(e) => {
                  const updatedTeams = [...teams];
                  updatedTeams[index].name = e.target.value;
                  setTeams(updatedTeams);
                }}
                style={{ marginLeft: "0px" }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <label>Team Color:</label>
              <select
                value={team.color || ""}
                onChange={(e) => {
                  const updatedTeams = [...teams];
                  updatedTeams[index].color = e.target.value;
                  setTeams(updatedTeams);
                }}
                style={{ marginLeft: "0px" }}
              >
                <option value="">Select a color</option>
                <option value="red">Red 🔴</option>
                <option value="blue">Blue 🔵</option>
                <option value="green">Green 🟢</option>
                <option value="purple">Purple 🟣</option>
                <option value="orange">Orange 🟠</option>
                <option value="black">Black ⚫</option>
                <option value="yellow">Yellow 🟡</option>
              </select>
            </div>
            <label>Players:</label>
            {team.players.map((player, pIndex) => (
              <div key={pIndex} className="player-info-row">
                
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
                />
                <input
                  type="number"
                  className="player-handicap-input"
                  placeholder="HCP"
                  value={player.handicap}
                  onChange={(e) => {
                    const updatedTeams = [...teams];
                    updatedTeams[index].players[pIndex].handicap = e.target.value;
                    setTeams(updatedTeams);
                  }}
                />
              </div>
            ))}

          </div>
        ))
      ) : (
        <p>Loading teams...</p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button onClick={goBack} style={{ marginRight: "10px" }}>⬅️ Back</button>
        <button onClick={handleContinue}>Continue to Match Setup ➡️</button>
      </div>
    </div>
  );
}

export default TeamSetup;
