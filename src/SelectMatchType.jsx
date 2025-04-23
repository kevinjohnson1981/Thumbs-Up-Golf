import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function SelectMatchType({ selectedDate, tournamentId, onSelectMatchType }) {
  const [matchData, setMatchData] = useState(null);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!selectedDate || !tournamentId) return;
      try {
        const matchQuery = query(
          collection(db, "tournaments", tournamentId, "matches"),
          where("date", "==", selectedDate)
        );
        const snapshot = await getDocs(matchQuery);

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          setMatchData(data);
          console.log("✅ Loaded match data:", data);
        } else {
          console.warn("❌ No match found for selected date");
        }
      } catch (err) {
        console.error("🔥 Error fetching match data:", err);
      }
    };

    fetchMatch();
  }, [selectedDate, tournamentId]);

  const handleSelect = (matchObj) => {
    let players = [];
  
    if (matchObj.type === "teamMatch18") {
      players = matchObj.matchTeams?.flatMap(team =>
        team.players.map(name => ({ name }))
      );
    } else if (matchObj.type === "stableford") {
      players = matchObj.participants?.map(name => ({ name }));
    } else if (matchObj.type === "teamMatch9") {
      const team0Players = matchObj.participants?.team0?.players || [];
      const team1Players = matchObj.participants?.team1?.players || [];
      players = [...team0Players, ...team1Players].map(name => ({ name }));
    }
    
  
    onSelectMatchType(matchObj.type, players, matchObj); // pass the matchObj too
  };
  
  

  return (
    <div>
      <h2>Select Match Type for {selectedDate}</h2>
      <div className="vertical-button-stack">
      {matchData?.matches?.map((match, index) => {
        const p0 = match.players0 || match.front9?.players0 || [];
        const p1 = match.players1 || match.front9?.players1 || [];

        // ✅ Support Stableford participants (array of strings or object keys)
        const stablefordPlayers = Array.isArray(match.participants)
          ? match.participants
          : typeof match.participants === 'object'
          ? Object.keys(match.participants)
          : [];

          const strokePlayPlayers = Array.isArray(match.players)
            ? match.players.map(p => (typeof p === "string" ? p : p.name))
            : typeof match.participants === 'object'
            ? Object.keys(match.participants)
            : [];

            const frontPairs = match.pairings?.front9 || [];
            const backPairs = match.pairings?.back9 || [];
            
            const individualPlayers = [
              ...new Set([
                ...frontPairs.flatMap(pair => [pair.playerA, pair.playerB]),
                ...backPairs.flatMap(pair => [pair.playerA, pair.playerB]),
              ])
            ];

            const front9Players0 = match.front9?.players0 || [];
            const front9Players1 = match.front9?.players1 || [];
            const back9Players0 = match.back9?.players0 || [];
            const back9Players1 = match.back9?.players1 || [];

            const front9Combined = [...front9Players0, ...front9Players1];
            const back9Combined = [...back9Players0, ...back9Players1];

            const uniquePlayersForTeamMatch9s = [
              ...new Set([...front9Combined, ...back9Combined])
            ];

            const individualMatch18Players = match.pairings?.map(pair => [pair.playerA, pair.playerB]).flat() || [];

            const bestBallPlayers = match.matchTeams?.flatMap(team => team.players) || [];


        return (
          <button key={index} onClick={() => handleSelect(match)}>
            <strong>{match.matchLabel || match.type}</strong><br />

            {p0.length > 0 && p1.length > 0 && (
              <div>
                {p0.join(", ")} vs {p1.join(", ")}
              </div>
            )}

            {match.type === "stableford" && stablefordPlayers.length > 0 && (
              <div>
                {stablefordPlayers.join(", ")}
              </div>
            )}

            {match.type === "teamMatch18" && match.participants && (
              <div>
                {(match.participants.team1?.players || []).join(", ")} vs {(match.participants.team2?.players || []).join(", ")}
              </div>
            )}

            {match.type?.includes("stroke") && strokePlayPlayers.length > 0 && (
              <div>
                {strokePlayPlayers.join(", ")}
              </div>
            )}

            {match.type === "individualMatch9" && individualPlayers.length > 0 && (
              <div>
                {individualPlayers.join(", ")}
              </div>
            )}

            {match.type === "teamMatch9" && match.participants && (
              <div>
                {(match.participants.team0?.players || []).join(", ")} vs {(match.participants.team1?.players || []).join(", ")}
              </div>
            )}


            {match.type === "individualMatch18" && individualMatch18Players.length > 0 && (
              <div>
                {individualMatch18Players.join(", ")}
              </div>
            )}

            {(match.type === "bestBall1" || match.type === "bestBall2") && bestBallPlayers.length > 0 && (
              <div>
                {bestBallPlayers.join(", ")}
              </div>
            )}


          </button>
        );
      })}




      </div>
    </div>
  );
}

export default SelectMatchType;
