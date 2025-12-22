"use client";

import { useChat } from "@ai-sdk/react";
import ChatInput from "@/components/chat-input";
import type { MarketAgentUIMessage } from "@/agent/market-agent";
import MarketView from "@/components/market-view";
import type { MarketUIToolInvocation } from "@/tool/market-tool";
import { Streamdown } from "streamdown";

export default function MarketChat() {
  const { status, sendMessage, messages } = useChat<MarketAgentUIMessage>();

  return (
    <div className="flex flex-col py-24 mx-auto w-full max-w-md stretch">
      {messages?.map((message) => (
        <div key={message.id} className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            {message.role}
          </div>
          <div className="space-y-2">
            {message.parts.map((part, index) => {
              switch (part.type) {
                case "text":
                  return message.role === "assistant" ? (
                    <Streamdown
                      key={index}
                      className="streamdown whitespace-pre-wrap text-sm leading-relaxed"
                    >
                      {part.text}
                    </Streamdown>
                  ) : (
                    <div key={index} className="whitespace-pre-wrap text-sm">
                      {part.text}
                    </div>
                  );

                case "step-start":
                  return index > 0 ? (
                    <div key={index} className="text-gray-500">
                      <hr className="my-2 border-gray-300" />
                    </div>
                  ) : null;

                case "tool-market": {
                  const invocation = part as MarketUIToolInvocation & {
                    toolCallId?: string;
                    id?: string;
                  };
                  return (
                    <MarketView
                      key={invocation.toolCallId ?? invocation.id ?? index}
                      invocation={invocation}
                    />
                  );
                }
              }
            })}
          </div>
        </div>
      ))}

      <ChatInput
        status={status}
        onSubmit={(text: string) => sendMessage({ text })}
      />
    </div>
  );
}
