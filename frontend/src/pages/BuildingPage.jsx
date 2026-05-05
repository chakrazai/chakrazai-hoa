import { useState } from 'react';
import { Layers, X, Download, ZoomIn, Droplets, Zap, Compass, Building2, Calendar, FileText, LayoutTemplate } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Badge, Button, SectionHeader, Tabs, MetricCard } from '../components/ui';

// ─── Blueprint SVG Components ─────────────────────────────────────────────────

function BpGrid({ w, h, step = 20 }) {
  return (
    <g opacity="0.25">
      {Array.from({ length: Math.ceil(w / step) + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={h} stroke="#60a5fa" strokeWidth="0.5" />
      ))}
      {Array.from({ length: Math.ceil(h / step) + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * step} x2={w} y2={i * step} stroke="#60a5fa" strokeWidth="0.5" />
      ))}
    </g>
  );
}

function Room({ x, y, w, h, label, sub, hi }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={hi ? '#102a47' : '#081624'} stroke={hi ? '#38bdf8' : '#7dd3fc'} strokeWidth={hi ? 2 : 1.2} />
      {label && <text x={x + w / 2} y={y + h / 2 - (sub ? 6 : 0)} textAnchor="middle" fill={hi ? '#7dd3fc' : '#93c5fd'} fontSize="8" fontFamily="monospace" fontWeight="bold">{label}</text>}
      {sub && <text x={x + w / 2} y={y + h / 2 + 7} textAnchor="middle" fill="#3d6a8a" fontSize="6.5" fontFamily="monospace">{sub}</text>}
    </g>
  );
}

function DimLine({ x1, y1, x2, y2, label, vertical }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1d4ed8" strokeWidth="0.75" markerEnd="url(#arr)" />
      <text x={mx + (vertical ? -8 : 0)} y={my + (vertical ? 0 : -4)} textAnchor="middle"
        fill="#3b82f6" fontSize="6.5" fontFamily="monospace"
        transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}>{label}</text>
    </g>
  );
}

function TitleBlock({ text }) {
  return (
    <g>
      <rect x={10} y={345} width={540} height={16} fill="#071120" stroke="#1e3a5c" strokeWidth="0.5" />
      <text x={280} y={356} textAnchor="middle" fill="#3d6a8a" fontSize="7" fontFamily="monospace">{text}</text>
    </g>
  );
}

// Ground floor — lobby + 2 units + parking
function GroundFloorSVG() {
  return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1d4ed8" />
        </marker>
      </defs>
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      <rect x={10} y={10} width={540} height={335} fill="none" stroke="#3b82f6" strokeWidth="2" />

      {/* Lobby */}
      <Room x={10} y={10} w={200} h={100} label="LOBBY" sub="Common Entry · 1,200 sf" />
      {/* Mailroom */}
      <Room x={210} y={10} w={100} h={60} label="MAILROOM" sub="240 sf" />
      {/* Management */}
      <Room x={310} y={10} w={120} h={60} label="MANAGEMENT" sub="Office · 360 sf" />
      {/* Utility */}
      <Room x={430} y={10} w={120} h={60} label="UTILITY" sub="Electric / Mech." />

      {/* Corridor */}
      <rect x={10} y={110} width={540} height={30} fill="#04090f" stroke="#1e40af" strokeWidth="1" strokeDasharray="5,3" />
      <text x={280} y={129} textAnchor="middle" fill="#2563eb" fontSize="8" fontFamily="monospace">MAIN CORRIDOR · 86'-0"</text>

      {/* Unit G-1 */}
      <Room x={10} y={140} w={255} h={85} label="UNIT G-1" sub="2 BED · 1,050 sf" />
      <Room x={10} y={140} w={110} h={55} label="LIVING" sub="320 sf" />
      <Room x={120} y={140} w={80} h={55} label="KITCHEN" sub="180 sf" />
      <Room x={200} y={140} w={65} h={55} label="DINING" sub="145 sf" />
      <Room x={10} y={195} w={90} h={30} label="BED 1" sub="240 sf" />
      <Room x={100} y={195} w={80} h={30} label="BED 2" sub="175 sf" />
      <Room x={180} y={195} w={85} h={30} label="BATH + ENTRY" sub="95 sf" />

      {/* Stairs / Elevator */}
      <Room x={265} y={140} w={55} h={85} label="ELEV" sub="★" />
      <Room x={320} y={140} w={55} h={85} label="STAIR" sub="↑↓" />

      {/* Unit G-2 */}
      <Room x={375} y={140} w={175} h={85} label="UNIT G-2" sub="1 BED · 780 sf" />
      <Room x={375} y={140} w={90} h={55} label="LIVING" sub="280 sf" />
      <Room x={465} y={140} w={85} h={55} label="KITCHEN" sub="165 sf" />
      <Room x={375} y={195} w={90} h={30} label="BEDROOM" sub="210 sf" />
      <Room x={465} y={195} w={85} h={30} label="BATH + ENTRY" sub="85 sf" />

      {/* Parking */}
      <Room x={10} y={225} w={540} height={100} label="UNDERGROUND PARKING GARAGE" sub="42 STALLS · ENTRY FROM EAST SIDE" />
      {Array.from({ length: 14 }).map((_, i) => (
        <g key={i}>
          <rect x={20 + i * 37} y={235} width={32} height={18} fill="none" stroke="#1e40af" strokeWidth="0.75" />
          <text x={36 + i * 37} y={247} textAnchor="middle" fill="#2563eb" fontSize="6" fontFamily="monospace">P-{i + 1}</text>
        </g>
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <g key={i}>
          <rect x={20 + i * 37} y={255} width={32} height={18} fill="none" stroke="#1e40af" strokeWidth="0.75" />
          <text x={36 + i * 37} y={267} textAnchor="middle" fill="#2563eb" fontSize="6" fontFamily="monospace">P-{i + 15}</text>
        </g>
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <g key={i}>
          <rect x={20 + i * 37} y={295} width={32} height={18} fill="none" stroke="#1e40af" strokeWidth="0.75" />
          <text x={36 + i * 37} y={307} textAnchor="middle" fill="#2563eb" fontSize="6" fontFamily="monospace">P-{i + 29}</text>
        </g>
      ))}

      <DimLine x1={10} y1={5} x2={550} y2={5} label="86'-0"" />
      <TitleBlock text="OAKWOOD ESTATES HOA · GROUND FLOOR PLAN · DWG-A1.0 · SCALE 1:100 · REV D" />
    </svg>
  );
}

