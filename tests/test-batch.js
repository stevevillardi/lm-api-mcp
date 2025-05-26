#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

/**
 * Test script for batch operations
 */
async function testBatchOperations() {
  console.log('🚀 Testing LogicMonitor MCP Server Batch Operations...\n');

  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['run', 'start'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug'
    }
  });

  const client = new Client({
    name: 'test-batch-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    console.log('📡 Connecting to server...');
    await client.connect(transport);
    
    const { tools } = await client.listTools();
    console.log(`✅ Connected! Found ${tools.length} tools\n`);

    // Test 1: Single device creation (backward compatibility)
    console.log('🔧 Test 1: Creating single device...');
    try {
      const singleResult = await client.callTool('lm_create_device', {
        displayName: 'Test Server 1',
        name: 'test-server-1.example.com',
        hostGroupIds: [1],
        preferredCollectorId: 1,
        disableAlerting: true,
        properties: [
          { name: 'environment', value: 'test' },
          { name: 'created_by', value: 'batch_test' }
        ]
      });
      console.log('✅ Single device created:', JSON.stringify(singleResult, null, 2));
    } catch (error) {
      console.error('❌ Single device creation failed:', error.message);
    }

    // Test 2: Batch device creation
    console.log('\n🔧 Test 2: Creating multiple devices in batch...');
    try {
      const batchResult = await client.callTool('lm_create_device', {
        devices: [
          {
            displayName: 'Batch Server 1',
            name: 'batch-server-1.example.com',
            hostGroupIds: [1],
            preferredCollectorId: 1,
            disableAlerting: true,
            properties: [{ name: 'batch_test', value: 'true' }]
          },
          {
            displayName: 'Batch Server 2',
            name: 'batch-server-2.example.com',
            hostGroupIds: [1],
            preferredCollectorId: 1,
            disableAlerting: true,
            properties: [{ name: 'batch_test', value: 'true' }]
          },
          {
            displayName: 'Batch Server 3',
            name: 'batch-server-3.example.com',
            hostGroupIds: [1],
            preferredCollectorId: 1,
            disableAlerting: true,
            properties: [{ name: 'batch_test', value: 'true' }]
          }
        ],
        batchOptions: {
          maxConcurrent: 2,
          continueOnError: true
        }
      });
      
      console.log('✅ Batch creation result:');
      console.log('Summary:', batchResult.summary);
      console.log('Results:', JSON.stringify(batchResult.devices, null, 2));
    } catch (error) {
      console.error('❌ Batch creation failed:', error.message);
    }

    // Test 3: Batch with intentional failure
    console.log('\n🔧 Test 3: Testing batch error handling...');
    try {
      const errorBatchResult = await client.callTool('lm_create_device', {
        devices: [
          {
            displayName: 'Valid Server',
            name: 'valid-server.example.com',
            hostGroupIds: [1],
            preferredCollectorId: 1
          },
          {
            displayName: 'Invalid Server',
            name: 'invalid-server.example.com',
            hostGroupIds: [], // This will fail validation
            preferredCollectorId: 1
          },
          {
            displayName: 'Another Valid Server',
            name: 'another-valid-server.example.com',
            hostGroupIds: [1],
            preferredCollectorId: 1
          }
        ],
        batchOptions: {
          continueOnError: true
        }
      });
      
      console.log('✅ Batch with errors result:');
      console.log('Summary:', errorBatchResult.summary);
      console.log('Individual results:');
      errorBatchResult.devices.forEach((result, index) => {
        if (result.success) {
          console.log(`  [${index}] ✅ Success: ${result.device.displayName}`);
        } else {
          console.log(`  [${index}] ❌ Failed: ${result.error}`);
        }
      });
    } catch (error) {
      console.error('❌ Error batch test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🔚 Closing connection...');
    await client.close();
    process.exit(0);
  }
}

// Run the tests
testBatchOperations().catch(console.error);