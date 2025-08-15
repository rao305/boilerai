#!/bin/bash

# Database migration script for Purdue Auth Service
# This script handles database migrations safely in all environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Parse environment
NODE_ENV=${NODE_ENV:-development}
log_info "Running migrations for environment: $NODE_ENV"

# Backup database in production
if [ "$NODE_ENV" = "production" ]; then
    log_warning "Running in production mode - creating backup first"
    
    # Create backup directory if it doesn't exist
    mkdir -p backups
    
    # Create backup filename with timestamp
    BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log_info "Creating database backup: $BACKUP_FILE"
    
    # Extract database connection details from DATABASE_URL
    # Expected format: postgresql://user:password@host:port/database
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Create backup
    PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        log_success "Backup created successfully: $BACKUP_FILE"
    else
        log_error "Backup failed - aborting migration"
        exit 1
    fi
fi

# Check database connectivity
log_info "Testing database connectivity..."
npx prisma db ping

if [ $? -ne 0 ]; then
    log_error "Cannot connect to database - aborting migration"
    exit 1
fi

# Show current migration status
log_info "Current migration status:"
npx prisma migrate status

# Run migrations
log_info "Applying database migrations..."

if [ "$NODE_ENV" = "production" ]; then
    # Production: use deploy command (no interactive prompts)
    npx prisma migrate deploy
else
    # Development: use dev command (can create new migrations)
    npx prisma migrate dev
fi

if [ $? -eq 0 ]; then
    log_success "Migrations completed successfully"
else
    log_error "Migration failed"
    
    if [ "$NODE_ENV" = "production" ] && [ -f "$BACKUP_FILE" ]; then
        log_warning "Migration failed in production. Backup is available at: $BACKUP_FILE"
        log_warning "To restore: PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    fi
    
    exit 1
fi

# Generate Prisma client
log_info "Generating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    log_success "Prisma client generated successfully"
else
    log_error "Failed to generate Prisma client"
    exit 1
fi

# Run seeds in development
if [ "$NODE_ENV" = "development" ]; then
    log_info "Running database seeds..."
    npx tsx scripts/seed.ts
    
    if [ $? -eq 0 ]; then
        log_success "Database seeded successfully"
    else
        log_warning "Seeding failed - continuing anyway"
    fi
fi

# Verify migration
log_info "Verifying database schema..."
npx prisma db ping

if [ $? -eq 0 ]; then
    log_success "Database verification passed"
else
    log_error "Database verification failed"
    exit 1
fi

# Show final status
log_info "Final migration status:"
npx prisma migrate status

# Print summary
echo ""
log_success "Migration process completed successfully!"
echo ""
log_info "Summary:"
log_info "- Environment: $NODE_ENV"
log_info "- Database: Connected and verified"

if [ "$NODE_ENV" = "production" ] && [ -f "$BACKUP_FILE" ]; then
    log_info "- Backup: $BACKUP_FILE"
fi

if [ "$NODE_ENV" = "development" ]; then
    log_info "- Test data: Seeded"
fi

echo ""
log_info "Next steps:"
log_info "1. Restart your application"
log_info "2. Run health checks"
log_info "3. Verify authentication flows"

if [ "$NODE_ENV" = "production" ]; then
    log_warning "Production deployment checklist:"
    log_warning "- Monitor application logs"
    log_warning "- Check authentication metrics"
    log_warning "- Verify user login functionality"
    log_warning "- Keep backup file until deployment is confirmed stable"
fi