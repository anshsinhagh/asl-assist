// Speech-to-Text using ElevenLabs SDK
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

// Initialize ElevenLabs client
const elevenlabs = ELEVENLABS_API_KEY 
  ? new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY })
  : null;

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

/**
 * Initialize audio recording from microphone
 */
async function initAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (err) {
    console.error('Error accessing microphone:', err);
    throw new Error('Microphone access failed');
  }
}

/**
 * Start recording audio
 */
async function startRecording() {
  if (isRecording) {
    console.warn('Recording already in progress');
    return;
  }

  try {
    const stream = await initAudioRecording();
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.start();
    isRecording = true;
    console.log('Recording started');
  } catch (err) {
    console.error('Error starting recording:', err);
    throw err;
  }
}

/**
 * Stop recording and return audio blob
 */
function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || !isRecording) {
      reject(new Error('No recording in progress'));
      return;
    }

    mediaRecorder.onstop = () => {
      isRecording = false;
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log('Recording stopped, blob size:', audioBlob.size);
      resolve(audioBlob);
    };

    mediaRecorder.onerror = (event) => {
      isRecording = false;
      reject(new Error('Recording error: ' + event.error));
    };

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  });
}

/**
 * Convert speech to text using ElevenLabs API
 * @param {Blob} audioBlob - Audio blob to transcribe
 * @param {Object} options - Transcription options
 * @returns {Promise<string>} - Transcribed text
 */
async function speechToText(audioBlob, options = {}) {
  if (!elevenlabs) {
    throw new Error('ElevenLabs API key not configured. Set VITE_ELEVENLABS_API_KEY environment variable.');
  }

  try {
    const transcription = await elevenlabs.speechToText.convert({
      file: audioBlob,
      modelId: options.modelId || 'scribe_v2',
      tagAudioEvents: options.tagAudioEvents ?? true,
      languageCode: options.languageCode || null, // null = auto-detect
      diarize: options.diarize ?? false,
    });

    return transcription.text || '';
  } catch (err) {
    console.error('Error in speech-to-text conversion:', err);
    throw err;
  }
}

/**
 * Record audio and convert to text in one function
 * @param {number} durationMs - Duration to record in milliseconds (optional)
 * @param {Object} transcriptionOptions - Options for transcription
 * @returns {Promise<string|Object>} - Transcribed text or object with stop function
 */
async function recordAndTranscribe(durationMs = null, transcriptionOptions = {}) {
  await startRecording();
  
  if (durationMs) {
    // Auto-stop after duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    const audioBlob = await stopRecording();
    const text = await speechToText(audioBlob, transcriptionOptions);
    return text;
  } else {
    // Return the stop function so caller can stop manually
    return {
      stop: async () => {
        const audioBlob = await stopRecording();
        const text = await speechToText(audioBlob, transcriptionOptions);
        return text;
      }
    };
  }
}

// Export functions for use in other modules
export {
  startRecording,
  stopRecording,
  speechToText,
  recordAndTranscribe,
  initAudioRecording
};
