// AlgoNook — App Shell v3
// Navigation state machine that connects all screens.
// Complete learning journey:
//   roadmap → topic → concept → visualize → pattern → practice → problems → debrief → review
// All existing systems (auth, Neon, mastery, XP, execution) are unchanged.

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate as useRouterNavigate } from 'react-router';
import { useUser, useAuth } from '@clerk/react';
import { GameProvider, useGame } from './game/GameContext.jsx';
import { syncClerkUser } from './lib/db.ts';
import Hud from './components/Hud.jsx';
import { PageScene } from './components/PageScene.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LandingScreen from './screens/LandingScreen.jsx';
import BootScreen from './screens/BootScreen.jsx';
import RoadmapScreen from './screens/RoadmapScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import GuidebookScreen from './screens/GuidebookScreen.jsx';
import TopicScreen from './screens/TopicScreen.jsx';
import ConceptScreen from './screens/ConceptScreen.jsx';
import VisualizationScreen from './screens/VisualizationScreen.jsx';
import PatternScreen from './screens/PatternScreen.jsx';
import PracticeScreen from './screens/PracticeScreen.jsx';
import PracticeHubScreen from './screens/PracticeHubScreen.jsx';
import PracticeChapterPickerScreen from './screens/PracticeChapterPickerScreen.jsx';
import ComplexityScreen from './screens/ComplexityScreen.jsx';
import ReviewScreen from './screens/ReviewScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import LeaderboardScreen from './screens/LeaderboardScreen.jsx';
import ChallengeArenaScreen from './screens/ChallengeArenaScreen.jsx';
import ArenaScreen from './screens/ArenaScreen.jsx';
import BriefScreen from './screens/BriefScreen.jsx';
import LearningRunScreen from './screens/LearningRunScreen.jsx';
import RunScreen from './screens/RunScreen.jsx';
import DebriefScreen from './screens/DebriefScreen.jsx';
import GameEngineScreen from './screens/GameEngineScreen.jsx';
import ArraySetGame from './screens/ArraySetGame.jsx';
import HashFrequencyGame from './screens/HashFrequencyGame.jsx';
import TwoPointersMovementGame from './screens/TwoPointersMovementGame.jsx';
import { GAME_LAB_BY_NODE } from './data/games/index.js';
import { MISSION_MAP, isUnlocked, missionsOfTopic } from './data/missions/index.js';
import { ROADMAP_NODES } from './data/roadmap.js';
import { getPracticeRecommendations } from './game/recommendations.js';

// Navigation location labels for the HUD breadcrumb
const LOCATION_LABELS = {
  home:          'Player Headquarters',
  guidebook:     'DSA Guidebook',
  roadmap:       'Learning Roadmap',
  topic:         'Topic',
  concept:       'Concept',
  complexity:    'Complexity Analysis',
  visualize:     'Visualization',
  pattern:       'Pattern Recognition',
  practice:      'Practice',
  'practice-hub': 'Adaptive Training Room',
  'practice-choose': 'Choose a Practice Chapter',
  game:          'Reasoning Lab',
  'array-set-game': 'Set Memory Sprint',
  'hash-frequency-game': 'Frequency Map Builder',
  'two-pointers-movement-game': 'Pointer Movement Game',
  review:        'Review & Mastery',
  profile:       'Player Profile',
  leaderboard:   'Competition Arena',
  arena:         'Battlefield Arena',
  challenges:    'Challenge Area',
  brief:         'Mission Brief',
  run:           'Practice',
  debrief:       'Results',
};

function LoadingScreen({ label = 'Authenticating…' }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="border border-[var(--bb-line)] bg-[var(--bb-panel)] p-6 text-center max-w-sm w-full">
        <div className="font-mono text-sm text-[var(--bb-green)] mb-3">
          AlgoNook
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--bb-muted)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--bb-green)] animate-pulse" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function ProgressErrorScreen({ message, onRetry }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="border border-[var(--bb-amber)] bg-[var(--bb-panel)] p-6 text-center max-w-md w-full">
        <div className="font-mono text-sm text-[var(--bb-amber)] mb-3">
          Progress sync unavailable
        </div>
        <p className="text-xs text-[var(--bb-muted)] mb-2">
          Your progress is stored on the server and cannot be loaded right now.
          Nothing is shown or saved locally until the server snapshot is available,
          so your account state stays consistent across browsers and devices.
        </p>
        {message && (
          <p className="text-[10px] text-[var(--bb-muted)] font-mono mb-4 break-all">{message}</p>
        )}
        <button onClick={onRetry} className="bb-btn bb-btn-green text-xs">
          Retry loading progress
        </button>
      </div>
    </div>
  );
}

