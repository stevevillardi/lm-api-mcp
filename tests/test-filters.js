#!/usr/bin/env node

import { formatLogicMonitorFilter } from '../dist/utils/filters.js';

// Test cases for filter formatting
const testCases = [
  // Basic wildcard case that user reported
  ['name:*villa*', 'name:"*villa*"'],
  
  // Already quoted - should not double quote
  ['name:"*villa*"', 'name:"*villa*"'],
  
  // Numeric values - should not quote
  ['id:123', 'id:123'],
  ['id>:100', 'id>:100'],
  
  // Boolean values - should not quote  
  ['disableAlerting:true', 'disableAlerting:true'],
  ['disableAlerting:false', 'disableAlerting:false'],
  
  // String values - should quote ALL strings
  ['hostStatus:alive', 'hostStatus:"alive"'],
  ['displayName:server1', 'displayName:"server1"'],
  ['name:simple', 'name:"simple"'],
  ['status:active', 'status:"active"'],
  
  // Multiple values with | (OR within same field)
  ['status:active|pending', 'status:"active"|"pending"'],
  
  // AND conditions with comma
  ['name:web*,hostStatus:alive', 'name:"web*",hostStatus:"alive"'],
  
  // OR conditions with ||
  ['name:web*||name:app*', 'name:"web*"||name:"app*"'],
  
  // Complex case
  ['displayName:*prod*,hostStatus:alive,id>:100', 'displayName:"*prod*",hostStatus:"alive",id>:100'],
  
  // Spaces in values
  ['name:test server', 'name:"test server"'],
  
  // Different operators
  ['name~web', 'name~"web"'],
  ['name!:test', 'name!:"test"']
];

console.log('🧪 Testing LogicMonitor Filter Formatting\n');

testCases.forEach(([input, expected]) => {
  const result = formatLogicMonitorFilter(input);
  const status = result === expected ? '✅' : '❌';
  
  console.log(`${status} Input:    ${input}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Got:      ${result}`);
  
  if (result !== expected) {
    console.log('   ⚠️  MISMATCH!');
  }
  console.log('');
});

console.log('Done!');