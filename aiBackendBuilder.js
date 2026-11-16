import { GoogleGenAI } from "@google/genai";
import { question } from "readline-sync";
import { exec } from "child_process"; // helps to execute commands in the terminal
import { promisify } from "util";
import os from "os";
import "dotenv/config"

const api_key = process.env.apk;
const ai = new GoogleGenAI({ apiKey: api_key });

const platform = os.platform();

const asyncExecute = promisify(exec);

// Function to execute a command
async function executeCommand({command}) {
  try {
    console.log("EXECUTING:", command);

    const { stdout, stderr } = await asyncExecute(command);
    if (stderr) {
      return `Error -> ${stderr}`;
    }
    return `Success ${stdout} || Task Executed Completely `;
  } catch (error) {
    return `Error -> ${error.message}`;
  }
}

// Declaration executeCommand
const executeCommandDeclaration = {
  name: "executeCommand",
  description: "Execute terminal command inside project workspace",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: "A Terminal command to execute",
      },
    },
    required: ["command"],
  },
};

// History of the conversation
const History = [];
const availableTools = {
  executeCommand: executeCommand,
};

async function backendAgent(userQuestion) {
  History.push({
    role: "user",
    parts: [
      {
        text: userQuestion,
      },
    ],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: History,
      config: {
        systemInstruction: `You are an autonomous Node.js Backend Builder running on the user's local computer. Your ONLY job is to build backend applications using Node.js and its ecosystem. Use Node.js, JavaScript/TypeScript, Express, Fastify, NestJS, MongoDB, PostgreSQL, Redis, RabbitMQ, Socket.IO, and compatible npm packages. NEVER use Python, Java, PHP, C#, Go, Rust, Ruby, or any other non-Node.js backend technology. You are backend-only and must NEVER create or modify React, Next.js, Vue, Angular, HTML, CSS, Tailwind, MUI, or any frontend code. When given a requirement, first understand it, then plan it, create the project structure, initialize npm, install dependencies, create files, implement the backend, run the project, validate the output, fix errors if any, and continue until the task is completed. Use executeCommand({ command }) for all terminal operations and always read command output before deciding the next step. Always use commands compatible with the current operating system (${platform}). Since terminal sessions are not persistent, always explicitly change directories when required. Use npm for package management and only install dependencies that are necessary. Never hardcode API keys, passwords, database credentials, JWT secrets, or any private tokens. Use environment variables for sensitive values. Avoid destructive commands that can damage the user's system. Follow this workflow strictly: UNDERSTAND → PLAN → CREATE → INSTALL → IMPLEMENT → RUN → READ OUTPUT → FIX → VALIDATE → COMPLETE.`,
        tools: [
          {
            functionDeclarations: [executeCommandDeclaration],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(response.functionCalls[0]);

      const { name, args, id } = response.functionCalls[0];
      const funCall = availableTools[name];
      const result = await funCall(args);

      History.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: name,
              response: {
                result: result,
              },
              id: id,
            },
          },
        ],
      });
    } else {
      History.push({
        role: "model",
        parts: [
          {
            text: response.text,
          },
        ],
      });
      console.log(response.text);
      break;
    }
  }
}

async function main() {
  const userQuestion = question("Ask me anything : ");
  await backendAgent(userQuestion);
  main();
}
main();
// executeCommand('mkdir test');
// executeCommand("cd test && type null > index.js").then(console.log);
