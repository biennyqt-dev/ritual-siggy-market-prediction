"use client";

import { useChat } from "@ai-sdk/react";
import ChatInput from "@/components/chat-input";
import type { MarketAgentUIMessage } from "@/agent/market-agent";
import MarketView from "@/components/market-view";
import type { MarketUIToolInvocation } from "@/tool/market-tool";

export default function MarketChat() {
  const { status, sendMessage, messages } = useChat<MarketAgentUIMessage>();

  return (
    <div className="flex flex-col py-24 mx-auto w-full max-w-md stretch">
      {messages?.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          <strong>{`${message.role}: `}</strong>
          {message.parts.map((part, index) => {
            switch (part.type) {
              case "text":
                return <div key={index}>{part.text}</div>;

              case "step-start":
                return index > 0 ? (
                  <div key={index} className="text-gray-500">
                    <hr className="my-2 border-gray-300" />
                  </div>
                ) : null;

              case "tool-market": {
                return (
                  <MarketView invocation={part as MarketUIToolInvocation} />
                );
              }
            }
          })}
          <br />
        </div>
      ))}

      <ChatInput
        status={status}
        onSubmit={(text: string) => sendMessage({ text })}
      />
    </div>
  );
}
