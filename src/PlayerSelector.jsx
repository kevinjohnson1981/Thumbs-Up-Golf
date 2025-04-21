import React, { useState, useEffect } from 'react';
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

function PlayerSelector({ onSelectPlayers }) {
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  // ✅ Fetch all players from Firebase when the component loads
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        let allPlayers = [];
        
        querySnapshot.forEach((doc) => {
          const teamData = doc.data();
          teamData.players.forEach((player) => {
            allPlayers.push({ name: player.name, handicap: player.handicap });
          });
        });

        setPlayers(allPlayers);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchPlayers();
  }, []);

  // ✅ Toggle selection when a player checkbox is clicked
  const handlePlayerSelection = (player) => {
    setSelectedPlayers((prevSelected) =>
      prevSelected.includes(player)
        ? prevSelected.filter((p) => p !== player)
        : [...prevSelected, player]
    );
  };

  return (
    <div>
      <h2>Who Are You Keeping Score For?</h2>

      {players.length > 0 ? (
        players.map((player, index) => (
          <div key={index}>
            <label>
              <input
                type="checkbox"
                checked={selectedPlayers.includes(player)}
                onChange={() => handlePlayerSelection(player)}
              />
              {player.name} (Handicap: {player.handicap})
            </label>
          </div>
        ))
      ) : (
        <p>Loading players...</p>
      )}

<button 
  onClick={() => {
    console.log("onSelectPlayers Function Exists?", typeof onSelectPlayers); // ✅ Check if it's defined
    console.log("Selected Players:", selectedPlayers); // ✅ Check if players are selected

    if (typeof onSelectPlayers === "function") {
      onSelectPlayers(selectedPlayers);
    } else {
      console.error("onSelectPlayers is NOT a function!"); // ❌ Log error if it's not defined
    }
  }} 
  disabled={selectedPlayers.length === 0}
>
  Continue
</button>
    </div>
  );
}

export default PlayerSelector;
