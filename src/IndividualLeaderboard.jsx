import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { onSnapshot } from "firebase/firestore";

function IndividualLeaderboard({ selectedTournamentId }) {

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const PAR = 72; // or change if your event uses a different par

  useEffect(() => {
    if (!selectedTournamentId) return;

    const fetchLeaderboardData = async () => {
      // 1️⃣  pull every score-file once
      const scoreSnaps = await getDocs(
        collection(db, "tournaments", selectedTournamentId, "scores")
      );
  
      // 2️⃣  pull every “day” document once (each can contain several matches)
      const daySnaps = await getDocs(
        collection(db, "tournaments", selectedTournamentId, "matches")
      );
  
      const allScores = [];
  
      // 3️⃣  for each score-file, find the day & match that produced it
      for (const scoreDoc of scoreSnaps.docs) {
        const scoreData = scoreDoc.data();            // { scores:{…}, … }
        const scoreId   = scoreDoc.id;                // scores_2025-06-14_teamMatch9_Match_2
        let   dayDoc    = null;                       // full day document
        let   thisMatch = null;                       // the exact match object
  
        daySnaps.docs.forEach(d => {
          const day = d.data();
          (day.matches || []).forEach(m => {
            const lbl = (m.matchLabel || "Match").replace(/\s+/g, "_");
            const cid = `scores_${day.date}_${m.type}_${lbl}`;
            if (cid === scoreId) {
              dayDoc    = day;
              thisMatch = m;
            }
          });
        });
  
        if (!dayDoc || !thisMatch) continue;            // couldn’t match → skip
        if (thisMatch.excludeFromIndividual) continue;  // admin ticked the box
  
        // hole-par lookup for this tee-box
        const holePars       = dayDoc.teeBox?.holes?.map(h => h.par) || [];
        const totalParByHole = {};
        holePars.forEach((par, idx) => (totalParByHole[idx] = par));
  
        const [ , date ] = scoreId.split("_");          // 2nd token is the date
  
        allScores.push({
          date,
          scores: scoreData.scores,
          totalParByHole
        });
      }
  
      // 4️⃣  aggregate per player
      const playerTotals = {};
  
      allScores.forEach(({ scores, date, totalParByHole }) => {
        if (!scores) return;
  
        Object.entries(scores).forEach(([playerName, holeScores]) => {
          if (!playerTotals[playerName]) {
            const teamName = holeScores.teamName || null;
            playerTotals[playerName] = { name: playerName, team: teamName, days: {} };
          }
  
          let gross = 0,
              net   = 0,
              parPlayed = 0;
  
          Object.entries(holeScores).forEach(([hIdx, v]) => {
            if (typeof v !== "object") return;           // skip teamName entry
            const g = parseInt(v.gross);
            const n = parseInt(v.net);
            if (!isNaN(g)) gross += g;
            if (!isNaN(n)) net   += n;
  
            const hp = totalParByHole[hIdx];
            if (!isNaN(hp)) parPlayed += hp;
          });
  
          const netToPar = parPlayed > 0 ? net - parPlayed : null;
  
          playerTotals[playerName].days[date] = { gross, net, netToPar };
        });
      });
  
          // 5️⃣  format & sort  (REPLACE this block)
    const leaderboard = Object.values(playerTotals)
    .map(p => ({
      name: p.name,
      team: p.team,
      scoresByDay: p.days,           // 👈 keep the old key!
      totalToPar: Object.values(p.days).reduce((s, d) => s + d.netToPar, 0)
    }))
    .sort((a, b) => a.totalToPar - b.totalToPar);

  
      setLeaderboardData(leaderboard);
      setLoading(false);
    };
  
  
    fetchLeaderboardData();
  }, []);
  

  


  if (loading) return <p>Loading leaderboard...</p>;

  const allDates = Array.from(
    new Set(
      leaderboardData.flatMap(p => Object.keys(p.scoresByDay))
    )
  ).sort();

  return (
    <div>
      <h2>Individual Leaderboard</h2>
      <table border="1" className="header-table">
        <thead>
          <tr>
            <th>Player</th>
            {allDates.map(date => (
              <th key={date}>{date}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData.map((player, idx) => (
            <tr key={idx} className={player.team ? `team-${player.team.replace(/\s+/g, '').toLowerCase()}` : ''}>
              <td>{player.name}</td>
              {allDates.map(date => {
                const score = player.scoresByDay[date];
                return (
                  <td key={date}>
                    {score
                      ? `${score.gross} / ${score.net} (${score.netToPar > 0 ? "+" : ""}${score.netToPar})`
                      : ""}
                  </td>
                );
              })}

              <td>
                ({player.totalToPar > 0 ? "+" : ""}{player.totalToPar})
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

export default IndividualLeaderboard;