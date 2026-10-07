import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChartColumn,
  Database,
  Headset,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4";
const SITE = "https://www.theravenlabs.com/";

type Vars = CSSProperties & { [k: `--${string}`]: string | number };

interface System {
  k: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  /** position in % of the stage */
  x: number;
  y: number;
  /** depth in px, plus a tilt toward the viewer */
  z: number;
  ry: number;
  rx: number;
  /** float duration / delay */
  t: number;
  d: number;
  /** kept on small screens */
  mobile?: boolean;
}

const SYSTEMS: System[] = [
  { k: "crm", label: "CRM", sub: "Customers & pipeline", icon: Users, x: 22, y: 15, z: 50, ry: 12, rx: -4, t: 6.4, d: -1, mobile: true },
  { k: "erp", label: "ERP", sub: "Operations & finance", icon: Boxes, x: 78, y: 15, z: 20, ry: -12, rx: -4, t: 7.2, d: -3, mobile: true },
  { k: "customer", label: "CUSTOMER", sub: "Support & comms", icon: Headset, x: 91, y: 52, z: 70, ry: -16, rx: 0, t: 6.8, d: -2 },
  { k: "analytics", label: "ANALYTICS", sub: "Reports & insight", icon: ChartColumn, x: 73, y: 88, z: 30, ry: -10, rx: 5, t: 7.6, d: -4 },
  { k: "data", label: "DATA", sub: "Warehouses & files", icon: Database, x: 27, y: 88, z: 60, ry: 10, rx: 5, t: 6.6, d: -5, mobile: true },
  { k: "automation", label: "AUTOMATION", sub: "Workflows & triggers", icon: Workflow, x: 9, y: 52, z: 10, ry: 16, rx: 0, t: 7, d: -2.5 },
];

const LABELS: { text: string; x: number; y: number; d: number; mobile?: boolean }[] = [
  { text: "REAL-TIME DATA", x: 50, y: 4, d: 0, mobile: true },
  { text: "CONNECTED", x: 90, y: 31, d: -1.6 },
  { text: "AI PROCESSING", x: 50, y: 23, d: -3.2, mobile: true },
  { text: "SYSTEM SYNC", x: 10, y: 31, d: -2.4 },
  { text: "AUTOMATION ACTIVE", x: 50, y: 77, d: -4, mobile: true },
  { text: "INTELLIGENT ACTION", x: 50, y: 97, d: -0.8 },
];

/** quadratic path from the AI core (300,300) to a system, in a 600×600 space */
function pathTo(s: System, i: number): string {
  const C = 300;
  const px = s.x * 6;
  const py = s.y * 6;
  const dx = px - C;
  const dy = py - C;
  const len = Math.hypot(dx, dy) || 1;
  const off = len * 0.14 * (i % 2 ? -1 : 1);
  const mx = (C + px) / 2 + (-dy / len) * off;
  const my = (C + py) / 2 + (dx / len) * off;
  return `M${C} ${C} Q${mx.toFixed(1)} ${my.toFixed(1)} ${px} ${py}`;
}

/** tiny deterministic generator so particles are stable between renders */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const stageParticles = (() => {
  const r = rng(7);
  return Array.from({ length: 12 }, (_, i) => ({
    x: 8 + r() * 84,
    y: 8 + r() * 84,
    size: 2 + Math.round(r() * 2),
    dx: (r() - 0.5) * 90,
    dy: (r() - 0.5) * 90,
    dur: 8 + r() * 8,
    delay: -r() * 12,
    soft: r() > 0.55,
    mobile: i % 2 === 0,
  }));
})();

const bgParticles = (() => {
  const r = rng(31);
  return Array.from({ length: 16 }, () => ({
    x: r() * 100,
    y: r() * 100,
    size: 2 + Math.round(r()),
    dx: (r() - 0.5) * 60,
    dy: (r() - 0.5) * 60,
    dur: 12 + r() * 10,
    delay: -r() * 16,
    accent: r() > 0.6,
  }));
})();

