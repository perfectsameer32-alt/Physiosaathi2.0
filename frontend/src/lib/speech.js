import { getSettings } from './storage';

// Shared Web Audio context to prevent audio leak and browser limits
let sharedAudioCtx = null;

export function getSharedAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (window.speechSynthesis) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }
}

// Attach user gesture unlockers
if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

// Audio Chime Synthesizer
export function playChime(freq = 659.25, type = 'success') {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // Audio context may be restricted by platform
  }
}

// Global active utterance reference set to completely prevent Chromium GC cancellation
if (typeof window !== 'undefined' && !window.__pysiosaathi_utterances) {
  window.__pysiosaathi_utterances = new Set();
}

let cachedVoices = [];
function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
  loadVoices();
}

// Watchdog interval for SpeechSynthesis pause bugs in Chrome
let watchdogTimer = null;
function startSpeechWatchdog() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (!window.speechSynthesis.speaking) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }, 400);
}

/**
 * Universal resilient speech announcement function.
 * Handles auto-resuming, garbage collection prevention, settings sync, and priority interruptions.
 */
export function speakAnnouncement(phrase, options = {}) {
  if (!phrase || typeof window === 'undefined' || !window.speechSynthesis) return;

  const settings = getSettings();
  const voiceEnabled = options.voiceEnabled ?? settings.voiceEnabled ?? true;
  if (!voiceEnabled) return;

  const synth = window.speechSynthesis;
  const priority = options.priority ?? false;
  const rate = options.rate ?? settings.speechRate ?? 1.0;
  const pitch = options.pitch ?? 1.0;
  const volume = options.volume ?? 1.0;

  try {
    if (synth.paused) {
      synth.resume();
    }

    if (priority) {
      synth.cancel();
      window.__pysiosaathi_utterances?.clear();
    }

    const utter = new SpeechSynthesisUtterance(phrase);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    // Pick best natural voice matching language
    const voices = loadVoices();
    if (voices.length > 0) {
      const langPrefix = options.lang ? options.lang.slice(0, 2) : 'en';
      const best =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(langPrefix) &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Neural') ||
              v.name.includes('Premium'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
        voices.find((v) => v.default) ||
        voices[0];
      if (best) utter.voice = best;
    }

    if (window.__pysiosaathi_utterances) {
      window.__pysiosaathi_utterances.add(utter);
    }

    utter.onstart = () => {
      startSpeechWatchdog();
      options.onStart?.();
    };

    utter.onend = () => {
      if (window.__pysiosaathi_utterances) {
        window.__pysiosaathi_utterances.delete(utter);
      }
      options.onEnd?.();
    };

    utter.onerror = (err) => {
      if (window.__pysiosaathi_utterances) {
        window.__pysiosaathi_utterances.delete(utter);
      }
      options.onError?.(err);
    };

    if (priority) {
      setTimeout(() => {
        try {
          synth.resume();
          synth.speak(utter);
        } catch {
          // ignore
        }
      }, 20);
    } else {
      synth.speak(utter);
    }
  } catch (err) {
    console.warn('[Speech] Announcement error:', err);
  }
}

/**
 * Cancel any ongoing speech announcement.
 */
export function cancelAnnouncement() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    window.__pysiosaathi_utterances?.clear();
  } catch {
    // ignore
  }
}

/**
 * Check if Speech Synthesis is supported in current environment.
 */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Check if Microphone Speech Recognition is supported in current browser.
 */
export function isMicSupported() {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Workout & Assistant Voice Command Recognizer using Web Speech Recognition.
 */
export function createSpeechRecognizer({
  onTranscript,
  onCommand,
  onStateChange,
  continuous = true,
  lang = 'en-US',
} = {}) {
  if (!isMicSupported()) {
    return {
      supported: false,
      start: () => {},
      stop: () => {},
      isListening: () => false,
    };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = continuous;
  recognition.interimResults = true;
  recognition.lang = lang;

  let listening = false;
  let manualStop = false;

  const parseWorkoutCommand = (text) => {
    const t = text.toLowerCase().trim();
    if (t.includes('pause') || t.includes('wait') || t.includes('hold on') || t.includes('ruko') || t.includes('ruk jao')) {
      return 'pause';
    }
    if (t.includes('resume') || t.includes('continue') || t.includes('start') || t.includes('shuru') || t.includes('chalo')) {
      return 'resume';
    }
    if (t.includes('finish') || t.includes('complete') || t.includes('done') || t.includes('stop session') || t.includes('khatam')) {
      return 'finish';
    }
    if (t.includes('rep') || t.includes('count') || t.includes('score') || t.includes('how many') || t.includes('kitna')) {
      return 'reps';
    }
    if (t.includes('voice off') || t.includes('mute') || t.includes('chup') || t.includes('quiet')) {
      return 'voice_off';
    }
    if (t.includes('voice on') || t.includes('unmute') || t.includes('speak') || t.includes('bol')) {
      return 'voice_on';
    }
    return null;
  };

  recognition.onstart = () => {
    listening = true;
    onStateChange?.(true);
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalTranscript += res[0].transcript;
      } else {
        interimTranscript += res[0].transcript;
      }
    }

    const currentText = (finalTranscript || interimTranscript).trim();
    if (currentText) {
      onTranscript?.(currentText, !!finalTranscript);
      const cmd = parseWorkoutCommand(currentText);
      if (cmd) {
        onCommand?.(cmd, currentText);
      }
    }
  };

  recognition.onerror = (err) => {
    if (err.error !== 'no-speech' && err.error !== 'aborted') {
      console.warn('[Mic] Recognition error:', err.error);
    }
    onStateChange?.(false, err.error);
  };

  recognition.onend = () => {
    listening = false;
    onStateChange?.(false);
    // Auto-restart in continuous workout mode unless stopped manually
    if (continuous && !manualStop) {
      setTimeout(() => {
        if (!manualStop) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      }, 400);
    }
  };

  return {
    supported: true,
    start: () => {
      manualStop = false;
      try {
        unlockAudio();
        recognition.start();
      } catch {
        // May already be running
      }
    },
    stop: () => {
      manualStop = true;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
    isListening: () => listening,
  };
}