// Standard floor — 4 units
function StandardFloorSVG({ floorNum = 2, highlightUnit = null }) {
  return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <defs>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1d4ed8" />
        </marker>
      </defs>
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      <rect x={10} y={10} width={540} height={335} fill="none" stroke="#3b82f6" strokeWidth="2" />

      {/* NW Unit A */}
      <Room x={10} y={10} w={230} h={155} label={`UNIT ${floorNum}A`} sub="2 BED · 1,050 sf" hi={highlightUnit === 'A'} />
      <Room x={10} y={10} w={120} h={90} label="LIVING" sub="320 sf" hi={highlightUnit === 'A'} />
      <Room x={130} y={10} w={110} h={90} label="KITCHEN / DINING" sub="280 sf" hi={highlightUnit === 'A'} />
      <Room x={10} y={100} w={95} h={65} label="BEDROOM 1" sub="240 sf" hi={highlightUnit === 'A'} />
      <Room x={105} y={100} w={80} h={65} label="BEDROOM 2" sub="185 sf" hi={highlightUnit === 'A'} />
      <Room x={185} y={100} w={55} h={65} label="BATH" sub="55 sf" hi={highlightUnit === 'A'} />

      {/* Central core */}
      <rect x={240} y={10} width={80} height={335} fill="#040c16" stroke="#1e40af" strokeWidth="1.2" strokeDasharray="4,3" />
      <Room x={245} y={10} w={70} h={70} label="ELEV" sub="★" />
      <Room x={245} y={80} w={70} h={85} label="STAIR" sub="↑↓" />
      <Room x={245} y={165} w={70} h={85} label="MECH" sub="Riser" />
      <Room x={245} y={250} w={70} h={85} label="STAIR" sub="↑↓" />
      <text x={280} y={340} textAnchor="middle" fill="#2563eb" fontSize="7.5" fontFamily="monospace">CORE</text>

      {/* NE Unit B */}
      <Room x={320} y={10} w={230} h={155} label={`UNIT ${floorNum}B`} sub="2 BED · 1,050 sf" hi={highlightUnit === 'B'} />
      <Room x={320} y={10} w={120} h={90} label="LIVING" sub="320 sf" hi={highlightUnit === 'B'} />
      <Room x={440} y={10} w={110} h={90} label="KITCHEN / DINING" sub="280 sf" hi={highlightUnit === 'B'} />
      <Room x={320} y={100} w={95} h={65} label="BEDROOM 1" sub="240 sf" hi={highlightUnit === 'B'} />
      <Room x={415} y={100} w={80} h={65} label="BEDROOM 2" sub="185 sf" hi={highlightUnit === 'B'} />
      <Room x={495} y={100} w={55} h={65} label="BATH" sub="55 sf" hi={highlightUnit === 'B'} />

      {/* Corridor */}
      <rect x={10} y={165} width={230} height={25} fill="#04090f" stroke="#1e40af" strokeWidth="0.8" strokeDasharray="4,3" />
      <text x={125} y={181} textAnchor="middle" fill="#2563eb" fontSize="7" fontFamily="monospace">CORRIDOR</text>
      <rect x={320} y={165} width={230} height={25} fill="#04090f" stroke="#1e40af" strokeWidth="0.8" strokeDasharray="4,3" />
      <text x={435} y={181} textAnchor="middle" fill="#2563eb" fontSize="7" fontFamily="monospace">CORRIDOR</text>

      {/* SW Unit C */}
      <Room x={10} y={190} w={230} h={155} label={`UNIT ${floorNum}C`} sub="2 BED · 1,050 sf" hi={highlightUnit === 'C'} />
      <Room x={10} y={190} w={120} h={90} label="LIVING" sub="320 sf" hi={highlightUnit === 'C'} />
      <Room x={130} y={190} w={110} h={90} label="KITCHEN / DINING" sub="280 sf" hi={highlightUnit === 'C'} />
      <Room x={10} y={280} w={95} h={65} label="BEDROOM 1" sub="240 sf" hi={highlightUnit === 'C'} />
      <Room x={105} y={280} w={80} h={65} label="BEDROOM 2" sub="185 sf" hi={highlightUnit === 'C'} />
      <Room x={185} y={280} w={55} h={65} label="BATH" sub="55 sf" hi={highlightUnit === 'C'} />

      {/* SE Unit D */}
      <Room x={320} y={190} w={230} h={155} label={`UNIT ${floorNum}D`} sub="2 BED · 1,050 sf" hi={highlightUnit === 'D'} />
      <Room x={320} y={190} w={120} h={90} label="LIVING" sub="320 sf" hi={highlightUnit === 'D'} />
      <Room x={440} y={190} w={110} h={90} label="KITCHEN / DINING" sub="280 sf" hi={highlightUnit === 'D'} />
      <Room x={320} y={280} w={95} h={65} label="BEDROOM 1" sub="240 sf" hi={highlightUnit === 'D'} />
      <Room x={415} y={280} w={80} h={65} label="BEDROOM 2" sub="185 sf" hi={highlightUnit === 'D'} />
      <Room x={495} y={280} w={55} h={65} label="BATH" sub="55 sf" hi={highlightUnit === 'D'} />

      <TitleBlock text={`OAKWOOD ESTATES HOA · FLOOR ${floorNum} PLAN · DWG-A1.${floorNum} · SCALE 1:100 · REV D`} />
    </svg>
  );
}

