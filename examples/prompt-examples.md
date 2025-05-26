# LogicMonitor MCP Server - Prompt Examples

This document provides example prompts that demonstrate the powerful automation capabilities of the LogicMonitor MCP Server. These examples showcase single operations, batch operations, complex workflows, and monitoring scenarios.

## Device Management

### Single Device Operations

**Add a new server to monitoring:**
```
Add server prod-web-01.example.com (192.168.1.100) to monitoring in the Production/Web Servers group using collector ID 5
```

**Update device properties:**
```
Update device ID 1234 to disable alerting and add custom properties: environment=production, team=platform
```

**Find and update devices:**
```
Find all devices with name matching "*test*" and disable alerting on them
```

### Batch Device Operations

**Add multiple servers at once:**
```
Add these servers to monitoring:
- prod-web-01 (10.0.1.10) in group 15
- prod-web-02 (10.0.1.11) in group 15  
- prod-db-01 (10.0.2.10) in group 20
- prod-cache-01 (10.0.3.10) in group 25
All should use collector 5 and have property "environment=production"
```

**Bulk update devices:**
```
Update these devices to use collector 10 and enable alerting:
- Device IDs: 100, 101, 102, 103, 104
Process up to 3 at a time and continue even if some fail
```

**Clean up old devices:**
```
Delete all devices with hostStatus "dead" that haven't been updated in the last 30 days
```

## Device Group Management

### Organize Infrastructure

**Create a hierarchical group structure:**
```
Create this device group structure under root:
- Production
  - Web Servers
  - Database Servers
  - Cache Servers
- Staging  
  - Web Servers
  - Database Servers
- Development
Each group should have property "notification.email" set to the appropriate team email
```

**Create dynamic groups:**
```
Create a dynamic device group called "Critical Production Servers" under group 1 that automatically includes devices where:
- customProperties.environment = "production" 
- customProperties.tier = "critical"
```

**Bulk group management:**
```
Create 5 device groups for our regional offices:
- NYC-Office (parent: 10)
- LON-Office (parent: 10)
- TOK-Office (parent: 10)
- SYD-Office (parent: 10)
- SFO-Office (parent: 10)
Each should have disableAlerting=false and description "Regional office infrastructure"
```

## Website Monitoring

### Single Website Monitoring

**Add website monitoring:**
```
Add website monitoring for www.example.com as a webcheck in group 50. 
Set polling interval to 5 minutes and use default alert settings.
Add a custom property "sla.target=99.9"
```

**Multi-step web check:**
```
Create a multi-step web check for our e-commerce site:
1. GET https://shop.example.com (expect 200)
2. POST https://shop.example.com/api/login (expect 200)
3. GET https://shop.example.com/dashboard (expect 200)
Name it "E-commerce User Flow" and put in group 60
```

### Batch Website Operations

**Monitor multiple endpoints:**
```
Add website monitoring for these APIs:
- api.example.com/v1/health (pingcheck)
- api.example.com/v2/health (pingcheck)
- payments.example.com/status (webcheck)
- auth.example.com/health (webcheck)
All should be in group 75 with 1-minute polling intervals
```

**Update multiple websites:**
```
Find all websites in group 60 and update them to:
- Enable alerting
- Set polling interval to 2 minutes
- Add property "team=platform"
```

## Alert Management

### Alert Operations

**Get current alerts:**
```
Show me all critical alerts from the last hour for devices in the Production group
```

**Acknowledge alerts with context:**
```
Acknowledge alert LMD123456 with comment "Investigating high CPU usage, engaged infrastructure team"
```

**Bulk alert management:**
```
Find all alerts for devices matching "test-*" and add a note that these are non-production systems scheduled for decommission
```

**Alert reporting:**
```
Get all alerts from the last 24 hours sorted by severity, and show me which devices have the most alerts
```

## Complex Automation Workflows

### Infrastructure Deployment

**Complete environment setup:**
```
I'm deploying a new microservices application with the following components:

Frontend:
- 3 web servers: fe-prod-01 through fe-prod-03 (10.1.1.1-3)

Backend:
- 5 API servers: api-prod-01 through api-prod-05 (10.1.2.1-5)  
- 2 database servers: db-prod-01 and db-prod-02 (10.1.3.1-2)
- 1 cache server: cache-prod-01 (10.1.4.1)

Also monitor these endpoints:
- https://app.example.com (main site)
- https://api.example.com/health (API health)
- https://api.example.com/metrics (metrics endpoint)

Create appropriate device groups, add all devices with collector 5, and set up the website monitoring. Tag everything with environment=production and project=microservices.
```

### Migration Scenarios

**Collector migration:**
```
We're migrating from collector 5 to collector 10. 
1. List all devices currently using collector 5
2. Update them in batches of 10 to use collector 10
3. Add a property "migration.date" with today's date
4. Generate a summary of the migration
```

