import React, { useEffect } from 'react';
import { useGame } from './context/GameContext';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import RoleRevealPage from './pages/RoleRevealPage';
import NightPage from './pages/NightPage';
import TeamProposalPage from './pages/TeamProposalPage';
import VotingPage from './pages/VotingPage';
import QuestPage from './pages/QuestPage';
import AssassinationPage from './pages/AssassinationPage';
import GameOverPage from './pages/GameOverPage';
import InfoPanel from './components/InfoPanel';
import AdminPage from './pages/AdminPage';

export default function App() {
  const { state } = useGame();
  const { room } = state;

  const pageKey = room ? room.phase : 'home';
  useEffect(() => { window.scrollTo(0, 0); }, [pageKey]);

  if (window.location.pathname === '/admin') {
    return <AdminPage />;
  }

  let page;
  if (!room) {
    page = <HomePage />;
  } else {
    switch (room.phase) {
      case 'lobby':          page = <LobbyPage />; break;
      case 'role_reveal':    page = <RoleRevealPage />; break;
      case 'night':          page = <NightPage />; break;
      case 'team_proposal':  page = <TeamProposalPage />; break;
      case 'voting':         page = <VotingPage />; break;
      case 'quest':          page = <QuestPage />; break;
      case 'assassination':  page = <AssassinationPage />; break;
      case 'game_over':      page = <GameOverPage />; break;
      default:               page = <div className="page"><div className="card"><p>Unknown phase: {room.phase}</p></div></div>;
    }
  }

  return (
    <>
      {page}
      <InfoPanel />
    </>
  );
}
