# Trust App - React Native Expo + Laravel + PostgreSQL

A full-stack mobile application with React Native Expo frontend and Laravel backend.
The purpose of this application is to determine how individuals manage currency in a game
designed to test the trust of the player in an opponent based on limited information.
The game is designed to give the users the option to either "invest" an amount of money
or "cash out" and steal the investment of both players.

The game aims to

- gather data on individuals and their management of an ingame currency
- create and update personality profiles about users based on the OCEAN personality model

The app also provides a data tab that displays useful data on the behavior of the players.
This data aims to visualise the player's decisions during games, as well as how their personality
influences choices.

# Setup Instructions

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Docker Desktop** (v20.10 or higher)
  - Download: https://www.docker.com/products/docker-desktop
  - Includes Docker and Docker Compose
- **Node.js** (v18 or higher)
  - Download: https://nodejs.org/
- **npm** or **yarn**
- **Expo CLI** (will be installed via npx)
- **Expo Go app** on your mobile device (optional, for testing on physical device)
  - iOS: https://apps.apple.com/app/expo-go/id982107779
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <https://github.com/EHB-MCT/wdm-LucaLattuca>
cd <wdm-LucaLattuca>
```

### 2. Project Structure

Ensure your project structure looks like this:

```
project-root/
├── backend/                 # Laravel application
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── public/
│   ├── composer.json
│   ├── artisan
│   ├── .env
│   └── Dockerfile
├── frontend/               # React Native Expo application
│   ├── app/
│   ├── assets/
│   ├── config/
│   │   └── api.js
│   ├── package.json
│   └── app.json
├── docker/
│   └── nginx/
│       └── nginx.conf
├── docker-compose.yml
└── README.md
```

### 3. Backend Setup (Docker)

#### Step 3.1: Place Docker Files

Copy the provided files to their correct locations:

1. **`Dockerfile`** → Place in `backend/Dockerfile`
2. **`docker-compose.yml`** → Place in project root
3. **`nginx.conf`** → Place in `docker/nginx/nginx.conf`
4. **`.dockerignore`** → Place in `backend/.dockerignore`

#### Step 3.2: Configure Environment

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create/update your `.env` file with Docker settings:

```bash
cp .env.example .env
```

3. Update the following values in `backend/.env`:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=db                    # This is the Docker service name
DB_PORT=5432
DB_DATABASE=trust
DB_USERNAME=postgres
DB_PASSWORD=1qa2ws3ed4rf

# For local development
SANCTUM_STATEFUL_DOMAINS=localhost:8081,127.0.0.1:8081
SESSION_DOMAIN=null
```

#### Step 3.3: Start Docker Containers

From the project root:

```bash
# Build and start all containers
docker-compose up -d --build

# Check if containers are running
docker-compose ps
```

You should see these containers running:

- `trust_db` (PostgreSQL)
- `trust_app` (Laravel PHP-FPM)
- `trust_nginx` (Nginx web server)
- `trust_queue` (Queue worker)

#### Step 3.4: Initialize Laravel Application

Run these commands to set up Laravel:

```bash
# Generate application key (if not already set)
docker-compose exec app php artisan key:generate

# Run database migrations
docker-compose exec app php artisan migrate

# (Optional) Seed database with sample data
docker-compose exec app php artisan db:seed

# Clear and cache configuration
docker-compose exec app php artisan config:cache
docker-compose exec app php artisan route:cache
```

#### Step 3.5: Verify Backend is Running

Open your browser and visit:

- **API Base URL**: http://localhost:8000
- You should see the Laravel welcome page or your API response

### 4. Frontend Setup (Expo)

#### Step 4.1: Install Dependencies

```bash
cd frontend
npm install
```

#### Step 4.2: Configure API Connection

1. Create the config directory if it doesn't exist:

```bash
mkdir -p config
```

2. Place the `api.js` file in `frontend/config/api.js`

3. **IMPORTANT**: Update the API URL based on how you're running the app:

**For iOS Simulator:**

```javascript
// frontend/config/api.js
export const API_URL = "http://localhost:8000";
```

**For Android Emulator:**

```javascript
// frontend/config/api.js
export const API_URL = "http://10.0.2.2:8000";
```

**For Physical Device (Expo Go):**

```javascript
// frontend/config/api.js
// Replace with your computer's local IP address
export const API_URL = "http://192.168.1.100:8000"; // Example IP
```

To find your local IP:

- **macOS/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows**: `ipconfig` and look for IPv4 Address

#### Step 4.3: Start Expo Development Server

```bash
npm start
# or
npx expo start
```

This will start the Expo development server and show a QR code.

#### Step 4.4: Run the App

Choose one of the following options:

