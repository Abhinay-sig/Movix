/**
 * Database Seeder for Movie Ticket Booking System
 *
 * This seeder creates comprehensive dummy data for testing and development.
 * It runs automatically on server startup and only seeds if data doesn't exist.
 * Uses findOrCreate to prevent duplicate entries on repeated runs.
 */

const { db } = require('../models');

const seederConfig = {
  shouldSeed: true, // Set to false to disable seeding
  forceReseed: false, // Set to true to clear and reseed all data (use with caution!)
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
  user2: {
    email: 'user2@moviebooking.com',
    name: 'Jane Smith',
    password: 'User@123456',
    role: db.USER_ROLES.USER,
  },
  user3: {
    email: 'user3@moviebooking.com',
    name: 'Bob Johnson',
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
    description: 'A mind-bending sci-fi thriller about time manipulation and parallel universes.',
    durationMins: 148,
    posterUrl: 'https://via.placeholder.com/300x450?text=Quantum+Paradox',
    isActive: true,
  },
  {
    title: 'Love in Paris',
    description: 'A romantic comedy about two strangers who meet in the City of Light.',
    durationMins: 115,
    posterUrl: 'https://via.placeholder.com/300x450?text=Love+in+Paris',
    isActive: true,
  },
  {
    title: 'Dark Shadows',
    description: 'A suspenseful thriller with unexpected twists at every turn.',
    durationMins: 132,
    posterUrl: 'https://via.placeholder.com/300x450?text=Dark+Shadows',
    isActive: true,
  },
  {
    title: 'The Last Journey',
    description: 'An epic adventure across continents and time.',
    durationMins: 165,
    posterUrl: 'https://via.placeholder.com/300x450?text=Last+Journey',
    isActive: true,
  },
  {
    title: 'Comedy Gold',
    description: 'A hilarious comedy that will keep you laughing throughout.',
    durationMins: 100,
    posterUrl: 'https://via.placeholder.com/300x450?text=Comedy+Gold',
    isActive: true,
  },
];

// ============================================================================
// THEATERS & HALLS
// ============================================================================

const SEED_THEATERS = [
  {
    name: 'Silver Screen Metropolis',
    address: '123 Main Street',
    city: 'New York',
  },
  {
    name: 'Cineplex Downtown',
    address: '456 Park Avenue',
    city: 'Los Angeles',
  },
];

const SEED_HALLS = [
  {
    name: 'Hall 1 - IMAX',
  },
  {
    name: 'Hall 2 - Premium',
  },
  {
    name: 'Hall 3 - Standard',
  },
  {
    name: 'Hall 1 - Classic',
  },
  {
    name: 'Hall 2 - Deluxe',
  },
];

// ============================================================================
// HALL LAYOUTS (50 rows x 80 columns)
// ============================================================================

/**
 * Create a simple hall layout with segments
 * Returns segments array where each row has [start, end] pairs for seat ranges
 */
function createSimpleHallLayout(rows = 50, cols = 80) {
  const segments = [];
  // Simple layout: all seats in each row from 0 to cols-1
  for (let i = 0; i < rows; i++) {
    segments.push([0, cols - 1]);
  }
  return segments;
}

/**
 * Create typed segments for seat allocation
 * Different sections have different seat types
 */
function createTypedSegments(rows = 50, cols = 80) {
  const typedSegments = [];

  for (let i = 0; i < rows; i++) {
    const row = [];

    // First 20 seats: STANDARD
    row.push({ start: 0, end: 19, type: db.SEAT_TYPES.STANDARD });

    // Next 20 seats: PREMIUM
    row.push({ start: 20, end: 39, type: db.SEAT_TYPES.PREMIUM });

    // Next 20 seats: RECLINER
    row.push({ start: 40, end: 59, type: db.SEAT_TYPES.RECLINER });

    // Last 20 seats: VIP
    row.push({ start: 60, end: 79, type: db.SEAT_TYPES.VIP });

    typedSegments.push(row);
  }

  return typedSegments;
}

// ============================================================================
// SHOWS & SHOW SEAT PRICES
// ============================================================================

/**
 * Create shows at different times
 */
