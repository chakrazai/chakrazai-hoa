import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clsx } from 'clsx';
import { MapPin, AlertTriangle, Wrench, Home, Filter, X } from 'lucide-react';

// Fix default marker icons broken by webpack/vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const ICONS = {
  violation: makeIcon('#ef4444'),
  maintenance: makeIcon('#f59e0b'),
  normal: makeIcon('#1e3a8a'),
};

const UNITS = [
  { id: 1,  address: '101 Oakwood Dr',  lat: 37.7749, lng: -122.4194, status: 'violation',   label: 'Parking violation – reported 2 days ago' },
  { id: 2,  address: '102 Oakwood Dr',  lat: 37.7755, lng: -122.4185, status: 'normal',      label: 'No active issues' },
  { id: 3,  address: '103 Oakwood Dr',  lat: 37.7761, lng: -122.4190, status: 'maintenance', label: 'Roof leak – work order #WO-112' },
  { id: 4,  address: '104 Maple Ln',    lat: 37.7742, lng: -122.4205, status: 'normal',      label: 'No active issues' },
  { id: 5,  address: '105 Maple Ln',    lat: 37.7748, lng: -122.4212, status: 'violation',   label: 'Landscaping violation – 1st notice' },
  { id: 6,  address: '106 Maple Ln',    lat: 37.7754, lng: -122.4200, status: 'normal',      label: 'No active issues' },
  { id: 7,  address: '107 Cedar Ct',    lat: 37.7737, lng: -122.4188, status: 'maintenance', label: 'HVAC repair – scheduled May 5' },
  { id: 8,  address: '108 Cedar Ct',    lat: 37.7743, lng: -122.4181, status: 'normal',      label: 'No active issues' },
  { id: 9,  address: '109 Cedar Ct',    lat: 37.7756, lng: -122.4175, status: 'violation',   label: 'Noise complaint – under review' },
  { id: 10, address: '110 Birch Way',   lat: 37.7731, lng: -122.4196, status: 'normal',      label: 'No active issues' },
  { id: 11, address: '111 Birch Way',   lat: 37.7727, lng: -122.4202, status: 'maintenance', label: 'Fence repair – awaiting permit' },
  { id: 12, address: '112 Birch Way',   lat: 37.7733, lng: -122.4209, status: 'normal',      label: 'No active issues' },
  { id: 13, address: '113 Elm Pl',      lat: 37.7762, lng: -122.4210, status: 'normal',      label: 'No active issues' },
  { id: 14, address: '114 Elm Pl',      lat: 37.7758, lng: -122.4220, status: 'violation',   label: 'Unapproved structure – 2nd notice' },
  { id: 15, address: '115 Elm Pl',      lat: 37.7764, lng: -122.4215, status: 'normal',      label: 'No active issues' },
];

const STATUS_META = {
  violation:   { label: 'Violation',   color: 'text-rose-600',  bg: 'bg-rose-50',  border: 'border-rose-200',  Icon: AlertTriangle },
  maintenance: { label: 'Maintenance', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', Icon: Wrench },
  normal:      { label: 'Clear',       color: 'text-navy-600',  bg: 'bg-navy-50',  border: 'border-navy-200',  Icon: Home },
};

function FlyTo({ unit }) {
  const map = useMap();
  useEffect(() => {
    if (unit) map.flyTo([unit.lat, unit.lng], 17, { duration: 0.8 });
  }, [unit]);
  return null;
}

export default function Map() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = filter === 'all' ? UNITS : UNITS.filter(u => u.status === filter);

  const counts = {
    violation: UNITS.filter(u => u.status === 'violation').length,
    maintenance: UNITS.filter(u => u.status === 'maintenance').length,
    normal: UNITS.filter(u => u.status === 'normal').length,
  };

  return (
    <div className="flex h-full w-full" style={{ height: 'calc(100vh - 50px)' }}>
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <MapPin size={14} className="text-navy-600" />
            Community Map
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Oakwood Estates HOA · {UNITS.length} units</p>
        </div>

        {/* Filter chips */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-1.5">
          {[
            { key: 'all',         label: 'All',         count: UNITS.length },
            { key: 'violation',   label: 'Violations',  count: counts.violation,   color: 'rose' },
            { key: 'maintenance', label: 'Maintenance', count: counts.maintenance, color: 'amber' },
            { key: 'normal',      label: 'Clear',       count: counts.normal,      color: 'navy' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                filter === f.key
                  ? f.color === 'rose'  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : f.color === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : f.color === 'navy'  ? 'bg-navy-100 text-navy-700 border-navy-200'
                  :                       'bg-navy-600 text-white border-navy-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              )}>
              {f.label}
              <span className="ml-0.5 opacity-70">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Unit list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filtered.map(unit => {
            const meta = STATUS_META[unit.status];
            const isSelected = selected?.id === unit.id;
            return (
              <button key={unit.id} onClick={() => setSelected(unit)}
                className={clsx(
                  'w-full text-left px-4 py-3 transition-all hover:bg-slate-50',
                  isSelected && 'bg-slate-50 border-l-2 border-navy-500'
                )}>
                <div className="flex items-start gap-2.5">
                  <div className={clsx('mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', meta.bg)}>
                    <meta.Icon size={11} className={meta.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{unit.address}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{unit.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Filter size={9} /> Legend
          </p>
          <div className="space-y-1">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0',
                  key === 'violation' ? 'bg-rose-500' : key === 'maintenance' ? 'bg-amber-500' : 'bg-navy-700'
                )} />
                {meta.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {selected && (
          <div className="absolute top-3 right-3 z-[1000] bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 max-w-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">{selected.address}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{selected.label}</p>
                <span className={clsx(
                  'inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                  STATUS_META[selected.status].bg,
                  STATUS_META[selected.status].color,
                  STATUS_META[selected.status].border,
                )}>
                  {STATUS_META[selected.status].label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        <MapContainer
          center={[37.7749, -122.4197]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map(unit => (
            <Marker key={unit.id} position={[unit.lat, unit.lng]} icon={ICONS[unit.status]}
              eventHandlers={{ click: () => setSelected(unit) }}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{unit.address}</p>
                  <p className="text-slate-500 mt-0.5">{unit.label}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          {selected && <FlyTo unit={selected} />}
        </MapContainer>
      </div>
    </div>
  );
}
