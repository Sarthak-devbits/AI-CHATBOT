import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

const context: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful assistant that give information about flight status and booking reservation for flights.",
  },
];

const getFlightDetails = (source: string, destination: string) => {
  if (
    source.toLocaleLowerCase() == "pune" &&
    destination.toLocaleLowerCase() == "bangalore"
  ) {
    return ["AX123", "AX732B", "AX1234"];
  } else if (source == "goa" && destination == "mumbai") {
    return ["AX456", "AX789C", "AX4567"];
  } else {
    return [];
  }
};

const bookReservationForFlight = (flightId: string) => {
  if (
    ["AX123", "AX732B", "AX1234", "AX456", "AX789C", "AX4567"].includes(
      flightId
    )
  ) {
    return `Reservation confirmed for flight ${flightId}.`;
  } else {
    return `Flight ${flightId} not found.`;
  }
};

async function callOpenAiWithTools() {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: context,
    tools: [
      {
        type: "function",
        function: {
          name: "getFlightDetails",
          description:
            "Will book the flight based on the source and destination ,Get the flight details between source and destination. will return the avaiable flights ID",
          parameters: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "The source city for the flight.",
              },
              destination: {
                type: "string",
                description: "The destination city for the flight.",
              },
            },
            required: ["source", "destination"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "bookReservationForFlight",
          description: "Will reserve a flight based on the flight Id",
          parameters: {
            type: "object",
            properties: {
              flightId: {
                type: "string",
                description: "ID of the flight to be reserved.",
              },
            },
            required: ["flightId"],
          },
        },
      },
    ],
  });

  console.log(response?.choices[0]?.message?.tool_calls);
  const willInvokeFunction =
    response?.choices[0]?.finish_reason == "tool_calls";
  if (willInvokeFunction) {
    const toolCall = response?.choices[0]?.message?.tool_calls![0];
    const toolName = toolCall?.function?.name;
    const toolArguments = toolCall?.function?.arguments;
    if (toolName == "getFlightDetails") {
      const { source, destination } = JSON.parse(toolArguments);
      const flightDetails = getFlightDetails(source, destination);
      context.push(response?.choices[0].message);
      context.push({
        role: "tool",
        content: flightDetails.join(", ") + "this are the available flights",
        tool_call_id: toolCall.id,
      });
    }
    if (toolName == "bookReservationForFlight") {
      const { flightId } = JSON.parse(toolArguments);
      const reservationResponse = bookReservationForFlight(flightId);
      context.push(response?.choices[0].message);
      context.push({
        role: "tool",
        content: reservationResponse!,
        tool_call_id: toolCall.id,
      });
    }
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: context,
    });
    console.log(secondResponse?.choices[0]?.message?.content);
    return;
  }
  //   console.log(response?.choices[0]?.message?.content);
}

process.stdin.addListener("data", async (data) => {
  const inputData = data?.toString().trim();
  context.push({
    role: "user",
    content: inputData,
  });
  callOpenAiWithTools();
});