**Group reorganization:**
```
Reorganize our monitoring structure:
1. Create new group structure: Production/Region/Type
2. Move all devices from "US-East" group to "Production/US-East/Servers"  
3. Move all devices from "US-West" group to "Production/US-West/Servers"
4. Update group properties to include region and timezone
5. Delete the old empty groups
```

### Monitoring Automation

**Auto-discovery follow-up:**
```
List all devices added in the last 7 days that don't have these required properties:
- environment
- owner.email  
- backup.schedule

For each device found, add default values:
- environment=unknown
- owner.email=ops@example.com
- backup.schedule=pending
```

**Maintenance window preparation:**
```
We have maintenance on Saturday for all production web servers:
1. Find all devices in groups matching "*Production*Web*"
2. Disable alerting on them
3. Add property "maintenance.scheduled=2024-03-15"
4. Create a report of all affected devices
```

### Compliance and Reporting

**Security compliance check:**
```
Perform a security compliance check:
1. List all devices in production groups
2. Check which ones are missing the "security.scan.date" property
3. For devices with the property, identify any where the date is older than 30 days
4. Generate a non-compliance report with device names and groups
```

**Capacity planning:**
```
Help me with capacity planning:
1. List all devices with alertStatus "warning" or "error"
2. Group them by hostGroupIds
3. For each group, show me the count of devices in each status
4. Identify groups where more than 50% of devices have issues
```

## Website Group Management

**Regional website monitoring:**
```
Set up website monitoring groups for our global presence:
1. Create website groups for each region: US-East, US-West, EU, APAC under parent group 1
2. Set each group to use regional monitoring locations
3. Add properties for timezone and responsible team
4. Move existing websites to appropriate regional groups based on their domain
```

## Troubleshooting Scenarios

**Alert investigation:**
```
Help me investigate the current production issues:
1. Get all active alerts for the Production device group
2. Show me which devices have the most alerts
3. For the top 5 devices, get their details including properties
4. Check if any of these devices were recently updated
```

**Performance analysis:**
```
Analyze our website performance:
1. List all websites with their current status
2. Identify any with alerting disabled
3. Find websites with polling intervals greater than 5 minutes
4. Create a summary of potential monitoring gaps
```

## Best Practices Examples

**Standardize monitoring configuration:**
```
Standardize our monitoring configuration:
1. Find all devices missing preferredCollectorId
2. Update them to use the collector in their region (property: region)
3. Find all devices without standard properties (environment, team, sla.target)
4. Generate a report of non-compliant devices for manual review
```

**Implement monitoring standards:**
```
Implement our new monitoring standards:
- All production devices must have alerting enabled
- All devices must have properties: environment, owner.email, cost.center
- All websites must have polling interval <= 5 minutes
- All groups must have property: notification.email

Check current compliance and fix what can be automated.
```

## Integration Examples

**CI/CD Integration:**
```
Our CI/CD pipeline just deployed version 2.5.0 to production:
1. Find all devices with property "application=shopping-cart"
2. Update their property "version" to "2.5.0"
3. Add property "last.deployment" with current timestamp
4. Add a note to any active alerts that a new version was deployed
```

**Infrastructure as Code:**
```
Sync monitoring with our Infrastructure as Code:
1. These servers should exist: prod-web-[01-05], prod-api-[01-03]
2. These should be removed: test-web-01, staging-api-02
3. All prod-web-* should be in group "Production/Web" with collector 10
4. All prod-api-* should be in group "Production/API" with collector 11
Please sync the monitoring to match this configuration.
```

## Tips for Effective Prompts

1. **Be specific** about device names, IPs, and group IDs when known
2. **Use batch operations** when dealing with multiple similar items
3. **Specify error handling** preferences (continue on error, max concurrent)
4. **Include context** like properties and group membership
5. **Chain operations** for complex workflows
6. **Request summaries** at the end of bulk operations

## Advanced Patterns

**Template-based deployment:**
```
Use this template to add monitoring for our new branch office:
- Router: {office}-rtr-01 (10.{subnet}.1.1)
- Switch: {office}-sw-01 (10.{subnet}.1.2)  
- Firewall: {office}-fw-01 (10.{subnet}.1.3)

Apply for:
- office=dallas, subnet=50
- office=denver, subnet=51
- office=phoenix, subnet=52

All devices should be in group "Branch Offices/{office}" with collector 15
```

**Conditional updates:**
```
For all devices in the Production group:
- If CPU usage property > 80%, add property "needs.upgrade=cpu"
- If memory usage property > 90%, add property "needs.upgrade=memory"  
- If both are high, set priority property to "critical"
```

These examples demonstrate the power and flexibility of the LogicMonitor MCP Server for automating monitoring operations, from simple device additions to complex infrastructure management workflows.