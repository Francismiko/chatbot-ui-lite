import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

const handler = async (req: Request): Promise<Response> => {
  try {
    const { message } = await req.json();

    const parser = new StringOutputParser();

    const model = new ChatOpenAI({ temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });

    const stream = await model.pipe(parser).stream(message.content);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
