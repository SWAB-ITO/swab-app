#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JotformClient } from "../../lib/infrastructure/clients/jotform-client.js";
import { Logger } from "../../lib/utils/logger.js";

// Initialize
const logger = new Logger('JotformMCP');
const apiKey = process.env.JOTFORM_API_KEY;

if (!apiKey) {
  logger.error('JOTFORM_API_KEY environment variable is required');
  process.exit(1);
}

const jotformClient = new JotformClient({
  apiKey,
  logger,
});

// Create MCP server
const server = new Server(
  {
    name: "jotform-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// LIST TOOLS - All 19 Jotform tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing tools');

  return {
    tools: [
      // User Operations
      {
        name: "get_user",
        description: "Get user profile information",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },

      // Form Operations
      {
        name: "get_forms",
        description: "List all forms",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_form",
        description: "Get details for a specific form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "get_form_questions",
        description: "Get all questions from a form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "get_form_properties",
        description: "Get form properties/settings",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "create_form",
        description: "Create a new form",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The form title",
            },
            questions: {
              type: "array",
              description: "Optional array of form questions",
            },
            properties: {
              type: "object",
              description: "Optional form properties",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "update_form",
        description: "Update form properties",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
            properties: {
              type: "object",
              description: "Form properties to update",
            },
          },
          required: ["formId", "properties"],
        },
      },
      {
        name: "delete_form",
        description: "Delete a form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },

      // Submission Operations
      {
        name: "get_form_submissions",
        description: "Get form submissions with pagination and filters",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 1000, max: 1000)",
            },
            offset: {
              type: "number",
              description: "Starting offset for pagination",
            },
            filter: {
              type: "object",
              description: "Filter object for submissions",
            },
            orderBy: {
              type: "string",
              description: "Field to order by",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "get_all_form_submissions",
        description: "Get ALL form submissions with automatic pagination (handles Jotform's 1000 limit)",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "get_submission",
        description: "Get a single submission by ID",
        inputSchema: {
          type: "object",
          properties: {
            submissionId: {
              type: "string",
              description: "The submission ID",
            },
          },
          required: ["submissionId"],
        },
      },
      {
        name: "create_submission",
        description: "Create a new submission",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
            submission: {
              type: "object",
              description: "Submission data (field ID to value mapping)",
            },
          },
          required: ["formId", "submission"],
        },
      },
      {
        name: "update_submission",
        description: "Update an existing submission",
        inputSchema: {
          type: "object",
          properties: {
            submissionId: {
              type: "string",
              description: "The submission ID",
            },
            submission: {
              type: "object",
              description: "Submission data to update",
            },
          },
          required: ["submissionId", "submission"],
        },
      },
      {
        name: "delete_submission",
        description: "Delete a submission",
        inputSchema: {
          type: "object",
          properties: {
            submissionId: {
              type: "string",
              description: "The submission ID",
            },
          },
          required: ["submissionId"],
        },
      },

      // Webhook Operations
      {
        name: "get_form_reports",
        description: "Get form reports",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "get_form_webhooks",
        description: "Get all webhooks configured for a form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "create_webhook",
        description: "Create a new webhook for a form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
            webhookURL: {
              type: "string",
              description: "The webhook URL to call when form is submitted",
            },
          },
          required: ["formId", "webhookURL"],
        },
      },
      {
        name: "delete_webhook",
        description: "Delete a webhook from a form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
            webhookId: {
              type: "string",
              description: "The webhook ID to delete",
            },
          },
          required: ["formId", "webhookId"],
        },
      },

      // API Key Verification
      {
        name: "verify_api_key",
        description: "Verify if the Jotform API key is valid",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// CALL TOOL - Handle all 19 tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Calling tool: ${name}`, { args });

  try {
    // User Operations
    if (name === "get_user") {
      const user = await jotformClient.getUser();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    }

    // Form Operations
    if (name === "get_forms") {
      const forms = await jotformClient.getForms();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(forms, null, 2),
          },
        ],
      };
    }

    if (name === "get_form") {
      const { formId } = args as { formId: string };
      const form = await jotformClient.getForm(formId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(form, null, 2),
          },
        ],
      };
    }

    if (name === "get_form_questions") {
      const { formId } = args as { formId: string };
      const questions = await jotformClient.getFormQuestions(formId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(questions, null, 2),
          },
        ],
      };
    }

    if (name === "get_form_properties") {
      const { formId } = args as { formId: string };
      const properties = await jotformClient.getFormProperties(formId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(properties, null, 2),
          },
        ],
      };
    }

    if (name === "create_form") {
      const { title, questions, properties } = args as {
        title: string;
        questions?: any[];
        properties?: Record<string, any>;
      };
      const form = await jotformClient.createForm({ title, questions, properties });
      return {
        content: [
          {
            type: "text",
            text: `Created form: ${form.title} (ID: ${form.id})\n\n${JSON.stringify(form, null, 2)}`,
          },
        ],
      };
    }

    if (name === "update_form") {
      const { formId, properties } = args as {
        formId: string;
        properties: Record<string, any>;
      };
      const form = await jotformClient.updateForm(formId, properties);
      return {
        content: [
          {
            type: "text",
            text: `Updated form ${formId}\n\n${JSON.stringify(form, null, 2)}`,
          },
        ],
      };
    }

    if (name === "delete_form") {
      const { formId } = args as { formId: string };
      await jotformClient.deleteForm(formId);
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted form ${formId}`,
          },
        ],
      };
    }

    // Submission Operations
    if (name === "get_form_submissions") {
      const { formId, limit, offset, filter, orderBy } = args as {
        formId: string;
        limit?: number;
        offset?: number;
        filter?: Record<string, any>;
        orderBy?: string;
      };
      const submissions = await jotformClient.getFormSubmissions(formId, {
        limit,
        offset,
        filter,
        orderBy,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                formId,
                total: submissions.length,
                submissions,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_all_form_submissions") {
      const { formId } = args as { formId: string };
      const submissions = await jotformClient.getAllFormSubmissions(formId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                formId,
                total: submissions.length,
                submissions,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_submission") {
      const { submissionId } = args as { submissionId: string };
      const submission = await jotformClient.getSubmission(submissionId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(submission, null, 2),
          },
        ],
      };
    }

    if (name === "create_submission") {
      const { formId, submission } = args as {
        formId: string;
        submission: Record<string, any>;
      };
      const result = await jotformClient.createSubmission(formId, submission);
      return {
        content: [
          {
            type: "text",
            text: `Created submission for form ${formId}\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === "update_submission") {
      const { submissionId, submission } = args as {
        submissionId: string;
        submission: Record<string, any>;
      };
      const result = await jotformClient.updateSubmission(submissionId, submission);
      return {
        content: [
          {
            type: "text",
            text: `Updated submission ${submissionId}\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === "delete_submission") {
      const { submissionId } = args as { submissionId: string };
      await jotformClient.deleteSubmission(submissionId);
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted submission ${submissionId}`,
          },
        ],
      };
    }

    // Webhook Operations
    if (name === "get_form_reports") {
      const { formId } = args as { formId: string };
      const reports = await jotformClient.getFormReports(formId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(reports, null, 2),
          },
        ],
      };
    }

    if (name === "get_form_webhooks") {
      const { formId } = args as { formId: string };
      const webhooks = await jotformClient.getFormWebhooks(formId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(webhooks, null, 2),
          },
        ],
      };
    }

    if (name === "create_webhook") {
      const { formId, webhookURL } = args as {
        formId: string;
        webhookURL: string;
      };
      const result = await jotformClient.createWebhook(formId, webhookURL);
      return {
        content: [
          {
            type: "text",
            text: `Created webhook for form ${formId}\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    if (name === "delete_webhook") {
      const { formId, webhookId } = args as {
        formId: string;
        webhookId: string;
      };
      await jotformClient.deleteWebhook(formId, webhookId);
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted webhook ${webhookId} from form ${formId}`,
          },
        ],
      };
    }

    // API Key Verification
    if (name === "verify_api_key") {
      const isValid = await jotformClient.verifyApiKey();
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
  logger.info("Jotform MCP server started successfully");
}

main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