**Option 1: Physical Device (Recommended for testing)**

1. Install Expo Go app on your phone
2. Scan the QR code with:
   - iPhone: Camera app
   - Android: Expo Go app
3. Make sure your phone is on the same WiFi network as your computer

**Option 2: iOS Simulator (macOS only)**

- Press `i` in the terminal where Expo is running
- Requires Xcode to be installed

**Option 3: Android Emulator**

- Press `a` in the terminal where Expo is running
- Requires Android Studio and an emulator to be set up

**Option 4: Web Browser**

- Press `w` in the terminal where Expo is running
- Opens in your default browser

## 🔧 Common Issues & Troubleshooting

### Backend Issues

**Issue: "Connection refused" when accessing http://localhost:8000**

```bash
# Check if containers are running
docker-compose ps

# Check container logs
docker-compose logs app
docker-compose logs nginx

# Restart containers
docker-compose restart
```

**Issue: Database connection errors**

```bash
# Check database logs
docker-compose logs db

# Verify database is ready
docker-compose exec db pg_isready -U postgres

# Re-run migrations
docker-compose exec app php artisan migrate:fresh
```

**Issue: Permission errors in Laravel**

```bash
# Fix storage permissions
docker-compose exec app chmod -R 775 storage bootstrap/cache
docker-compose exec app chown -R www-data:www-data storage bootstrap/cache
```

### Frontend Issues

**Issue: Cannot connect to backend API**

1. Verify backend is running: `curl http://localhost:8000`
2. Check API_URL in `frontend/config/api.js` matches your setup
3. For physical devices, ensure you're using your computer's local IP, not localhost
4. Ensure phone and computer are on the same WiFi network

**Issue: "Network request failed"**

- Update `API_URL` in `config/api.js` with your actual local IP
- Disable any VPN or firewall that might block connections
- Check that port 8000 is not blocked

**Issue: Expo Go won't scan QR code**

- Make sure you're on the same WiFi network
- Try typing the URL manually in Expo Go
- Restart the Expo development server

## 📝 Useful Commands

### Docker Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f app
docker-compose logs -f db

# Rebuild containers (after Dockerfile changes)
docker-compose up -d --build

# Access Laravel container shell
docker-compose exec app sh

# Access database shell
docker-compose exec db psql -U postgres -d trust

# Remove all containers and volumes (fresh start)
docker-compose down -v
```

### Laravel Commands (via Docker)

```bash
# Run artisan commands
docker-compose exec app php artisan <command>

# Examples:
docker-compose exec app php artisan migrate
docker-compose exec app php artisan db:seed
docker-compose exec app php artisan tinker
docker-compose exec app php artisan route:list
docker-compose exec app php artisan cache:clear
docker-compose exec app php artisan config:clear

# Run Composer commands
docker-compose exec app composer install
docker-compose exec app composer update
```

### Expo Commands

```bash
# Start development server
npm start

# Start with cache cleared
npm start -- --clear

# Run specific platform
npm run ios
npm run android
npm run web

# Check for issues
npx expo-doctor
```

## 🔐 Environment Variables

### Backend (.env)

Key variables to configure:

- `APP_URL` - Your application URL (http://localhost:8000)
- `DB_HOST` - Database host (use 'db' for Docker)
- `DB_DATABASE` - Database name
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password

### Frontend (config/api.js)

- `API_URL` - Backend API URL (update based on your setup)

## 📱 Testing the App

1. **Start Backend**: `docker-compose up -d`
2. **Verify Backend**: Visit http://localhost:8000
3. **Start Frontend**: `cd frontend && npm start`
4. **Open in Expo Go**: Scan QR code with your phone
5. **Test API Connection**: The app should be able to communicate with your Laravel backend

## 🛑 Stopping the Application

```bash
# Stop frontend
# Press Ctrl+C in the terminal running Expo

# Stop backend
docker-compose down
```

## 📦 Production Deployment

For production deployment, you'll need to:

1. Build the Expo app for iOS/Android
2. Deploy Laravel to a server (not using Docker Compose for production)
3. Set up a production database
4. Configure proper environment variables
5. Set up HTTPS/SSL certificates

This setup is for **local development only**.

If you encounter issues:

1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs`
3. Ensure all prerequisites are installed correctly
4. Verify your network configuration (especially for Expo Go on physical devices)

---

# Sources

Claude (sonnet 4.5) has been used throughout the development of this project for models, controllers, game simulators, creating the trust game... All chat links can be found at the **bottom** of the files.

While AI provided the code, all project architecture, system design, and integration decisions were reviewed
and implemented by me.
This approach allowed for faster prototyping while maintaining full control over the application's structure and behavior.
