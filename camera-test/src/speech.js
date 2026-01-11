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

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @returns {Promise<Blob>} - Audio blob
 */
async function textToSpeech(text, options = {}) {
  if (!elevenlabs) {
    throw new Error('ElevenLabs API key not configured. Set VITE_ELEVENLABS_API_KEY environment variable.');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    // Use ElevenLabs text-to-speech API
    // The convert method returns a stream, we need to convert it to a blob
    const audioStream = await elevenlabs.textToSpeech.convert(
      options.voiceId || "21m00Tcm4TlvDq8ikWAM", // Default voice (Rachel)
      {
        text: text,
        model_id: options.modelId || "eleven_monolingual_v1",
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0.0,
          use_speaker_boost: options.useSpeakerBoost ?? true
        }
      }
    );

    // Convert stream to blob
    const chunks = [];
    const reader = audioStream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks into a single Uint8Array, then create blob
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([combined], { type: 'audio/mpeg' });
  } catch (err) {
    console.error('Error in text-to-speech conversion:', err);
    throw err;
  }
}

/**
 * Play audio blob in the browser
 * @param {Blob} audioBlob - Audio blob to play
 */
function playAudio(audioBlob) {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    
    audio.onerror = (err) => {
      URL.revokeObjectURL(audioUrl);
      reject(err);
    };
    
    audio.play().catch(reject);
  });
}

/**
 * Convert text to speech and play it
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 */
async function speakText(text, options = {}) {
  try {
    const audioBlob = await textToSpeech(text, options);
    await playAudio(audioBlob);
  } catch (err) {
    console.error('Error speaking text:', err);
    throw err;
  }
}

// Export functions for use in other modules
export {
  startRecording,
  stopRecording,
  speechToText,
  recordAndTranscribe,
  initAudioRecording,
  textToSpeech,
  playAudio,
  speakText
};
