// AlgoNook — app shell: screen state machine + CRT frame
import { useEffect, useState } from 'react';
import { GameProvider, useGame } from './game/GameContext.jsx';
import Hud from './components/Hud.jsx';
import BootScreen from './screens/BootScreen.jsx';
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

function Shell() {
  const { save, setBooted } = useGame();
  const [screen, setScreen] = useState(save.booted ? 'map' : 'boot');
  const [mission, setMission] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const startFromBoot = () => {
    setBooted();
    setScreen('map');
  };

  return (
    <div className="min-h-dvh">
      <div className="crt-flicker" />
      <div className="crt-scanlines" />
      <div className="crt-vignette" />

      {screen === 'boot' ? (
        <BootScreen onStart={startFromBoot} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
