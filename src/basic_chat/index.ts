import { OpenAI } from "openai";
import { encoding_for_model } from "tiktoken";

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

const MAX_TOKENS = 700;
const encoder = encoding_for_model("gpt-3.5-turbo");

let context: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: "You are a helpful assistant.",
  },
];

async function createChatCompletion() {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: context,
  });
  context.push({
    role: "assistant",
    content: response.choices[0].message.content,
  });
  console.log(getContextLength());
  if (
    response &&
    response?.usage &&
    response?.usage?.total_tokens > MAX_TOKENS
  ) {
    console.log("yes");
    deleteOlderMessages();
  }
}

function deleteOlderMessages() {
  let contextLength = getContextLength();
  while (contextLength > MAX_TOKENS) {
    for (let i = 0; i < context.length; i++) {
      const message = context[i];
      if (message.role != "system") {
        context.slice(i, 1);
        contextLength = getContextLength();
        break;
      }
    }
  }
}

function getContextLength() {
  let length = 0;
  context.forEach((message) => {
    if (typeof message?.content == "string") {
      length += encoder.encode(message.content).length;
    } else if (Array.isArray(message?.content)) {
      message?.content.forEach((item) => {
        if (item.type == "text") {
          length += encoder.encode(item.text).length;
        }
      });
    }
  });
  return length;
}

process.stdin.addListener("data", async function (data) {
  const userInput = data.toString().trim();
  console.log(context);
  context.push({
    role: "user",
    content: userInput,
  });
  await createChatCompletion();
});