function createShowTimes() {
  const shows = [];
  const now = new Date();

  // Create shows across different times
  const timeSlots = ['10:00', '13:30', '16:30', '19:30', '22:00'];
  const movieIds = [1, 2, 3, 4, 5];
  const hallIds = [1, 2, 3];

  // Generate shows for next 30 days
  for (let day = 1; day <= 30; day++) {
    const showDate = new Date(now);
    showDate.setDate(showDate.getDate() + day);

    timeSlots.forEach((time, timeIdx) => {
      const [hours, mins] = time.split(':').map(Number);
      const startsAt = new Date(showDate);
      startsAt.setHours(hours, mins, 0, 0);

      const movieId = movieIds[day % movieIds.length];
      const movie = SEED_MOVIES[(movieId - 1) % SEED_MOVIES.length];

      const endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + movie.durationMins);

      const hallId = hallIds[(day + timeIdx) % hallIds.length];

      shows.push({
        hallId,
        movieId,
        startsAt,
        endsAt,
        language: ['English', 'Hindi', 'Spanish'][Math.floor(Math.random() * 3)],
        isApproved: true,
        approvedAt: new Date(),
        isBlocked: false,
        isCancelled: false,
      });
    });
  }

  return shows;
}

/**
 * Create seat prices for a show
 * Prices follow: Standard < Premium < Recliner < VIP
 */
function createShowSeatPrices(showId) {
  return [
    { showId, seatTypeId: 1, price: 200 }, // STANDARD
    { showId, seatTypeId: 2, price: 350 }, // PREMIUM
    { showId, seatTypeId: 3, price: 500 }, // RECLINER
    { showId, seatTypeId: 4, price: 700 }, // VIP
  ];
}

// ============================================================================
// BOOKINGS & BOOKING SEATS
// ============================================================================

/**
 * Create sample bookings for existing shows
 */
function createSampleBookings(showId, userId) {
  const seatCodes = [
    'A1',
    'A2',
    'B5',
    'B6',
    'C10',
    'C11',
    'D15',
    'D16',
    'E20',
    'E21',
  ];
  const randomSeats = seatCodes.slice(0, Math.floor(Math.random() * 3) + 2);

  return {
    showId,
    userId,
    status: db.BOOKING_STATUS.CONFIRMED,
    totalAmount: randomSeats.length * 250,
    seats: randomSeats,
  };
}

// ============================================================================
// SEEDER FUNCTIONS
// ============================================================================

async function seedUsers() {
  console.log('🌱 Seeding Users...');
  const users = {};

  for (const [key, userData] of Object.entries(SEED_USERS)) {
    const passwordHash = await db.User.hashPassword(userData.password);
    const [user] = await db.User.findOrCreate({
      where: { email: userData.email },
      defaults: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        isBlocked: false,
      },
    });
    users[key] = user;
    console.log(`  ✓ ${userData.role} user: ${userData.email}`);
  }

  return users;
}

async function seedMovies() {
  console.log('🌱 Seeding Movies...');
  const movies = [];

  for (const movieData of SEED_MOVIES) {
    const [movie] = await db.Movie.findOrCreate({
      where: { title: movieData.title },
      defaults: movieData,
    });
    movies.push(movie);
    console.log(`  ✓ Movie: ${movieData.title}`);
  }

  return movies;
}

async function seedTheatersAndHalls(owner1, owner2) {
  console.log('🌱 Seeding Theaters and Halls...');
  const theaters = [];

  // Theater 1 - Owner 1
  const [theater1] = await db.Theater.findOrCreate({
    where: { name: SEED_THEATERS[0].name },
    defaults: {
      ...SEED_THEATERS[0],
      ownerUserId: owner1.id,
      isBlocked: false,
    },
  });
  theaters.push(theater1);
  console.log(`  ✓ Theater: ${SEED_THEATERS[0].name}`);

  // Theater 2 - Owner 2
  const [theater2] = await db.Theater.findOrCreate({
    where: { name: SEED_THEATERS[1].name },
    defaults: {
      ...SEED_THEATERS[1],
      ownerUserId: owner2.id,
      isBlocked: false,
    },
  });
  theaters.push(theater2);
  console.log(`  ✓ Theater: ${SEED_THEATERS[1].name}`);

  // Create halls for theaters
  const halls = [];
  for (let t = 0; t < theaters.length; t++) {
    const theater = theaters[t];
    for (let h = 0; h < 3; h++) {
      const hallName = `${SEED_HALLS[h].name}`;
      const [hall] = await db.Hall.findOrCreate({
        where: { name: hallName, theaterId: theater.id },
        defaults: {
          name: hallName,
          theaterId: theater.id,
          isApproved: true,
          approvedAt: new Date(),
          isBlocked: false,
        },
      });
      halls.push(hall);
      console.log(`  ✓ Hall: ${theater.name} - ${hallName}`);

      // Create hall layout
      await db.HallLayout.findOrCreate({
        where: { hallId: hall.id },
        defaults: {
          hallId: hall.id,
          rows: 50,
          cols: 80,
          segmentsByRow: createSimpleHallLayout(50, 80),
          typedSegmentsByRow: createTypedSegments(50, 80),
        },
      });
      console.log(`    ✓ Layout: 50 rows × 80 cols with typed segments`);
    }
  }

  return { theaters, halls };
}

