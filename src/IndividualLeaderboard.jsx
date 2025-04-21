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
      const scoreSnapshots = await getDocs(collection(db, "tournaments", selectedTournamentId, "scores"));
      const allScores = [];
  
      for (const docSnap of scoreSnapshots.docs) {
        const data = docSnap.data();
        const matchId = docSnap.id;
        const [_, date, matchType] = matchId.split("_");
  
        // Fetch the corresponding match doc to get hole pars
        const matchSnap = await getDocs(
          query(collection(db, "tournaments", selectedTournamentId, "matches"), where("date", "==", date))
        );
        const matchDoc = matchSnap.docs[0]?.data();
        const holePars = matchDoc?.teeBox?.holes?.map(h => h.par) || [];
        const totalPar = holePars.reduce((sum, par) => sum + par, 0);
        const totalParByHole = {};
          holePars.forEach((par, idx) => {
            totalParByHole[idx] = par;
          });

          allScores.push({ date, matchType, totalPar, totalParByHole, scores: data.scores });
      }
  
      const playerTotals = {};
  
      allScores.forEach(scoreDoc => {
        const { scores, totalPar, date } = scoreDoc;
        if (!scores) return;
  
        Object.entries(scores).forEach(([playerName, holeScores]) => {
          if (!playerTotals[playerName]) {
            const teamName = holeScores.teamName || null;
            playerTotals[playerName] = {
              name: playerName,
              team: teamName,
              days: {},
            };
          }
  
          const playedHoles = Object.entries(holeScores).filter(
            ([_, value]) => typeof value === "object" && value !== null && !isNaN(parseInt(value.net))
          );
          
          let totalParPlayed = 0;
          let gross = 0;
          let net = 0;
          
          playedHoles.forEach(([holeIdx, value]) => {
            const idx = parseInt(holeIdx);
            const grossScore = parseInt(value.gross);
            const netScore = parseInt(value.net);
            if (!isNaN(grossScore)) gross += grossScore;
            if (!isNaN(netScore)) net += netScore;
          
            // Add hole par from matchDoc if available
            const holePar = scoreDoc.totalParByHole?.[idx];
            if (!isNaN(holePar)) totalParPlayed += holePar;
          });
          
          // Calculate net-to-par based on actual par for played holes
          const netToPar = totalParPlayed > 0 ? net - totalParPlayed : null;
          
          playerTotals[playerName].days[date] = {
            gross,
            net,
            netToPar
          };
        });
      });
  
      const formatted = Object.values(playerTotals).map(player => {
        const totalToPar = Object.values(player.days).reduce((sum, d) => sum + d.netToPar, 0);
        return {
          name: player.name,
          team: player.team,
          scoresByDay: player.days,
          totalToPar
        };
      }).sort((a, b) => a.totalToPar - b.totalToPar);
  
      setLeaderboardData(formatted);
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
                      : "-"}
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
