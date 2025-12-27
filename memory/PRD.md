# TechPro Academy - Education Platform PRD

## Original Problem Statement
Build an education platform providing training for different technologies (AWS, Python, DevOps, Kubernetes, AI with DevOps), resume preparation, interview preparation, job support using Java. The platform must contain a landing page with testimonials, login page, courses and their description, checkout page, and page to upload recordings.

## User Choices
- Payment: Stripe integration
- Authentication: Both JWT (email/password) and Google OAuth
- Storage: Local file storage (cloud-ready architecture)
- Admin Dashboard: Yes
- Design: Modern dark theme (Terminal Pro aesthetic)

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Stripe Checkout
- **Storage**: Local uploads (expandable to cloud)

## What's Been Implemented (Dec 2024)

### Backend
- User authentication (register, login, JWT tokens)
- Google OAuth via Emergent Auth
- Course CRUD operations
- Stripe payment checkout integration
- Payment status polling and webhook handling
- Enrollment management
- Recording upload/download (local storage)
- Testimonials management
- Admin stats and user management

### Frontend
- Landing page with hero, features, categories, testimonials
- Login/Register pages (JWT + Google)
- Course catalog with search/filter
- Course detail page with enrollment
- Stripe checkout flow
- User dashboard with enrolled courses
- Recording upload/download page
- Admin dashboard with courses, users, analytics tabs

## Credentials
- Admin: admin@techpro.com / admin123
- Stripe: sk_test_emergent (test key)

## Prioritized Backlog

### P0 (Critical)
- ✅ All core features implemented

### P1 (Important)
- Course progress tracking
- Video streaming instead of download
- Email notifications on enrollment

### P2 (Nice to have)
- Quiz/assessment system
- Discussion forums
- Certificate generation
- Cloud storage migration (S3)

## Next Tasks
1. Add course progress tracking
2. Implement certificate generation
3. Add email notifications
4. Consider video streaming solution
