# ERP System - Dummy for Testing

A simple ERP system with login and student management for testing your VPS deployment.

## Features

- **Login**: One seeded user (admin / admin123)
- **Dashboard**: View all students
- **Add Student**: Add new students with name, email, roll number, class
- **Delete Student**: Remove students from the system
- **Data Persistence**: PostgreSQL data persists across rebuilds via Docker volume

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Deployment

1. Navigate to the project directory:
   ```bash
   cd erp-system
   ```

2. Build and start all services:
   ```bash
   docker-compose up -d --build
   ```

3. Check if services are running:
   ```bash
   docker-compose ps
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Stopping Services

```bash
docker-compose down
```

## Important: Data Persistence

The PostgreSQL data is stored in a named Docker volume called `postgres_data`. This means:

- ✓ Data stays when you stop containers: `docker-compose stop`
- ✓ Data stays when you remove containers: `docker-compose down`
- ✗ Data WILL BE LOST if you run: `docker-compose down -v`

To rebuild without losing data:
```bash
docker-compose up -d --build
```

To completely reset (delete all data):
```bash
docker-compose down -v
```

## Troubleshooting

### Check logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs postgres
```

### Restart a service
```bash
docker-compose restart backend
```

### Reset everything
```bash
docker-compose down -v
docker-compose up -d --build
```

## Project Structure

```
erp-system/
├── docker-compose.yml    # Main Docker configuration
├── backend/
│   ├── Dockerfile
│   ├── server.js        # Express API server
│   └── package.json
└── frontend/
    ├── Dockerfile
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── App.js
        └── App.css
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|-----------|-------------|------|
| POST | /api/auth/login | Login user | No |
| GET | /api/students | Get all students | Yes |
| POST | /api/students | Add student | Yes |
| DELETE | /api/students/:id | Delete student | Yes |
| GET | /api/health | Health check | No |
