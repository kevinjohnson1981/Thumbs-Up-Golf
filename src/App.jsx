import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import './style.css'
import { auth, storage } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./Login";
import { signOut } from "firebase/auth";
import AdminDashboard from './AdminDashboard';
import SetupOptions from './SetupOptions';
import TeamSetup from './TeamSetup';
import PlayerSetup from './PlayerSetup';
import MatchPlanner from './MatchPlanner';
import IndividualMatchPlanner from './IndividualMatchPlanner';
import { collection, query, where, getDocs } from "firebase/firestore";
import SelectMatchDay from './SelectMatchDay';
import SelectMatchType from './SelectMatchType';
import ScoreEntry from './ScoreEntry';
import { signInAnonymously } from "firebase/auth";
import IndividualLeaderboard from './IndividualLeaderboard';
import TeamLeaderboard from './TeamLeaderboard';
import PlayerNav from './PlayerNav';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

function App() {
  const defaultTheme = {
    backgroundColor: "#e2ddd4",
    buttonColor: "#8c8170",
    textColor: "#2f2a24",
    cardColor: "#f7f2ea"
  };
  const [view, setView] = useState("adminDashboard");
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [rules, setRules] = useState("");
  const [teams, setTeams] = useState([]);
  const [individualPlayers, setIndividualPlayers] = useState([]);
  const [eventFormat, setEventFormat] = useState("team");
  const [tournamentName, setTournamentName] = useState("");
  const [numTeams, setNumTeams] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(3);
  const [numPlayers, setNumPlayers] = useState(4);
  const [setupComplete, setSetupComplete] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [teamPoints, setTeamPointsInApp] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMatchObject, setSelectedMatchObject] = useState(null);
  const [lastMatchView, setLastMatchView] = useState(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("defaultGray");
  const [customTheme, setCustomTheme] = useState(defaultTheme);
  const initialAuthHandled = useRef(false);
  

  const themeOptions = {
    defaultGray: {
      label: "Default Gray",
      ...defaultTheme
    },
    classicBlue: {
      label: "America",
      backgroundColor: "#f3ede2",
      buttonColor: "#9f2f35",
      textColor: "#173f6b",
      cardColor: "#fbf8f2"
    },
    mastersGreen: {
      label: "Masters Green",
      backgroundColor: "#c7d6b8",
      buttonColor: "#2f6b2f",
      textColor: "#1d3a1d",
      cardColor: "#f4f7ee"
    },
    sunsetGold: {
      label: "Sunset Gold",
      backgroundColor: "#f2dfc3",
      buttonColor: "#b85f2e",
      textColor: "#6f3414",
      cardColor: "#fbf2e4"
    },
    midnight: {
      label: "Midnight",
      backgroundColor: "#18212b",
      buttonColor: "#8f6a3a",
      textColor: "#f3ead9",
      cardColor: "#24303c"
    },
    custom: {
      label: "Custom Theme",
      ...customTheme
    }
  };

  const activeTheme = (selectedTournament?.theme || selectedTheme) === "custom"
    ? { ...defaultTheme, ...customTheme }
    : (themeOptions[selectedTournament?.theme || selectedTheme] || themeOptions.defaultGray);
  const shellTheme = isAdmin
    ? {
        backgroundColor: "#ddd1bb",
        buttonColor: "#c38b33",
        textColor: "#173321",
        cardColor: "#f5efe3"
      }
    : activeTheme;

  const defaultLogo = "/ThumbsUpGolf2.png";

  const headerLogoSrc =
    view === "adminDashboard"
      ? defaultLogo
      : selectedTournament?.logoUrl?.trim() || defaultLogo;

  const generateDefaultCode = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TUP${random}`;
  };
  
  const handleRemoveTournamentLogo = async () => {
    if (!selectedTournament?.id) return;
  
    try {
      if (selectedTournament.logoUrl) {
        const logoRef = ref(storage, selectedTournament.logoUrl);
        await deleteObject(logoRef);
      }
  
      await saveTournamentData(selectedTournament.id, {
        logoUrl: ""
      });
  
      setSelectedTournament((prev) =>
        prev ? { ...prev, logoUrl: "" } : prev
      );
  
      setSelectedLogoFile(null);
  
      console.log("✅ Tournament logo removed");
    } catch (error) {
      console.error("❌ Error removing tournament logo:", error);
    }
  };
  
  const saveTournamentData = async (tournamentId, data) => {
    try {
      await setDoc(doc(db, "tournaments", tournamentId), data, { merge: true });
      console.log("✅ Tournament updated:", data);
    } catch (error) {
      console.error("❌ Error saving tournament data:", error);
    }
  };

  const startNewTournament = async (format) => {
    const newTournamentId = `${user.uid}_${Date.now()}`;
    const defaultCode = generateDefaultCode();
    const newTournament = {
      id: newTournamentId,
      adminId: user.uid,
      eventFormat: format,
      name: "",
      teams: [],
      players: [],
      numTeams: 2,
      playersPerTeam: 3,
      numPlayers: 4,
      eventCode: defaultCode,
      rules: "",
      createdAt: new Date().toISOString(),
    };

    setEventFormat(format);
    setEventCode(defaultCode);
    setRules("");
    setSelectedTheme("defaultGray");
    setCustomTheme(defaultTheme);

    await setDoc(doc(db, "tournaments", newTournamentId), newTournament);
    setTournamentName("");
    setTeams([]);
    setIndividualPlayers([]);
    setNumPlayers(4);
    setSelectedTournament({ id: newTournamentId, ...newTournament });
    setSetupComplete(false);
    setView("setupOptions");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!initialAuthHandled.current) {
        initialAuthHandled.current = true;

        if (firebaseUser) {
          setUser(null);
          setIsAdmin(false);
          setEventCode("");
          setSelectedTournament(null);
          setTeams([]);
          setIndividualPlayers([]);
          setTournamentName("");
          setView("adminDashboard");
          setAuthChecked(true);
          signOut(auth).catch((error) => {
            console.error("Error clearing restored auth session:", error);
          });
          return;
        }
      }

      if (firebaseUser?.isAnonymous) {
        setUser(firebaseUser);
        setIsAdmin(false);
      } else if (firebaseUser && firebaseUser.emailVerified) {
        setUser(firebaseUser);
        setIsAdmin(true);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      setEventFormat(selectedTournament.eventFormat || "team");
      setTournamentName(selectedTournament.name || "");
      setIndividualPlayers(selectedTournament.players || []);
      setNumTeams(selectedTournament.numTeams || 2);
      setPlayersPerTeam(selectedTournament.playersPerTeam || 3);
      setNumPlayers(selectedTournament.numPlayers || selectedTournament.players?.length || 4);
      setEventCode(selectedTournament.eventCode || "");
      setRules(selectedTournament.rules || "");
      setSelectedTheme(selectedTournament.theme || "defaultGray");
      setCustomTheme({ ...defaultTheme, ...(selectedTournament.customTheme || {}) });
    }
  }, [selectedTournament]);
  
  

  useEffect(() => {
    const fetchAdminTournaments = async () => {
      if (!user || !isAdmin || selectedTournament) {
        console.log("⛔ Skipping tournament fetch: user:", user, "isAdmin:", isAdmin, "selectedTournament:", selectedTournament);
        return;
      }
  
      console.log("👤 Logged-in UID:", user.uid);
      console.log("📡 Querying for admin tournaments...");
  
      try {
        const q = query(collection(db, "tournaments"), where("adminId", "==", user.uid));
        const snapshot = await getDocs(q);
        const tournaments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        console.log("📦 Fetched tournaments:", tournaments);
  
        if (tournaments.length > 0) {
          tournaments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setSelectedTournament(tournaments[0]);
          setTournamentName(tournaments[0].name);
          setTeams(tournaments[0].teams || []);
          setSelectedTheme(tournaments[0].theme || "defaultGray");
          setCustomTheme({ ...defaultTheme, ...(tournaments[0].customTheme || {}) });
          setView("adminDashboard");
        }
      } catch (error) {
        console.error("🔥 Error fetching tournaments:", error);
      }
    };
  
    fetchAdminTournaments();
  }, [user, isAdmin, selectedTournament]);
  
  
  

// 👨‍💼 Admin-only startup
useEffect(() => {
  if (!authChecked || !isAdmin) return;
  setView("adminDashboard");
}, [authChecked, isAdmin]);

// 👤 Guest join (anonymous sign-in w/ event code)
useEffect(() => {
  if (!authChecked || isAdmin || !eventCode || !user?.isAnonymous) return;
  setView("selectMatchDay");
}, [authChecked, isAdmin, eventCode, user]);


  useEffect(() => {
    console.log("👤 user:", user);
    console.log("🧑‍💼 isAdmin:", isAdmin);
    console.log("📺 view:", view);
  }, [user, isAdmin, view]);
  
  

  if (!authChecked) return <p>Loading...</p>;

  if (!user && !eventCode) {
    return (
      <Login
        onLogin={(user) => {
          setUser(user);
          setIsAdmin(true);
        }}
        onJoinWithCode={async (code) => {
          try {
            const result = await signInAnonymously(auth);  // 👈 capture the result
            const anonymousUser = result.user;
        
            setUser(anonymousUser);            // 👈 manually set the user
            setIsAdmin(false);                 // 👈 explicitly mark as player
            setEventCode(code);
        
            // Fetch tournament from Firebase
            const q = query(collection(db, "tournaments"), where("eventCode", "==", code));
            const snapshot = await getDocs(q);
        
            if (!snapshot.empty) {
              const tournamentDoc = snapshot.docs[0];
              const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
        
              console.log("🎯 Joined tournament:", tournamentData);
              setSelectedTournament(tournamentData);
              setTournamentName(tournamentData.name);
              setTeams(tournamentData.teams || []);
              setSelectedTheme(tournamentData.theme || "defaultGray");
              setCustomTheme({ ...defaultTheme, ...(tournamentData.customTheme || {}) });
              setView("selectMatchDay");
            } else {
              alert("❌ Invalid event code. Please try again.");
            }
          } catch (error) {
            console.error("Failed to sign in or fetch tournament:", error);
          }
        }}
        
        
        
      />
    );
  }

  return (
    <div className="container app-shell"
      style={{
        color: shellTheme.textColor,
        minHeight: "100vh",
        "--theme-bg": shellTheme.backgroundColor,
        "--theme-accent": shellTheme.buttonColor,
        "--theme-card": shellTheme.cardColor,
        "--theme-text": shellTheme.textColor
      }}>
      <header className="app-shell-header">
        <div className="app-header">
          <img
            src={headerLogoSrc}
            alt="Tournament Logo"
            className="app-logo"
          />
        </div>
      </header>

      {user && !isAdmin && (
        <PlayerNav
          onGoHome={() => setView("selectMatchDay")}
          onGoIndividualLeaderboard={() => setView("individualLeaderboard")}
          onGoTeamLeaderboard={() => setView("teamLeaderboard")}
          onShowRules={() => setShowRulesModal(true)}
          tournamentName={tournamentName} // 👈 pass it in here
          showTeamLeaderboard={eventFormat !== "individual"}
        />
      )}


      {view === "adminDashboard" && (
        <AdminDashboard
          user={user}
          onStartNewTeam={() => startNewTournament("team")}
          onStartNewIndividual={() => startNewTournament("individual")}
          
          onSelectTournament={(tournament) => {
            setSelectedTournament(tournament);
            setEventFormat(tournament.eventFormat || "team");
            setTournamentName(tournament.name);
            setTeams(tournament.teams || []);
            setIndividualPlayers(tournament.players || []);
            setSelectedTheme(tournament.theme || "defaultGray");
            setCustomTheme({ ...defaultTheme, ...(tournament.customTheme || {}) });
            setNumPlayers(tournament.numPlayers || tournament.players?.length || 4);
            setSetupComplete(true);
            setView("setupOptions");
          }}

          onDeleteTournament={async (tournamentId) => {
            const confirmDelete = window.confirm("Are you sure you want to delete this tournament?");
            if (!confirmDelete) return;
        
            try {
              await deleteDoc(doc(db, "tournaments", tournamentId));
              console.log("🗑️ Tournament deleted:", tournamentId);
        
              // Refresh tournament list by clearing the selection
              setSelectedTournament(null);
              setTournamentName("");
              setTeams([]);
              setIndividualPlayers([]);
              setView("adminDashboard"); // force reload
            } catch (error) {
              console.error("❌ Failed to delete tournament:", error);
            }
          }}
        />
      )}

      {view === "setupOptions" && (
        <SetupOptions
          tournamentName={tournamentName}
          setTournamentName={setTournamentName}
          numTeams={numTeams}
          setNumTeams={setNumTeams}
          numPlayers={numPlayers}
          setNumPlayers={setNumPlayers}
          eventCode={eventCode}
          setEventCode={setEventCode}
          rules={rules}
          setRules={setRules}
          playersPerTeam={playersPerTeam}
          setPlayersPerTeam={setPlayersPerTeam}
          selectedLogoFile={selectedLogoFile}
          setSelectedLogoFile={setSelectedLogoFile}
          currentLogoUrl={selectedTournament?.logoUrl || ""}
          onRemoveLogo={handleRemoveTournamentLogo}
          eventFormat={eventFormat}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          customTheme={customTheme}
          setCustomTheme={setCustomTheme}
          themeOptions={themeOptions}
          onContinue={async () => {
            let updatedTeams = selectedTournament?.teams || [];
            let updatedPlayers = selectedTournament?.players || [];
          
            if (eventFormat === "team" && updatedTeams.length === 0) {
              updatedTeams = Array.from({ length: numTeams }, () => ({
                name: '',
                color: '',
                players: Array.from({ length: playersPerTeam }, () => ({ name: '', handicap: '' }))
              }));
            }

            if (eventFormat === "individual" && updatedPlayers.length === 0) {
              updatedPlayers = Array.from({ length: numPlayers }, (_, playerIndex) => ({
                name: '',
                handicap: '',
                color: ['#2f6b2f', '#9f2f35', '#173f6b', '#b85f2e'][playerIndex] || '#8c8170'
              }));
            }
          
            setTeams(updatedTeams);
            setIndividualPlayers(updatedPlayers);
          
            const code = eventCode?.trim() || generateDefaultCode();
          
            let logoUrl = selectedTournament?.logoUrl || "";
          
            if (selectedLogoFile && selectedTournament?.id) {
              try {
                const fileName = `tournament-logos/${selectedTournament.id}/${Date.now()}_${selectedLogoFile.name}`;
                const storageRef = ref(storage, fileName);
          
                await uploadBytes(storageRef, selectedLogoFile);
                logoUrl = await getDownloadURL(storageRef);
          
                console.log("✅ Logo uploaded successfully:", logoUrl);
              } catch (error) {
                console.error("❌ Error uploading logo:", error);
              }
            }
          
            if (selectedTournament?.id) {
              await saveTournamentData(selectedTournament.id, {
                eventFormat,
                name: tournamentName,
                numTeams,
                playersPerTeam,
                numPlayers,
                players: updatedPlayers,
                eventCode: code,
                rules,
                logoUrl,
                theme: selectedTheme,
                customTheme
              });
            
              setSelectedTournament((prev) =>
                prev
                  ? {
                      ...prev,
                      eventFormat,
                      name: tournamentName,
                      numTeams,
                      playersPerTeam,
                      numPlayers,
                      players: updatedPlayers,
                      eventCode: code,
                      rules,
                      logoUrl,
                      theme: selectedTheme,
                      customTheme
                    }
                  : prev
              );
            }
            
            setSelectedLogoFile(null);
            setView(eventFormat === "individual" ? "playerSetup" : "teamSetup");
          }}
          goBack={() => {
            setSelectedTournament(null); // Clear current selection
            setView("adminDashboard");   // Return to tournament list
          }}
                    
          />
          )}

      {view === "teamSetup" && (
        <TeamSetup
          teams={teams}
          setTeams={setTeams}
          goNext={async () => {
            if (selectedTournament?.id) {
              await saveTournamentData(selectedTournament.id, {
                teams
              });
            }
            setView("matchPlanner");
          }}
          
          goBack={() => setView("setupOptions")}
          tournamentName={tournamentName}
          selectedTournamentId={selectedTournament?.id} // 👈 pass this in!
        />
      )}

      {view === "playerSetup" && (
        <PlayerSetup
          players={individualPlayers}
          setPlayers={setIndividualPlayers}
          goNext={async () => {
            if (selectedTournament?.id) {
              await saveTournamentData(selectedTournament.id, {
                eventFormat,
                players: individualPlayers
              });
            }
            setView("individualMatchPlanner");
          }}
          goBack={() => setView("setupOptions")}
          tournamentName={tournamentName}
          selectedTournamentId={selectedTournament?.id}
        />
      )}

      {view === "individualMatchPlanner" && (
        <IndividualMatchPlanner
          players={individualPlayers}
          setSelectedDate={(date) => setSelectedDate(date)}
          goBack={() => setView("playerSetup")}
          tournamentId={selectedTournament?.id}
        />
      )}

      {view === "matchPlanner" && (
        <MatchPlanner
          teams={teams}
          setSelectedDate={(date) => console.log("Match date selected:", date)}
          goBack={() => setView("teamSetup")}
          tournamentId={selectedTournament?.id}
          players={matchPlayers}
        />
      )}

      {view === "selectMatchDay" && (
        <SelectMatchDay
          tournamentId={selectedTournament?.id}
          tournamentName={tournamentName}
          onSelectMatchDay={(selectedDate) => {
            setSelectedDate(selectedDate);
            setView("selectMatchType");
          }}          
          onAdmin={() => setView("adminDashboard")}
        />
      )}

      {view === "selectMatchType" && (
        <SelectMatchType
          selectedDate={selectedDate}
          tournamentId={selectedTournament?.id}
          onSelectMatchType={(matchType, players, matchObj) => {
            setMatchType(matchType);
            setMatchPlayers(players);
            setSelectedMatchObject(matchObj);
            setLastMatchView({ matchType, players, matchObj });
            setView("scoreEntry"); // ← We’ll add this screen next!
          }}
        />
      )}

      {view === "scoreEntry" && (
        <ScoreEntry
          selectedDate={selectedDate}
          tournamentId={selectedTournament?.id}
          matchType={matchType}
          players={matchPlayers}
          selectedMatch={selectedMatchObject}  // 👈 Pass it in here
          teamPoints={teamPoints}
          setTeamPointsInApp={setTeamPointsInApp}
          teams={teams}
          individualPlayers={individualPlayers}
          eventFormat={eventFormat}
        />
      )}

{view === "individualLeaderboard" && (
  <>
    <IndividualLeaderboard
      selectedTournamentId={selectedTournament?.id}
      teams={teams}
      individualPlayers={individualPlayers}
      eventFormat={eventFormat}
    />
    {lastMatchView && (
      <button
        onClick={() => {
          setMatchType(lastMatchView.matchType);
          setMatchPlayers(lastMatchView.players);
          setSelectedMatchObject(lastMatchView.matchObj);
          setView("scoreEntry");
        }}
        style={{ margin: "10px 0", padding: "8px", fontWeight: "bold" }}
      >
        Return to Match
      </button>
    )}
  </>
)}

{view === "teamLeaderboard" && (
  <>
    <TeamLeaderboard
      selectedTournamentId={selectedTournament?.id}
      selectedDate={selectedDate}
    />
    {lastMatchView && (
      <button
        onClick={() => {
          setMatchType(lastMatchView.matchType);
          setMatchPlayers(lastMatchView.players);
          setSelectedMatchObject(lastMatchView.matchObj);
          setView("scoreEntry");
        }}
        style={{ margin: "10px 0", padding: "8px", fontWeight: "bold" }}
      >
        Return to Match
      </button>
    )}
  </>
)}

{showRulesModal && (
  <div style={{
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  }}>
    <div style={{
      background: "#fff",
      borderRadius: "10px",
      padding: "20px",
      width: "75%",
      maxWidth: "800px",
      position: "relative"
    }}>
      <button
        onClick={() => setShowRulesModal(false)}
        style={{
          position: "absolute",
          top: "1px",
          right: "1px",
          border: "none",
          background: "transparent",
          color: "#FF0000",
          fontSize: "2rem",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        X
      </button>

      <h2 style={{ marginTop: 0 }}>
        {tournamentName ? `${tournamentName} Rules` : "Tournament Rules"}
      </h2>

      {rules && rules.trim() ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            lineHeight: "1.5"
          }}
        >
          {rules}
        </pre>
      ) : (
        <p>No rules have been added yet.</p>
      )}
    </div>
  </div>
)}

      {user && (
        <button className="app-logout-button" onClick={() => {
          signOut(auth);
          setUser(null);
          setEventCode(null);
          setIsAdmin(null);
        }}>
          Logout
        </button>
      )}
    </div>
  );
}

export default App;