/**
 * HydrationGate — STEP 3 contract:
 * The authenticated roadmap/progress UI is only rendered AFTER GameContext has
 * replaced its state with the Neon (server) snapshot. While loading (or if the
 * load fails) no progress UI renders, so local empty state can never flash in
 * or overwrite server truth.
 */
function HydrationGate({ children }) {
  const { hydration, syncError, retryHydration } = useGame();
  if (hydration === 'ready') return children;
  if (hydration === 'error') {
    return <ProgressErrorScreen message={syncError} onRetry={retryHydration} />;
  }
  return <LoadingScreen label="Loading your progress from the server…" />;
}

/**
 * CrashHook — QA affordance used by tests/error-boundary.spec.js.
 *   - `?qa_crash=screen` crashes on mount (fresh-load crash test)
 *   - `window.dispatchEvent(new Event('algonook:qa-crash'))` crashes the next
 *     render, so a crash can be injected while the learner is mid-flow
 * Renders nothing otherwise; no effect on normal use.
 */
function CrashHook() {
  const [crash, setCrash] = useState(
    () => new URLSearchParams(window.location.search).get('qa_crash') === 'screen'
  );
  useEffect(() => {
    const trigger = () => setCrash(true);
    window.addEventListener('algonook:qa-crash', trigger);
    return () => window.removeEventListener('algonook:qa-crash', trigger);
  }, []);
  if (crash) throw new Error('QA crash hook: screen render');
  return null;
}

function resolveLocation(pathname, search) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'practice' && parts[1] === 'choose') return { screen: 'practice-choose', nodeId: null, mission: null };
  if (parts[0] === 'topic' && parts[1]) {
    const page = parts[2] || 'topic';
    const screenByPage = { concept: 'concept', visualize: 'visualize', complexity: 'complexity', pattern: 'pattern', practice: 'practice', game: 'game' };
    return { screen: screenByPage[page] || 'topic', nodeId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'challenge' && parts[1]) {
    const missionId = decodeURIComponent(parts[1]);
    const mission = MISSION_MAP[missionId] || null;
    return { screen: parts[2] === 'run' ? 'run' : 'brief', mission, nodeId: mission?.chapter || mission?.topic || null };
  }
  const topic = new URLSearchParams(search).get('topic');
  const screen = ({ '': 'home', roadmap: 'roadmap', guidebook: 'guidebook', review: 'review', profile: 'profile', arena: 'arena', leaderboard: 'leaderboard', practice: topic ? 'practice' : 'practice-hub', challenges: 'challenges', patterns: 'pattern', results: 'debrief' })[parts[0] || ''] || 'home';
  return { screen, nodeId: topic || (['practice', 'pattern'].includes(screen) ? 'foundations' : null), mission: null, result: null };
}

function pathForLocation(target, extra = {}, currentNodeId = null, currentMission = null) {
  const nodeId = extra.nodeId || currentNodeId || 'foundations';
  if (target === 'home') return '/';
  if (target === 'guidebook' && (extra.nodeId || currentNodeId)) return `/guidebook?topic=${encodeURIComponent(nodeId)}`;
  if (target === 'practice-choose') return '/practice/choose';
  if (target === 'roadmap' || target === 'guidebook' || target === 'review' || target === 'profile' || target === 'arena' || target === 'leaderboard' || target === 'challenges' || target === 'practice-hub') return `/${target === 'practice-hub' ? 'practice' : target}`;
  if (target === 'topic') return `/topic/${encodeURIComponent(nodeId)}`;
  if (['concept', 'visualize', 'complexity', 'pattern', 'practice', 'game'].includes(target)) return `/topic/${encodeURIComponent(nodeId)}/${target}`;
  if (target === 'brief' || target === 'run') {
    const mission = extra.mission || currentMission;
    return mission ? `/challenge/${encodeURIComponent(mission.id)}/${target}` : `/topic/${encodeURIComponent(nodeId)}`;
  }
  if (target === 'debrief') return '/results';
  return `/${target}`;
}