// Architectural elevation SVG
function ArchitecturalSVG({ type = 'site' }) {
  if (type === 'site') return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      {/* Building footprint */}
      <rect x={140} y={60} width={280} height={180} fill="#071825" stroke="#7dd3fc" strokeWidth="1.5" />
      {/* North arrow */}
      <g transform="translate(510,40)">
        <circle cx={0} cy={0} r={18} fill="none" stroke="#3b82f6" strokeWidth="1" />
        <text x={0} y={-22} textAnchor="middle" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">N</text>
        <polygon points="0,-15 5,10 0,5 -5,10" fill="#60a5fa" />
      </g>
      {/* Parking outline */}
      <rect x={40} y={270} width={480} height={70} fill="#04090f" stroke="#1e40af" strokeWidth="1" strokeDasharray="4,3" />
      <text x={280} y={309} textAnchor="middle" fill="#3b82f6" fontSize="9" fontFamily="monospace">SURFACE PARKING · 28 STALLS</text>
      {/* Driveway */}
      <rect x={220} y={240} width={120} height={30} fill="#04090f" stroke="#1e40af" strokeWidth="0.8" />
      <text x={280} y={258} textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="monospace">DRIVEWAY</text>
      {/* Landscaping */}
      {[60, 100, 460, 500].map(x => (
        <circle key={x} cx={x} cy={150} r={25} fill="#071f12" stroke="#166534" strokeWidth="1" />
      ))}
      {[60, 100, 460, 500].map(x => (
        <text key={x} x={x} y={154} textAnchor="middle" fill="#166534" fontSize="7" fontFamily="monospace">TREE</text>
      ))}
      {/* Labels */}
      <text x={280} y={155} textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="monospace" fontWeight="bold">BUILDING A</text>
      <text x={280} y={168} textAnchor="middle" fill="#4d7fa3" fontSize="8" fontFamily="monospace">148 UNITS · 6 FLOORS</text>
      {/* Property boundary */}
      <rect x={20} y={20} width={520} height={330} fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="8,4" />
      <text x={280} y={16} textAnchor="middle" fill="#dc2626" fontSize="7" fontFamily="monospace">PROPERTY LINE</text>
      <TitleBlock text="OAKWOOD ESTATES HOA · SITE PLAN · DWG-A0.1 · SCALE 1:200 · REV C" />
    </svg>
  );

  // Elevation view
  return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      {/* Ground line */}
      <line x1={20} y1={310} x2={540} y2={310} stroke="#7dd3fc" strokeWidth="1.5" />
      <text x={30} y={322} fill="#4d7fa3" fontSize="7" fontFamily="monospace">GL ±0.00</text>
      {/* Building outline */}
      <rect x={80} y={60} width={400} height={250} fill="#071825" stroke="#7dd3fc" strokeWidth="1.5" />
      {/* Floors */}
      {[1, 2, 3, 4, 5].map(f => (
        <line key={f} x1={80} y1={60 + f * 40} x2={480} y2={60 + f * 40} stroke="#1e40af" strokeWidth="0.75" strokeDasharray="3,2" />
      ))}
      {[0, 1, 2, 3, 4, 5].map(f => (
        <text key={f} x={72} y={298 - f * 40} textAnchor="end" fill="#3b82f6" fontSize="7" fontFamily="monospace">FL {f === 0 ? 'G' : f}</text>
      ))}
      {/* Windows */}
      {[0, 1, 2, 3, 4, 5].map(f =>
        [0, 1, 2, 3, 4, 5, 6].map(w => (
          <rect key={`${f}-${w}`} x={90 + w * 55} y={70 + f * 40} width={32} height={22} fill="#0a1e35" stroke="#60a5fa" strokeWidth="0.8" />
        ))
      )}
      {/* Roof */}
      <polygon points="80,60 280,20 480,60" fill="#071825" stroke="#7dd3fc" strokeWidth="1.5" />
      <TitleBlock text="OAKWOOD ESTATES HOA · NORTH ELEVATION · DWG-A3.1 · SCALE 1:100 · REV C" />
    </svg>
  );
}

