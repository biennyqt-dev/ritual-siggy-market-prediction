"use client";

import { Download, Share2, X } from "lucide-react";
import { useRef } from "react";
import type { PositionRecord } from "@/lib/types";

export function ShareWin({
  position,
  onClose,
}: {
  position: PositionRecord;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profit = Math.max(0.01, position.amount * (100 / position.probability - 1));

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#f7fff8";
    context.fillRect(0, 0, 1200, 630);
    const gradient = context.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#0f7849");
    gradient.addColorStop(1, "#8ee4ad");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(1050, 100, 390, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#092f20";
    context.font = "700 30px Arial";
    context.fillText("SIGGY PREDICTION MARKET", 72, 78);
    context.fillStyle = "#168958";
    context.font = "700 18px monospace";
    context.fillText("SETTLED ON RITUAL CHAIN", 74, 116);
    context.fillStyle = "#092f20";
    context.font = "700 68px Arial";
    context.fillText("I READ THE SIGNAL.", 72, 236);
    context.fillText("I WON THE MARKET.", 72, 310);
    context.fillStyle = "#526159";
    context.font = "28px Arial";
    const words = position.question.split(" ");
    let line = "";
    let y = 386;
    for (const word of words) {
      const test = `${line}${word} `;
      if (context.measureText(test).width > 780) {
        context.fillText(line, 74, y);
        line = `${word} `;
        y += 38;
      } else {
        line = test;
      }
    }
    context.fillText(line, 74, y);
    context.fillStyle = "#ffffff";
    context.fillRect(848, 328, 280, 174);
    context.fillStyle = "#0f7849";
    context.font = "700 24px monospace";
    context.fillText(`${position.side} POSITION`, 876, 378);
    context.font = "700 54px Arial";
    context.fillText(`+${profit.toFixed(2)} R`, 876, 448);
    context.fillStyle = "#526159";
    context.font = "20px Arial";
    context.fillText("siggy.market", 74, 566);
  }

  function download() {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `siggy-win-${position.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function shareOnX() {
    const text = encodeURIComponent(
      `I read the signal and won "${position.question}" on SIGGY Prediction Market, built on Ritual Chain.`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Share your win"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Share your win</span>
            <h2>Make the call visible.</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <X size={19} />
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={1200}
          height={630}
          className="share-canvas"
        />
        <div className="share-preview" aria-hidden="true">
          <span>SIGGY / SETTLED ON RITUAL</span>
          <strong>I read the signal.<br />I won the market.</strong>
          <p>{position.question}</p>
          <b>{position.side} · +{profit.toFixed(2)} R</b>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={download}>
            <Download size={16} /> Save image
          </button>
          <button type="button" className="primary-button" onClick={shareOnX}>
            <Share2 size={16} /> Share on X
          </button>
        </div>
      </section>
    </div>
  );
}
