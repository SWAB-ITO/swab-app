#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GivebutterClient } from "../../backend/lib/infrastructure/clients/givebutter-client.js";
import { Logger } from "../../backend/lib/utils/logger.js";

// Initialize
const logger = new Logger('GivebutterMCP');
const apiKey = process.env.GIVEBUTTER_API_KEY;

if (!apiKey) {
  logger.error('GIVEBUTTER_API_KEY environment variable is required');
  process.exit(1);
}

const givebutterClient = new GivebutterClient({
  apiKey,
  logger,
});

// Create MCP server
const server = new Server(
  {
    name: "givebutter-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// LIST TOOLS - All 22 Givebutter tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing tools');

  return {
    tools: [
      // Campaign Operations
      {
        name: "get_campaigns",
        description: "List all campaigns",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_campaign",
        description: "Get details for a specific campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "number",
              description: "The campaign ID",
            },
          },
          required: ["campaignId"],
        },
      },
      {
        name: "get_campaign_by_code",
        description: "Find a campaign by its code",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The campaign code (e.g., 'mentor-2025')",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "create_campaign",
        description: "Create a new campaign",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Campaign code (unique identifier)",
            },
            title: {
              type: "string",
              description: "Campaign title",
            },
            description: {
              type: "string",
              description: "Campaign description",
            },
            goal: {
              type: "number",
              description: "Fundraising goal",
            },
            start_date: {
              type: "string",
              description: "Start date (ISO 8601 format)",
            },
            end_date: {
              type: "string",
              description: "End date (ISO 8601 format)",
            },
          },
          required: ["code", "title"],
        },
      },
      {
        name: "update_campaign",
        description: "Update a campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "number",
              description: "The campaign ID",
            },
            data: {
              type: "object",
              description: "Fields to update (code, title, description, goal, etc.)",
            },
          },
          required: ["campaignId", "data"],
        },
      },
      {
        name: "delete_campaign",
        description: "Delete a campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "number",
              description: "The campaign ID",
            },
          },
          required: ["campaignId"],
        },
      },

      // Member Operations
      {
        name: "get_campaign_members",
        description: "Get campaign members (single page)",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "number",
              description: "The campaign ID",
            },
            page: {
              type: "number",
              description: "Page number (default: 1)",
            },
            perPage: {
              type: "number",
              description: "Items per page (default: 20, max: 100)",
            },
          },
          required: ["campaignId"],
        },
      },
      {
        name: "get_all_campaign_members",
        description: "Get ALL campaign members with automatic pagination",
        inputSchema: {
          type: "object",
          properties: {
            campaignId: {
              type: "number",
              description: "The campaign ID",
            },
          },
          required: ["campaignId"],
        },
      },
      {
        name: "get_member",
        description: "Get a specific member",
        inputSchema: {
          type: "object",
          properties: {
            memberId: {
              type: "number",
              description: "The member ID",
            },
          },
          required: ["memberId"],
        },
      },
      {
        name: "delete_member",
        description: "Delete a member (remove from campaign)",
        inputSchema: {
          type: "object",
          properties: {
            memberId: {
              type: "number",
              description: "The member ID",
            },
          },
          required: ["memberId"],
        },
      },

      // Team Operations
      {
        name: "get_teams",
        description: "List all teams",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_team",
        description: "Get details for a specific team",
        inputSchema: {
          type: "object",
          properties: {
            teamId: {
              type: "number",
              description: "The team ID",
            },
          },
          required: ["teamId"],
        },
      },

      // Contact Operations
      {
        name: "get_contacts",
        description: "Get contacts (single page)",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default: 1)",
            },
            perPage: {
              type: "number",
              description: "Items per page (default: 20, max: 100)",
            },
          },
        },
      },
      {
        name: "get_all_contacts",
        description: "Get ALL contacts with automatic pagination",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_contact",
        description: "Get a specific contact by ID",
        inputSchema: {
          type: "object",
          properties: {
            contactId: {
              type: "number",
              description: "The contact ID",
            },
          },
          required: ["contactId"],
        },
      },
      {
        name: "create_contact",
        description: "Create a new contact",
        inputSchema: {
          type: "object",
          properties: {
            first_name: {
              type: "string",
              description: "First name",
            },
            last_name: {
              type: "string",
              description: "Last name",
            },
            email: {
              type: "string",
              description: "Email address",
            },
            phone: {
              type: "string",
              description: "Phone number",
            },
            external_id: {
              type: "string",
              description: "External ID for syncing",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Array of tags",
            },
            custom_fields: {
              type: "object",
              description: "Custom field values",
            },
          },
          required: ["first_name", "last_name", "email"],
        },
      },
      {
        name: "update_contact",
        description: "Update a contact",
        inputSchema: {
          type: "object",
          properties: {
            contactId: {
              type: "number",
              description: "The contact ID",
            },
            data: {
              type: "object",
              description: "Fields to update",
            },
          },
          required: ["contactId", "data"],
        },
      },
      {
        name: "archive_contact",
        description: "Archive a contact",
        inputSchema: {
          type: "object",
          properties: {
            contactId: {
              type: "number",
              description: "The contact ID to archive",
            },
          },
          required: ["contactId"],
        },
      },
      {
        name: "restore_contact",
        description: "Restore an archived contact",
        inputSchema: {
          type: "object",
          properties: {
            contactId: {
              type: "number",
              description: "The contact ID to restore",
            },
          },
          required: ["contactId"],
        },
      },

      // Transaction Operations
      {
        name: "get_transactions",
        description: "Get transactions (single page) with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default: 1)",
            },
            perPage: {
              type: "number",
              description: "Items per page (default: 20, max: 100)",
            },
            campaign_id: {
              type: "number",
              description: "Filter by campaign ID",
            },
            member_id: {
              type: "number",
              description: "Filter by member ID",
            },
            contact_id: {
              type: "number",
              description: "Filter by contact ID",
            },
            type: {
              type: "string",
              description: "Filter by transaction type",
            },
            status: {
              type: "string",
              description: "Filter by transaction status",
            },
          },
        },
      },
      {
        name: "get_all_transactions",
        description: "Get ALL transactions with automatic pagination and optional filters",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "number",
              description: "Filter by campaign ID",
            },
            member_id: {
              type: "number",
              description: "Filter by member ID",
            },
            contact_id: {
              type: "number",
              description: "Filter by contact ID",
            },
            type: {
              type: "string",
              description: "Filter by transaction type",
            },
            status: {
              type: "string",
              description: "Filter by transaction status",
            },
          },
        },
      },

      // API Key Verification
      {
        name: "verify_api_key",
        description: "Verify if the Givebutter API key is valid",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// CALL TOOL - Handle all 22 tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Calling tool: ${name}`, { args });

  try {
    // Campaign Operations
    if (name === "get_campaigns") {
      const campaigns = await givebutterClient.getCampaigns();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(campaigns, null, 2),
          },
        ],
      };
    }

    if (name === "get_campaign") {
      const { campaignId } = args as { campaignId: number };
      const campaign = await givebutterClient.getCampaign(campaignId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(campaign, null, 2),
          },
        ],
      };
    }

    if (name === "get_campaign_by_code") {
      const { code } = args as { code: string };
      const campaign = await givebutterClient.getCampaignByCode(code);
      if (!campaign) {
        return {
          content: [
            {
              type: "text",
              text: `Campaign with code "${code}" not found`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(campaign, null, 2),
          },
        ],
      };
    }

    if (name === "create_campaign") {
      const data = args as {
        code: string;
        title: string;
        description?: string;
        goal?: number;
        start_date?: string;
        end_date?: string;
      };
      const campaign = await givebutterClient.createCampaign(data);
      return {
        content: [
          {
            type: "text",
            text: `Created campaign: ${campaign.title} (ID: ${campaign.id})\n\n${JSON.stringify(campaign, null, 2)}`,
          },
        ],
      };
    }

    if (name === "update_campaign") {
      const { campaignId, data } = args as {
        campaignId: number;
        data: any;
      };
      const campaign = await givebutterClient.updateCampaign(campaignId, data);
      return {
        content: [
          {
            type: "text",
            text: `Updated campaign ${campaignId}\n\n${JSON.stringify(campaign, null, 2)}`,
          },
        ],
      };
    }

    if (name === "delete_campaign") {
      const { campaignId } = args as { campaignId: number };
      await givebutterClient.deleteCampaign(campaignId);
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted campaign ${campaignId}`,
          },
        ],
      };
    }

    // Member Operations
    if (name === "get_campaign_members") {
      const { campaignId, page, perPage } = args as {
        campaignId: number;
        page?: number;
        perPage?: number;
      };
      const response = await givebutterClient.getCampaignMembers(
        campaignId,
        page || 1,
        perPage || 20
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    if (name === "get_all_campaign_members") {
      const { campaignId } = args as { campaignId: number };
      const members = await givebutterClient.getAllCampaignMembers(campaignId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                campaignId,
                total: members.length,
                members,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_member") {
      const { memberId } = args as { memberId: number };
      const member = await givebutterClient.getMember(memberId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(member, null, 2),
          },
        ],
      };
    }

    if (name === "delete_member") {
      const { memberId } = args as { memberId: number };
      await givebutterClient.deleteMember(memberId);
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted member ${memberId}`,
          },
        ],
      };
    }

    // Team Operations
    if (name === "get_teams") {
      const teams = await givebutterClient.getTeams();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(teams, null, 2),
          },
        ],
      };
    }

    if (name === "get_team") {
      const { teamId } = args as { teamId: number };
      const team = await givebutterClient.getTeam(teamId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(team, null, 2),
          },
        ],
      };
    }

    // Contact Operations
    if (name === "get_contacts") {
      const { page, perPage } = args as {
        page?: number;
        perPage?: number;
      };
      const response = await givebutterClient.getContacts(
        page || 1,
        perPage || 20
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    if (name === "get_all_contacts") {
      const contacts = await givebutterClient.getAllContacts();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: contacts.length,
                contacts,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_contact") {
      const { contactId } = args as { contactId: number };
      const contact = await givebutterClient.getContact(contactId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(contact, null, 2),
          },
        ],
      };
    }

    if (name === "create_contact") {
      const data = args as {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        external_id?: string;
        tags?: string[];
        custom_fields?: Record<string, any>;
      };
      const contact = await givebutterClient.createContact(data);
      return {
        content: [
          {
            type: "text",
            text: `Created contact: ${contact.first_name} ${contact.last_name} (ID: ${contact.id})\n\n${JSON.stringify(contact, null, 2)}`,
          },
        ],
      };
    }

    if (name === "update_contact") {
      const { contactId, data } = args as {
        contactId: number;
        data: any;
      };
      const contact = await givebutterClient.updateContact(contactId, data);
      return {
        content: [
          {
            type: "text",
            text: `Updated contact ${contactId}\n\n${JSON.stringify(contact, null, 2)}`,
          },
        ],
      };
    }

    if (name === "archive_contact") {
      const { contactId } = args as { contactId: number };
      const success = await givebutterClient.archiveContact(contactId);
      return {
        content: [
          {
            type: "text",
            text: success
              ? `Successfully archived contact ${contactId}`
              : `Failed to archive contact ${contactId}`,
          },
        ],
      };
    }

    if (name === "restore_contact") {
      const { contactId } = args as { contactId: number };
      const contact = await givebutterClient.restoreContact(contactId);
      return {
        content: [
          {
            type: "text",
            text: `Restored contact ${contactId}\n\n${JSON.stringify(contact, null, 2)}`,
          },
        ],
      };
    }

    // Transaction Operations
    if (name === "get_transactions") {
      const { page, perPage, campaign_id, member_id, contact_id, type, status } = args as {
        page?: number;
        perPage?: number;
        campaign_id?: number;
        member_id?: number;
        contact_id?: number;
        type?: string;
        status?: string;
      };
      const response = await givebutterClient.getTransactions(
        page || 1,
        perPage || 20,
        { campaign_id, member_id, contact_id, type, status }
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    if (name === "get_all_transactions") {
      const { campaign_id, member_id, contact_id, type, status } = args as {
        campaign_id?: number;
        member_id?: number;
        contact_id?: number;
        type?: string;
        status?: string;
      };
      const transactions = await givebutterClient.getAllTransactions({
        campaign_id,
        member_id,
        contact_id,
        type,
        status,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: transactions.length,
                transactions,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // API Key Verification
    if (name === "verify_api_key") {
      const isValid = await givebutterClient.verifyApiKey();
      return {
        content: [
          {
            type: "text",
            text: isValid
              ? "✓ API key is valid"
              : "✗ API key is invalid or expired",
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, error);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Givebutter MCP server started successfully");
}

main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
