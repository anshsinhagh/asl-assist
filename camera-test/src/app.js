// Import speech-to-text functions
import { 
  startRecording, 
  stopRecording, 
  speechToText, 
  recordAndTranscribe,
  speakText
} from './speech.js';

// Import sign language mapping
import { 
  textToSignImages, 
  SIGN_IMAGE_BASE_PATH,
  getRandomWords,
  getSignImagePath
} from './signMapping.js';

const video = document.getElementById("camera");
const startBtn = document.getElementById("start");
const speechControls = document.getElementById("speech-controls");
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const randomSignsBtn = document.getElementById("random-signs-btn");
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
    transcriptionDiv.innerHTML = "";
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
      displaySignLanguage(text);
    } else {
      transcriptionDiv.innerHTML = "<p>No speech detected or transcription failed.</p>";
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

// Function to display sign language images
function displaySignLanguage(text) {
  const signData = textToSignImages(text);
  
  // Clear previous content
  transcriptionDiv.innerHTML = "";
  
  // Create container for sign images
  const signContainer = document.createElement("div");
  signContainer.className = "sign-container";
  
  let foundSigns = 0;
  let missingWords = [];
  
  signData.forEach(({ word, imagePath }) => {
    if (imagePath) {
      // Create image element for sign
      const img = document.createElement("img");
      img.src = imagePath;
      img.alt = word;
      img.className = "sign-image";
      img.title = word; // Show word on hover
      
      // Handle image load errors
      img.onerror = function() {
        this.style.display = "none";
        // Fallback: show word if image not found
        const fallback = document.createElement("span");
        fallback.className = "sign-fallback";
        fallback.textContent = word;
        signContainer.appendChild(fallback);
      };
      
      signContainer.appendChild(img);
      foundSigns++;
    } else {
      missingWords.push(word);
    }
  });
  
  // Add container to transcription div
  transcriptionDiv.appendChild(signContainer);
  
  // Show missing words if any (for debugging/feedback)
  if (missingWords.length > 0) {
    const missingDiv = document.createElement("div");
    missingDiv.className = "missing-words";
    missingDiv.innerHTML = `<small>Words not in mapping: ${missingWords.join(", ")}</small>`;
    transcriptionDiv.appendChild(missingDiv);
  }
  
  // Show the transcription area
  transcriptionDiv.classList.remove("hidden");
  
  console.log(`Displayed ${foundSigns} signs, ${missingWords.length} words not mapped`);
}

// Function to generate and display random ASL sequence
async function handleRandomSignSequence() {
  try {
    // Disable button while processing
    randomSignsBtn.disabled = true;
    randomSignsBtn.textContent = "Generating...";
    
    // Get random words (5-8 words)
    const wordCount = Math.floor(Math.random() * 4) + 5; // 5-8 words
    const randomWords = getRandomWords(wordCount);
    
    console.log('Random words:', randomWords);
    
    // Build text from words
    const text = randomWords.join(' ');
    
    // Display the sign images
    displaySignLanguage(text);
    
    // Convert to speech and play
    try {
      await speakText(text);
      console.log('Finished speaking random sequence');
    } catch (err) {
      console.error('Error speaking text:', err);
      alert('Failed to generate speech: ' + err.message);
    }
    
    // Re-enable button
    randomSignsBtn.disabled = false;
    randomSignsBtn.textContent = "Random ASL Sequence";
  } catch (err) {
    console.error('Error generating random sequence:', err);
    alert('Failed to generate random sequence: ' + err.message);
    randomSignsBtn.disabled = false;
    randomSignsBtn.textContent = "Random ASL Sequence";
  }
}

// Wire up button event listeners
recordBtn.addEventListener("click", handleStartRecording);
stopBtn.addEventListener("click", handleStopAndTranscribe);
randomSignsBtn.addEventListener("click", handleRandomSignSequence);