async function seedShows(halls, movies) {
  console.log('🌱 Seeding Shows...');
  const shows = createShowTimes();
  const createdShows = [];

  let showCount = 0;
  for (const showData of shows) {
    // Get valid hallId from our seeded halls
    const validHallId = halls[showData.hallId % halls.length].id;
    const validMovieId = movies[showData.movieId % movies.length].id;

    const [show] = await db.Show.findOrCreate({
      where: {
        hallId: validHallId,
        movieId: validMovieId,
        startsAt: showData.startsAt,
      },
      defaults: {
        ...showData,
        hallId: validHallId,
        movieId: validMovieId,
      },
    });
    createdShows.push(show);
    showCount++;
  }

  console.log(`  ✓ Created ${showCount} shows`);

  // Seed show seat prices
  let priceCount = 0;
  for (const show of createdShows.slice(0, 20)) {
    // Only for first 20 shows to keep data manageable
    const prices = createShowSeatPrices(show.id);
    for (const priceData of prices) {
      await db.ShowSeatPrice.findOrCreate({
        where: { showId: priceData.showId, seatTypeId: priceData.seatTypeId },
        defaults: priceData,
      });
      priceCount++;
    }
  }

  console.log(`  ✓ Created ${priceCount} seat price entries`);

  return createdShows;
}

async function seedBookings(shows, users) {
  console.log('🌱 Seeding Sample Bookings...');

  // Create a few sample bookings
  const sampleShows = shows.slice(5, 10); // Use shows 5-9
  const sampleUsers = [users.user1, users.user2, users.user3];

  let bookingCount = 0;
  for (let i = 0; i < sampleShows.length; i++) {
    const show = sampleShows[i];
    const user = sampleUsers[i % sampleUsers.length];

    const seatCodes = ['A1', 'A2', 'B5', 'B6'];
    const seatsToBook = seatCodes.slice(0, 2 + (i % 2));

    const [booking] = await db.Booking.findOrCreate({
      where: { showId: show.id, userId: user.id },
      defaults: {
        showId: show.id,
        userId: user.id,
        status: db.BOOKING_STATUS.CONFIRMED,
        totalAmount: seatsToBook.length * 250,
      },
    });

    // Create booking seats
    for (const seatCode of seatsToBook) {
      await db.BookingSeat.findOrCreate({
        where: { showId: show.id, seatCode },
        defaults: {
          bookingId: booking.id,
          showId: show.id,
          seatCode,
          seatTypeId: 1, // STANDARD
          price: 200,
        },
      });
    }

    bookingCount++;
  }

  console.log(`  ✓ Created ${bookingCount} bookings with seats`);
}

// ============================================================================
// MAIN SEEDER FUNCTION
// ============================================================================

async function seedDatabase() {
  if (!seederConfig.shouldSeed) {
    console.log('ℹ️  Database seeding is disabled');
    return;
  }

  try {
    console.log('\n📦 Starting Database Seeding...\n');

    // Force reseed if enabled (use with caution)
    if (seederConfig.forceReseed) {
      console.log('⚠️  FORCE RESEED ENABLED - Clearing tables...');
      await db.sequelize.truncate({ cascade: true });
      console.log('✓ Database cleared\n');
    }

    // Check if data already exists
    const userCount = await db.User.count();
    if (userCount > 0 && !seederConfig.forceReseed) {
      console.log('ℹ️  Database already contains data. Skipping seed.');
      console.log(
        '   Set forceReseed: true in seedConfig to override.\n'
      );
      return;
    }

    // Execute seeding in order
    const users = await seedUsers();
    const movies = await seedMovies();
    const { theaters, halls } = await seedTheatersAndHalls(users.owner1, users.owner2);
    const shows = await seedShows(halls, movies);
    await seedBookings(shows, users);

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('Sample Credentials:');
    console.log('  Admin:         admin@moviebooking.com / Admin@123456');
    console.log('  Owner 1:       owner1@moviebooking.com / Owner@123456');
    console.log('  Owner 2:       owner2@moviebooking.com / Owner@123456');
    console.log('  User 1:        user1@moviebooking.com / User@123456');
    console.log('  User 2:        user2@moviebooking.com / User@123456');
    console.log('  User 3:        user3@moviebooking.com / User@123456\n');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
}

module.exports = { seedDatabase };
