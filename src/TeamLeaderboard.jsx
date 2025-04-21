// TeamLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

function TeamLeaderboard({ selectedTournamentId }) {

  const [teamTotals, setTeamTotals] = useState([]);
  const [days, setDays] = useState([]);
  const [teams, setTeams] = useState([]);


  useEffect(() => {
    if (!selectedTournamentId) return;
  
    const fetchScoresAndTeams = async () => {
      // ✅ Fetch team colors from tournament document
      const tournamentSnapshot = await getDocs(collection(db, "tournaments"));
      const tournamentDoc = tournamentSnapshot.docs.find(doc => doc.id === selectedTournamentId);
      const tournamentData = tournamentDoc?.data();
      const teamsFromFirebase = tournamentData?.teams || [];
      setTeams(teamsFromFirebase); // 🟢 store team color info
  
      // ✅ Fetch scores
      const scoresSnapshot = await getDocs(
        collection(db, "tournaments", selectedTournamentId, "scores")
      );
  
      const scoresByDate = {};
  
      scoresSnapshot.forEach(doc => {
        const data = doc.data();
        const matchId = doc.id;
        const [_, date] = matchId.split("_");
  
        if (!scoresByDate[date]) {
          scoresByDate[date] = [];
        }
  
        if (data.teamPoints) {
          scoresByDate[date].push(data.teamPoints);
        }
      });
  
      // ✅ Organize and total scores
      const teamScores = {};
      const sortedDates = Object.keys(scoresByDate).sort();
      const dayLabels = sortedDates.map((date, idx) => `Day ${idx + 1}`);
  
      sortedDates.forEach((date, idx) => {
        const matches = scoresByDate[date];
        const dayLabel = `Day ${idx + 1}`;
  
        matches.forEach(teamPoints => {
          Object.entries(teamPoints).forEach(([teamName, pointsObj]) => {
            if (!teamScores[teamName]) {
              teamScores[teamName] = { teamName, total: 0 };
            }
  
            let dayTotal = 0;
            if (typeof pointsObj.total === 'number') {
              dayTotal = pointsObj.total;
            } else if (
              typeof pointsObj.front9 === 'number' ||
              typeof pointsObj.back9 === 'number'
            ) {
              const front = typeof pointsObj.front9 === 'number' ? pointsObj.front9 : 0;
              const back = typeof pointsObj.back9 === 'number' ? pointsObj.back9 : 0;
              dayTotal = front + back;
            }
  
            if (!teamScores[teamName][dayLabel]) {
              teamScores[teamName][dayLabel] = 0;
            }
  
            teamScores[teamName][dayLabel] += dayTotal;
            teamScores[teamName].total += dayTotal;
          });
        });
      });
  
      const sorted = Object.values(teamScores).sort((a, b) => b.total - a.total);
      setDays(dayLabels);
      setTeamTotals(sorted);
    };
  
    fetchScoresAndTeams();
  }, [selectedTournamentId]);
  


  return (
    <div>
      <h2>Team Leaderboard</h2>
      <table className="header-table">
        <thead>
          <tr>
            <th>Team</th>
            {days.map((day, i) => (
              <th key={i}>{day}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {teamTotals.map((team, index) => {
            const teamColor = teams.find(t => t.name === team.teamName)?.color || "#ccc";
            const textColor = ["yellow", "orange"].includes(teamColor.toLowerCase()) ? "black" : "white";

            return (
              <tr
                key={index}
                style={{ backgroundColor: teamColor, color: textColor }}
              >
                <td>{team.teamName}</td>
                {days.map((day, i) => (
                  <td key={i}>{team[day] || 0}</td>
                ))}
                <td>{team.total}</td>
              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  );
}

export default TeamLeaderboard;
