// voiceAlert.ts
export function playVoiceAlert(message: string, lang: 'en' | 'ta') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // Stop any ongoing speech

  const utter = new window.SpeechSynthesisUtterance(message);
  const voices = window.speechSynthesis.getVoices();
  let voice: SpeechSynthesisVoice | undefined;
  if (lang === 'ta') {
    // Try all possible Tamil voices
    voice = voices.find(v => v.lang === 'ta-IN')
      || voices.find(v => v.lang.startsWith('ta'))
      || voices.find(v => v.lang === 'ta-LK');
    if (!voice) {
      // Fallback: try Google Translate TTS as a workaround (browser must allow audio)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(message)}&tl=ta&client=tw-ob`;
      const audio = new window.Audio(ttsUrl);
      audio.play().catch(() => {
        alert('Tamil voice is not supported in your browser/system.');
      });
      return;
    }
  } else {
    // English
    voice = voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'));
  }
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
    if (lang === 'ta') {
      alert('Tamil voice is not supported in your browser/system.');
    }
  }
  utter.rate = 1;
  utter.pitch = 1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

export function stopVoiceAlert() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
