// Configure chat tools (OpenAI calls )
// Decide if tool is required
// Invokde the tool
// Make a second OpenAI call with the tool response
import { OpenAI } from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

function getTimeOfDay() {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `The current time is ${hours}:${
    minutes < 10 ? "0" + minutes : minutes
  }.`;
}

function getOrderStatus(orderId: string) {
  const statuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  return `The status of order ${orderId} is: ${randomStatus}.`;
}

async function callOpenAiWithTools() {
  const context: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that give information about time of day and order status.",
    },
    {
      role: "user",
      content: "What order status of 123",
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: context,
    tools: [
      {
        type: "function",
        function: {
          name: "getTimeOfDay",
          description: "Get the current time of day in HH:MM format.",
        },
      },
      {
        type: "function",
        function: {
          name: "getOrderStatus",
          description: "Rerurns the status of the order",
          parameters: {
            type: "object",
            properties: {
              orderId: {
                type: "string",
                description: "The ID of the order to check status for.",
              },
            },
            required: ["orderId"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  const willInvokeFunction =
    response?.choices[0]?.finish_reason == "tool_calls";
  const toolCall = response?.choices[0]?.message?.tool_calls![0];
  if (willInvokeFunction) {
    const toolName = toolCall?.function?.name;
    if (toolName == "getTimeOfDay") {
      const toolResponse = getTimeOfDay();
      context.push(response?.choices[0].message);
      context.push({
        role: "tool",
        content: toolResponse,
        tool_call_id: toolCall.id,
      });
    }
    if (toolName == "getOrderStatus") {
      const rawArguments = toolCall?.function?.arguments;
      const parsedArguments = JSON.parse(rawArguments);
      const toolResponse = getOrderStatus(parsedArguments.orderId);

      context.push(response?.choices[0].message);
      context.push({
        role: "tool",
        content: toolResponse,
        tool_call_id: toolCall.id,
      });
    }
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: context,
    });

    console.log(secondResponse?.choices[0]?.message?.content);
  }
}

callOpenAiWithTools();
