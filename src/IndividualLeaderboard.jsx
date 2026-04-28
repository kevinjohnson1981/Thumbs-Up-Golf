import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

function IndividualLeaderboard({ selectedTournamentId, teams = [], individualPlayers = [], eventFormat = "team" }) {

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStablefordColumn, setShowStablefordColumn] = useState(false);
  const [showMatchPointsColumn, setShowMatchPointsColumn] = useState(false);

  const formatToPar = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "";
    if (value === 0) return "E";
    return `${value > 0 ? "+" : ""}${value}`;
  };

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

  const getStablefordPointsForRound = (holeScores, totalParByHole) => {
    let totalPoints = 0;

    Object.entries(holeScores).forEach(([holeIndex, value]) => {
      if (typeof value !== "object") return;

      const net = parseInt(value.net, 10);
      const par = totalParByHole[holeIndex];

      if (Number.isNaN(net) || Number.isNaN(par)) return;

      const diff = net - par;

      if (diff >= 2) totalPoints += 0;
      else if (diff === 1) totalPoints += 0.5;
      else if (diff === 0) totalPoints += 1;
      else if (diff === -1) totalPoints += 2;
      else totalPoints += 3;
    });

    return totalPoints;
  };

  const getIndividualMatchPointsForRound = (scores, pairings = [], holesToCount = []) => {
    const pointsByPlayer = {};

    pairings.forEach((pair) => {
      if (!pair?.playerA || !pair?.playerB) return;

      let playerAWins = 0;
      let playerBWins = 0;

      holesToCount.forEach((holeIndex) => {
        const playerANet = scores?.[pair.playerA]?.[holeIndex]?.net;
        const playerBNet = scores?.[pair.playerB]?.[holeIndex]?.net;

        if (playerANet == null || playerBNet == null) return;

        if (playerANet < playerBNet) playerAWins += 1;
        else if (playerBNet < playerANet) playerBWins += 1;
      });

      if (!pointsByPlayer[pair.playerA]) pointsByPlayer[pair.playerA] = 0;
      if (!pointsByPlayer[pair.playerB]) pointsByPlayer[pair.playerB] = 0;

      if (playerAWins > playerBWins) {
        pointsByPlayer[pair.playerA] += 1;
      } else if (playerBWins > playerAWins) {
        pointsByPlayer[pair.playerB] += 1;
      } else {
        pointsByPlayer[pair.playerA] += 0.5;
        pointsByPlayer[pair.playerB] += 0.5;
      }
    });

    return pointsByPlayer;
  };

  const teamColorMap = {};
  teams.forEach((team) => {
    if (team?.name) {
      teamColorMap[team.name] = team.color || "";
    }
  });

  const playerColorMap = {};
  individualPlayers.forEach((player) => {
    if (player?.name) {
      playerColorMap[player.name] = player.color || "";
    }
  });

  const buildLeaderboardData = (scoreDocs = [], dayDocs = []) => {
    const allScores = [];
    let hasStablefordRounds = false;
    let hasMatchPlayRounds = false;

    for (const scoreDoc of scoreDocs) {
      const scoreData = scoreDoc.data();
      const scoreId = scoreDoc.id;
      let dayDoc = null;
      let thisMatch = null;

      dayDocs.forEach((daySnapshot) => {
        const day = daySnapshot.data();
        (day.matches || []).forEach((match) => {
          const label = (match.matchLabel || "Match").replace(/\s+/g, "_");
          const candidateId = `scores_${day.date}_${match.type}_${label}`;
          if (candidateId === scoreId) {
            dayDoc = day;
            thisMatch = match;
          }
        });
      });

      if (!dayDoc || !thisMatch) continue;
      if (thisMatch.excludeFromIndividual) continue;

      const holePars = dayDoc.teeBox?.holes?.map((hole) => hole.par) || [];
      const totalParByHole = {};
      holePars.forEach((par, index) => {
        totalParByHole[index] = par;
      });

      const [, date] = scoreId.split("_");

      allScores.push({
        date,
        scores: scoreData.scores,
        totalParByHole,
        matchType: thisMatch.type,
        match: thisMatch,
      });

      if (thisMatch.type === "stableford") hasStablefordRounds = true;
      if (thisMatch.type === "individualMatch9" || thisMatch.type === "individualMatch18") {
        hasMatchPlayRounds = true;
      }
    }

    const playerTotals = {};

    allScores.forEach(({ scores, date, totalParByHole, matchType, match }) => {
      if (!scores) return;

      Object.entries(scores).forEach(([playerName, holeScores]) => {
        if (!playerTotals[playerName]) {
          const teamName = holeScores.teamName || null;
          playerTotals[playerName] = {
            name: playerName,
            team: teamName,
            days: {},
            stablefordTotal: 0,
            matchPointsTotal: 0,
          };
        }

        let gross = 0;
        let net = 0;
        let parPlayed = 0;

        Object.entries(holeScores).forEach(([holeIndex, value]) => {
          if (typeof value !== "object") return;
          const grossScore = parseInt(value.gross, 10);
          const netScore = parseInt(value.net, 10);
          if (!Number.isNaN(grossScore)) gross += grossScore;
          if (!Number.isNaN(netScore)) net += netScore;

          const par = totalParByHole[holeIndex];
          if (!Number.isNaN(par)) parPlayed += par;
        });

        const netToPar = parPlayed > 0 ? net - parPlayed : null;
        playerTotals[playerName].days[date] = { gross, net, netToPar };

        if (matchType === "stableford") {
          playerTotals[playerName].stablefordTotal += getStablefordPointsForRound(holeScores, totalParByHole);
        }
      });

      if (matchType === "individualMatch18") {
        const allHoles = [...Array(18).keys()];
        const pointsByPlayer = getIndividualMatchPointsForRound(scores, match?.pairings || [], allHoles);
        Object.entries(pointsByPlayer).forEach(([playerName, matchPoints]) => {
          if (!playerTotals[playerName]) {
            playerTotals[playerName] = {
              name: playerName,
              team: null,
              days: {},
              stablefordTotal: 0,
              matchPointsTotal: 0,
            };
          }
          playerTotals[playerName].matchPointsTotal += matchPoints;
        });
      }

      if (matchType === "individualMatch9") {
        const front9Points = getIndividualMatchPointsForRound(
          scores,
          match?.pairings?.front9 || [],
          [...Array(9).keys()]
        );
        const back9Points = getIndividualMatchPointsForRound(
          scores,
          match?.pairings?.back9 || [],
          [...Array(9).keys()].map((index) => index + 9)
        );

        [front9Points, back9Points].forEach((pointsByPlayer) => {
          Object.entries(pointsByPlayer).forEach(([playerName, matchPoints]) => {
            if (!playerTotals[playerName]) {
              playerTotals[playerName] = {
                name: playerName,
                team: null,
                days: {},
                stablefordTotal: 0,
                matchPointsTotal: 0,
              };
            }
            playerTotals[playerName].matchPointsTotal += matchPoints;
          });
        });
      }
    });

    const leaderboard = Object.values(playerTotals)
      .map((player) => ({
        name: player.name,
        team: player.team,
        scoresByDay: player.days,
        totalToPar: Object.values(player.days).reduce((sum, day) => sum + day.netToPar, 0),
        stablefordTotal: player.stablefordTotal || 0,
        matchPointsTotal: player.matchPointsTotal || 0,
      }))
      .sort((a, b) => a.totalToPar - b.totalToPar);

    setLeaderboardData(leaderboard);
    setShowStablefordColumn(eventFormat === "individual" && hasStablefordRounds);
    setShowMatchPointsColumn(eventFormat === "individual" && hasMatchPlayRounds);
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedTournamentId) {
      setLeaderboardData([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    let scoreDocs = null;
    let dayDocs = null;

    const maybeRebuild = () => {
      if (!scoreDocs || !dayDocs) return;
      buildLeaderboardData(scoreDocs, dayDocs);
    };

    const unsubscribeScores = onSnapshot(
      collection(db, "tournaments", selectedTournamentId, "scores"),
      (snapshot) => {
        scoreDocs = snapshot.docs;
        maybeRebuild();
      },
      (error) => {
        console.error("Error listening to scores:", error);
        setLoading(false);
      }
    );

    const unsubscribeMatches = onSnapshot(
      collection(db, "tournaments", selectedTournamentId, "matches"),
      (snapshot) => {
        dayDocs = snapshot.docs;
        maybeRebuild();
      },
      (error) => {
        console.error("Error listening to matches:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeScores();
      unsubscribeMatches();
    };
  }, [selectedTournamentId, eventFormat]);
  

  const allDates = Array.from(
    new Set(
      leaderboardData.flatMap(p => Object.keys(p.scoresByDay))
    )
  ).sort();

  const dayLabels = allDates.map((date, idx) => ({
    date,
    label: `Day ${idx + 1}`
  }));

  if (loading) {
    return (
      <div className="admin-page-shell leaderboard-page-shell">
        <section className="admin-hero-card compact player-select-hero">
          <div className="admin-hero-copy">
            <h2>Individual Leaderboard</h2>
          </div>
        </section>

        <section className="admin-section-card leaderboard-section-card">
          <div className="admin-empty-state">
            <h4>Loading leaderboard...</h4>
            <p>Scores are being gathered for this event.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page-shell leaderboard-page-shell">
      <section className="admin-hero-card compact player-select-hero">
        <div className="admin-hero-copy">
          <h2>Individual Leaderboard</h2>
        </div>
      </section>

      <section className="admin-section-card leaderboard-section-card">
        {leaderboardData.length === 0 ? (
          <div className="admin-empty-state">
            <h4>No scores posted yet</h4>
            <p>Once players start entering scores, the leaderboard will appear here.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper leaderboard-table-wrapper">
              <table className="header-table leaderboard-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Player</th>
                    {dayLabels.map((day) => (
                      <th key={day.date}>{day.label}</th>
                    ))}
                    <th>Total</th>
                    {showStablefordColumn && <th className="leaderboard-metric-column">Stblfd</th>}
                    {showMatchPointsColumn && <th className="leaderboard-metric-column">Match</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((player, idx) => (
                    (() => {
                      const rowColor = eventFormat === "individual"
                        ? playerColorMap[player.name] || ""
                        : teamColorMap[player.team] || "";

                      return (
                    <tr
                      key={idx}
                      className={`leaderboard-row ${idx < 3 ? `leaderboard-row-top-${idx + 1}` : ""}`}
                      style={{
                        backgroundColor: rowColor,
                        color: getTextColor(rowColor || "")
                      }}
                    >
                      <td className="leaderboard-rank-cell">{idx + 1}</td>
                      <td>{player.name}</td>
                      {dayLabels.map((day) => {
                        const score = player.scoresByDay[day.date];
                        return (
                          <td key={day.date} className="leaderboard-day-cell">
                            {score
                              ? <span className="leaderboard-day-to-par">{formatToPar(score.netToPar)}</span>
                              : ""}
                          </td>
                        );
                      })}
                      <td className="leaderboard-total-cell">
                        {formatToPar(player.totalToPar)}
                      </td>
                      {showStablefordColumn && (
                        <td className="leaderboard-day-cell leaderboard-metric-column">
                          <span className="leaderboard-day-to-par">{player.stablefordTotal || ""}</span>
                        </td>
                      )}
                      {showMatchPointsColumn && (
                        <td className="leaderboard-day-cell leaderboard-metric-column">
                          <span className="leaderboard-day-to-par">{player.matchPointsTotal || ""}</span>
                        </td>
                      )}
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default IndividualLeaderboard;
