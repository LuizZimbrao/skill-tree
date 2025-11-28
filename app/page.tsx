/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

type Skill = {
  id?: number;
  name: string;
  x: number;
  y: number;
  level: number;
  description: string;
  image: string;
  maxPoints?: number;
  currentPoints?: number;
  resources?: { name: string; value: string; color: string }[];
};

type Connection = {
  id: string;
  from: number;
  to: number;
  hasControlPoint?: boolean;
  controlPoint?: { x: number; y: number };
  dotted?: boolean;
  mutuallyExclusive?: boolean;
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [connections, setConnections] = useState<
    { x1: number; y1: number; x2: number; y2: number }[]
  >([]);

  const [scale, setScale] = useState<number>(0.4);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<Skill | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 2.5;

  useEffect(() => {
    fetch("/talent-tree-config.json")
      .then((r) => r.json())
      .then((data) => {
        const skillList: Skill[] = data?.FullData?.skills ?? [];
        const connList: Connection[] = data?.FullData?.connections ?? [];

        setSkills(skillList);

        const built = connList
          .map((c) => {
            const fromSkill = skillList.find((s) => s.id === c.from);
            const toSkill = skillList.find((s) => s.id === c.to);

            if (!fromSkill || !toSkill) return null;

            return {
              x1: fromSkill.x,
              y1: fromSkill.y,
              x2: toSkill.x,
              y2: toSkill.y,
            };
          })
          .filter(Boolean) as any[];

        setConnections(built);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!skills.length || !containerRef.current) return;

    const container = containerRef.current;

    const minX = Math.min(...skills.map((s) => s.x));
    const maxX = Math.max(...skills.map((s) => s.x));
    const minY = Math.min(...skills.map((s) => s.y));
    const maxY = Math.max(...skills.map((s) => s.y));

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    const screenCenterX = container.clientWidth / 2;
    const screenCenterY = container.clientHeight / 2;

    setPan({
      x: screenCenterX - contentCenterX * scale,
      y: screenCenterY - contentCenterY * scale,
    });
  }, [skills, scale]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY;
    const zoomIntensity = 0.0018;
    const zoom = Math.exp(delta * zoomIntensity);

    const newScaleUnclamped = scale * zoom;
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, newScaleUnclamped)
    );

    const sx = (mouseX - pan.x) * (newScale / scale - 1);
    const sy = (mouseY - pan.y) * (newScale / scale - 1);

    setPan((p) => ({ x: p.x - sx, y: p.y - sy }));
    setScale(newScale);
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setIsPanning(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    document.body.classList.add("no-select");
  }
  function onMouseUp() {
    setIsPanning(false);
    lastMouseRef.current = null;
    document.body.classList.remove("no-select");
  }
  function onMouseMove(e: React.MouseEvent) {
    setCursor({ x: e.clientX, y: e.clientY });
    if (!isPanning || !lastMouseRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  function onDoubleClick() {
    setScale(0.8);
    setPan({ x: -400, y: -200 });
  }

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{
        backgroundImage:
          "linear-gradient(89.88deg,hsla(0,0%,0%,.9) 43.83%,hsla(0,0%,0%,.8) 99.93%), url('/img/banner.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
        onDoubleClick={onDoubleClick}
        className={`w-full h-full relative select-none ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: isPanning ? "none" : "transform 60ms linear",
          }}
        >
          <div
            className="
              absolute inset-0 pointer-events-none opacity-[0.06]
              bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),
              linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]
              bg-[length:120px_120px,120px_120px]
            "
          />

          <svg
            className="absolute left-0 top-0 pointer-events-none"
            width="10000"
            height="10000"
            style={{ overflow: "visible" }}
          >
            {connections.map((c, i) => (
              <g key={i}>
                <line
                  x1={c.x1}
                  y1={c.y1}
                  x2={c.x2}
                  y2={c.y2}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <line
                  x1={c.x1}
                  y1={c.y1}
                  x2={c.x2}
                  y2={c.y2}
                  stroke="rgba(255,215,0,0.06)"
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>

          {skills.map((skill) => (
            <div
              key={skill.id ?? `${skill.name}-${skill.x}-${skill.y}`}
              onMouseEnter={() => setHovered(skill)}
              onMouseLeave={() => setHovered(null)}
              className="absolute w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/10 cursor-pointer"
              style={{
                left: skill.x,
                top: skill.y,
                transform: "translate(-50%, -50%)",
                background: skill.image
                  ? `url(${skill.image}) center/cover no-repeat`
                  : "#1e1e1ecc",
              }}
            />
          ))}
        </div>

        {hovered && (
          <div
            className="fixed z-[9999] w-[320px] bg-[rgba(12,14,16,0.95)] text-white p-3 rounded-lg shadow-xl pointer-events-none"
            style={{
              left: cursor.x + 16,
              top: cursor.y + 16,
            }}
          >
            <div className="flex gap-3">
              {hovered.image ? (
                <img
                  src={hovered.image}
                  alt={hovered.name}
                  className="w-[56px] h-[56px] rounded-md object-cover"
                />
              ) : null}
              <div>
                <div className="font-bold">
                  {hovered.name} {hovered.level ? `(Lv ${hovered.level})` : ""}
                </div>
                <div className="text-[13px] opacity-90">
                  {hovered.description}
                </div>
              </div>
            </div>

            {hovered.resources?.length ? (
              <div className="mt-2 text-[13px]">
                {hovered.resources.map((r) => (
                  <div key={r.name} style={{ color: r.color }}>
                    <strong>{r.name}:</strong> {r.value}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
