import { Chat } from "@/components/Chat/Chat";
import { Footer } from "@/components/Layout/Footer";
import { Navbar } from "@/components/Layout/Navbar";
import { Message } from "@/types";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const UIDL_TEMPLATE = `
uidl: "1.0.0"
nodes:
  root:
    name: "root1"
    label: "节点1"
    description: ""
    type: element
    elementType: "Root"
    parent: ~
    props:
      prop1: ""
      headSlot: { type: "slotReference", slotId: "slot1" }
    children: [node1, node2, node3] # 本质是一种依赖, 引用表达的简化
    # children: [ { type: "elementReference", nodeId: "node1" }, { type: "elementReference", nodeId: "node2" } ]
    events:
    styles:
      styles:
      nestingStyles:
      referenceStyles:
    x-lock: false
    x-hide: false
  node1:
    name: "node1"
    elementType: "Button"
    parent: "xxx"
    index: 0
    props:
      area1:
        props: {}
        children: []
      children: "Click Me"
    events:
    - type: "onClick"
      modifies:
      - "enter"
      - "prevent"
      action: "showDialog"
      callArgs:
        arg1: ""
  symbol1: // component defined in page scope
    name: "symbol1"
    type: "symbol"
    meta: {}
    args: ["slot1_item", "slot1_index"]
    elementType: "Slot"
    children: ["node-4", "node-5"]
  slot1:
    name: "slot1"
    type: "slot-element"
    args: ["slot1_item", "slot1_index"]
    elementType: "Slot"
    children: ["node-4", "node-5"]
  query1:
    name: "query1"
    label: ""
    type: query
    queryType:
  style1:
    name: "style1"
    type: "style"
    styleType: "ImportCSS"
    params: { url: "" }
  state1:
    name: "state1"
    label: "某变量"
    stateType: ""
  object1:
    name: "object1"
    type: "computed-state"
    label: "数据加工"
    definitions:
  fn1:
    type: "function"
    name: "function1"
    label: "某函数"
  action1:
  flow1:
  props-template1:
    type: "props-template"
    args: ["props_template1_item", "props_template1_index"]
    return:
      arg1: { type: "formula", formula: "props_template1_item.value" }
      arg2: { type: slotReference, slot_id: "slot3" }
preloads: [style1, state1, query1]
main: root`

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message: Message) => {
    const updatedMessages = [...messages, message];

    setMessages(updatedMessages);

    const parser = new StringOutputParser();

    const model = new ChatOpenAI({ temperature: 0, openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

    const extractResult = await model.pipe(parser).invoke([
      new SystemMessage(`你需要将用户输入的界面需求做一下提取, 如一个报名表界面, 至少应该包含一个表格, 一个图片, 一个按钮, 以及一个信息填写表单
      最终输出成这样的格式: '生成一个xx界面, 包含一个xx, 一个xx, 一个xx, 以及一个xx'`),
      new HumanMessage(message.content),
    ]);

    const UIDL_prompt = [
      new SystemMessage(`你需要将用户输入的自然语言转化成相应的UIDL格式代码;
      这是我提供给你的UIDL协议规范, 给你作为参考:'''${UIDL_TEMPLATE}''';
      最终输出为json格式的代码`),
      new HumanMessage(extractResult),
    ];
    const stream = await model.pipe(parser).stream(UIDL_prompt);

    let isFirst = true;

    for await (const chunkValue of stream) {
      if (isFirst) {
        isFirst = false;
        setMessages((messages) => [
          ...messages,
          {
            role: "assistant",
            content: chunkValue
          }
        ]);
      } else {
        setMessages((messages) => {
          const lastMessage = messages[messages.length - 1];
          const updatedMessage = {
            ...lastMessage,
            content: lastMessage.content + chunkValue
          };
          return [...messages.slice(0, -1), updatedMessage];
        });
      }
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: `我是UIDL机器人`
      }
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `我是UIDL机器人`
      }
    ]);
  }, []);

  return (
    <>
      <Head>
        <title>Chatbot UI</title>
        <meta
          name="description"
          content="A simple chatbot starter kit for OpenAI's chat model using Next.js, TypeScript, and Tailwind CSS."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>

      <div className="flex flex-col h-screen">
        <Navbar />

        <div className="flex-1 pb-4 overflow-auto sm:px-10 sm:pb-10">
          <div className="max-w-[800px] mx-auto mt-4 sm:mt-12">
            <Chat
              messages={messages}
              loading={loading}
              onSend={handleSend}
              onReset={handleReset}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
