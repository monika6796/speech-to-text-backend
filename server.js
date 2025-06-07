const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // ✅ फाइल पढ़ने के लिए
const speech = require('@google-cloud/speech'); // ✅ Google Speech-to-Text
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// File upload setup using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Test route
app.get('/', (req, res) => {
  res.send('Speech-to-Text API is running!');
});

// ✅ Upload route (you can update this later if needed)
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const transcription = "Transcribed text will be here"; // Placeholder
    res.status(200).json({ message: 'Success', transcription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ✅ ✅ ✅ Updated /transcribe route (real transcription logic)
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const client = new speech.SpeechClient();
    const fileName = req.file.path;
    const file = fs.readFileSync(fileName);
    const audioBytes = file.toString('base64');

    const audio = { content: audioBytes };
    const config = {
      encoding: 'MP3',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    };

    const request = { audio, config };
    const [response] = await client.recognize(request);

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    // ✅ Supabase में insert
    const { data, error: insertError } = await supabase
      .from('transcriptions')
      .insert([
        {
          file_path: fileName,
          transcription: transcription,
        },
      ]);

    if (insertError) {
      console.error('❌ Supabase Insert Error:', insertError);
    } else {
      console.log("✅ Transcription saved to Supabase:", data);
    }

    res.json({ text: transcription });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at: http://localhost:${PORT}`);
});
