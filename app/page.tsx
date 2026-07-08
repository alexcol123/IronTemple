"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Message = { from: "bot" | "user"; text: string };

function renderText(text: string) {
  const parts = text.split(/(\/[a-z][a-z0-9-]*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /^\/[a-z][a-z0-9-]*$/.test(part) ? (
      <Link key={i} href={part} className="underline font-medium">
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

const INITIAL_MESSAGE: Message = {
  from: "bot",
  text: "Iron Temple 🏋️\n\nEnter your phone number to get started.",
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"phone" | string>("phone");
  const [context, setContext] = useState<Record<string, unknown>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    addMessage({ from: "user", text });

    if (state === "phone") {
      setPhone(text);
      localStorage.setItem("it_phone", text);
      const res = await fetch(`/api/user?phone=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data.user) {
        setState("idle");
        addMessage({
          from: "bot",
          text: `Hey ${data.user.name}! 👋 Type HERE when you're at the gym.`,
        });
      } else {
        setState("idle");
        addMessage({ from: "bot", text: `Welcome! Type JOIN to sign up.` });
      }
      return;
    }

    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text, state, context }),
    });

    const data = await res.json();
    addMessage({ from: "bot", text: data.reply });
    setState(data.nextState);
    if (data.context) setContext(data.context);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 overflow-hidden gap-3">
      {/* Dev toolbar — outside the phone frame */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link
          href="/history"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          History
        </Link>
        <Link
          href="/prs"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          PRs
        </Link>
        <Link
          href="/email"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          Email
        </Link>
        <Link
          href="/admin"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          Admin
        </Link>
        <Link
          href="/profile"
          className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          My Info
        </Link>
        <Popover>
          <PopoverTrigger className="text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted transition-colors">
            Commands
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <p className="text-xs font-semibold mb-2">Available Commands</p>
            <div className="flex flex-col gap-2">
              {[
                {
                  cmd: "JOIN",
                  desc: "Sign up with your phone number",
                  when: "Any time",
                },
                {
                  cmd: "HERE",
                  desc: "Start today's workout",
                  when: "Any time",
                },
                {
                  cmd: "CHANGE",
                  desc: "Switch to a different plan",
                  when: "Any time",
                },
                {
                  cmd: "START",
                  desc: "Begin the exercise list",
                  when: "After HERE",
                },
                {
                  cmd: "SKIP",
                  desc: "Skip the current exercise",
                  when: "During workout",
                },
              ].map(({ cmd, desc, when }) => (
                <div key={cmd}>
                  <p className="text-xs font-mono font-medium">
                    {cmd}{" "}
                    <span className="font-sans font-normal text-muted-foreground">
                      — {when}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Phone frame */}
      <div className="flex flex-col w-full max-w-sm h-full sm:h-175 sm:border-8 sm:border-gray-900 sm:rounded-[3rem] overflow-hidden sm:shadow-2xl bg-background">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="w-10" />
          <div className="text-center">
            <p className="font-semibold text-sm">Iron Temple</p>
            <p className="text-xs text-muted-foreground">+1 (888) 888-8888</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 w-full **:data-[slot=scroll-area-scrollbar]:hidden">
          <div className="flex flex-col gap-3 px-1 py-1">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.from === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 px-3 py-3 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              state === "phone" ? "Enter your phone number..." : "Message"
            }
            className="rounded-full text-sm"
          />
          <Button size="sm" onClick={handleSend} className="rounded-full px-4">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
