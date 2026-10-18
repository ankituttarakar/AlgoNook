import { useEffect, useReducer, useRef, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import {
  getGuideKeyboardAction,
  getResumeDestination,
  guidePanelReducer,
  GUIDE_SUGGESTED_PROMPTS,
  isGuideActionAllowed,
  matchGuideQuery,
} from '../lib/guideAssistant.js';

let nextMessageId = 1;

function createMessage(role, text, results = []) {
  return { id: nextMessageId++, role, text, results };
}

export default function AlgoNookGuide({ onNavigate }) {
  const { save } = useGame();
  const [isOpen, dispatchPanel] = useReducer(guidePanelReducer, false);
  const [messages, setMessages] = useState(() => [createMessage('assistant', 'Hi, I’m AlgoNook Guide. I can help you find app sections and DSA learning resources.')]);
  const [query, setQuery] = useState('');
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (getGuideKeyboardAction(event) === 'close') {
        event.preventDefault();
        dispatchPanel('ESCAPE');
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const closePanel = () => {
    dispatchPanel('CLOSE');
    triggerRef.current?.focus();
  };

  const submitQuery = (value = query) => {
    const submitted = value.trim();
    if (!submitted) return;
    const response = matchGuideQuery(submitted, save);
    setMessages((current) => [
      ...current,
      createMessage('user', submitted),
      createMessage('assistant', response.text, response.results || []),
    ]);
    setQuery('');
  };

  const chooseDestination = (destination) => {
    if (!isGuideActionAllowed(destination)) return;
    onNavigate(destination.target, destination.nodeId ? { nodeId: destination.nodeId } : {});
    closePanel();
  };

  const handleInputKeyDown = (event) => {
    if (getGuideKeyboardAction(event) === 'submit') {
      event.preventDefault();
      submitQuery();
    }
  };

  const resumeDestination = getResumeDestination(save);
  const suggestedPrompts = resumeDestination
    ? [`Resume ${resumeDestination.label.replace(/^Continue /, '')}`, ...GUIDE_SUGGESTED_PROMPTS.slice(0, 3)]
    : GUIDE_SUGGESTED_PROMPTS;

  return (
    <div className="algonook-guide" data-testid="algonook-guide">
      {isOpen && (
        <section id="algonook-guide-panel" className="guide-panel" role="dialog" aria-modal="false" aria-labelledby="guide-panel-title">
          <header className="guide-panel-header">
            <span className="guide-panel-mark" aria-hidden="true">⌘</span>
            <div>
              <p className="guide-panel-kicker">FREE · LOCAL ASSISTANT</p>
              <h2 id="guide-panel-title">AlgoNook Guide</h2>
            </div>
            <button type="button" className="guide-close" aria-label="Close AlgoNook Guide" onClick={closePanel}>×</button>
          </header>

          <div className="guide-conversation" ref={messagesRef} aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <article className={`guide-message guide-message-${message.role}`} key={message.id}>
                <p>{message.text}</p>
                {message.results.length > 0 && (
                  <div className="guide-results" aria-label="Suggested destinations">
                    {message.results.map((destination, index) => (
                      <button
                        type="button"
                        className="guide-result"
                        key={`${destination.target}:${destination.nodeId || ''}:${index}`}
                        onClick={() => chooseDestination(destination)}
                      >
                        <span>{destination.label}</span><span aria-hidden="true">↗</span>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {messages.length === 1 && (
              <div className="guide-suggestions" aria-label="Suggested questions">
                {suggestedPrompts.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => submitQuery(prompt)}>{prompt}</button>
                ))}
              </div>
            )}
          </div>

          <form className="guide-composer" onSubmit={(event) => { event.preventDefault(); submitQuery(); }}>
            <label className="sr-only" htmlFor="guide-query">Ask AlgoNook Guide</label>
            <input
              id="guide-query"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Find a feature or DSA topic…"
              autoComplete="off"
            />
            <button type="submit" aria-label="Send question" disabled={!query.trim()}><span aria-hidden="true">↑</span></button>
          </form>
          <p className="guide-privacy-note">Queries stay in this tab and aren’t saved.</p>
        </section>
      )}

      <button
        type="button"
        ref={triggerRef}
        className="guide-launcher"
        aria-label={isOpen ? 'Close AlgoNook Guide' : 'Open AlgoNook Guide'}
        aria-expanded={isOpen}
        aria-controls="algonook-guide-panel"
        onClick={() => dispatchPanel(isOpen ? 'CLOSE' : 'OPEN')}
      >
        <span aria-hidden="true">⌘</span><span>Guide</span>
      </button>
    </div>
  );
}
