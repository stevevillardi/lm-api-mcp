#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamablehttp.js');

async function testDeviceGroups() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000/mcp';
  const account = process.env.LM_ACCOUNT;
  const bearerToken = process.env.LM_BEARER_TOKEN;

  if (!account || !bearerToken) {
    console.error('Please set LM_ACCOUNT and LM_BEARER_TOKEN environment variables');
    process.exit(1);
  }

  const headers = {
    'X-LM-Account': account,
    'X-LM-Bearer-Token': bearerToken
  };

  const transport = new StreamableHTTPClientTransport({
    url: serverUrl,
    headers
  });

  const client = new Client({
    name: 'test-device-groups',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    console.log('Connecting to server...');
    await client.connect(transport);
    console.log('Connected successfully!\n');

    // Test single device group creation
    console.log('Testing single device group creation...');
    try {
      const singleResult = await client.callTool('lm_create_device_group', {
        name: 'Test Group Single',
        parentId: 1,
        description: 'Created via single operation',
        properties: [
          { name: 'test.property', value: 'single' }
        ]
      });
      console.log('Single creation result:', JSON.stringify(singleResult, null, 2));
    } catch (error) {
      console.error('Single creation error:', error);
    }

    // Test batch device group creation
    console.log('\nTesting batch device group creation...');
    try {
      const batchResult = await client.callTool('lm_create_device_group', {
        groups: [
          {
            name: 'Test Group Batch 1',
            parentId: 1,
            description: 'Created via batch operation 1'
          },
          {
            name: 'Test Group Batch 2',
            parentId: 1,
            description: 'Created via batch operation 2',
            properties: [
              { name: 'batch.property', value: 'batch2' }
            ]
          }
        ],
        batchOptions: {
          maxConcurrent: 2,
          continueOnError: true
        }
      });
      console.log('Batch creation result:', JSON.stringify(batchResult, null, 2));
    } catch (error) {
      console.error('Batch creation error:', error);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testDeviceGroups().catch(console.error);