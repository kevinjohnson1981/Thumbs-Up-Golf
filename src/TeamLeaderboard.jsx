// TeamLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

function TeamLeaderboard({ selectedTournamentId }) {

  const [teamTotals, setTeamTotals] = useState([]);
  const [days, setDays] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const getTextColor = (bgColor) => {
    if (!bgColor) return "#000000";

    const namedColors = {
      red: "#ff0000",
      blue: "#0000ff",
      green: "#008000",
      purple: "#800080",
      orange: "#ffa500",
      black: "#000000",
      yellow: "#ffff00",
      gold: "#ffd700",
      white: "#ffffff",
      gray: "#808080",
      grey: "#808080",
    };

    const normalized = namedColors[bgColor.toLowerCase()] || bgColor;
    const hex = normalized.replace("#", "");
    if (hex.length !== 6) return "#000000";

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 150 ? "#000000" : "#ffffff";
  };


  useEffect(() => {
    if (!selectedTournamentId) return;
  
    const fetchScoresAndTeams = async () => {
      const tournamentRef = doc(db, "tournaments", selectedTournamentId);
      const tournamentSnapshot = await getDoc(tournamentRef);
      const tournamentData = tournamentSnapshot.exists() ? tournamentSnapshot.data() : null;
      const teamsFromFirebase = tournamentData?.teams || [];
      setTeams(teamsFromFirebase);
  
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
      setLoading(false);
    };
  
    fetchScoresAndTeams();
  }, [selectedTournamentId]);
  

  if (loading) {
    return (
      <div className="admin-page-shell leaderboard-page-shell">
        <section className="admin-hero-card compact player-select-hero">
          <div className="admin-hero-copy">
            <h2>Team Leaderboard</h2>
          </div>
        </section>

        <section className="admin-section-card leaderboard-section-card">
          <div className="admin-empty-state">
            <h4>Loading leaderboard...</h4>
            <p>Team points are being gathered for this event.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page-shell leaderboard-page-shell">
      <section className="admin-hero-card compact player-select-hero">
        <div className="admin-hero-copy">
          <h2>Team Leaderboard</h2>
        </div>
      </section>

      <section className="admin-section-card leaderboard-section-card">
        {teamTotals.length === 0 ? (
          <div className="admin-empty-state">
            <h4>No team scores posted yet</h4>
            <p>Once team points are saved, the leaderboard will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper leaderboard-table-wrapper">
            <table className="header-table leaderboard-table team-leaderboard-table">
              <thead>
                <tr>
                  <th>Pos</th>
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
                  const textColor = getTextColor(teamColor);

                  return (
                    <tr
                      key={index}
                      className="leaderboard-row"
                      style={{ backgroundColor: teamColor, color: textColor }}
                    >
                      <td className="leaderboard-rank-cell">{index + 1}</td>
                      <td>{team.teamName}</td>
                      {days.map((day, i) => (
                        <td key={i} className="team-leaderboard-day-cell">
                          <span className="leaderboard-day-to-par">{team[day] || 0}</span>
                        </td>
                      ))}
                      <td className="leaderboard-total-cell">{team.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TeamLeaderboard;