// Plumbing riser SVG
function PlumbingSVG() {
  const floors = ['G', '2', '3', '4', '5', '6', 'ROOF'];
  return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      {/* Riser columns */}
      {[80, 200, 320, 440].map((x, ci) => (
        <g key={ci}>
          <line x1={x} y1={30} x2={x} y2={340} stroke="#06b6d4" strokeWidth="2.5" />
          <text x={x} y={25} textAnchor="middle" fill="#22d3ee" fontSize="7.5" fontFamily="monospace">RISER {ci + 1}</text>
          {floors.map((f, fi) => (
            <g key={fi}>
              <circle cx={x} cy={50 + fi * 44} r={5} fill="#0e7490" stroke="#22d3ee" strokeWidth="1.5" />
              <text x={x + 10} y={54 + fi * 44} fill="#67e8f9" fontSize="6.5" fontFamily="monospace">FL-{f} BRANCH</text>
            </g>
          ))}
        </g>
      ))}
      {/* Floor lines */}
      {floors.map((f, fi) => (
        <g key={fi}>
          <line x1={40} y1={50 + fi * 44} x2={520} y2={50 + fi * 44} stroke="#164e63" strokeWidth="0.75" strokeDasharray="4,3" />
          <text x={35} y={54 + fi * 44} textAnchor="end" fill="#0891b2" fontSize="7" fontFamily="monospace">FL {f}</text>
        </g>
      ))}
      {/* Legend */}
      <g transform="translate(450, 30)">
        <rect width={100} height={65} fill="#071120" stroke="#1e3a5c" />
        <line x1={8} y1={16} x2={28} y2={16} stroke="#06b6d4" strokeWidth="2.5" />
        <text x={32} y={19} fill="#67e8f9" fontSize="7" fontFamily="monospace">COLD WATER</text>
        <line x1={8} y1={30} x2={28} y2={30} stroke="#ef4444" strokeWidth="2.5" />
        <text x={32} y={33} fill="#fca5a5" fontSize="7" fontFamily="monospace">HOT WATER</text>
        <line x1={8} y1={44} x2={28} y2={44} stroke="#84cc16" strokeWidth="2.5" strokeDasharray="4,2" />
        <text x={32} y={47} fill="#bef264" fontSize="7" fontFamily="monospace">DRAIN</text>
        <circle cx={18} cy={58} r={4} fill="#0e7490" stroke="#22d3ee" strokeWidth="1.5" />
        <text x={32} y={61} fill="#67e8f9" fontSize="7" fontFamily="monospace">VALVE</text>
      </g>
      <TitleBlock text="OAKWOOD ESTATES HOA · PLUMBING RISER DIAGRAM · DWG-P1.0 · REV B" />
    </svg>
  );
}