/* -------------------------------------------------------------------------- */
/*  Styles (keyframes + interaction rules that Tailwind utilities can't hold)  */
/* -------------------------------------------------------------------------- */

const CSS = `
.rl { --a:#5b5bd6; --a-rgb:91,91,214; }
.p3d { transform-style: preserve-3d; }

/* entrances */
@keyframes e-down { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:none } }
@keyframes e-up   { from { opacity:0; transform:translateY(20px) }  to { opacity:1; transform:none } }
@keyframes e-scale{ from { opacity:0; transform:scale(.94) }        to { opacity:1; transform:none } }
@keyframes e-card { from { opacity:0; transform:translateZ(-60px) scale(.88) } to { opacity:1; transform:none } }
@keyframes e-fade { from { opacity:0 } to { opacity:1 } }
.e-down  { animation: e-down .7s cubic-bezier(.2,.7,.2,1) both; }
.e-up    { animation: e-up .8s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d,0s); }
.e-scale { animation: e-scale 1s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d,0s); }
.e-card  { animation: e-card .9s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d,0s); }

/* continuous motion */
@keyframes core-float {
  0%,100% { transform: translateY(0) rotateX(4deg) rotateY(-9deg); }
  50%     { transform: translateY(-11px) rotateX(-3deg) rotateY(9deg); }
}
@keyframes card-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
@keyframes dash { to { stroke-dashoffset: -64; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ring-a { from { transform: rotateX(72deg) rotateZ(0deg); } to { transform: rotateX(72deg) rotateZ(360deg); } }
@keyframes ring-b { from { transform: rotateX(60deg) rotateY(-26deg) rotateZ(360deg); } to { transform: rotateX(60deg) rotateY(-26deg) rotateZ(0deg); } }
@keyframes drift {
  0%   { transform: translate(0,0); opacity: 0; }
  15%  { opacity: .85; }
  50%  { transform: translate(var(--dx), var(--dy)); opacity: .5; }
  85%  { opacity: .7; }
  100% { transform: translate(calc(var(--dx) * 1.8), calc(var(--dy) * .3)); opacity: 0; }
}
@keyframes label { 0%,100% { opacity:.35; transform: translateY(0) } 50% { opacity:.7; transform: translateY(-5px) } }
@keyframes blob-a { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(6vw,4vh) scale(1.12) } }
@keyframes blob-b { 0%,100% { transform: translate(0,0) scale(1.05) } 50% { transform: translate(-5vw,-5vh) scale(.94) } }
@keyframes blob-c { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-3vw,6vh) scale(1.1) } }
@keyframes ping-dot { 0% { transform: scale(1); opacity:.55 } 100% { transform: scale(2.8); opacity:0 } }
@keyframes underline { from { stroke-dashoffset: 220 } to { stroke-dashoffset: 0 } }
@keyframes floor { 0%,100% { transform: scaleX(1); opacity:.55 } 50% { transform: scaleX(.86); opacity:.35 } }
@keyframes pulse-ring { 0% { transform: scale(.6); opacity:.5 } 100% { transform: scale(1.7); opacity:0 } }

.loop-float { animation: card-float var(--t,7s) ease-in-out var(--d,0s) infinite; }
.loop-core  { animation: core-float 9s ease-in-out infinite; }
.loop-spin  { animation: spin var(--t,60s) linear infinite; transform-box: fill-box; transform-origin: center; }
.ring-a { animation: ring-a 18s linear infinite; }
.ring-b { animation: ring-b 26s linear infinite; }
.loop-drift { animation: drift var(--dur) ease-in-out var(--delay) infinite; }
.loop-label { animation: label 6s ease-in-out var(--d,0s) infinite; }
.loop-ping  { animation: ping-dot 2.2s ease-out infinite; }
.loop-floor { animation: floor 9s ease-in-out infinite; }

/* SVG lines */
.base { fill:none; stroke: rgba(23,23,23,.09); stroke-width: 1; transition: stroke .35s; }
.flow { fill:none; stroke: rgb(var(--a-rgb)); stroke-width: 1.4; stroke-linecap: round; stroke-dasharray: 6 10;
        opacity: .5; transition: opacity .35s, stroke-width .35s; animation: dash 3.2s linear infinite; }
.flow-rev { animation-direction: reverse; }

/* system cards */
.face { transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, border-color .35s; }
.pos:hover .face { transform: translateZ(20px) scale(1.03); border-color: rgba(var(--a-rgb), .28);
                   box-shadow: 0 30px 60px -14px rgba(23,23,23,.2), 0 4px 10px rgba(23,23,23,.05), 0 0 0 1px rgba(var(--a-rgb), .08); }
.arrow { opacity:0; transform: translate(-3px,3px); transition: opacity .3s, transform .3s; }
.pos:hover .arrow { opacity:1; transform:none; }
.pulse { opacity:0; }
.pos:hover .pulse { animation: pulse-ring 1.1s ease-out infinite; }

/* AI core */
.core-hover { transition: transform .5s cubic-bezier(.2,.7,.2,1); }
.core:hover .core-hover { transform: scale(1.03); }
.glow { opacity:.28; transition: opacity .5s; }
.core:hover .glow { opacity:.55; }
.swap-a, .swap-b { transition: opacity .45s, transform .45s; }
.swap-b { opacity:0; transform: translateY(4px); }
.core:hover .swap-a { opacity:0; transform: translateY(-4px); }
.core:hover .swap-b { opacity:1; transform:none; }

/* hovering the core speeds up the system */
.stage:has(.core:hover) .flow   { animation-duration: 1.3s; opacity: .8; }
.stage:has(.core:hover) .ring-a { animation-duration: 9s; }
.stage:has(.core:hover) .ring-b { animation-duration: 13s; }
.pt-wrap { opacity:.6; transition: opacity .5s; }
.stage:has(.core:hover) .pt-wrap { opacity:1; }

${SYSTEMS.map(
  (s) => `.stage:has([data-k="${s.k}"]:hover) .ln-${s.k} .flow { opacity:1; stroke-width:2; }
