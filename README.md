# ASL Assist 🤟

A real-time speech-to-ASL (American Sign Language) translation web application that converts spoken words into ASL sign images. Built for accessibility and communication assistance.

## 🌟 Features

- **Real-Time Speech Transcription**: Uses ElevenLabs API for accurate speech-to-text conversion
- **ASL Sign Language Display**: Automatically converts transcribed words into corresponding ASL sign images
- **Camera Integration**: Full-screen camera view with AR-style overlay
- **Text-to-Speech**: Convert text back to speech using ElevenLabs TTS
- **Random ASL Sequence**: Practice mode with random sign sequences
- **Mobile-Friendly**: Responsive design optimized for mobile devices
- **300+ Word Vocabulary**: Comprehensive mapping of common English words to ASL signs

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite
- **Speech-to-Text & TTS**: ElevenLabs API
- **Audio Processing**: Web Audio API
- **Media**: MediaDevices API (camera & microphone)

## 📁 Project Structure

```
asl-assist/
└── camera-test/
    ├── index.html              # Main HTML entry point
    ├── package.json            # Dependencies and scripts
    ├── vite.config.js          # Vite configuration
    ├── SIGN_IMAGES_SETUP.md    # Guide for sign images setup
    ├── public/
    │   └── signs/              # ASL sign language images
    ├── scripts/
    │   ├── downloadSigns.js         # Script to download sign images
    │   └── downloadSignsEnhanced.js # Enhanced image downloader
    └── src/
        ├── app.js              # Main application logic
        ├── speech.js           # Speech-to-text & TTS module
        ├── signMapping.js      # Word-to-ASL image mappings
        ├── styles.css          # Application styles
        └── .env                # Environment variables (not committed)
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- ElevenLabs API key ([Get one here](https://elevenlabs.io/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/asl-assist.git
   cd asl-assist/camera-test
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `camera-test/src/` directory:
   ```env
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

4. **Add ASL sign images**
   
   Place your ASL sign images in `public/signs/` directory. See [SIGN_IMAGES_SETUP.md](camera-test/SIGN_IMAGES_SETUP.md) for detailed instructions.

   Or use the download scripts:
   ```bash
   npm run download-signs
   # or
   npm run download-signs-enhanced
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
npm run preview  # Preview the production build
```

## 📖 Usage

1. **Start the Camera**: Click the "Start Camera" button to enable video feed
2. **Record Speech**: Click "Start Recording" to begin capturing audio
3. **View Translations**: Click "Stop & Transcribe" to convert speech to ASL signs
4. **Practice Mode**: Click "Random ASL Sequence" to display random sign combinations

## 🔧 Configuration

### Vite Configuration

The app is configured to:
- Run on all network interfaces (accessible from other devices)
- Use port 5173 by default
- Allow ngrok tunneling for external access

```javascript
// vite.config.js
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['your-ngrok-host.ngrok-free.dev'],
  },
})
```

### Adding New ASL Signs

1. Add the word-to-image mapping in `src/signMapping.js`:
   ```javascript
   export const signMapping = {
     "newword": "newword.png",
     // ...
   };
   ```

2. Place the corresponding image in `public/signs/newword.png`

## 📝 API Reference

### Speech Module (`speech.js`)

| Function | Description |
|----------|-------------|
| `startRecording()` | Begin audio recording from microphone |
| `stopRecording()` | Stop recording and return audio blob |
| `speechToText(blob, options)` | Convert audio to text using ElevenLabs |
| `textToSpeech(text, options)` | Convert text to speech audio |
| `speakText(text, options)` | Convert and play text as speech |
| `recordAndTranscribe(duration, options)` | Record and transcribe in one call |

### Sign Mapping Module (`signMapping.js`)

| Function | Description |
|----------|-------------|
| `getSignImagePath(word)` | Get image path for a single word |
| `textToSignImages(text)` | Convert text to array of sign image paths |

## 🎨 Supported Vocabulary

The app includes mappings for **300+ common words** including:

- **Pronouns**: I, you, he, she, they, we, etc.
- **Verbs**: go, come, see, know, think, want, need, etc.
- **Nouns**: time, person, home, food, family, etc.
- **Adjectives**: good, bad, big, small, happy, sad, etc.
- **Prepositions**: in, on, at, with, for, to, etc.
- **Numbers**: one through ten, hundred, thousand
- **Common phrases**: hello, goodbye, please, thank you, etc.

## 🔒 Security Notes

- Never commit your `.env` file with API keys
- The `.gitignore` is configured to exclude environment files
- Use environment variables for all sensitive data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io/) for speech-to-text and text-to-speech APIs
- ASL community for sign language resources
- [Vite](https://vitejs.dev/) for the blazing fast build tool

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Made with ❤️ for the deaf and hard-of-hearing community