// Electrical single-line SVG
function ElectricalSVG() {
  return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      {/* Main switchboard */}
      <rect x={210} y={20} width={140} height={50} fill="#1a1a00" stroke="#facc15" strokeWidth="2" />
      <text x={280} y={42} textAnchor="middle" fill="#fde047" fontSize="9" fontFamily="monospace" fontWeight="bold">MAIN PANEL</text>
      <text x={280} y={56} textAnchor="middle" fill="#ca8a04" fontSize="7.5" fontFamily="monospace">400A / 208V 3Ø</text>
      {/* Distribution lines */}
      <line x1={280} y1={70} x2={280} y2={100} stroke="#facc15" strokeWidth="2" />
      <line x1={80} y1={100} x2={480} y2={100} stroke="#facc15" strokeWidth="1.5" />
      {/* Sub panels */}
      {[80, 200, 320, 440].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={100} x2={x} y2={130} stroke="#facc15" strokeWidth="1.5" />
          <rect x={x - 40} y={130} width={80} height={40} fill="#1a1a00" stroke="#facc15" strokeWidth="1.5" />
          <text x={x} y={148} textAnchor="middle" fill="#fde047" fontSize="7.5" fontFamily="monospace">SUB-PANEL {i + 1}</text>
          <text x={x} y={162} textAnchor="middle" fill="#ca8a04" fontSize="6.5" fontFamily="monospace">100A / FL {i + 1}-{i + 2}</text>
          {/* Branch circuits */}
          {[0, 1, 2].map(b => (
            <g key={b}>
              <line x1={x} y1={170} x2={x - 30 + b * 30} y2={200} stroke="#854d0e" strokeWidth="1" />
              <rect x={x - 45 + b * 30} y={200} width={30} height={20} fill="#1a0a00" stroke="#b45309" strokeWidth="1" />
              <text x={x - 30 + b * 30} y={213} textAnchor="middle" fill="#fbbf24" fontSize="6" fontFamily="monospace">{20 + b * 5}A</text>
            </g>
          ))}
        </g>
      ))}
      {/* Emergency panel */}
      <rect x={20} y={250} width={100} height={40} fill="#1a0000" stroke="#dc2626" strokeWidth="1.5" />
      <text x={70} y={268} textAnchor="middle" fill="#f87171" fontSize="7.5" fontFamily="monospace">EMRG PANEL</text>
      <text x={70} y={282} textAnchor="middle" fill="#dc2626" fontSize="6.5" fontFamily="monospace">50A BACKUP</text>
      <line x1={80} y1={100} x2={70} y2={250} stroke="#dc2626" strokeWidth="1.5" strokeDasharray="5,3" />
      {/* Ground */}
      <line x1={260} y1={20} x2={260} y2={10} stroke="#facc15" strokeWidth="1.5" />
      <line x1={240} y1={10} x2={280} y2={10} stroke="#facc15" strokeWidth="1.5" />
      <text x={280} y={12} fill="#ca8a04" fontSize="7" fontFamily="monospace">UTILITY FEED</text>
      <TitleBlock text="OAKWOOD ESTATES HOA · ELECTRICAL SINGLE-LINE · DWG-E1.0 · REV B" />
    </svg>
  );
}

