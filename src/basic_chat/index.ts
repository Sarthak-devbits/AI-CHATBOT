import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

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
  console.log(response.choices[0].message.content);
}

process.stdin.addListener("data", async function (data) {
  const userInput = data.toString().trim();
  context.push({
    role: "user",
    content: userInput,
  });
  await createChatCompletion();
});
