#!/usr/bin/env node

/**
 * Test script for LogicMonitor MCP Website and Website Group tools
 * 
 * This tests:
 * 1. Website tools (list, get, create, update, delete)
 * 2. Website group tools (list, get, create, update, delete)
 * 3. Batch operations for both
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPServerTransport } from '@anthropic-ai/mcp-server-http';

const TEST_CONFIG = {
  account: process.env.LM_ACCOUNT,
  bearerToken: process.env.LM_BEARER_TOKEN,
  serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp'
};

// Validate configuration
if (!TEST_CONFIG.account || !TEST_CONFIG.bearerToken) {
  console.error('❌ Missing required environment variables: LM_ACCOUNT and LM_BEARER_TOKEN');
  process.exit(1);
}

console.log('🔧 Test Configuration:', {
  account: TEST_CONFIG.account,
  serverUrl: TEST_CONFIG.serverUrl
});

// Helper function to call a tool
async function callTool(client, toolName, args = {}) {
  try {
    console.log(`\n📞 Calling tool: ${toolName}`);
    console.log('📋 Arguments:', JSON.stringify(args, null, 2));
    
    const result = await client.callTool(toolName, args);
    
    if (result.content && result.content[0]) {
      const content = JSON.parse(result.content[0].text);
      console.log('✅ Success:', JSON.stringify(content, null, 2));
      return content;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error calling ${toolName}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n🚀 Starting LogicMonitor MCP Website Tools Tests\n');
  
  const transport = new StreamableHTTPServerTransport({
    url: TEST_CONFIG.serverUrl,
    method: 'SSE',
    headers: {
      'X-LM-Account': TEST_CONFIG.account,
      'X-LM-Bearer-Token': TEST_CONFIG.bearerToken
    }
  });

  const client = new Client({
    name: 'test-websites-client',
    version: '1.0.0'
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: List Website Groups
    console.log('\n=== Test 1: List Website Groups ===');
    const groups = await callTool(client, 'lm_list_website_groups', {
      size: 10
    });

    // Test 2: Create Website Group (single)
    console.log('\n=== Test 2: Create Website Group (single) ===');
    const newGroup = await callTool(client, 'lm_create_website_group', {
      name: 'Test Website Group',
      parentId: 1,
      description: 'Test group created by MCP test script'
    });

    if (newGroup && newGroup.group) {
      const groupId = newGroup.group.id;
      
      // Test 3: Create Websites (batch)
      console.log('\n=== Test 3: Create Websites (batch) ===');
      const websites = await callTool(client, 'lm_create_website', {
        websites: [
          {
            name: 'Test Website 1',
            domain: 'test1.example.com',
            type: 'pingcheck',
            groupId: groupId,
            description: 'Test website 1'
          },
          {
            name: 'Test Website 2',
            domain: 'test2.example.com',
            type: 'webcheck',
            groupId: groupId,
            description: 'Test website 2',
            steps: [{
              url: '/',
              HTTPMethod: 'GET',
              statusCode: '200'
            }]
          }
        ],
        batchOptions: {
          maxConcurrent: 2
        }
      });

      // Test 4: List Websites
      console.log('\n=== Test 4: List Websites ===');
      await callTool(client, 'lm_list_websites', {
        filter: `groupId:${groupId}`,
        size: 10
      });

      // Test 5: Update Websites (batch)
      if (websites && websites.results && websites.results.length > 0) {
        console.log('\n=== Test 5: Update Websites (batch) ===');
        const websiteIds = websites.results
          .filter(r => r.success)
          .map(r => ({ websiteId: r.data.id, description: 'Updated description' }));
        
        await callTool(client, 'lm_update_website', {
          websites: websiteIds,
          batchOptions: {
            maxConcurrent: 2
          }
        });

        // Test 6: Delete Websites (batch)
        console.log('\n=== Test 6: Delete Websites (batch) ===');
        await callTool(client, 'lm_delete_website', {
          websites: websiteIds.map(w => ({ websiteId: w.websiteId })),
          batchOptions: {
            maxConcurrent: 2
          }
        });
      }

      // Test 7: Delete Website Group
      console.log('\n=== Test 7: Delete Website Group ===');
      await callTool(client, 'lm_delete_website_group', {
        groupId: groupId
      });
    }

    // Test 8: Batch Create/Update/Delete Device Groups
    console.log('\n=== Test 8: Batch Device Group Operations ===');
    
    // Create multiple device groups
    const deviceGroups = await callTool(client, 'lm_create_device_group', {
      groups: [
        {
          name: 'Test Device Group 1',
          parentId: 1,
          description: 'Batch test group 1'
        },
        {
          name: 'Test Device Group 2',
          parentId: 1,
          description: 'Batch test group 2'
        }
      ],
      batchOptions: {
        maxConcurrent: 2
      }
    });

    if (deviceGroups && deviceGroups.results) {
      // Update the groups
      const groupIds = deviceGroups.results
        .filter(r => r.success)
        .map(r => ({ 
          groupId: r.data.id, 
          description: 'Updated via batch' 
        }));
      
      await callTool(client, 'lm_update_device_group', {
        groups: groupIds,
        batchOptions: {
          maxConcurrent: 2
        }
      });

      // Delete the groups
      await callTool(client, 'lm_delete_device_group', {
        groups: groupIds.map(g => ({ groupId: g.groupId })),
        batchOptions: {
          maxConcurrent: 2
        }
      });
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MCP server');
  }
}

// Run the tests
runTests().catch(console.error);