.stage:has([data-k="${s.k}"]:hover) .ln-${s.k} .base { stroke: rgba(var(--a-rgb), .32); }`,
).join("\n")}

/* reduced motion: keep simple fades only */
@media (prefers-reduced-motion: reduce) {
  .e-down, .e-up, .e-scale, .e-card { animation: e-fade .4s ease both !important; animation-delay: 0s !important; }
  .loop-float, .loop-core, .loop-spin, .ring-a, .ring-b, .loop-drift, .loop-label, .loop-ping, .loop-floor,
  .flow, .blob { animation: none !important; }
  .pt-wrap, .bg-pt { display: none; }
  .pos:hover .face, .core:hover .core-hover { transform: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <a href={SITE} className="flex items-center gap-2.5 px-1" aria-label="Raven Labs">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#171717]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M4 17.5 11.5 5l1.6 5.2L20 7.5 12.6 19l-1.8-5.4Z" fill="#fff" />
          <path d="M11.5 5l1.6 5.2" stroke="var(--a)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[15px] font-medium tracking-[-0.02em] text-[#171717]">Raven Labs</span>
    </a>
  );
}

const pill =
  "pointer-events-auto rounded-full border border-black/[0.06] bg-white/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.06)]";

function Nav() {
  const links = [
    { t: "Services", m: true },
    { t: "Solutions" },
    { t: "About" },
    { t: "Contact", m: true },
  ];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-5">
      <nav className="e-down flex items-center gap-2" aria-label="Primary">
        <div className={`${pill} py-1.5 pl-2 pr-3.5`}>
          <Logo />
        </div>
        <ul className={`${pill} flex items-center gap-0.5 p-1`}>
          {links.map((l) => (
            <li key={l.t} className={l.m ? "" : "hidden sm:block"}>
              <a
                href={SITE}
                className="block rounded-full px-3 py-1.5 text-[13px] text-gray-600 transition-colors hover:bg-black/[0.04] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-[var(--a)] sm:px-3.5"
              >
                {l.t}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Background({ reduced }: { reduced: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* cinematic video texture, kept very quiet */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        src={VIDEO_SRC}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,247,245,0.9)_0%,rgba(255,255,255,0.8)_45%,rgba(247,247,245,0.93)_100%)]" />

      {/* soft moving light */}
      <div className="blob absolute -left-[10%] top-[8%] h-[46vmax] w-[46vmax] rounded-full bg-[rgba(91,91,214,0.12)] blur-[90px]" style={{ animation: "blob-a 22s ease-in-out infinite" }} />
      <div className="blob absolute -right-[12%] top-[22%] h-[42vmax] w-[42vmax] rounded-full bg-[rgba(190,190,205,0.35)] blur-[100px]" style={{ animation: "blob-b 28s ease-in-out infinite" }} />
      <div className="blob absolute bottom-[-12%] left-[30%] h-[34vmax] w-[34vmax] rounded-full bg-[rgba(120,120,230,0.09)] blur-[90px]" style={{ animation: "blob-c 25s ease-in-out infinite" }} />

      {/* faint technical grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23,23,23,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(23,23,23,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 62% 42%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 62% 42%, #000 0%, transparent 75%)",
        }}
      />

      {/* fine technical lines */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" fill="none">
        <line x1="0" y1="18%" x2="100%" y2="18%" stroke="rgba(23,23,23,0.04)" />
        <line x1="0" y1="82%" x2="100%" y2="82%" stroke="rgba(23,23,23,0.04)" />
        <line x1="38%" y1="0" x2="38%" y2="100%" stroke="rgba(23,23,23,0.035)" />
      </svg>

      {/* particles drift with scroll */}
      <div className="absolute inset-0" style={{ transform: "translateY(calc(var(--scroll, 0) * -0.15px))" }}>
        {bgParticles.map((p, i) => (
          <span
            key={i}
            className="bg-pt loop-drift absolute rounded-full"
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: p.accent ? "rgba(91,91,214,0.45)" : "rgba(23,23,23,0.22)",
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--dur": `${p.dur}s`,
                "--delay": `${p.delay}s`,
              } as Vars
            }
          />
        ))}
      </div>
    </div>
  );
}

const glass =
  "border border-black/[0.06] bg-white/75 backdrop-blur-xl shadow-[0_18px_50px_-12px_rgba(23,23,23,0.14),0_2px_6px_rgba(23,23,23,0.04)]";

function SystemCard({ s, i }: { s: System; i: number }) {
  const Icon = s.icon;
  return (
    <div
      data-k={s.k}
      className={`pos p3d absolute w-[27%] sm:w-[25%] ${s.mobile ? "" : "hidden sm:block"}`}
      style={{
        left: `${s.x}%`,
        top: `${s.y}%`,
        transform: `translate(-50%,-50%) translateZ(${s.z}px) rotateY(${s.ry}deg) rotateX(${s.rx}deg)`,
      }}
    >
      <div className="e-card p3d" style={{ "--d": `${0.45 + i * 0.09}s` } as Vars}>
        <div className="loop-float p3d" style={{ "--t": `${s.t}s`, "--d": `${s.d}s` } as Vars}>
          <div className={`face relative rounded-2xl p-2 sm:rounded-[18px] sm:p-3 ${glass}`}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[rgba(91,91,214,0.09)] text-[var(--a)] sm:h-7 sm:w-7 sm:rounded-[10px]">
                <span className="pulse absolute inset-0 rounded-[inherit] border border-[var(--a)]" />
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[9px] font-medium tracking-[0.14em] text-[#171717] sm:text-[10px]">
                {s.label}
              </span>
              <ArrowUpRight className="arrow hidden h-3 w-3 shrink-0 text-[var(--a)] sm:block" strokeWidth={2} />
            </div>
            <div className="mt-2.5 hidden sm:block">
              <p className="truncate text-[9.5px] text-gray-400">{s.sub}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-1 w-8 rounded-full bg-black/10" />
                <span className="h-1 w-5 rounded-full bg-[rgba(91,91,214,0.4)]" />
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Lines({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full overflow-visible" fill="none">
      {/* orbit guides */}
      <circle cx="300" cy="300" r="238" stroke="rgba(23,23,23,0.07)" strokeDasharray="2 7" />
      <g className="loop-spin" style={{ "--t": "90s" } as Vars}>
        <circle cx="300" cy="300" r="282" stroke="rgba(91,91,214,0.18)" strokeDasharray="60 320" strokeLinecap="round" />
      </g>
      <g className="loop-spin" style={{ "--t": "140s", animationDirection: "reverse" } as Vars}>
        <circle cx="300" cy="300" r="196" stroke="rgba(23,23,23,0.08)" strokeDasharray="1 11" />
        <circle cx="300" cy="104" r="2.5" fill="rgba(91,91,214,0.55)" />
      </g>
      {/* registration marks */}
      {[[18, 18], [582, 18], [18, 582], [582, 582]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} stroke="rgba(23,23,23,0.16)" />
      ))}

      {SYSTEMS.map((s, i) => {
        const d = pathTo(s, i);
        const rev = i % 2 === 1;
        const dur = 3.4 + (i % 3) * 0.5;
        return (
          <g key={s.k} className={`ln-${s.k} ${s.mobile ? "" : "hidden sm:inline"}`}>
            <path d={d} className="base" />
            <path d={d} className={`flow ${rev ? "flow-rev" : ""}`} />
            {!reduced && (
              <g opacity="0">
                <circle r="8" fill="rgba(91,91,214,0.16)" />
                <circle r="3" fill="var(--a)" />
                <animateMotion
                  dur={`${dur}s`}
                  begin={`${i * 0.55}s`}
                  repeatCount="indefinite"
                  path={d}
                  keyPoints={rev ? "1;0" : "0;1"}
                  keyTimes="0;1"
                  calcMode="linear"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.15;0.85;1"
                  dur={`${dur}s`}
                  begin={`${i * 0.55}s`}
                  repeatCount="indefinite"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Core() {
  return (
    <div
      className="core p3d absolute left-1/2 top-1/2 aspect-square w-[44%] rounded-full"
      style={{ transform: "translate(-50%,-50%) translateZ(60px)" }}
    >
      <div className="e-scale p3d h-full w-full" style={{ "--d": "0.25s" } as Vars}>
        <div className="core-hover p3d h-full w-full">
          <div className="loop-core p3d relative h-full w-full">
            {/* ambient glow */}
            <div className="glow absolute -inset-[16%] rounded-full bg-[radial-gradient(circle,rgba(91,91,214,0.9)_0%,rgba(91,91,214,0)_68%)] " />

            {/* stacked ceramic / acrylic layers for thickness */}
            <div className="absolute inset-0 rounded-full border border-white/80 bg-[radial-gradient(circle_at_30%_22%,#fff_0%,#f4f4f2_52%,#e4e4ea_100%)] shadow-[0_8px_20px_rgba(23,23,23,0.06),inset_0_-14px_30px_rgba(91,91,214,0.10),inset_0_2px_6px_rgba(255,255,255,0.9)]" />
            <div className="absolute inset-[7%] rounded-full border border-black/[0.05] bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.95),rgba(236,236,242,0.7))] [transform:translateZ(10px)]" />
            <div className="absolute inset-[14%] rounded-full border border-white/70 bg-white/40 shadow-[inset_0_0_30px_rgba(91,91,214,0.12)] [transform:translateZ(20px)]" />

            {/* tilted orbit rings, they pass in front of and behind the orb */}
            <div className="ring-a pointer-events-none absolute -inset-[24%] rounded-full border border-[rgba(91,91,214,0.28)]">
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--a)] shadow-[0_0_14px_3px_rgba(91,91,214,0.45)]" />
            </div>
            <div className="ring-b pointer-events-none absolute -inset-[12%] hidden rounded-full border border-dashed border-black/[0.12] sm:block">
              <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#171717]/70" />
            </div>

            {/* label */}
            <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full text-center [transform:translateZ(36px)]">
              <span className="text-[7px] font-medium tracking-[0.34em] text-gray-400 sm:text-[8px]">RAVEN</span>
              <span className="text-[2.1rem] font-medium leading-none tracking-[-0.05em] text-[#171717] sm:text-[3.4rem]">AI</span>
              <span className="relative mt-1.5 h-[20px] w-full sm:mt-2.5">
                <span className="swap-a absolute inset-x-0 text-[7px] font-medium tracking-[0.3em] text-gray-500 sm:text-[8.5px]">CORE</span>
                <span className="swap-b absolute inset-x-0 text-[6.5px] font-medium leading-[1.55] tracking-[0.2em] text-[var(--a)] sm:text-[8px]">
                  INTELLIGENCE
                  <br />
                  ACTIVE
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stage({ reduced }: { reduced: boolean }) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const fine = useMedia("(hover: hover) and (pointer: fine)");

  // Mouse parallax: writes CSS variables directly, no React re-renders.
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || reduced || !fine) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty("--ry", `${cx.toFixed(3)}deg`);
      el.style.setProperty("--rx", `${cy.toFixed(3)}deg`);
      raf = Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2 * 6;   // max 6deg
      ty = -(e.clientY / window.innerHeight - 0.5) * 2 * 5; // max 5deg
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduced, fine]);

  return (
    <div className="e-scale" style={{ "--d": "0.15s" } as Vars}>
      <div
        role="img"
        aria-label="Illustration of the Raven Labs AI core connected to CRM, ERP, data, customer, automation and analytics systems"
        className="stage relative mx-auto aspect-square w-full max-w-[460px] sm:max-w-[560px] lg:ml-auto lg:w-[min(100%,calc(100vh-7rem),700px)] lg:max-w-none"
        style={{ perspective: "1400px" }}
      >
        <div
          ref={tiltRef}
          className="p3d absolute inset-0 will-change-transform"
          style={{
            transform:
              "translateY(calc(var(--scroll, 0) * -0.08px)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          }}
        >
          {/* floor shadow */}
          <div className="loop-floor absolute bottom-[8%] left-1/2 h-[5%] w-[40%] -translate-x-1/2 rounded-full bg-black/15 blur-2xl [transform:translateZ(-80px)]" />

          <Lines reduced={reduced} />

          {/* travelling data particles */}
          {stageParticles.map((p, i) => (
            <span key={i} className={`pt-wrap absolute ${p.mobile ? "" : "hidden sm:block"}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <span
                className="loop-drift block rounded-full blur-[1px]"
                style={
                  {
                    width: p.size,
                    height: p.size,
                    background: p.soft ? "rgba(91,91,214,0.5)" : "rgba(91,91,214,0.9)",
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`,
                    "--dur": `${p.dur}s`,
                    "--delay": `${p.delay}s`,
                  } as Vars
                }
              />
            </span>
          ))}

          {/* floating data labels */}
          {LABELS.map((l, i) => (
            <span
              key={l.text}
              className={`e-up absolute -translate-x-1/2 -translate-y-1/2 ${l.mobile ? "" : "hidden sm:block"}`}
              style={{ left: `${l.x}%`, top: `${l.y}%`, "--d": `${0.9 + i * 0.08}s` } as Vars}
            >
              <span
                className="loop-label flex items-center gap-1.5 whitespace-nowrap text-[7.5px] font-medium tracking-[0.2em] text-gray-500 sm:text-[9px]"
                style={{ "--d": `${l.d}s` } as Vars}
              >
                <span className="h-1 w-1 rounded-full bg-[var(--a)]" />
                {l.text}
              </span>
            </span>
          ))}

          {SYSTEMS.map((s, i) => (
            <SystemCard key={s.k} s={s} i={i} />
          ))}

          <Core />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");

  // Scroll drives one CSS variable; the visual and particles read it in CSS.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduced) return;
    const onScroll = () => el.style.setProperty("--scroll", String(Math.min(window.scrollY, 600)));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  return (
    <div ref={rootRef} className="rl relative min-h-screen overflow-hidden bg-[#f7f7f5] text-[#171717] antialiased">
      <style>{CSS}</style>
      <Background reduced={reduced} />
      <Nav />

      <main className="relative z-10">
        <section className="flex min-h-screen items-center px-5 pb-10 pt-28 sm:px-8 lg:px-14 lg:pt-24">
          <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-8">
            {/* LEFT */}
            <div className="max-w-[520px]">
                <div className="e-up flex flex-wrap items-center gap-x-4 gap-y-2" style={{ "--d": "0.1s" } as Vars}>
                  <span className="text-xs font-medium tracking-[0.18em] text-[var(--a)]">AI AUTOMATION &amp; INTEGRATION</span>
                  <span className="flex items-center gap-2 text-[10px] font-medium tracking-[0.16em] text-gray-500">
                    <span className="relative flex h-2 w-2">
                      <span className="loop-ping absolute inset-0 rounded-full bg-[var(--a)]" />
                      <span className="relative h-2 w-2 rounded-full bg-[var(--a)]" />
                    </span>
                    AI SYSTEM READY
                  </span>
                </div>

                <h1
                  className="e-up mt-6 text-[2.5rem] font-medium leading-[0.95] tracking-[-0.05em] text-[#171717] min-[420px]:text-[3rem] sm:text-[4rem] lg:text-[5rem]"
                  style={{ "--d": "0.2s" } as Vars}
                >
                  Make Your Business
                  <br />
                  <span className="relative inline-block text-[var(--a)]">
                    Work Smarter.
                    <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-[6px] w-full" fill="none" aria-hidden="true">
                      <path
                        d="M2 5 C 50 1, 120 1, 198 4"
                        stroke="var(--a)"
                        strokeOpacity="0.35"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="220"
                        style={{ animation: reduced ? undefined : "underline 1.2s cubic-bezier(.2,.7,.2,1) 1s both" }}
                      />
                    </svg>
                  </span>
                </h1>

                <p
                  className="e-up mt-7 max-w-md text-[14px] leading-relaxed text-gray-500 sm:text-[16px]"
                  style={{ "--d": "0.32s" } as Vars}
                >
                  Connect your systems, automate repetitive work and turn business data into intelligent action.
                </p>

                <div className="e-up mt-9" style={{ "--d": "0.44s" } as Vars}>
                  <a
                    href={SITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-[#171717]/80 bg-white px-7 py-3.5 text-[14px] font-medium text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--a)] hover:bg-[var(--a)] hover:text-white hover:shadow-[0_14px_34px_rgba(91,91,214,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--a)] sm:w-auto"
                  >
                    Book an AI Consultation
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.8} />
                  </a>
                </div>

                <p
                  className="e-up mt-10 text-[10px] font-medium tracking-[0.22em] text-gray-400"
                  style={{ "--d": "0.56s" } as Vars}
                >
                  AI • AUTOMATION • INTEGRATION • INTELLIGENCE
                </p>
            </div>

            {/* RIGHT */}
            <Stage reduced={reduced} />
          </div>
        </section>

        <footer className="px-5 pb-14 sm:px-8 lg:px-14">
          <div className="e-up mx-auto grid max-w-[1400px] gap-4 border-t border-black/[0.07] pt-6 text-[12px] text-gray-500 sm:grid-cols-3 sm:text-[13px]" style={{ "--d": "0.9s" } as Vars}>
            {["Connect your systems.", "Automate repetitive work.", "Turn business data into intelligent action."].map((t, i) => (
              <p key={t} className="flex gap-3">
                <span className="font-medium tracking-[0.16em] text-[var(--a)]">0{i + 1}</span>
                {t}
              </p>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}