/**
 * AuthenticatedApp — all screens that require being signed in.
 *
 * Complete learning journey state machine:
 *   roadmap  — visual DSA learning roadmap (default)
 *     → topic        — topic hub (overview, can jump to any stage)
 *       → concept    — learn what/why/when
 *         → visualize — interactive algorithm visualization
 *           → pattern — pattern recognition training
 *             → practice — quick knowledge checks
 *               → problems (via topic → brief) — full coding problems
 *     → review       — mastery tracking and spaced review
 *
 * Mission flow (unchanged):
 *   topic → brief → run → debrief → (next/replay/roadmap)
 */
function AuthenticatedApp() {
  return (
    <GameProvider>
      <AuthenticatedAppShell />
    </GameProvider>
  );
}

function AuthenticatedAppShell() {
  const location = useLocation();
  const routerNavigate = useRouterNavigate();
  const route = resolveLocation(location.pathname, location.search);
  const { startTopic, completeStage, save, setBooted, cleared } = useGame();
  const mission = route.mission || (route.screen === 'brief'
    ? MISSIONS.find((item) => !cleared[item.id] && isUnlocked(item.id, cleared)) || null
    : null);
  const screen = route.screen === 'debrief' && !location.state?.result ? 'roadmap' : route.screen;
  const selectedNodeId = route.nodeId || mission?.chapter || mission?.topic || null;
  const result = route.screen === 'debrief' ? location.state?.result || null : null;
  const [errorResetKey, setErrorResetKey] = useState(0);
  const recommendations = useMemo(() => getPracticeRecommendations(save), [save]);
  useEffect(() => {
    if (selectedNodeId && ROADMAP_NODES.some((node) => node.id === selectedNodeId)) startTopic(selectedNodeId);
  }, [selectedNodeId, startTopic]);
  const continueChapter = (stage, nodeId = selectedNodeId) => {
    if (stage === 'review') return navigate('review');
    if (stage === 'problems') {
      const node = ROADMAP_NODES.find((item) => item.id === nodeId);
      const mission = node && (node.missionTopics || (node.topicId ? [node.topicId] : [])).flatMap(missionsOfTopic).find((item) => !cleared[item.id] && isUnlocked(item.id, cleared));
      return mission ? navigate('brief', { mission }) : navigate('review');
    }
    const destination = ({
      concept: 'concept', visualize: 'visualize', complexity: 'complexity', game: 'game',
      patterns: 'pattern', practice: 'practice',
    })[stage];
    if (destination) navigate(destination, { nodeId });
  };
  const handleHudNavigate = (target) => {
    if (target === 'home' || target === 'roadmap' || target === 'guidebook') return navigate(target);
    if (target === 'learn') return selectedNodeId ? navigate('topic', { nodeId: selectedNodeId }) : navigate('roadmap');
    if (target === 'review') return navigate('review');
    if (target === 'profile' || target === 'arena' || target === 'leaderboard' || target === 'challenges') return navigate(target);
    if (target === 'practice') return navigate('practice-hub');
  };

  // Error recovery: Retry re-renders the current screen; Return to Roadmap
  // leaves the crashed screen first, then re-renders.
  const retryCurrentScreen = () => setErrorResetKey((key) => key + 1);
  const recoverToRoadmap = () => {
    navigate('roadmap');
    setErrorResetKey((key) => key + 1);
  };

  // Scroll to top whenever screen changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const navigate = (target, extra = {}) => {
    const state = target === 'debrief' ? { result: extra.result } : undefined;
    routerNavigate(pathForLocation(target, extra, selectedNodeId, mission), { state });
  };
  const launchRecommendation = (recommendation) => {
    const activity = recommendation.activity;
    if (activity.type === 'coding') navigate('brief', { mission: activity.mission });
    else if (activity.type === 'game') navigate('game', { nodeId: activity.nodeId });
    else if (activity.type === 'concept' || activity.type === 'visualize' || activity.type === 'practice') navigate(activity.type, { nodeId: activity.nodeId });
    else navigate('topic', { nodeId: recommendation.nodeId });
  };

  const hudLocation = screen === 'topic'
    ? ROADMAP_NODES.find((node) => node.id === selectedNodeId)?.label || 'Topic'
    : screen === 'game'
      ? `${ROADMAP_NODES.find((node) => node.id === selectedNodeId)?.label || 'DSA'} Reasoning Lab`
    : LOCATION_LABELS[screen] || '';
  const scene = screen === 'home' ? 'home-hub'
    : screen === 'guidebook' ? 'learning-library'
      : screen === 'roadmap' ? 'world-map'
    : screen === 'topic' ? 'topic-island'
      : ['concept', 'visualize', 'pattern', 'complexity'].includes(screen) ? 'learning-room'
        : screen === 'game' || screen.endsWith('-game') ? 'game-arena'
          : screen === 'run' ? (mission?.problemFlow ? 'coding-lab' : 'game-arena')
            : screen === 'practice' || screen === 'practice-hub' || screen === 'practice-choose' ? 'training-room'
              : screen === 'review' ? 'review-room'
                : screen === 'profile' ? 'player-profile'
                  : screen === 'leaderboard' ? 'competition-arena'
                    : screen === 'arena' ? 'battle-arena'
                      : screen === 'challenges' ? 'challenge-arena'
                    : screen === 'debrief' ? 'mission-debrief'
                      : 'mission-brief';
  const sceneKey = screen === 'topic' ? `${screen}-${selectedNodeId}` : screen === 'run' ? `${screen}-${mission?.id || 'mission'}` : screen;

  // Boot gate: the operator establishes a callsign before the roadmap appears.
  // The choice is persisted to the server, so it hydrates identically in every
  // browser and profile for this account (never localStorage-only).
  if (!save.booted) {
    return (
      <ErrorBoundary
        resetKey={errorResetKey}
        onRetry={retryCurrentScreen}
        onReturnToRoadmap={recoverToRoadmap}
      >
        <CrashHook />
        <HydrationGate>
          <BootScreen onStart={() => setBooted()} />
        </HydrationGate>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      resetKey={errorResetKey}
      onRetry={retryCurrentScreen}
      onReturnToRoadmap={recoverToRoadmap}
    >
      <CrashHook />

      <HydrationGate>
        <Hud
          location={hudLocation}
          onNavigate={handleHudNavigate}
        />

        <PageScene key={sceneKey} scene={scene} world={selectedNodeId}>

        {screen === 'home' && (
          <HomeScreen
            recommendations={recommendations.slice(0, 4)}
            onLaunchRecommendation={launchRecommendation}
            onRoadmap={() => navigate('roadmap')}
            onPractice={() => handleHudNavigate('practice')}
            onReview={() => navigate('review')}
            onGuidebook={() => navigate('guidebook')}
            onContinueNode={(node, stage) => stage
              ? continueChapter(stage, node.id)
              : navigate('topic', { nodeId: node.id })}
          />
        )}
        {screen === 'guidebook' && <GuidebookScreen initialNodeId={selectedNodeId} onBack={() => navigate('roadmap')} />}
        {screen === 'practice-hub' && <PracticeHubScreen recommendations={recommendations} onLaunch={launchRecommendation} onChooseChapter={() => navigate('practice-choose')} />}
        {screen === 'practice-choose' && <PracticeChapterPickerScreen onPractice={(node) => navigate('practice', { nodeId: node.id })} onLearn={(node) => navigate('topic', { nodeId: node.id })} onBack={() => navigate('practice-hub')} />}

        {/* ── ROADMAP ── */}
        {screen === 'roadmap' && (
          <RoadmapScreen
            onSelectNode={(node) => navigate('topic', { nodeId: node.id })}
            onReview={() => navigate('review')}
            onStartMission={(m) => navigate('brief', { mission: m })}
          />
        )}
        {/* ── TOPIC ── */}
        {screen === 'topic' && selectedNodeId && (
          <TopicScreen
            nodeId={selectedNodeId}
            onBack={() => navigate('roadmap')}
            onStartMission={(m) => navigate('brief', { mission: m })}
            onContinueChapter={continueChapter}
            onReview={() => navigate('review')}
            onGuidebook={() => navigate('guidebook', { nodeId: selectedNodeId })}
          />
        )}

        {screen === 'array-set-game' && selectedNodeId === 'arrays' && (
          <ArraySetGame onBack={() => navigate('topic', { nodeId: 'arrays' })} />
        )}
        {screen === 'hash-frequency-game' && selectedNodeId === 'hashing' && (
          <HashFrequencyGame onBack={() => navigate('topic', { nodeId: 'hashing' })} />
        )}
        {screen === 'two-pointers-movement-game' && selectedNodeId === 'two-pointers' && (
          <TwoPointersMovementGame onBack={() => navigate('topic', { nodeId: 'two-pointers' })} />
        )}

        {screen === 'game' && GAME_LAB_BY_NODE[selectedNodeId] && (
          <GameEngineScreen
            game={GAME_LAB_BY_NODE[selectedNodeId]}
            backLabel={selectedNodeId === 'foundations' ? '← Back to Complexity' : '← Back to Visualization'}
            completeLabel={selectedNodeId === 'foundations' ? 'Continue to Practice →' : 'Continue to Pattern →'}
            onBack={() => navigate(selectedNodeId === 'foundations' ? 'complexity' : 'visualize', { nodeId: selectedNodeId })}
            onComplete={() => {
              completeStage(selectedNodeId, 'game');
              navigate(selectedNodeId === 'foundations' ? 'practice' : 'pattern', { nodeId: selectedNodeId });
            }}
          />
        )}

        {/* ── CONCEPT ── */}
        {screen === 'concept' && selectedNodeId && (
          <ConceptScreen
            nodeId={selectedNodeId}
            onContinue={() => {
              completeStage(selectedNodeId, 'concept');
              navigate('visualize', { nodeId: selectedNodeId });
            }}
            onBack={() => navigate('topic', { nodeId: selectedNodeId })}
          />
        )}

        {/* ── COMPLEXITY (Foundations only) ── */}
        {screen === 'complexity' && selectedNodeId === 'foundations' && (
          <ComplexityScreen
            onContinue={() => {
              completeStage(selectedNodeId, 'complexity');
              navigate('game', { nodeId: selectedNodeId });
            }}
            onBack={() => navigate('visualize', { nodeId: selectedNodeId })}
          />
        )}

        {/* ── VISUALIZE ── */}
        {screen === 'visualize' && selectedNodeId && (
          <VisualizationScreen
            nodeId={selectedNodeId}
            continueLabel={selectedNodeId === 'foundations' ? 'Continue to Complexity Analysis →' : GAME_LAB_BY_NODE[selectedNodeId] ? 'Continue to Reasoning Game →' : undefined}
            onContinue={() => {
              completeStage(selectedNodeId, 'visualize');
              if (selectedNodeId === 'foundations') navigate('complexity', { nodeId: selectedNodeId });
              else if (GAME_LAB_BY_NODE[selectedNodeId]) navigate('game', { nodeId: selectedNodeId });
              else navigate('pattern', { nodeId: selectedNodeId });
            }}
            onBack={() => navigate('concept', { nodeId: selectedNodeId })}
          />
        )}

        {/* ── PATTERN ── */}
        {screen === 'pattern' && selectedNodeId && (
          <PatternScreen
            nodeId={selectedNodeId}
            onContinue={() => {
              completeStage(selectedNodeId, 'pattern');
              navigate('practice', { nodeId: selectedNodeId });
            }}
            onBack={() => navigate('visualize', { nodeId: selectedNodeId })}
          />
        )}

        {/* ── PRACTICE ── */}
        {screen === 'practice' && selectedNodeId && (
          <PracticeScreen
            nodeId={selectedNodeId}
            recommendations={recommendations.filter((item) => item.nodeId === selectedNodeId && item.activity.type !== 'practice').slice(0, 3)}
            onLaunchRecommendation={launchRecommendation}
            onContinue={() => {
              completeStage(selectedNodeId, 'practice');
              const currentNode = ROADMAP_NODES.find((node) => node.id === selectedNodeId);
              const nextMission = currentNode && (currentNode.missionTopics || (currentNode.topicId ? [currentNode.topicId] : []))
                .flatMap(missionsOfTopic)
                .find((item) => !cleared[item.id] && isUnlocked(item.id, cleared));
              if (nextMission) navigate('brief', { mission: nextMission });
              else navigate('topic', { nodeId: selectedNodeId });
            }}
            onBack={() => navigate('pattern', { nodeId: selectedNodeId })}
          />
        )}

        {/* ── REVIEW ── */}
        {screen === 'review' && (
          <ReviewScreen
            onNavigate={navigate}
            onLaunchRecommendation={launchRecommendation}
            onBack={() => navigate('roadmap')}
          />
        )}
        {screen === 'profile' && <ProfileScreen onBack={() => navigate('roadmap')} onReview={() => navigate('review')} />}
        {screen === 'challenges' && <ChallengeArenaScreen onBack={() => navigate('roadmap')} onChooseChapter={() => navigate('practice-choose')} onStartMission={(item) => navigate('brief', { mission: item })} />}
        {screen === 'arena' && <ArenaScreen onBack={() => navigate('roadmap')} onOpenChallenges={() => navigate('challenges')} onChooseChapter={() => navigate('practice-choose')} onStartMission={(item) => navigate('brief', { mission: item })} />}
        {screen === 'leaderboard' && <LeaderboardScreen onBack={() => navigate('roadmap')} onProfile={() => navigate('profile')} />}

        {/* ── BRIEF ── */}
        {screen === 'brief' && mission && (
          <BriefScreen
            mission={mission}
            onDeploy={() => navigate('run')}
            onBack={() => {
              // Go back to topic if we came from one, otherwise roadmap
              if (selectedNodeId) navigate('topic', { nodeId: selectedNodeId });
              else navigate('roadmap');
            }}
          />
        )}

        {/* ── RUN ── */}
        {screen === 'run' && mission && (
          mission.learningFlow ? (
            <LearningRunScreen
              mission={mission}
              onFinish={(r) => navigate('debrief', { result: r })}
              onAbort={() => {
                if (selectedNodeId) navigate('topic', { nodeId: selectedNodeId });
                else navigate('roadmap');
              }}
            />
          ) : (
            <RunScreen
              mission={mission}
              onFinish={(r) => navigate('debrief', { result: r })}
              onAbort={() => {
                if (selectedNodeId) navigate('topic', { nodeId: selectedNodeId });
                else navigate('roadmap');
              }}
            />
          )
        )}

        {/* ── DEBRIEF ── */}
        {screen === 'debrief' && result && (
          <DebriefScreen
            result={result}
            onNext={(m) => navigate('brief', { mission: m })}
            onReplay={() => navigate('brief', { mission })}
            onMap={() => navigate('roadmap')}
            onReview={() => navigate('review')}
          />
        )}
        </PageScene>
      </HydrationGate>
    </ErrorBoundary>
  );
}

function Shell() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Sync Clerk user to Neon users table on sign-in (unchanged)
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
    <div className="app-shell">

      {/* 1. Loading — Clerk resolving session */}
      {!isLoaded && <LoadingScreen />}

      {/* 2. Signed-out — show marketing landing */}
      {isLoaded && !isSignedIn && <LandingScreen />}

      {/* 3. Signed-in — full learning platform */}
      {isLoaded && isSignedIn && <AuthenticatedApp />}
    </div>
  );
}

export default function App() {
  // Safety net: catches anything the inline boundary cannot (auth shell,
  // GameProvider mount, LandingScreen) so a crash never leaves a blank page.
  return (
    <ErrorBoundary>
      <Shell />
    </ErrorBoundary>
  );
}
