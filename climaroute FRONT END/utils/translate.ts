const cache: { [key: string]: string } = {};

export async function fetchAndCacheTranslation(text: string, target: "ta") {
  if (cache[text]) return cache[text];
  const res = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    body: JSON.stringify({
      q: text,
      source: "en",
      target,
      format: "text",
    }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  cache[text] = data.translatedText;
  return data.translatedText;
}
