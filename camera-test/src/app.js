// Import speech-to-text functions
import { 
  startRecording, 
  stopRecording, 
  speechToText, 
  recordAndTranscribe 
} from './speech.js';

const video = document.getElementById("camera");
const startBtn = document.getElementById("start");
const speechControls = document.getElementById("speech-controls");
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const transcriptionDiv = document.getElementById("transcription");

let recordingController = null;

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = stream;
    startBtn.classList.add("hidden");
    // Show speech controls after camera starts
    speechControls.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Camera access failed");
  }
}

startBtn.addEventListener("click", startCamera);

// Function calls from speech.js module
async function handleStartRecording() {
  try {
    recordingController = await recordAndTranscribe();
    console.log('Speech recording started');
    
    // Update UI
    recordBtn.classList.add("hidden");
    recordBtn.classList.add("recording");
    stopBtn.classList.remove("hidden");
    transcriptionDiv.classList.add("hidden");
    transcriptionDiv.textContent = "";
  } catch (err) {
    console.error('Failed to start recording:', err);
    alert('Failed to start audio recording: ' + err.message);
  }
}

async function handleStopAndTranscribe() {
  try {
    if (!recordingController) {
      console.warn('No recording in progress');
      return;
    }
    
    // Show loading state
    stopBtn.textContent = "Transcribing...";
    stopBtn.disabled = true;
    
    const text = await recordingController.stop();
    console.log('Transcribed text:', text);
    
    // Update UI
    recordBtn.classList.remove("hidden");
    recordBtn.classList.remove("recording");
    stopBtn.classList.add("hidden");
    stopBtn.textContent = "Stop & Transcribe";
    stopBtn.disabled = false;
    
    if (text) {
      transcriptionDiv.textContent = text;
      transcriptionDiv.classList.remove("hidden");
    } else {
      transcriptionDiv.textContent = "No speech detected or transcription failed.";
      transcriptionDiv.classList.remove("hidden");
    }
    
    recordingController = null;
  } catch (err) {
    console.error('Failed to transcribe:', err);
    alert('Failed to transcribe audio: ' + err.message);
    
    // Reset UI on error
    recordBtn.classList.remove("hidden");
    recordBtn.classList.remove("recording");
    stopBtn.classList.add("hidden");
    stopBtn.textContent = "Stop & Transcribe";
    stopBtn.disabled = false;
    recordingController = null;
  }
}

// Wire up button event listeners
recordBtn.addEventListener("click", handleStartRecording);
stopBtn.addEventListener("click", handleStopAndTranscribe);
