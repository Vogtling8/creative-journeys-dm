// netlify/functions/tts.js
// Text-to-speech proxy — supports ElevenLabs (premium) or Web Speech fallback signal

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  const elevenKey = process.env.ELEVENLABS_API_KEY;

  // If no ElevenLabs key, signal client to use Web Speech API
  if (!elevenKey) {
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ useBrowserTTS: true })
    };
  }

  const { text, voiceId = "21m00Tcm4TlvDq8ikWAM", stability = 0.5, similarity = 0.75 } = JSON.parse(event.body);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability, similarity_boost: similarity }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 500, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ error: err }) };
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64, mimeType: "audio/mpeg" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message, useBrowserTTS: true })
    };
  }
};
