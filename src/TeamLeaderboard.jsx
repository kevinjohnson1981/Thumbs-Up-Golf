// TeamLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";

function TeamLeaderboard({ selectedTournamentId, selectedDate = null }) {

  const [teamTotals, setTeamTotals] = useState([]);
  const [days, setDays] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matchStatusCards, setMatchStatusCards] = useState([]);
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

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "";
    const parsed = new Date(`${rawDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return rawDate;

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  };

  const getPlayerTeamName = (playerName, currentTeams) => {
    const team = currentTeams.find((entry) =>
      entry.players?.some((player) => player.name === playerName)
    );
    return team?.name || "";
  };

  const dedupeNames = (names = []) => [...new Set(names.filter(Boolean))];

  const formatToPar = (value) => {
    if (value == null || Number.isNaN(value)) return "—";
    if (value === 0) return "E";
    return value > 0 ? `+${value}` : `${value}`;
  };

  const getScoreDocId = (date, type, label) =>
    `scores_${date}_${type}_${(label || "Match").replace(/\s+/g, "_")}`;

  const getDayMode = (matches = []) => {
    const hasBestBall = matches.some((match) => match.type === "teamBestBall");
    const hasPointFormats = matches.some((match) =>
      ["teamMatch18", "teamMatch9", "individualMatch18", "individualMatch9", "stableford", "teamMatchFront9", "teamMatchBack9"].includes(match.type)
    );

    if (hasBestBall && hasPointFormats) return "mixed";
    if (hasBestBall) return "toPar";
    return "points";
  };

  const getBestBallTeamScore = (playerNames = [], scoreData = {}, holeIndex) => {
    const netScores = playerNames
      .map((playerName) => scoreData?.scores?.[playerName]?.[holeIndex]?.net)
      .filter((value) => typeof value === "number");

    return netScores.length > 0 ? Math.min(...netScores) : null;
  };

  const computeBestBallTotalsForDay = (dayDoc, scoreDocMap) => {
    const holes = dayDoc?.teeBox?.holes || [];
    const bestBallMatches = (dayDoc?.matches || []).filter((match) => match.type === "teamBestBall");
    const teamPlayerMap = new Map();

    bestBallMatches.forEach((match) => {
      (match.participants || []).forEach((entry) => {
        if (!entry?.teamName) return;
        const existing = teamPlayerMap.get(entry.teamName) || new Set();
        (entry.players || []).forEach((playerName) => existing.add(playerName));
        teamPlayerMap.set(entry.teamName, existing);
      });
    });

    const dayScoresByDoc = bestBallMatches.map((match) => ({
      match,
      scoreData: scoreDocMap.get(getScoreDocId(dayDoc.date, match.type, match.matchLabel)) || null,
    }));

    const results = {};
    teamPlayerMap.forEach((playerSet, teamName) => {
      let totalToPar = 0;
      let hasScores = false;

      holes.forEach((hole, holeIndex) => {
        const bestNetCandidates = dayScoresByDoc
          .map(({ scoreData }) => getBestBallTeamScore([...playerSet], scoreData, holeIndex))
          .filter((value) => value != null);

        if (bestNetCandidates.length === 0) return;

        const bestNet = Math.min(...bestNetCandidates);
        totalToPar += bestNet - (hole.par || 0);
        hasScores = true;
      });

      results[teamName] = hasScores ? totalToPar : null;
    });

    return results;
  };

  const buildMatchSides = (match, currentTeams) => {
    if (match.type === "teamMatch18") {
      return [
        {
          label: match.participants?.team1?.teamName || "Team A",
          players: match.participants?.team1?.players || [],
        },
        {
          label: match.participants?.team2?.teamName || "Team B",
          players: match.participants?.team2?.players || [],
        },
      ];
    }

    if (match.type === "teamMatch9") {
      return [
        {
          label: match.participants?.team0?.teamName || "Team A",
          players: match.participants?.team0?.players || [],
        },
        {
          label: match.participants?.team1?.teamName || "Team B",
          players: match.participants?.team1?.players || [],
        },
      ];
    }

    if (match.type === "stableford") {
      const grouped = {};
      (match.participants || []).forEach((playerName) => {
        const teamName = getPlayerTeamName(playerName, currentTeams) || "Team";
        if (!grouped[teamName]) grouped[teamName] = [];
        grouped[teamName].push(playerName);
      });

      return Object.entries(grouped).slice(0, 2).map(([label, players]) => ({
        label,
        players,
      }));
    }

    if (match.type === "teamBestBall") {
      return (match.participants || [])
        .filter((entry) => entry?.teamName && Array.isArray(entry.players) && entry.players.length > 0)
        .map((entry) => ({
          label: entry.teamName,
          players: entry.players,
        }));
    }

    if (match.type === "individualMatch9") {
      return [
        {
          label: match.front9?.teamA || match.back9?.teamA || "Team A",
          players: dedupeNames([
            ...(match.front9?.playersA || []),
            ...(match.back9?.playersA || []),
          ]),
        },
        {
          label: match.front9?.teamB || match.back9?.teamB || "Team B",
          players: dedupeNames([
            ...(match.front9?.playersB || []),
            ...(match.back9?.playersB || []),
          ]),
        },
      ];
    }

    if (match.type === "individualMatch18") {
      return [
        {
          label: match.teamA || "Team A",
          players: dedupeNames((match.pairings || []).map((pair) => pair.playerA)),
        },
        {
          label: match.teamB || "Team B",
          players: dedupeNames((match.pairings || []).map((pair) => pair.playerB)),
        },
      ];
    }

    return [];
  };

  const getTeamPointsForSide = (scoreData, sideLabel) => {
    if (!scoreData?.teamPoints || !sideLabel) return "-";
    const pointsObj = scoreData.teamPoints[sideLabel];
    if (!pointsObj) return "-";
    if (typeof pointsObj.total === "number") return pointsObj.total;

    const front = typeof pointsObj.front9 === "number" ? pointsObj.front9 : 0;
    const back = typeof pointsObj.back9 === "number" ? pointsObj.back9 : 0;
    if (front === 0 && back === 0) return "-";
    return front + back;
  };

  const getTeamBestBallCardTotal = (scoreData, playerNames = [], holes = []) => {
    let total = 0;
    let hasScores = false;

    holes.forEach((hole, holeIndex) => {
      const bestNet = getBestBallTeamScore(playerNames, scoreData, holeIndex);
      if (bestNet == null) return;

      total += bestNet - (hole.par || 0);
      hasScores = true;
    });

    return hasScores ? total : null;
  };

  const getTeamColor = (teamName) => {
    return teams.find((entry) => entry.name === teamName)?.color || "#173321";
  };

  const buildMatchStatusCards = (matchDocs = [], scoreDocs = [], currentTeams = []) => {
    if (!selectedDate) {
      setMatchStatusCards([]);
      return;
    }

    const selectedDayDoc = matchDocs
      .map((matchDoc) => matchDoc.data())
      .find((dayDoc) => dayDoc.date === selectedDate);

    if (!selectedDayDoc?.matches?.length) {
      setMatchStatusCards([]);
      return;
    }

    const scoreDocMap = new Map(
      scoreDocs.map((scoreDoc) => [scoreDoc.id, scoreDoc.data()])
    );

    const cards = selectedDayDoc.matches.map((match, index) => {
      const label = (match.matchLabel || `Match ${index + 1}`).replace(/\s+/g, "_");
      const scoreDocId = `scores_${selectedDayDoc.date}_${match.type}_${label}`;
      const scoreData = scoreDocMap.get(scoreDocId) || null;
      const sides = buildMatchSides(match, currentTeams);
      const displayMode = match.type === "teamBestBall" ? "toPar" : "points";

      return {
        id: scoreDocId,
        label: match.matchLabel || `Match ${index + 1}`,
        type: match.type,
        displayMode,
        sides: sides.map((side) => ({
          ...side,
          total:
            match.type === "teamBestBall"
              ? getTeamBestBallCardTotal(scoreData, side.players, selectedDayDoc.teeBox?.holes || [])
              : getTeamPointsForSide(scoreData, side.label),
        })),
      };
    });

    setMatchStatusCards(cards);
  };


  useEffect(() => {
    if (!selectedTournamentId) {
      setTeamTotals([]);
      setDays([]);
      setTeams([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    let latestScoreDocs = [];
    let latestMatchDocs = [];
    let latestTeams = [];

    const rebuildTeamLeaderboard = (scoreDocs = [], matchDocs = [], currentTeams = []) => {
      const scoreDocMap = new Map(scoreDocs.map((scoreDoc) => [scoreDoc.id, scoreDoc.data()]));
      const dayDocs = matchDocs
        .map((matchDoc) => matchDoc.data())
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      const dayDefinitions = dayDocs.map((dayDoc, index) => ({
        date: dayDoc.date,
        label: `Day ${index + 1}`,
        mode: getDayMode(dayDoc.matches || []),
        dayDoc,
      }));

      const rows = {};
      currentTeams.forEach((team) => {
        rows[team.name] = { teamName: team.name, total: null };
      });

      dayDefinitions.forEach(({ date, label, mode, dayDoc }) => {
        if (mode === "toPar") {
          const bestBallTotals = computeBestBallTotalsForDay(dayDoc, scoreDocMap);
          Object.entries(bestBallTotals).forEach(([teamName, value]) => {
            rows[teamName] ??= { teamName, total: null };
            rows[teamName][label] = value;
          });
          return;
        }

        if (mode === "points") {
          scoreDocs.forEach((scoreDoc) => {
            const data = scoreDoc.data();
            const [, scoreDate] = scoreDoc.id.split("_");
            if (scoreDate !== date || !data.teamPoints) return;

            Object.entries(data.teamPoints).forEach(([teamName, pointsObj]) => {
              rows[teamName] ??= { teamName, total: null };

              let dayTotal = 0;
              if (typeof pointsObj.total === "number") {
                dayTotal = pointsObj.total;
              } else if (
                typeof pointsObj.front9 === "number" ||
                typeof pointsObj.back9 === "number"
              ) {
                const front = typeof pointsObj.front9 === "number" ? pointsObj.front9 : 0;
                const back = typeof pointsObj.back9 === "number" ? pointsObj.back9 : 0;
                dayTotal = front + back;
              }

              rows[teamName][label] = (rows[teamName][label] || 0) + dayTotal;
            });
          });
        }
      });

      const overallModes = [...new Set(dayDefinitions.map((day) => day.mode))];
      const compatibleOverallMode =
        overallModes.length === 1 && overallModes[0] !== "mixed" ? overallModes[0] : "mixed";

      const teamRows = Object.values(rows).map((row) => {
        if (compatibleOverallMode === "points") {
          row.total = dayDefinitions.reduce((sum, day) => sum + (row[day.label] || 0), 0);
        } else if (compatibleOverallMode === "toPar") {
          const values = dayDefinitions
            .map((day) => row[day.label])
            .filter((value) => typeof value === "number");
          row.total = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
        } else {
          row.total = null;
        }
        return row;
      });

      const sorted = [...teamRows].sort((a, b) => {
        if (compatibleOverallMode === "points") {
          return (b.total || 0) - (a.total || 0);
        }

        if (compatibleOverallMode === "toPar") {
          const aValue = typeof a.total === "number" ? a.total : Number.POSITIVE_INFINITY;
          const bValue = typeof b.total === "number" ? b.total : Number.POSITIVE_INFINITY;
          return aValue - bValue;
        }

        return a.teamName.localeCompare(b.teamName);
      });

      setDays(dayDefinitions);
      setTeamTotals(sorted);
      setLoading(false);
    };

    const unsubscribeTournament = onSnapshot(
      doc(db, "tournaments", selectedTournamentId),
      (snapshot) => {
        const tournamentData = snapshot.exists() ? snapshot.data() : null;
        latestTeams = tournamentData?.teams || [];
        setTeams(latestTeams);
        rebuildTeamLeaderboard(latestScoreDocs, latestMatchDocs, latestTeams);
        buildMatchStatusCards(latestMatchDocs, latestScoreDocs, latestTeams);
      },
      (error) => {
        console.error("Error listening to tournament teams:", error);
        setLoading(false);
      }
    );

    const unsubscribeScores = onSnapshot(
      collection(db, "tournaments", selectedTournamentId, "scores"),
      (snapshot) => {
        latestScoreDocs = snapshot.docs;
        rebuildTeamLeaderboard(latestScoreDocs, latestMatchDocs, latestTeams);
        buildMatchStatusCards(latestMatchDocs, latestScoreDocs, latestTeams);
      },
      (error) => {
        console.error("Error listening to team scores:", error);
        setLoading(false);
      }
    );

    const unsubscribeMatches = onSnapshot(
      collection(db, "tournaments", selectedTournamentId, "matches"),
      (snapshot) => {
        latestMatchDocs = snapshot.docs;
        rebuildTeamLeaderboard(latestScoreDocs, latestMatchDocs, latestTeams);
        buildMatchStatusCards(latestMatchDocs, latestScoreDocs, latestTeams);
      },
      (error) => {
        console.error("Error listening to matches for team status:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeTournament();
      unsubscribeScores();
      unsubscribeMatches();
    };
  }, [selectedTournamentId, selectedDate]);
  

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
                    <th key={i}>{day.label}</th>
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
                          <span className="leaderboard-day-to-par">
                            {day.mode === "toPar"
                              ? formatToPar(team[day.label])
                              : day.mode === "mixed"
                              ? "Mixed"
                              : team[day.label] ?? 0}
                          </span>
                        </td>
                      ))}
                      <td className="leaderboard-total-cell">
                        {days.length > 0 && days.every((day) => day.mode === "toPar")
                          ? formatToPar(team.total)
                          : team.total ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedDate && matchStatusCards.length > 0 && (
        <section className="admin-section-card leaderboard-section-card">
          <div className="admin-section-header">
            <div>
              <p className="admin-eyebrow">Selected Day</p>
              <h3>{`Match Status • ${formatDisplayDate(selectedDate)}`}</h3>
            </div>
          </div>

          <div className="match-status-card-grid">
            {matchStatusCards.map((card) => (
              <article key={card.id} className="match-status-summary-card">
                <div className="match-status-summary-topline">
                  <span className="selection-card-label">{card.label}</span>
                </div>
                <div className="match-status-summary-sides">
                  {card.sides.map((side) => (
                    <div key={`${card.id}-${side.label}`} className="match-status-summary-side">
                      <div className="match-status-summary-teamline">
                        <strong
                          className="match-status-summary-teamname"
                          style={{ color: getTeamColor(side.label) }}
                        >
                          {side.label}
                        </strong>
                        <span className="match-status-summary-teamscore">
                          {card.displayMode === "toPar" ? formatToPar(side.total) : side.total}
                        </span>
                      </div>
                      <span className="match-status-summary-players">
                        {side.players.join(", ") || side.label}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default TeamLeaderboard;
