# Movix - Digital Movie Ticketing Platform

Movix is an end-to-end digital movie ticketing and theater management platform. Designed to service both consumers and enterprise stakeholders, the system consists of a centralized Node.js backbone powering two separate React frontends: one for standard consumers (booking seats) and one for staff (theater owners managing inventory and admins governing the platform). The application supports fully dynamic hall layout configurations, multi-tier seat pricing, real-time concurrent booking prevention via WebSockets, premium "Pro" memberships, and integrated payment processing.

## Tech Stack

### Backend (`/backend`)
*   **Runtime & Framework:** Node.js, Express.js (v5.2.1)
*   **Database:** MySQL with Sequelize ORM
*   **Authentication:** JSON Web Tokens (JWT) & bcryptjs
*   **Real-Time:** Socket.io for live seat-availability updates and temporary locking
*   **Payments:** Razorpay integration for tickets and memberships
*   **Utilities:** Zod (validation), Cloudinary & multer (media uploads), Nodemailer (emails), Day.js (dates)

### Frontend - User (`/frontend-user`)
*   **Core:** React 19 (Vite)
*   **Styling:** Tailwind CSS v4
*   **Real-Time Communication:** socket.io-client for live seat blocking

### Frontend - Staff (`/frontend-staff`)
*   **Core:** React 19 (Vite), React Router v7
*   **Styling & UI:** Tailwind CSS v4, Lucide React
*   **Data Visualization & Export:** Recharts (dashboards), jsPDF & jsPDF-AutoTable (revenue reports)
*   **Validation:** Zod

## User Roles & Permissions

*   **Standard User (`user`):** The primary consumer. Can browse movies, search available shows, participate in real-time seat selection, and purchase tickets via Razorpay.
*   **Pro User:** A premium tier of standard users who have purchased a 'Pro' membership. They gain access to a Pro dashboard, potential discounts, and earn/manage `Movix` loyalty coins.
*   **Theater Owner (`theater_owner`):** Venue partners. They access the staff portal to register their theaters, utilize the layout-building engine to create hall seat maps, schedule movie showings, and view localized revenue data. (Requires Admin approval).
*   **Administrator (`admin`):** Top-level managers. They oversee the master catalog of movies, define global seat types (e.g., Standard, Premium, VIP) and price caps, and handle the approval pipeline for newly created theaters, halls, and show schedules. They also have an overarching dashboard for system health and aggregate platform reporting.

## Key Features & Functionalities

*   **Real-Time Seat Booking Engine:** WebSockets (`socket.io`) prevent concurrent booking race conditions. Seats are temporarily locked during the checkout process and auto-expire if abandoned.
*   **Dynamic Hall Customization:** Theater owners can define physical spatial grids and assign structural seat layouts (`HallLayout`, `HallSeatCap`). 
*   **Complex Approval Pipelines:** A robust verification system where Admins review and approve/reject Theater Owner submissions (Theaters, Halls, Shows) via `AdminRejection` modeling.
*   **Advanced Pricing & Seat Tiers:** Granular pricing logic utilizing distinct seat tiers and varying attributes, with top-level price caps governed by admins.
*   **Pro Memberships & Loyalty Coins:** Integrated reward system holding `MovixCoinTransaction`s to foster retention and continuous engagement.
*   **Analytics & Reporting:** Rich reporting dashboards utilizing Recharts constraints for revenue trends, theater-performance breakdowns, and downloadable PDF reports.

## Project Flow

1.  **Venue & Content Registration (Staff Flow):**
    *   Theater Owners register theaters and construct complex hall seat grids via the visual seating manager.
    *   Submissions enter a pending queue for Admins to review and approve.
    *   Admins manage the master Movie catalog and configure global seat/pricing rules.
    *   Owners schedule approved Halls with movies, pending one final admin verification.
2.  **Discovery & Selection (Consumer Flow):**
    *   Consumers browse upcoming shows on the User Frontend and select a movie & location to open an interactive hall map.
3.  **Real-Time Reservation:**
    *   Users select unassigned seats. The app dispatches a temporary seat hold using WebSockets to visually lock the seat against competitors.
4.  **Checkout & Fulfillment:**
    *   Users are forwarded to Razorpay for secure payment.
    *   Upon successful verification, the booking is recorded in MySQL, `MovixCoins` are appended to the user's wallet, and a digital receipt is emailed via Nodemailer.