// Structural SVG
function StructuralSVG() {
  return (
    <svg viewBox="0 0 560 370" className="w-full h-full">
      <rect width="560" height="370" fill="#050e1a" />
      <BpGrid w={560} h={370} />
      {/* Column grid */}
      {[60, 160, 260, 360, 460, 540].map(x =>
        [40, 120, 200, 280, 320].map(y => (
          <g key={`${x}-${y}`}>
            <rect x={x - 8} y={y - 8} width={16} height={16} fill="#1e1b00" stroke="#a16207" strokeWidth="2" />
            <text x={x} y={y + 3} textAnchor="middle" fill="#ca8a04" fontSize="5.5" fontFamily="monospace" fontWeight="bold">C</text>
          </g>
        ))
      )}
      {/* Beams horizontal */}
      {[40, 120, 200, 280, 320].map(y =>
        [60, 160, 260, 360, 460].map(x => (
          <rect key={`bh-${x}-${y}`} x={x + 8} y={y - 3} width={94} height={6} fill="#1e1b00" stroke="#a16207" strokeWidth="1" />
        ))
      )}
      {/* Beams vertical */}
      {[60, 160, 260, 360, 460, 540].map(x =>
        [40, 120, 200, 280].map(y => (
          <rect key={`bv-${x}-${y}`} x={x - 3} y={y + 8} width={6} height={104} fill="#1e1b00" stroke="#a16207" strokeWidth="1" />
        ))
      )}
      {/* Slab hatching */}
      {[60, 160].map(y =>
        [60, 160, 260, 360].map(x => (
          <g key={`s-${x}-${y}`} opacity="0.4">
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={i} x1={x + 10} y1={y + 10 + i * 15} x2={x + 90} y2={y + 10 + i * 15} stroke="#92400e" strokeWidth="0.5" />
            ))}
          </g>
        ))
      )}
      {/* Legend */}
      <g transform="translate(400, 240)">
        <rect width={140} height={85} fill="#071120" stroke="#1e3a5c" />
        <text x={70} y={14} textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="monospace" fontWeight="bold">LEGEND</text>
        <rect x={8} y={20} width={12} height={12} fill="#1e1b00" stroke="#a16207" strokeWidth="1.5" />
        <text x={28} y={30} fill="#fbbf24" fontSize="7" fontFamily="monospace">COLUMN (400×400)</text>
        <rect x={8} y={38} width={28} height={6} fill="#1e1b00" stroke="#a16207" strokeWidth="1" />
        <text x={42} y={45} fill="#fbbf24" fontSize="7" fontFamily="monospace">PRIMARY BEAM</text>
        <rect x={8} y={54} width={16} height={6} fill="#1e1b00" stroke="#a16207" strokeWidth="0.75" />
        <text x={30} y={61} fill="#fbbf24" fontSize="7" fontFamily="monospace">SECONDARY BEAM</text>
        <rect x={8} y={68} width={20} height={12} fill="#1e1b00" stroke="#a16207" strokeWidth="0.5" opacity="0.6" />
        <text x={34} y={77} fill="#fbbf24" fontSize="7" fontFamily="monospace">CONCRETE SLAB</text>
      </g>
      <TitleBlock text="OAKWOOD ESTATES HOA · STRUCTURAL FRAMING PLAN · DWG-S1.0 · REV B" />
    </svg>
  );
}

// ─── Map Data ─────────────────────────────────────────────────────────────────

const MAP_CATEGORIES = [
  { id: 'floor',          label: 'Floor Plans',   Icon: LayoutTemplate },
  { id: 'architectural',  label: 'Architectural', Icon: Compass },
  { id: 'plumbing',       label: 'Plumbing',      Icon: Droplets },
  { id: 'electrical',     label: 'Electrical',    Icon: Zap },
  { id: 'structural',     label: 'Structural',    Icon: Building2 },
];

