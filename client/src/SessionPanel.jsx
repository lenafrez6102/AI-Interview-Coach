import { useState, useRef, useEffect } from 'react';

/**
 * Pure function: formats elapsed seconds as MM:SS (zero-padded).
 * @param {number} seconds - non-negative integer
 * @returns {string} formatted time string, e.g. "02:05"
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * SessionPanel — shows Start/Stop session controls, a timer,
 * and the live transcription display area.
 *
 * Props:
 *   sessionState      {string}   — 'idle' | 'active' | 'ended'
 *   transcription     {string}   — cumulative transcription text
 *   onStartSession    {function} — called after mic is granted and session begins
 *   onStopSession     {function} — called when session ends
 *   onTranscriptUpdate {function} — called with new transcript text to append
 *   onMicError        {function} — called with error message if mic is denied
 */
function SessionPanel({
  sessionState,
  transcription,
  onStartSession,
  onStopSession,
  onTranscriptUpdate,
  onMicError,
}) {
  const isActive = sessionState === 'active';

  // Elapsed seconds — managed locally in SessionPanel
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Microphone permission error message
  const [micError, setMicError] = useState(null);

  // Refs for cleanup
  const wsRef = useRef(null); // Will store SpeechRecognition instance
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const isActiveRef = useRef(false); // Track active state in ref to avoid stale closure

  // Reset elapsed time when session becomes idle
  useEffect(() => {
    if (sessionState === 'idle') {
      setElapsedSeconds(0);
      setMicError(null);
      isActiveRef.current = false;
    } else if (sessionState === 'active') {
      isActiveRef.current = true;
    } else if (sessionState === 'ended') {
      isActiveRef.current = false;
    }
  }, [sessionState]);

  async function handleStart() {
    setMicError(null);

    // 1. Request microphone access (still needed for Web Speech API)
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      const msg = 'Microphone access was denied. Please enable microphone permissions and try again.';
      setMicError(msg);
      if (onMicError) onMicError(msg);
      return;
    }

    streamRef.current = stream;

    // 2. Use Web Speech API instead of WebSocket
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome or Edge.';
      setMicError(msg);
      if (onMicError) onMicError(msg);
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Enable interim results so we get transcription
    recognition.lang = 'en-US';

    wsRef.current = recognition; // Store in wsRef for cleanup

    recognition.onresult = (event) => {
      // Get only final results to avoid duplication
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          if (transcript && onTranscriptUpdate) {
            onTranscriptUpdate(transcript + ' ');
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = '';
      switch(event.error) {
        case 'aborted':
          errorMessage = 'Speech recognition was aborted. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone was found or microphone is being used by another application.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Speech recognition requires an internet connection.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission was denied. Please enable microphone access in your browser settings.';
          break;
        case 'no-speech':
          errorMessage = 'No speech was detected. Please try speaking again.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service is not allowed. Please check your browser settings.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      if (onTranscriptUpdate) {
        onTranscriptUpdate(`\n[${errorMessage}]`);
      }
      // Don't stop session on 'no-speech' error, just continue
      if (event.error !== 'no-speech') {
        stopSession();
      }
    };

    recognition.onend = () => {
      // If session is still active, restart recognition (it stops after ~60s of silence or on error)
      if (sessionState === 'active' && wsRef.current === recognition) {
        try {
          recognition.start();
          console.log('Speech recognition restarted');
        } catch (err) {
          console.error('Failed to restart recognition:', err);
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      const msg = `Failed to start speech recognition: ${err.message}`;
      setMicError(msg);
      if (onMicError) onMicError(msg);
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    // 3. Notify App that session has started
    onStartSession();

    // 4. Start the elapsed-time timer
    setElapsedSeconds(0);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopSession() {
    // Mark as inactive first to prevent restart
    isActiveRef.current = false;
    
    // Clear the timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop speech recognition
    if (wsRef.current && wsRef.current.stop) {
      try {
        wsRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping
      }
      wsRef.current = null;
    }

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Wait a bit for final speech results to come through before ending session
    setTimeout(() => {
      // Notify App that session has ended (updates sessionState to 'ended')
      onStopSession();
    }, 500); // 500ms delay to allow final transcription
  }

  function handleStop() {
    stopSession();
  }

  return (
    <section className="section" aria-label="Practice Session">
      <p className="section-label">Practice Session</p>

      <div className="session-controls">
        {isActive ? (
          <button className="btn" onClick={handleStop}>
            Stop Session
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={sessionState === 'active'}
          >
            Start Practice Session
          </button>
        )}

        {isActive && (
          <span className="timer" aria-live="off" aria-label={`Elapsed time: ${formatTime(elapsedSeconds)}`}>
            {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>

      {micError && (
        <p className="error-message" role="alert">
          {micError}
        </p>
      )}

      <div
        className="transcription-display"
        aria-live="polite"
        aria-label="Transcription"
      >
        {transcription ? (
          <span>{transcription}</span>
        ) : (
          <span className="transcription-placeholder">
            {isActive
              ? 'Listening… start speaking.'
              : 'Transcription will appear here during your session.'}
          </span>
        )}
      </div>
    </section>
  );
}

export default SessionPanel;
