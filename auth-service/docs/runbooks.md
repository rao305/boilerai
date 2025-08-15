# Purdue Authentication Service - Operations Runbook

## Overview
This runbook provides step-by-step procedures for operating and maintaining the Purdue Authentication Service in production.

## Table of Contents
- [Emergency Procedures](#emergency-procedures)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Incident Response](#incident-response)
- [Maintenance Procedures](#maintenance-procedures)
- [Security Procedures](#security-procedures)
- [Troubleshooting](#troubleshooting)

## Emergency Procedures

### 🚨 Complete Service Outage

**Symptoms:**
- Health check failures
- 5xx errors across all endpoints
- Unable to authenticate users

**Immediate Actions:**
1. **Check service health**
   ```bash
   curl -f https://auth.purdue.edu/health
   ```

2. **Check dependencies**
   ```bash
   # Database connectivity
   docker exec auth-service npx prisma db ping
   
   # Redis connectivity
   docker exec auth-service redis-cli -u $REDIS_URL ping
   ```

3. **Check logs**
   ```bash
   docker logs auth-service --tail 100
   kubectl logs deployment/auth-service -n auth --tail 100
   ```

4. **Restart service if needed**
   ```bash
   # Docker
   docker-compose restart auth-service
   
   # Kubernetes
   kubectl rollout restart deployment/auth-service -n auth
   ```

5. **Enable magic link fallback if Microsoft is down**
   ```bash
   # Set environment variable
   export FALLBACK_MAGIC_LINK=true
   # Restart service
   docker-compose restart auth-service
   ```

### 🔥 Microsoft Entra ID Outage

**Symptoms:**
- SSO login failures
- Azure AD callback errors
- Users can't sign in via primary method

**Actions:**
1. **Verify Azure AD status**
   - Check [Azure Status Page](https://status.azure.com/)
   - Test direct OAuth flow: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`

2. **Enable magic link fallback**
   ```bash
   # Update environment
   FALLBACK_MAGIC_LINK=true
   
   # Restart service
   docker-compose restart auth-service
   ```

3. **Monitor magic link usage**
   ```bash
   # Check magic link metrics
   curl -s http://localhost:9090/metrics | grep magic_link
   ```

4. **Communicate to users**
   - Update status page
   - Enable maintenance banner with fallback instructions

### 🛡️ Security Breach Response

**Immediate Actions:**
1. **Isolate the system**
   ```bash
   # Block all traffic temporarily
   kubectl scale deployment/auth-service --replicas=0 -n auth
   ```

2. **Capture forensic data**
   ```bash
   # Export logs
   docker logs auth-service > incident-logs-$(date +%Y%m%d-%H%M%S).log
   
   # Export database audit trail
   npx prisma db execute --file scripts/export-audit.sql
   ```

3. **Rotate all secrets**
   - Azure AD client secret
   - Database passwords
   - Redis password
   - Session secrets
   - JWT signing keys

4. **Revoke all active sessions**
   ```sql
   -- Clear all sessions
   DELETE FROM "Session";
   DELETE FROM "MagicLink";
   
   -- Clear Redis sessions
   FLUSHDB
   ```

## Monitoring and Alerting

### Key Metrics to Monitor

#### Application Metrics
```promql
# Login success rate (should be > 95%)
rate(auth_login_successes_total[5m]) / rate(auth_login_attempts_total[5m])

# Average login duration (should be < 2s)
histogram_quantile(0.95, rate(auth_login_duration_seconds_bucket[5m]))

# Active sessions (monitor for unusual spikes)
auth_active_sessions

# Rate limit hits (should be minimal)
rate(auth_rate_limit_hits_total[5m])
```

#### System Metrics
```promql
# HTTP error rate (should be < 1%)
rate(http_requests_total{status_class="5xx"}[5m]) / rate(http_requests_total[5m])

# Database connection health (should be 1)
database_connected

# Redis connection health (should be 1)
redis_connected

# Response time p95 (should be < 500ms)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Alert Thresholds

#### Critical Alerts (Page immediately)
```yaml
- name: auth_service_down
  condition: up{job="auth-service"} == 0
  for: 1m

- name: high_error_rate
  condition: rate(http_requests_total{status_class="5xx"}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 2m

- name: database_down
  condition: database_connected == 0
  for: 30s

- name: redis_down
  condition: redis_connected == 0
  for: 30s
```

#### Warning Alerts (Investigate within hours)
```yaml
- name: high_login_latency
  condition: histogram_quantile(0.95, rate(auth_login_duration_seconds_bucket[5m])) > 5
  for: 5m

- name: low_login_success_rate
  condition: rate(auth_login_successes_total[5m]) / rate(auth_login_attempts_total[5m]) < 0.90
  for: 3m

- name: high_rate_limit_hits
  condition: rate(auth_rate_limit_hits_total[5m]) > 10
  for: 5m
```

## Incident Response

### Incident Classification

#### Severity 1 (Critical)
- Complete service outage
- Security breach
- Data integrity issues
- Response time: **5 minutes**

#### Severity 2 (High)
- Partial service degradation
- High error rates (>5%)
- Authentication delays >10s
- Response time: **15 minutes**

#### Severity 3 (Medium)
- Minor performance issues
- Non-critical feature failures
- Response time: **1 hour**

### Response Procedures

1. **Acknowledge incident**
   ```bash
   # Create incident channel
   slack-incident create --title "Auth Service Issue" --severity S1
   ```

2. **Gather initial information**
   - Error rates and affected users
   - Recent deployments or changes
   - External service status

3. **Implement immediate workarounds**
   - Route traffic to backup regions
   - Enable fallback authentication
   - Scale up resources

4. **Root cause analysis**
   - Analyze logs and metrics
   - Reproduce issue in staging
   - Identify contributing factors

5. **Permanent fix**
   - Implement proper solution
   - Test thoroughly
   - Deploy with rollback plan

6. **Post-incident review**
   - Document lessons learned
   - Update runbooks
   - Implement preventive measures

## Maintenance Procedures

### Planned Deployments

1. **Pre-deployment checklist**
   - [ ] Database migrations tested
   - [ ] Feature flags configured
   - [ ] Rollback plan documented
   - [ ] Monitoring alerts adjusted
   - [ ] Stakeholders notified

2. **Deployment steps**
   ```bash
   # 1. Deploy database migrations
   npx prisma migrate deploy
   
   # 2. Deploy application (blue-green)
   kubectl set image deployment/auth-service auth-service=auth:v2.0.0
   
   # 3. Monitor health during rollout
   kubectl rollout status deployment/auth-service
   
   # 4. Run smoke tests
   npm run test:smoke
   
   # 5. Update traffic routing
   kubectl patch service auth-service -p '{"spec":{"selector":{"version":"v2.0.0"}}}'
   ```

3. **Post-deployment verification**
   - Health checks passing
   - Login flows working
   - Metrics normal
   - Error rates low

### Database Maintenance

#### Weekly Tasks
```bash
# Update statistics
ANALYZE;

# Check for unused indexes
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0;

# Monitor connection usage
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

#### Monthly Tasks
```bash
# Vacuum analyze
VACUUM ANALYZE;

# Archive old audit logs (older than 1 year)
DELETE FROM "AuditLog" WHERE "createdAt" < NOW() - INTERVAL '1 year';

# Clean up expired sessions
DELETE FROM "Session" WHERE expires < NOW();

# Clean up expired magic links
DELETE FROM "MagicLink" WHERE expires < NOW();
```

## Security Procedures

### Key Rotation

#### Azure AD Client Secret (Every 90 days)
1. **Generate new secret in Azure portal**
2. **Update environment variables**
   ```bash
   # Update secret in secrets manager
   kubectl create secret generic azure-credentials \
     --from-literal=client-id=$AZURE_CLIENT_ID \
     --from-literal=client-secret=$NEW_SECRET \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
3. **Restart services**
4. **Verify authentication works**
5. **Remove old secret from Azure**

#### Database Passwords (Every 180 days)
1. **Create new password**
2. **Update connection strings**
3. **Test connectivity**
4. **Update secrets in all environments**

#### Session Secrets (Emergency rotation)
1. **Generate new secret**
   ```bash
   openssl rand -base64 32
   ```
2. **Update NEXTAUTH_SECRET**
3. **Restart all instances**
4. **All users will need to re-authenticate**

### Security Audit Procedures

#### Weekly Security Checks
```bash
# Check for suspicious login patterns
SELECT 
  "ipAddress",
  COUNT(*) as attempts,
  COUNT(CASE WHEN action = 'login_failed' THEN 1 END) as failures
FROM "AuditLog" 
WHERE "createdAt" > NOW() - INTERVAL '7 days'
  AND action LIKE 'login%'
GROUP BY "ipAddress"
HAVING COUNT(CASE WHEN action = 'login_failed' THEN 1 END) > 10
ORDER BY failures DESC;

# Check for rate limit violations
SELECT 
  "ipAddress",
  action,
  COUNT(*) as violations
FROM "AuditLog"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
  AND action = 'rate_limit_exceeded'
GROUP BY "ipAddress", action
ORDER BY violations DESC;
```

## Troubleshooting

### Common Issues

#### "Authentication Failed" Errors

**Potential Causes:**
- Azure AD configuration issues
- Network connectivity problems
- Clock synchronization issues
- Invalid certificates

**Debugging Steps:**
1. **Check Azure AD configuration**
   ```bash
   # Verify callback URLs match
   echo "Current callback: $DOMAIN/api/auth/callback/azure-ad"
   
   # Test OAuth endpoint
   curl -v "https://login.microsoftonline.com/$AZURE_TENANT_ID/v2.0/.well-known/openid_configuration"
   ```

2. **Check system time**
   ```bash
   # Time skew can cause JWT validation failures
   timedatectl status
   ntpq -p
   ```

3. **Verify certificates**
   ```bash
   # Check TLS certificates
   openssl s_client -connect login.microsoftonline.com:443 -servername login.microsoftonline.com
   ```

#### High Response Times

**Investigation Steps:**
1. **Check database performance**
   ```sql
   -- Find slow queries
   SELECT query, mean_exec_time, calls, total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Check Redis performance**
   ```bash
   # Monitor Redis operations
   redis-cli --latency
   redis-cli info stats
   ```

3. **Check application metrics**
   ```bash
   # Query Prometheus for slow endpoints
   curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,%20rate(http_request_duration_seconds_bucket[5m]))'
   ```

#### Memory Leaks

**Debugging Steps:**
1. **Monitor memory usage**
   ```bash
   # Application memory
   docker stats auth-service
   
   # Node.js heap usage
   curl http://localhost:3000/health/memory
   ```

2. **Generate heap dump**
   ```bash
   # Send SIGUSR2 to generate heap dump
   kill -USR2 $(pgrep node)
   ```

3. **Analyze with heap profiler**
   ```bash
   node --inspect=0.0.0.0:9229 dist/server.js
   ```

### Log Analysis

#### Key Log Patterns
```bash
# Authentication failures
grep "auth_failed" /var/log/auth-service/error.log | tail -20

# Rate limiting
grep "rate_limit_exceeded" /var/log/auth-service/access.log

# Database errors
grep "ECONNREFUSED\|timeout" /var/log/auth-service/error.log

# Security violations
grep "security_violation\|csrf_failure" /var/log/auth-service/security.log
```

#### Log Levels and Actions
- **ERROR**: Immediate investigation required
- **WARN**: Review within 24 hours
- **INFO**: Normal operations
- **DEBUG**: Development troubleshooting only

## Emergency Contacts

### Escalation Path
1. **On-call Engineer** (Primary response)
2. **Team Lead** (If no response in 15 minutes)
3. **Engineering Manager** (Severity 1 incidents)
4. **Security Team** (Security incidents)

### External Contacts
- **Microsoft Support**: For Azure AD issues
- **DNS Provider**: For domain/SSL issues
- **Email Provider**: For magic link delivery issues

## Recovery Time Objectives (RTO)

- **Critical Issues (S1)**: 15 minutes
- **High Impact (S2)**: 1 hour
- **Medium Impact (S3)**: 4 hours
- **Low Impact (S4)**: Next business day

## Data Backup and Recovery

### Backup Schedule
- **Database**: Continuous streaming replication + daily snapshots
- **Redis**: Daily snapshots (non-critical data)
- **Configuration**: Version controlled in Git

### Recovery Procedures
```bash
# Database point-in-time recovery
pg_restore --clean --no-owner --no-privileges -d purdue_auth backup_20240115.dump

# Redis recovery (if needed)
redis-cli --rdb /var/lib/redis/dump.rdb

# Configuration rollback
git checkout production-stable
kubectl apply -f k8s/
```