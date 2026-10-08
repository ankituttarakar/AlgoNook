// AlgoNook — app shell: screen state machine + CRT frame
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/react';
import { GameProvider } from './game/GameContext.jsx';
import { syncClerkUser } from './lib/db.ts';
import Hud from './components/Hud.jsx';
import LandingScreen from './screens/LandingScreen.jsx';
import MapScreen from './screens/MapScreen.jsx';
import BriefScreen from './screens/BriefScreen.jsx';
import RunScreen from './screens/RunScreen.jsx';
import LearningRunScreen from './screens/LearningRunScreen.jsx';
import DebriefScreen from './screens/DebriefScreen.jsx';

const LOCATION = {
  map: 'SECTOR MAP',
  brief: 'MISSION BRIEF',
  run: 'LIVE MISSION',
  debrief: 'DEBRIEF',
};

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="bb-panel p-6 text-center max-w-sm w-full border-[var(--bb-line)]">
        <div className="font-crt text-xl text-[var(--bb-green)] bb-glow mb-3">
          ALGONOOK MAINFRAME
        </div>
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-[var(--bb-muted)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--bb-green)] anim-pulse-glow" />
          <span>AUTHENTICATING GRID LINK</span>
          <span className="anim-blink text-[var(--bb-green)]">▌</span>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedGame() {
  const [screen, setScreen] = useState('map');
  const [mission, setMission] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <GameProvider>
      <Hud location={LOCATION[screen] || ''} />
      {screen === 'map' && (
        <MapScreen
          onSelect={(m) => { setMission(m); setScreen('brief'); }}
        />
      )}
      {screen === 'brief' && mission && (
        <BriefScreen
          mission={mission}
          onDeploy={() => setScreen('run')}
          onBack={() => setScreen('map')}
        />
      )}
      {screen === 'run' && mission && (
        mission.learningFlow ? (
          <LearningRunScreen
            mission={mission}
            onFinish={(r) => { setResult(r); setScreen('debrief'); }}
            onAbort={() => setScreen('map')}
          />
        ) : (
          <RunScreen
            mission={mission}
            onFinish={(r) => { setResult(r); setScreen('debrief'); }}
            onAbort={() => setScreen('map')}
          />
        )
      )}
      {screen === 'debrief' && result && (
        <DebriefScreen
          result={result}
          onNext={(m) => { setMission(m); setScreen('brief'); }}
          onReplay={() => setScreen('brief')}
          onMap={() => setScreen('map')}
        />
      )}
    </GameProvider>
  );
}

function Shell() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Sync with Neon users table when user signs in
  useEffect(() => {
    if (isSignedIn && user) {
      const email = user.primaryEmailAddress?.emailAddress || null;
      syncClerkUser(
        {
          email,
          username: user.username,
          firstName: user.firstName,
        },
        getToken
      );
    }
  }, [isSignedIn, user, getToken]);

  return (
    <div className="min-h-dvh">
      <div className="crt-flicker" />
      <div className="crt-scanlines" />
      <div className="crt-vignette" />

      {/* 1. Loading State: Clerk is authenticating / resolving session */}
      {!isLoaded && <LoadingScreen />}

      {/* 2. Signed-Out State: Only render LandingScreen once isLoaded && !isSignedIn */}
      {isLoaded && !isSignedIn && <LandingScreen />}

      {/* 3. Signed-In State: Mount GameProvider & Sector Map ONLY when authenticated */}
      {isLoaded && isSignedIn && <AuthenticatedGame />}
    </div>
  );
}

export default function App() {
  return <Shell />;
}
