# Sign Language Images Setup

## Where to Place Images

Place all your sign language images in the `public/signs/` directory.

### Directory Structure:
```
camera-test/
├── public/
│   └── signs/
│       ├── a.png
│       ├── the.png
│       ├── hello.png
│       ├── thank.png
│       └── ... (all other sign images)
```

## Image Naming

Each image should be named exactly as specified in `src/signMapping.js`. For example:
- `a.png` for the word "a"
- `hello.png` for the word "hello"
- `thank.png` for the word "thank"

## Current Mapping

The mapping includes **~300 common words** covering:
- Pronouns (I, you, he, she, they, etc.)
- Common verbs (go, come, see, know, think, etc.)
- Common nouns (time, person, home, food, etc.)
- Adjectives (good, bad, big, small, etc.)
- Prepositions (in, on, at, with, etc.)
- Numbers (one through ten, hundred, thousand)
- Common phrases (hello, thank you, please, etc.)

## Adding New Words

To add more words to the mapping, edit `src/signMapping.js` and add entries like:
```javascript
"yourword": "yourword.png",
```

Then add the corresponding image file to `public/signs/yourword.png`.

## Testing

1. Make sure images are in `public/signs/` directory
2. Run `npm run dev`
3. Speak into the microphone
4. The transcribed words will be converted to sign language images automatically

## Notes

- Images should be in PNG format (or update the mapping to use other formats)
- If an image is missing, the word will be shown as text instead
- Words not in the mapping will be listed below the sign images