const MAPS = {
  floor: [
    { id: 'g',  name: 'Ground Floor',  sub: 'Lobby · Parking · Units G-1, G-2', revision: 'Rev D', updated: 'Mar 15, 2024', status: 'current', dwg: 'DWG-A1.0', units: 'G-1, G-2', svgType: 'ground' },
    { id: 'f2', name: 'Floor 2',       sub: 'Units 2A, 2B, 2C, 2D', revision: 'Rev D', updated: 'Mar 15, 2024', status: 'current', dwg: 'DWG-A1.2', units: '2A–2D', svgType: 'standard', floorNum: 2 },
    { id: 'f3', name: 'Floor 3',       sub: 'Units 3A, 3B, 3C, 3D', revision: 'Rev D', updated: 'Mar 15, 2024', status: 'current', dwg: 'DWG-A1.3', units: '3A–3D', svgType: 'standard', floorNum: 3 },
    { id: 'f4', name: 'Floor 4',       sub: 'Units 4A, 4B, 4C, 4D', revision: 'Rev C', updated: 'Jan 10, 2024', status: 'current', dwg: 'DWG-A1.4', units: '4A–4D', svgType: 'standard', floorNum: 4 },
    { id: 'f5', name: 'Floor 5',       sub: 'Units 5A, 5B, 5C, 5D', revision: 'Rev C', updated: 'Jan 10, 2024', status: 'current', dwg: 'DWG-A1.5', units: '5A–5D', svgType: 'standard', floorNum: 5 },
    { id: 'f6', name: 'Floor 6 (Top)', sub: 'Units 6A, 6B · Penthouse', revision: 'Rev B', updated: 'Sep 4, 2023',  status: 'current', dwg: 'DWG-A1.6', units: '6A–6B', svgType: 'standard', floorNum: 6 },
  ],
  architectural: [
    { id: 'a1', name: 'Site Plan',         sub: 'Property boundary, parking, landscaping', revision: 'Rev C', updated: 'Mar 2024', status: 'current', dwg: 'DWG-A0.1', svgType: 'site' },
    { id: 'a2', name: 'North Elevation',   sub: 'Street-facing façade', revision: 'Rev C', updated: 'Mar 2024', status: 'current', dwg: 'DWG-A3.1', svgType: 'elevation' },
    { id: 'a3', name: 'South Elevation',   sub: 'Rear façade', revision: 'Rev C', updated: 'Mar 2024', status: 'current', dwg: 'DWG-A3.2', svgType: 'elevation' },
    { id: 'a4', name: 'Building Section',  sub: 'N-S cross section', revision: 'Rev B', updated: 'Sep 2023', status: 'current', dwg: 'DWG-A4.1', svgType: 'elevation' },
    { id: 'a5', name: 'Roof Plan',         sub: 'Roof drainage & access', revision: 'Rev A', updated: 'Jun 2023', status: 'superseded', dwg: 'DWG-A2.1', svgType: 'site' },
  ],
  plumbing: [
    { id: 'p1', name: 'Plumbing Riser Diagram',  sub: 'Cold/hot water & drain risers', revision: 'Rev B', updated: 'Nov 2023', status: 'current', dwg: 'DWG-P1.0', svgType: 'plumbing' },
    { id: 'p2', name: 'Ground Floor Plumbing',   sub: 'Slab plumbing layout', revision: 'Rev B', updated: 'Nov 2023', status: 'current', dwg: 'DWG-P2.0', svgType: 'plumbing' },
    { id: 'p3', name: 'Typical Floor Plumbing',  sub: 'Floors 2–5 unit plumbing', revision: 'Rev A', updated: 'Jun 2023', status: 'current', dwg: 'DWG-P2.1', svgType: 'plumbing' },
    { id: 'p4', name: 'Roof Drainage Plan',      sub: 'Storm drainage & scuppers', revision: 'Rev A', updated: 'Jun 2023', status: 'current', dwg: 'DWG-P3.0', svgType: 'plumbing' },
  ],
  electrical: [
    { id: 'e1', name: 'Single-Line Diagram',      sub: 'Main & sub-panel distribution', revision: 'Rev B', updated: 'Nov 2023', status: 'current', dwg: 'DWG-E1.0', svgType: 'electrical' },
    { id: 'e2', name: 'Ground Floor Electrical',  sub: 'Lighting & power layout', revision: 'Rev B', updated: 'Nov 2023', status: 'current', dwg: 'DWG-E2.0', svgType: 'electrical' },
    { id: 'e3', name: 'Typical Floor Electrical', sub: 'Floors 2–5 unit circuits', revision: 'Rev A', updated: 'Jun 2023', status: 'current', dwg: 'DWG-E2.1', svgType: 'electrical' },
    { id: 'e4', name: 'Emergency Power Plan',     sub: 'Generator & backup circuits', revision: 'Rev A', updated: 'Jun 2023', status: 'current', dwg: 'DWG-E3.0', svgType: 'electrical' },
  ],
  structural: [
    { id: 's1', name: 'Foundation Plan',       sub: 'Footings & grade beams', revision: 'Rev B', updated: 'Nov 2023', status: 'current', dwg: 'DWG-S0.1', svgType: 'structural' },
    { id: 's2', name: 'Typical Framing Plan',  sub: 'Columns, beams & slabs', revision: 'Rev B', updated: 'Nov 2023', status: 'current', dwg: 'DWG-S1.0', svgType: 'structural' },
    { id: 's3', name: 'Roof Framing Plan',     sub: 'Roof structure & rafters', revision: 'Rev A', updated: 'Jun 2023', status: 'current', dwg: 'DWG-S2.0', svgType: 'structural' },
    { id: 's4', name: 'Structural Sections',   sub: 'Beam & column details', revision: 'Rev A', updated: 'Jun 2023', status: 'current', dwg: 'DWG-S3.0', svgType: 'structural' },
  ],
};

function getBlueprintSVG(map) {
  if (map.svgType === 'ground')     return <GroundFloorSVG />;
  if (map.svgType === 'standard')   return <StandardFloorSVG floorNum={map.floorNum} />;
  if (map.svgType === 'site')       return <ArchitecturalSVG type="site" />;
  if (map.svgType === 'elevation')  return <ArchitecturalSVG type="elevation" />;
  if (map.svgType === 'plumbing')   return <PlumbingSVG />;
  if (map.svgType === 'electrical') return <ElectricalSVG />;
  if (map.svgType === 'structural') return <StructuralSVG />;
  return <GroundFloorSVG />;
}

