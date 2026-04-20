/**
 * Database Seeder for Movie Ticket Booking System
 */

const { db } = require('../models');

const seederConfig = {
  shouldSeed: true,
  forceReseed: false, // ⚠️ set true only when needed
};

// ============================================================================
// USERS
// ============================================================================

const SEED_USERS = {
  admin: {
    email: 'admin@moviebooking.com',
    name: 'Admin User',
    password: 'Admin@123456',
    role: db.USER_ROLES.ADMIN,
  },
  owner1: {
    email: 'owner1@moviebooking.com',
    name: 'Theater Owner 1',
    password: 'Owner@123456',
    role: db.USER_ROLES.OWNER,
  },
  owner2: {
    email: 'owner2@moviebooking.com',
    name: 'Theater Owner 2',
    password: 'Owner@123456',
    role: db.USER_ROLES.OWNER,
  },
  user1: {
    email: 'user1@moviebooking.com',
    name: 'John Doe',
    password: 'User@123456',
    role: db.USER_ROLES.USER,
  },
};

// ============================================================================
// MOVIES
// ============================================================================

const SEED_MOVIES = [
  {
    title: 'The Quantum Paradox',
    genre: 'Sci-Fi',
    releaseDate: '2024-01-12',
    description: 'A time-fracture experiment leaves a physicist trapped between possible futures.',
    durationMins: 148,
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Love in Paris',
    genre: 'Romance',
    releaseDate: '2024-02-09',
    description: 'A travel photographer and a pastry chef rediscover love during a winter in Paris.',
    durationMins: 115,
    posterUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'French', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Shadow Rebellion',
    genre: 'Action',
    releaseDate: '2024-03-15',
    description: 'An underground resistance fights back after a city-wide surveillance coup.',
    durationMins: 130,
    posterUrl: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi', 'Tamil'],
    isActive: true,
  },
  {
    title: 'Midnight Chase',
    genre: 'Thriller',
    releaseDate: '2024-04-05',
    description: 'A suspended detective races through Europe to stop a midnight assassination.',
    durationMins: 122,
    posterUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'The Silent Ocean',
    genre: 'Adventure',
    releaseDate: '2024-05-10',
    description: 'A deep-sea mission uncovers a submerged civilization beneath arctic waters.',
    durationMins: 140,
    posterUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Malayalam'],
    isActive: true,
  },
  {
    title: 'Campus Diaries',
    genre: 'Drama',
    releaseDate: '2024-06-21',
    description: 'Four students navigate ambition, heartbreak, and friendship in their final year.',
    durationMins: 105,
    posterUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    languages: ['Hindi', 'English'],
    isActive: true,
  },
  {
    title: 'Code of Destiny',
    genre: 'Tech Thriller',
    releaseDate: '2024-07-19',
    description: 'A prodigy hacker uncovers a machine-learning system that predicts political assassinations.',
    durationMins: 135,
    posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi', 'Telugu'],
    isActive: true,
  },
  {
    title: 'Haunted Manor',
    genre: 'Horror',
    releaseDate: '2024-08-16',
    description: 'A weekend reunion inside an abandoned estate awakens a family curse.',
    durationMins: 118,
    posterUrl: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Rise of the Titans',
    genre: 'Fantasy',
    releaseDate: '2024-09-13',
    description: 'Ancient guardians emerge when a forgotten mountain kingdom is invaded.',
    durationMins: 155,
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi', 'Tamil'],
    isActive: true,
  },
  {
    title: 'Love & Lattes',
    genre: 'Romantic Drama',
    releaseDate: '2024-10-04',
    description: 'A barista and a novelist connect over unfinished letters and late-night coffee.',
    durationMins: 98,
    posterUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'The Final Verdict',
    genre: 'Courtroom Drama',
    releaseDate: '2024-11-08',
    description: 'A high-profile murder trial collapses when the defense reveals a hidden witness.',
    durationMins: 125,
    posterUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Galaxy Warriors',
    genre: 'Sci-Fi Action',
    releaseDate: '2024-12-20',
    description: 'An elite deep-space squad defends Earth from a collapsing star empire.',
    durationMins: 145,
    posterUrl: 'https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi', 'Telugu'],
    isActive: true,
  },
  {
    title: 'Neon Samurai',
    genre: 'Cyberpunk Action',
    releaseDate: '2025-01-17',
    description: 'A rogue bodyguard hunts a synthetic crime lord through a rain-lit megacity.',
    durationMins: 132,
    posterUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Japanese', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Monsoon Letters',
    genre: 'Romance',
    releaseDate: '2025-02-14',
    description: 'Two strangers in Mumbai exchange handwritten letters through a lost courier bag.',
    durationMins: 110,
    posterUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=600&q=80',
    languages: ['Hindi', 'Marathi', 'English'],
    isActive: true,
  },
  {
    title: 'Desert Crown',
    genre: 'Historical Epic',
    releaseDate: '2025-03-07',
    description: 'A reluctant prince leads a final stand to reclaim a desert kingdom.',
    durationMins: 162,
    posterUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    languages: ['Hindi', 'Tamil', 'Telugu'],
    isActive: true,
  },
  {
    title: 'Signal Lost',
    genre: 'Mystery Thriller',
    releaseDate: '2025-04-18',
    description: 'A vanished radio transmission leads a journalist to a town erased from maps.',
    durationMins: 124,
    posterUrl: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Runway 9',
    genre: 'Action Thriller',
    releaseDate: '2025-05-23',
    description: 'Passengers and crew fight to land a hijacked aircraft before fuel runs out.',
    durationMins: 119,
    posterUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi'],
    isActive: true,
  },
  {
    title: 'Paper Kingdom',
    genre: 'Family Fantasy',
    releaseDate: '2025-06-06',
    description: 'A child discovers an entire world hidden inside illustrated storybooks.',
    durationMins: 102,
    posterUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    languages: ['English', 'Hindi', 'Malayalam'],
    isActive: true,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function createSimpleHallLayout(rows = 10, cols = 10) {
  const segments = [];
  for (let i = 0; i < rows; i++) {
    segments.push([0, cols - 1]);
  }
  return segments;
}

function createTypedSegments(rows = 10, cols = 10) {
  const typed = [];
  for (let i = 0; i < rows; i++) {
    typed.push([
      { start: 0, end: 4, type: db.SEAT_TYPES.STANDARD },
      { start: 5, end: 7, type: db.SEAT_TYPES.PREMIUM },
      { start: 8, end: 9, type: db.SEAT_TYPES.VIP },
    ]);
  }
  return typed;
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================
// ============================================================================

async function seedUsers() {
  const users = {};

  for (const [key, u] of Object.entries(SEED_USERS)) {
    const passwordHash = await db.User.hashPassword(u.password);

    const [user] = await db.User.findOrCreate({
      where: { email: u.email },
      defaults: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });

    users[key] = user;
  }

  return users;
}

async function seedMovies() {
  const movies = [];

  for (const m of SEED_MOVIES) {
    const [movie] = await db.Movie.findOrCreate({
      where: { title: m.title },
      defaults: {
        ...m,
        releaseDate: m.releaseDate ?? null,
      },
    });

    await movie.update({
      genre: m.genre,
      releaseDate: m.releaseDate ?? null,
      description: m.description,
      durationMins: m.durationMins,
      posterUrl: m.posterUrl,
      isActive: m.isActive,
    });

    for (const language of m.languages || []) {
      // eslint-disable-next-line no-await-in-loop
      await db.MovieLanguage.findOrCreate({
        where: {
          movieId: movie.id,
          language,
        },
        defaults: {
          movieId: movie.id,
          language,
        },
      });
    }

    movies.push(movie);
  }

  return movies;
}

async function seedTheatersAndHalls(owner) {
  const halls = [];
  const theaterSeeds = [
    { name: 'Demo Theater', address: 'MG Road, Central Plaza', city: 'Bangalore' },
    { name: 'Skyline Cinemas', address: 'Bandra West, Linking Road', city: 'Mumbai' },
    { name: 'Riverfront Screens', address: 'Banjara Hills, Road No. 12', city: 'Hyderabad' },
  ];

  for (const theaterSeed of theaterSeeds) {
    // eslint-disable-next-line no-await-in-loop
    const [theater] = await db.Theater.findOrCreate({
      where: { name: theaterSeed.name },
      defaults: {
        ...theaterSeed,
        ownerUserId: owner.id,
      },
    });

    for (let i = 1; i <= 2; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const [hall] = await db.Hall.findOrCreate({
        where: { name: `Hall ${i}`, theaterId: theater.id },
        defaults: {
          name: `Hall ${i}`,
          theaterId: theater.id,
          isApproved: true,
        },
      });

      halls.push(hall);

      // eslint-disable-next-line no-await-in-loop
      await db.HallLayout.findOrCreate({
        where: { hallId: hall.id },
        defaults: {
          hallId: hall.id,
          rows: 10,
          cols: 10,
          segmentsByRow: createSimpleHallLayout(),
          typedSegmentsByRow: createTypedSegments(),
        },
      });
    }
  }

  return { halls };
}

function createShows(halls, movies) {
  const shows = [];
  const now = new Date();

  for (let i = 0; i < 5; i++) {
    const movie = movies[i % movies.length];
    const hall = halls[i % halls.length];

    const startsAt = new Date(now.getTime() + i * 3600000);
    const endsAt = new Date(startsAt.getTime() + movie.durationMins * 60000);

    shows.push({
      hallId: hall.id,
      movieId: movie.id,
      startsAt,
      endsAt,
      isApproved: true,
    });
  }

  return shows;
}

async function seedShows(halls, movies) {
  const showData = createShows(halls, movies);
  const shows = [];

  for (const s of showData) {
    const [show] = await db.Show.findOrCreate({
      where: {
        hallId: s.hallId,
        movieId: s.movieId,
        startsAt: s.startsAt,
      },
      defaults: s,
    });

    shows.push(show);
  }

  return shows;
}

// ============================================================================
// MAIN
// ============================================================================

async function seedDatabase() {
  if (!seederConfig.shouldSeed) return;

  try {
    console.log('🌱 Seeding started...');

    if (seederConfig.forceReseed) {
      await db.sequelize.truncate({ cascade: true, restartIdentity: true });
      console.log('⚠️ DB reset');
    }

    // Keep seeding idempotent with findOrCreate so newly added dummy content
    // is inserted on later runs without requiring a destructive reset.
    const users = await seedUsers();
    const movies = await seedMovies();
    const { halls } = await seedTheatersAndHalls(users.owner1);
    await seedShows(halls, movies);

    console.log('✅ Seeding completed');
  } catch (err) {
    console.error('❌ Seeder error:', err);
  }
}

module.exports = { seedDatabase };
