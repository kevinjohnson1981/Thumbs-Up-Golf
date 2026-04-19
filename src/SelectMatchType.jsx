import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function SelectMatchType({ selectedDate, tournamentId, onSelectMatchType }) {
  const [matchData, setMatchData] = useState(null);

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "this day";
    const parsed = new Date(`${rawDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return rawDate;

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  };

  const formatMatchType = (type) => {
    if (!type) return "Match";

    const map = {
      stroke: "Stroke Play",
      stableford: "Stableford",
      teamMatch18: "Team Match Play",
      teamMatch9: "Team Match Play",
      individualMatch18: "Individual Match Play",
      individualMatch9: "Individual Match Play",
      bestBall1: "Best Ball",
      bestBall2: "Best Ball",
    };

    return map[type] || type;
  };

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
    <div className="admin-page-shell">
      <section className="admin-hero-card compact player-select-hero">
        <div className="admin-hero-copy">
          <p className="player-select-hero-intro match-select-date-line">
            {`You're scoring for ${formatDisplayDate(selectedDate)}.`}
          </p>
          <p className="player-select-hero-course">
            {matchData?.course?.course_name || "Course not set"}
          </p>
          <h2>Select a match</h2>
        </div>
      </section>

      <section className="admin-section-card">
      <div className="selection-card-grid match-type-grid">
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

            const individualMatch18Players = Array.isArray(match.pairings)
              ? match.pairings.map(pair => [pair.playerA, pair.playerB]).flat()
              : [];



            const bestBallPlayers = match.matchTeams?.flatMap(team => team.players) || [];


        const summary =
          (p0.length > 0 && p1.length > 0 && `${p0.join(", ")} vs ${p1.join(", ")}`) ||
          (match.type === "stableford" && stablefordPlayers.length > 0 && stablefordPlayers.join(", ")) ||
          (match.type === "teamMatch18" && match.participants &&
            `${(match.participants.team1?.players || []).join(", ")} vs ${(match.participants.team2?.players || []).join(", ")}`) ||
          (match.type?.includes("stroke") && strokePlayPlayers.length > 0 && strokePlayPlayers.join(", ")) ||
          (match.type === "individualMatch9" && individualPlayers.length > 0 && individualPlayers.join(", ")) ||
          (match.type === "teamMatch9" && match.participants &&
            `${(match.participants.team0?.players || []).join(", ")} vs ${(match.participants.team1?.players || []).join(", ")}`) ||
          (match.type === "individualMatch18" && individualMatch18Players.length > 0 && individualMatch18Players.join(", ")) ||
          ((match.type === "bestBall1" || match.type === "bestBall2") && bestBallPlayers.length > 0 && bestBallPlayers.join(", ")) ||
          "Tap to begin scoring";

        return (
          <button className="selection-card match-type-card" key={index} onClick={() => handleSelect(match)}>
            <div className="match-type-card-topline">
              <span className="selection-card-label">{match.matchLabel || `Match ${index + 1}`}</span>
              <span className="match-type-date">{formatMatchType(match.type)}</span>
            </div>
            <strong>{summary}</strong>
          </button>
        );
      })}




      </div>
      </section>
    </div>
  );
}

export default SelectMatchType;