// ─── Blueprint Viewer Modal ───────────────────────────────────────────────────

function BlueprintViewer({ map, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={15} className="text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">{map.name}</h2>
              <p className="text-xs text-slate-400">{map.dwg} · {map.revision} · Updated {map.updated}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm"><Download size={12} />Export PDF</Button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Blueprint */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          <div className="min-w-[700px]">
            {getBlueprintSVG(map)}
          </div>
        </div>
        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-700 flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
          <span>Drawing: <span className="text-slate-300">{map.dwg}</span></span>
          <span>Revision: <span className="text-slate-300">{map.revision}</span></span>
          <span>Last Updated: <span className="text-slate-300">{map.updated}</span></span>
          {map.units && <span>Units: <span className="text-slate-300">{map.units}</span></span>}
        </div>
      </div>
    </div>
  );
}

// ─── Map Card ─────────────────────────────────────────────────────────────────

function MapCard({ map, onView }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-200 transition-all group">
      {/* Mini blueprint preview */}
      <div className="h-36 bg-slate-950 cursor-pointer relative overflow-hidden" onClick={() => onView(map)}>
        <div className="scale-[0.32] origin-top-left absolute" style={{ width: '312.5%', height: '312.5%' }}>
          {getBlueprintSVG(map)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            <ZoomIn size={18} className="text-white" />
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{map.name}</p>
          <Badge variant={map.status === 'current' ? 'green' : 'gray'}>{map.status === 'current' ? 'Current' : 'Superseded'}</Badge>
        </div>
        <p className="text-xs text-slate-500 mb-3">{map.sub}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="font-mono">{map.dwg}</span>
            <span>{map.revision}</span>
          </div>
          <button onClick={() => onView(map)}
            className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 transition-colors">
            <ZoomIn size={11} />View
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Building Page ───────────────────────────────────────────────────────

export default function BuildingPage() {
  const [activeTab, setActiveTab]   = useState('floor');
  const [viewingMap, setViewingMap] = useState(null);

  const tabs = MAP_CATEGORIES.map(c => ({ id: c.id, label: c.label }));
  const maps = MAPS[activeTab] || [];

  return (
    <div className="page-enter">
      {viewingMap && <BlueprintViewer map={viewingMap} onClose={() => setViewingMap(null)} />}

      <SectionHeader
        title="Building Maps"
        subtitle="Architectural drawings, floor plans and engineering blueprints"
        action={<Button variant="secondary" size="sm"><Download size={12} />Export All</Button>}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Floors"      value={6}    sub="Ground + 5 upper floors" />
        <MetricCard label="Total Drawings"    value={23}   sub="All categories" />
        <MetricCard label="Last Survey"       value="2024" sub="Annual structural review" subVariant="good" />
        <MetricCard label="Pending Revisions" value={2}    sub="Awaiting approval"        subVariant="bad" />
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="px-5 pt-4 border-b border-slate-100">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            {maps.map(map => (
              <MapCard key={map.id} map={map} onView={setViewingMap} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Floor lookup helper (used by ResidentsPage) ──────────────────────────────

export function getResidentFloor(unitStr) {
  const num = parseInt((unitStr || '').replace(/\D/g, ''), 10) || 0;
  if (num <= 12)  return { floor: 'Ground Floor', floorNum: 0, svgType: 'ground', dwg: 'DWG-A1.0', revision: 'Rev D', mapId: 'g',  unit: num <= 6 ? 'G-1' : 'G-2' };
  if (num <= 33)  return { floor: 'Floor 2',      floorNum: 2, svgType: 'standard', dwg: 'DWG-A1.2', revision: 'Rev D', mapId: 'f2', unit: '2A' };
  if (num <= 55)  return { floor: 'Floor 3',      floorNum: 3, svgType: 'standard', dwg: 'DWG-A1.3', revision: 'Rev D', mapId: 'f3', unit: '3B' };
  if (num <= 75)  return { floor: 'Floor 4',      floorNum: 4, svgType: 'standard', dwg: 'DWG-A1.4', revision: 'Rev C', mapId: 'f4', unit: '4C' };
  if (num <= 100) return { floor: 'Floor 5',      floorNum: 5, svgType: 'standard', dwg: 'DWG-A1.5', revision: 'Rev C', mapId: 'f5', unit: '5A' };
  return           { floor: 'Floor 6',      floorNum: 6, svgType: 'standard', dwg: 'DWG-A1.6', revision: 'Rev B', mapId: 'f6', unit: '6A' };
}
