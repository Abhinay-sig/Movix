const DEFAULT_MOVIE_LANGUAGES = ['English'];

function toDisplayLanguage(value) {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeMovieLanguages(input, fallback = DEFAULT_MOVIE_LANGUAGES) {
  const values = Array.isArray(input)
    ? input
    : input
      ? [input]
      : [];

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const language = toDisplayLanguage(value);
    if (!language) continue;

    const key = language.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(language);
  }

  return normalized.length ? normalized : [...fallback];
}

function extractMovieLanguages(movie) {
  return normalizeMovieLanguages(
    Array.isArray(movie?.MovieLanguages)
      ? movie.MovieLanguages.map((row) => row.language)
      : [],
    DEFAULT_MOVIE_LANGUAGES
  );
}

function serializeMovieWithLanguages(movie) {
  const json = typeof movie?.toJSON === 'function' ? movie.toJSON() : movie;
  return {
    ...json,
    languages: extractMovieLanguages(movie),
  };
}

async function replaceMovieLanguages(db, movieId, languages, transaction) {
  const normalized = normalizeMovieLanguages(languages);

  await db.MovieLanguage.destroy({
    where: { movieId },
    transaction,
  });

  await db.MovieLanguage.bulkCreate(
    normalized.map((language) => ({
      movieId,
      language,
    })),
    { transaction }
  );

  return normalized;
}

module.exports = {
  DEFAULT_MOVIE_LANGUAGES,
  normalizeMovieLanguages,
  extractMovieLanguages,
  serializeMovieWithLanguages,
  replaceMovieLanguages,
};
