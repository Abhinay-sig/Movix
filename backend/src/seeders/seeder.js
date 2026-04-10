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
    description: 'Sci-fi thriller',
    durationMins: 148,
    posterUrl: 'https://via.placeholder.com/300x450',
    isActive: true,
  },
  {
    title: 'Love in Paris',
    genre: 'Romance',
    releaseDate: '2024-02-09',
    description: 'Romantic comedy',
    durationMins: 115,
    posterUrl: 'https://via.placeholder.com/300x450',
    isActive: true,
  },
  {
  title: 'Shadow Rebellion',
  genre: 'Action',
  releaseDate: '2024-03-15',
  description: 'An underground resistance fights against a dystopian regime.',
  durationMins: 130,
  posterUrl: 'https://via.placeholder.com/300x450?text=Shadow+Rebellion',
  isActive: true,
},
{
  title: 'Midnight Chase',
  genre: 'Thriller',
  releaseDate: '2024-04-05',
  description: 'A high-speed action thriller across international borders.',
  durationMins: 122,
  posterUrl: 'https://via.placeholder.com/300x450?text=Midnight+Chase',
  isActive: true,
},
{
  title: 'The Silent Ocean',
  genre: 'Adventure',
  releaseDate: '2024-05-10',
  description: 'A deep-sea expedition uncovers terrifying secrets.',
  durationMins: 140,
  posterUrl: 'https://via.placeholder.com/300x450?text=Silent+Ocean',
  isActive: true,
},
{
  title: 'Campus Diaries',
  genre: 'Drama',
  releaseDate: '2024-06-21',
  description: 'A coming-of-age story filled with friendship, love, and dreams.',
  durationMins: 105,
  posterUrl: 'https://via.placeholder.com/300x450?text=Campus+Diaries',
  isActive: true,
},
{
  title: 'Code of Destiny',
  genre: 'Tech Thriller',
  releaseDate: '2024-07-19',
  description: 'A genius hacker gets caught in a global cyber conspiracy.',
  durationMins: 135,
  posterUrl: 'https://via.placeholder.com/300x450?text=Code+of+Destiny',
  isActive: true,
},
{
  title: 'Haunted Manor',
  genre: 'Horror',
  releaseDate: '2024-08-16',
  description: 'A group of friends encounters supernatural forces in an abandoned mansion.',
  durationMins: 118,
  posterUrl: 'https://via.placeholder.com/300x450?text=Haunted+Manor',
  isActive: true,
},
{
  title: 'Rise of the Titans',
  genre: 'Fantasy',
  releaseDate: '2024-09-13',
  description: 'Ancient giants awaken and threaten humanity’s survival.',
  durationMins: 155,
  posterUrl: 'https://via.placeholder.com/300x450?text=Rise+of+Titans',
  isActive: true,
},
{
  title: 'Love & Lattes',
  genre: 'Romantic Drama',
  releaseDate: '2024-10-04',
  description: 'A barista and a writer find love in a cozy café.',
  durationMins: 98,
  posterUrl: 'https://via.placeholder.com/300x450?text=Love+%26+Lattes',
  isActive: true,
},
{
  title: 'The Final Verdict',
  genre: 'Courtroom Drama',
  releaseDate: '2024-11-08',
  description: 'A courtroom drama where nothing is as it seems.',
  durationMins: 125,
  posterUrl: 'https://via.placeholder.com/300x450?text=Final+Verdict',
  isActive: true,
},
{
  title: 'Galaxy Warriors',
  genre: 'Sci-Fi Action',
  releaseDate: '2024-12-20',
  description: 'An elite team defends the universe from alien invasions.',
  durationMins: 145,
  posterUrl: 'https://via.placeholder.com/300x450?text=Galaxy+Warriors',
  isActive: true,
}
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

    movies.push(movie);
  }

  return movies;
}

async function seedTheatersAndHalls(owner) {
  const [theater] = await db.Theater.findOrCreate({
    where: { name: 'Demo Theater' },
    defaults: {
      name: 'Demo Theater',
      address: 'Sample Address',
      city: 'Bangalore',
      ownerUserId: owner.id,
    },
  });

  const halls = [];

  for (let i = 1; i <= 2; i++) {
    const [hall] = await db.Hall.findOrCreate({
      where: { name: `Hall ${i}`, theaterId: theater.id },
      defaults: {
        name: `Hall ${i}`,
        theaterId: theater.id,
        isApproved: true,
      },
    });

    halls.push(hall);

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

  return { theater, halls };
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
