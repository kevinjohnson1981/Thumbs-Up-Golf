import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import './style.css'
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./Login";
import { signOut } from "firebase/auth";
import AdminDashboard from './AdminDashboard';
import SetupOptions from './SetupOptions';
import TeamSetup from './TeamSetup';
import MatchPlanner from './MatchPlanner';
import { collection, query, where, getDocs } from "firebase/firestore";
import SelectMatchDay from './SelectMatchDay';
import SelectMatchType from './SelectMatchType';
import ScoreEntry from './ScoreEntry';
import { signInAnonymously } from "firebase/auth";
import IndividualLeaderboard from './IndividualLeaderboard';
import TeamLeaderboard from './TeamLeaderboard';
import PlayerNav from './PlayerNav';




function App() {
  const [view, setView] = useState("setupOptions");
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [teams, setTeams] = useState([]);
  const [tournamentName, setTournamentName] = useState("");
  const [numTeams, setNumTeams] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(3);
  const [setupComplete, setSetupComplete] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [teamPoints, setTeamPointsInApp] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMatchObject, setSelectedMatchObject] = useState(null);
  const [lastMatchView, setLastMatchView] = useState(null);




  const generateDefaultCode = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TUP${random}`;
  };
  

  
  const saveTournamentData = async (tournamentId, data) => {
    try {
      await setDoc(doc(db, "tournaments", tournamentId), data, { merge: true });
      console.log("✅ Tournament updated:", data);
    } catch (error) {
      console.error("❌ Error saving tournament data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        setUser(firebaseUser);
        setIsAdmin(true); // ✅ Set admin status here
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
      setTournamentName(selectedTournament.name || "");
      setNumTeams(selectedTournament.numTeams || 2);
      setPlayersPerTeam(selectedTournament.playersPerTeam || 3);
      setEventCode(selectedTournament.eventCode || "");
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
  if (!authChecked || isAdmin || !eventCode || user?.emailVerified) return;
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
    <div className="container">
      <header style={{ borderBottom: "5px solid #ccc", paddingBottom: "10px", marginBottom: "10px" }}>
        <div className="app-header">
          <img src="/ThumbsUpGolf2.png" alt="Thumbs Up Golf Logo" className="app-logo" />
        </div>
      </header>

      {user && !isAdmin && (
        <PlayerNav
          onGoHome={() => setView("selectMatchDay")}
          onGoIndividualLeaderboard={() => setView("individualLeaderboard")}
          onGoTeamLeaderboard={() => setView("teamLeaderboard")}
          tournamentName={tournamentName} // 👈 pass it in here
        />
      )}


      {view === "adminDashboard" && (
        <AdminDashboard
          user={user}
          onStartNew={async () => {
            const newTournamentId = `${user.uid}_${Date.now()}`;
            const defaultCode = generateDefaultCode();
            const newTournament = {
              id: newTournamentId,
              adminId: user.uid,
              name: "",
              teams: [],
              numTeams: 2,
              playersPerTeam: 3,
              eventCode: defaultCode, // 👈 add this!
              createdAt: new Date().toISOString(),
            };
            setEventCode(defaultCode); // 👈 also set it in state

          
            await setDoc(doc(db, "tournaments", newTournamentId), newTournament);
            setTournamentName("");
            setTeams([]);
            setSelectedTournament({ id: newTournamentId, ...newTournament });
            setSetupComplete(false);
            setView("setupOptions");
          }}
          
          onSelectTournament={(tournament) => {
            setSelectedTournament(tournament);
            setTournamentName(tournament.name);
            setTeams(tournament.teams || []);
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
          eventCode={eventCode}
          setEventCode={setEventCode}
          playersPerTeam={playersPerTeam}
          setPlayersPerTeam={setPlayersPerTeam}
          onContinue={async () => {
            let updatedTeams = selectedTournament?.teams || [];
          
            if (updatedTeams.length === 0) {
              updatedTeams = Array.from({ length: numTeams }, () => ({
                name: '',
                color: '',
                players: Array.from({ length: playersPerTeam }, () => ({ name: '', handicap: '' }))
              }));
            }
          
            setTeams(updatedTeams);
          
            const code = eventCode?.trim() || generateDefaultCode();
          
            if (selectedTournament?.id) {
              await saveTournamentData(selectedTournament.id, {
                name: tournamentName,
                numTeams,
                playersPerTeam,
                eventCode: code // 💥 Save the generated or custom event code here!
              });
            }
          
            setView("teamSetup");
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
        />
      )}

{view === "individualLeaderboard" && (
  <>
    <IndividualLeaderboard selectedTournamentId={selectedTournament?.id} />
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
    <TeamLeaderboard selectedTournamentId={selectedTournament?.id} />
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

      {user && (
        <button onClick={() => {
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
