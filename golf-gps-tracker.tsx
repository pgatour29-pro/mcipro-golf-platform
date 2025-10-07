import React, { useState, useEffect } from 'react';
import { MapPin, Users, ShoppingBag, Navigation, Clock, Phone, AlertTriangle, Activity, Satellite, Menu, X, Star, ChevronLeft, ChevronDown, Search, Filter, Download, TrendingUp, DollarSign, Radio } from 'lucide-react';

const GolfGPSPlatform = () => {
  const [activeView, setActiveView] = useState('operations');
  const [userRole, setUserRole] = useState('gm');
  const [golfers, setGolfers] = useState([]);
  const [caddies, setCaddies] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Golf course hole definitions with actual layout
  const courseHoles = [
    {hole: 1, tee: {x: 10, y: 15}, fairway: [{x: 10, y: 15}, {x: 15, y: 20}, {x: 20, y: 22}], green: {x: 20, y: 22}},
    {hole: 2, tee: {x: 22, y: 24}, fairway: [{x: 22, y: 24}, {x: 28, y: 30}, {x: 32, y: 35}], green: {x: 32, y: 35}},
    {hole: 3, tee: {x: 34, y: 37}, fairway: [{x: 34, y: 37}, {x: 40, y: 38}, {x: 45, y: 37}], green: {x: 45, y: 37}},
    {hole: 4, tee: {x: 47, y: 35}, fairway: [{x: 47, y: 35}, {x: 52, y: 30}, {x: 55, y: 25}], green: {x: 55, y: 25}},
    {hole: 5, tee: {x: 57, y: 23}, fairway: [{x: 57, y: 23}, {x: 62, y: 20}, {x: 68, y: 18}], green: {x: 68, y: 18}},
    {hole: 6, tee: {x: 70, y: 16}, fairway: [{x: 70, y: 16}, {x: 75, y: 14}, {x: 80, y: 12}], green: {x: 80, y: 12}},
    {hole: 7, tee: {x: 82, y: 14}, fairway: [{x: 82, y: 14}, {x: 85, y: 20}, {x: 87, y: 26}], green: {x: 87, y: 26}},
    {hole: 8, tee: {x: 87, y: 28}, fairway: [{x: 87, y: 28}, {x: 88, y: 35}, {x: 88, y: 42}], green: {x: 88, y: 42}},
    {hole: 9, tee: {x: 86, y: 44}, fairway: [{x: 86, y: 44}, {x: 82, y: 50}, {x: 75, y: 55}], green: {x: 75, y: 55}},
    {hole: 10, tee: {x: 73, y: 57}, fairway: [{x: 73, y: 57}, {x: 68, y: 60}, {x: 62, y: 62}], green: {x: 62, y: 62}},
    {hole: 11, tee: {x: 60, y: 64}, fairway: [{x: 60, y: 64}, {x: 55, y: 68}, {x: 48, y: 70}], green: {x: 48, y: 70}},
    {hole: 12, tee: {x: 46, y: 72}, fairway: [{x: 46, y: 72}, {x: 40, y: 74}, {x: 35, y: 76}], green: {x: 35, y: 76}},
    {hole: 13, tee: {x: 33, y: 78}, fairway: [{x: 33, y: 78}, {x: 28, y: 80}, {x: 22, y: 82}], green: {x: 22, y: 82}},
    {hole: 14, tee: {x: 20, y: 84}, fairway: [{x: 20, y: 84}, {x: 18, y: 78}, {x: 16, y: 72}], green: {x: 16, y: 72}},
    {hole: 15, tee: {x: 14, y: 70}, fairway: [{x: 14, y: 70}, {x: 12, y: 64}, {x: 10, y: 58}], green: {x: 10, y: 58}},
    {hole: 16, tee: {x: 8, y: 56}, fairway: [{x: 8, y: 56}, {x: 8, y: 48}, {x: 8, y: 40}], green: {x: 8, y: 40}},
    {hole: 17, tee: {x: 10, y: 38}, fairway: [{x: 10, y: 38}, {x: 12, y: 32}, {x: 14, y: 26}], green: {x: 14, y: 26}},
    {hole: 18, tee: {x: 16, y: 24}, fairway: [{x: 16, y: 24}, {x: 20, y: 20}, {x: 25, y: 18}], green: {x: 25, y: 18}}
  ];

  useEffect(() => {
    const initGolfers = Array.from({length: 32}, (_, i) => {
      const holeIdx = (i * 2) % 18;
      const hole = courseHoles[holeIdx];
      const progress = Math.random();
      const fairwayIdx = Math.floor(progress * (hole.fairway.length - 1));
      const pos = hole.fairway[fairwayIdx];
      
      return {
        id: `P${String(i + 1).padStart(3, '0')}`,
        name: ['John Smith', 'Mike Chen', 'David Lee', 'James Wilson'][i % 4],
        group: `G${Math.floor(i / 4) + 1}`,
        hole: holeIdx + 1,
        lat: 13.7563 + (pos.y - 50) * 0.0002,
        lng: 100.5018 + (pos.x - 50) * 0.0002,
        mapX: pos.x,
        mapY: pos.y,
        heading: Math.random() * 360,
        speed: 1.2 + Math.random() * 0.8,
        pace: i % 4 === 0 ? 'slow' : 'normal',
        startTime: new Date(Date.now() - (180 - i * 5) * 60000)
      };
    });

    const initCaddies = Array.from({length: 20}, (_, i) => {
      const assigned = i < 15;
      const holeIdx = (i * 2) % 18;
      const hole = courseHoles[holeIdx];
      const pos = hole.fairway[0];
      
      return {
        id: `C${String(i + 1).padStart(3, '0')}`,
        name: `Caddy ${i + 1}`,
        status: assigned ? 'busy' : 'available',
        lat: 13.7563 + (pos.y - 50) * 0.0002,
        lng: 100.5018 + (pos.x - 50) * 0.0002,
        mapX: pos.x,
        mapY: pos.y,
        heading: 45,
        speed: assigned ? 1.5 : 0,
        group: assigned ? `G${Math.floor(i / 2) + 1}` : null
      };
    });

    setGolfers(initGolfers);
    setCaddies(initCaddies);

    const interval = setInterval(() => {
      setGolfers(prev => prev.map(g => {
        const hole = courseHoles[g.hole - 1];
        let newMapX = g.mapX;
        let newMapY = g.mapY;
        
        const targetIdx = Math.min(hole.fairway.length - 1, Math.floor(Math.random() * hole.fairway.length));
        const target = hole.fairway[targetIdx];
        const dx = target.x - g.mapX;
        const dy = target.y - g.mapY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0.5) {
          newMapX += (dx / dist) * 0.3;
          newMapY += (dy / dist) * 0.3;
        }
        
        return {
          ...g,
          mapX: newMapX,
          mapY: newMapY,
          lat: 13.7563 + (newMapY - 50) * 0.0002,
          lng: 100.5018 + (newMapX - 50) * 0.0002,
          heading: Math.atan2(dy, dx) * 180 / Math.PI
        };
      }));

      setCaddies(prev => prev.map(c => {
        if (c.status !== 'busy') return c;
        return {
          ...c,
          mapX: c.mapX + (Math.random() - 0.5) * 0.2,
          mapY: c.mapY + (Math.random() - 0.5) * 0.2,
          lat: 13.7563 + (c.mapY - 50) * 0.0002,
          lng: 100.5018 + (c.mapX - 50) * 0.0002
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const restaurants = [
    {
      id: 1, name: 'Clubhouse Grill', rating: 4.8, time: '15-20 min', fee: 50, img: '🍽️',
      items: [
        {id: 1, name: 'Wagyu Burger', price: 480, img: '🍔', desc: 'Premium beef patty', hot: true},
        {id: 2, name: 'Caesar Salad', price: 280, img: '🥗', desc: 'Fresh greens', hot: true},
        {id: 3, name: 'Grilled Salmon', price: 580, img: '🐟', desc: 'Atlantic salmon'}
      ]
    },
    {
      id: 2, name: 'Beverage Bar', rating: 4.9, time: '5-10 min', fee: 20, img: '🍹',
      items: [
        {id: 10, name: 'Fresh Coconut', price: 120, img: '🥥', desc: 'Ice cold', hot: true},
        {id: 11, name: 'Smoothie Bowl', price: 220, img: '🥤', desc: 'Tropical blend', hot: true}
      ]
    }
  ];

  const placeOrder = (items, hole, pos, rest) => {
    const order = {
      id: `${1000 + orders.length + 1}`,
      rest, items,
      total: items.reduce((s, i) => s + i.price * i.qty, 0) + rest.fee,
      status: 'preparing',
      time: new Date(),
      hole,
      lat: pos.lat,
      lng: pos.lng,
      dlat: 13.7563,
      dlng: 100.5018,
      mapX: 50,
      mapY: 50
    };
    setOrders(prev => [...prev, order]);
    setTimeout(() => setOrders(p => p.map(o => o.id === order.id ? {...o, status: 'delivering'} : o)), 10000);
    setTimeout(() => setOrders(p => p.map(o => o.id === order.id ? {...o, status: 'delivered'} : o)), 40000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => prev.map(o => {
        if (o.status !== 'delivering') return o;
        const dx = (o.lat - o.dlat) * 5000;
        const dy = (o.lng - o.dlng) * 5000;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.5) return {...o, status: 'delivered'};
        return {
          ...o,
          dlat: o.dlat + dx / d * 0.0001,
          dlng: o.dlng + dy / d * 0.0001,
          mapX: o.mapX + (o.lat - o.dlat) * 500 * 0.1,
          mapY: o.mapY + (o.lng - o.dlng) * 500 * 0.1
        };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const Operations = () => {
    const stats = {
      active: golfers.length,
      caddies: caddies.filter(c => c.status === 'busy').length + '/' + caddies.length,
      orders: orders.filter(o => o.status !== 'delivered').length,
      slow: golfers.filter(g => g.pace === 'slow').length
    };

    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Course Control</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="font-medium">Live Tracking</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-8">
                  <button onClick={() => setActiveView('operations')} className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeView === 'operations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-gray-600 hover:bg-gray-100'}`}>
                    Operations
                  </button>
                  <button onClick={() => setActiveView('food')} className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeView === 'food' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-gray-600 hover:bg-gray-100'}`}>
                    F&B Orders
                  </button>
                  <button onClick={() => setActiveView('orders')} className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeView === 'orders' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-gray-600 hover:bg-gray-100'}`}>
                    Track Orders
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-600">
                  {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                </div>
                <div className="relative">
                  <select value={userRole} onChange={e => setUserRole(e.target.value)} className="appearance-none bg-white border-2 border-gray-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-semibold text-gray-900 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer">
                    <option value="gm">General Manager</option>
                    <option value="pro">Pro Shop</option>
                    <option value="caddy">Caddy Master</option>
                    <option value="ops">Operations</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-96 bg-white border-r flex-shrink-0 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Real-Time Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="text-3xl font-black text-blue-900 mb-1">{stats.active}</div>
                    <div className="text-xs font-semibold text-blue-700">Players on Course</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                    <div className="text-3xl font-black text-emerald-900 mb-1">{stats.caddies}</div>
                    <div className="text-xs font-semibold text-emerald-700">Active Caddies</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="text-3xl font-black text-orange-900 mb-1">{stats.orders}</div>
                    <div className="text-xs font-semibold text-orange-700">Live Orders</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <div className="text-3xl font-black text-red-900 mb-1">{stats.slow}</div>
                    <div className="text-xs font-semibold text-red-700">Pace Alerts</div>
                  </div>
                </div>
              </div>

              {stats.slow > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pace Alerts</h3>
                  <div className="space-y-2">
                    {golfers.filter(g => g.pace === 'slow').map(g => (
                      <div key={g.id} onClick={() => setSelectedEntity(g)} className="bg-red-50 border-2 border-red-200 rounded-xl p-4 cursor-pointer hover:border-red-400 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-red-900">{g.group}</div>
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="text-sm text-red-700 font-medium">Hole {g.hole} • Behind pace</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Active Groups</h3>
                <div className="space-y-2">
                  {golfers.slice(0, 8).map(g => (
                    <div key={g.id} onClick={() => setSelectedEntity(g)} className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-gray-900">{g.name}</div>
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${g.pace === 'slow' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {g.pace === 'slow' ? 'SLOW' : 'ON TIME'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600">{g.group}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">Hole {g.hole}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 relative bg-green-900">
            <div className="absolute inset-0 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fairwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#15803d" />
                    <stop offset="100%" stopColor="#166534" />
                  </linearGradient>
                  <radialGradient id="greenGrad">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </radialGradient>
                </defs>
                
                <rect width="100" height="100" fill="#14532d" />
                
                {courseHoles.map(hole => (
                  <g key={hole.hole}>
                    <path
                      d={`M ${hole.fairway.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}`}
                      stroke="url(#fairwayGrad)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.8"
                    />
                    
                    <circle
                      cx={hole.tee.x}
                      cy={hole.tee.y}
                      r="1.2"
                      fill="#3b82f6"
                      stroke="#1e40af"
                      strokeWidth="0.3"
                    />
                    <text
                      x={hole.tee.x}
                      y={hole.tee.y}
                      textAnchor="middle"
                      dy="0.4"
                      fill="white"
                      fontSize="1"
                      fontWeight="bold"
                    >
                      {hole.hole}
                    </text>
                    
                    <circle
                      cx={hole.green.x}
                      cy={hole.green.y}
                      r="2"
                      fill="url(#greenGrad)"
                      opacity="0.9"
                    />
                    <circle
                      cx={hole.green.x}
                      cy={hole.green.y}
                      r="0.4"
                      fill="#fbbf24"
                    />
                  </g>
                ))}
                
                <rect x="48" y="48" width="4" height="4" fill="#8b5cf6" rx="0.5" />
              </svg>

              {golfers.map(g => (
                <div key={g.id} onClick={() => setSelectedEntity(g)} className="absolute cursor-pointer group" style={{left: g.mapX + '%', top: g.mapY + '%', transform: 'translate(-50%, -50%)'}}>
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full shadow-xl ${g.pace === 'slow' ? 'bg-red-500 ring-4 ring-red-400/50' : 'bg-blue-500 ring-4 ring-blue-400/50'} animate-pulse`}></div>
                    <div className={`absolute w-16 h-16 -m-6 rounded-full ${g.pace === 'slow' ? 'bg-red-500/20' : 'bg-blue-500/10'} blur-xl pointer-events-none`}></div>
                  </div>
                  <div className="absolute left-6 top-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50">
                    <div className="bg-slate-900/98 backdrop-blur-xl border-2 border-emerald-500/50 text-white px-5 py-4 rounded-2xl shadow-2xl whitespace-nowrap min-w-60">
                      <div className="font-black text-base mb-3 text-emerald-400">{g.name}</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Group</span>
                          <span className="font-bold">{g.group}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Hole</span>
                          <span className="font-bold">{g.hole}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <span className={`font-bold ${g.pace === 'slow' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {g.pace === 'slow' ? 'BEHIND' : 'ON TIME'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {caddies.filter(c => c.status === 'busy').map(c => (
                <div key={c.id} className="absolute" style={{left: c.mapX + '%', top: c.mapY + '%', transform: 'translate(-50%, -50%)'}}>
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-xl ring-4 ring-teal-400/50"></div>
                </div>
              ))}

              {orders.filter(o => o.status === 'delivering').map(o => (
                <div key={o.id} className="absolute animate-bounce" style={{left: o.mapX + '%', top: o.mapY + '%', transform: 'translate(-50%, -50%)'}}>
                  <div className="w-4 h-4 rounded-lg bg-orange-500 shadow-2xl flex items-center justify-center ring-4 ring-orange-400/50">
                    <ShoppingBag className="w-2 h-2 text-white" />
                  </div>
                </div>
              ))}

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-12 h-12 rounded-xl bg-purple-600/90 backdrop-blur-sm border-2 border-purple-400 flex items-center justify-center shadow-2xl">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border-2 border-gray-200">
              <div className="space-y-3 text-sm font-semibold">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-400/30"></div>
                  <span className="text-gray-700">Players ({golfers.length})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-teal-400 ring-4 ring-teal-400/30"></div>
                  <span className="text-gray-700">Caddies ({caddies.filter(c => c.status === 'busy').length})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-lg bg-orange-500"></div>
                  <span className="text-gray-700">Deliveries ({orders.filter(o => o.status === 'delivering').length})</span>
                </div>
              </div>
            </div>
          </div>

          {selectedEntity && selectedEntity.hole && (
            <div className="w-96 bg-white border-l flex-shrink-0 overflow-y-auto shadow-2xl">
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{selectedEntity.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 font-semibold">{selectedEntity.group}</p>
                  </div>
                  <button onClick={() => setSelectedEntity(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="text-sm font-semibold opacity-90 mb-2">Current Position</div>
                  <div className="text-4xl font-black">Hole {selectedEntity.hole}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="text-xs font-bold text-gray-500 mb-2">PACE STATUS</div>
                    <div className={`text-xl font-black ${selectedEntity.pace === 'slow' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedEntity.pace === 'slow' ? 'BEHIND' : 'ON TIME'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="text-xs font-bold text-gray-500 mb-2">SPEED</div>
                    <div className="text-xl font-black text-gray-900">{selectedEntity.speed.toFixed(1)} km/h</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const FoodView = () => {
    const [sel, setSel] = useState(null);
    const [cart, setCart] = useState([]);
    const [hole, setHole] = useState(1);
    const [modal, setModal] = useState(false);

    if (sel) {
      const total = cart.reduce((s, i) => s + i.price * i.qty, 0) + sel.fee;
      return (
        <div className="h-screen flex flex-col bg-gray-50">
          <div className="bg-white border-b shadow-sm">
            <div className="max-w-6xl mx-auto px-8 py-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setSel(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-4xl">{sel.img}</span>
                    <h1 className="text-2xl font-black">{sel.name}</h1>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{sel.rating}</span>
                    </div>
                    <span>•</span>
                    <span className="font-semibold">{sel.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            <div className="max-w-6xl mx-auto px-8 py-8">
              <h2 className="text-2xl font-black mb-6">Popular Items</h2>
              <div className="grid gap-4">
                {sel.items.filter(i => i.hot).map(item => {
                  const inCart = cart.find(c => c.id === item.id);
                  return (
                    <div key={item.id} className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-emerald-500 hover:shadow-xl transition-all">
                      <div className="flex gap-6">
                        <div className="flex-1">
                          <h3 className="text-xl font-black mb-2">{item.name}</h3>
                          <p className="text-sm text-gray-600 mb-3 font-medium">{item.desc}</p>
                          <div className="text-2xl font-black text-emerald-600">฿{item.price}</div>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-32 h-32 text-7xl flex items-center justify-center bg-gray-50 rounded-2xl">
                            {item.img}
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-2 bg-emerald-600 rounded-xl shadow-lg">
                              <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty - 1} : c).filter(c => c.qty > 0))} className="px-4 py-2 text-white font-black text-xl">−</button>
                              <span className="text-white font-black text-xl min-w-[30px] text-center">{inCart.qty}</span>
                              <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c))} className="px-4 py-2 text-white font-black text-xl">+</button>
                            </div>
                          ) : (
                            <button onClick={() => setCart([...cart, {...item, qty: 1}])} className="px-6 py-3 bg-white border-3 border-emerald-600 text-emerald-600 rounded-xl font-black hover:bg-emerald-50 shadow-lg">
                              ADD
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-emerald-500 shadow-2xl">
              <div className="max-w-6xl mx-auto px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 font-semibold">{cart.reduce((s, i) => s + i.qty, 0)} items</div>
                    <div className="text-3xl font-black text-gray-900">฿{total}</div>
                  </div>
                  <button onClick={() => setModal(true)} className="px-12 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-black text-lg hover:shadow-2xl hover:shadow-emerald-600/30 transition-all">
                    SELECT LOCATION
                  </button>
                </div>
              </div>
            </div>
          )}

          {modal && (
            <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => setModal(false)}>
              <div className="bg-white rounded-t-3xl w-full max-w-4xl p-8" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-1.5 bg-gray-300 rounded-full mx-auto mb-8"></div>
                <h2 className="text-3xl font-black mb-8">Select Delivery Hole</h2>
                <div className="grid grid-cols-6 gap-3 mb-8">
                  {Array.from({length: 18}, (_, i) => (
                    <button key={i} onClick={() => setHole(i + 1)} className={`p-6 rounded-2xl border-3 font-black text-lg transition-all ${hole === i + 1 ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => {
                  placeOrder(cart, hole, {lat: 13.7563 + Math.random() * 0.01, lng: 100.5018 + Math.random() * 0.01}, sel);
                  setCart([]);
                  setSel(null);
                  setModal(false);
                  setActiveView('orders');
                }} className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-black text-xl hover:shadow-2xl transition-all">
                  CONFIRM ORDER TO HOLE {hole}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <h1 className="text-4xl font-black mb-2">Food & Beverage</h1>
            <p className="text-emerald-100 font-semibold">Order directly to your location on the course</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <h2 className="text-2xl font-black mb-6">Available Now</h2>
            <div className="grid gap-6">
              {restaurants.map(r => (
                <div key={r.id} onClick={() => setSel(r)} className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-emerald-500 hover:shadow-2xl transition-all cursor-pointer">
                  <div className="flex gap-6">
                    <div className="w-32 h-32 text-8xl flex items-center justify-center bg-gray-50 rounded-2xl flex-shrink-0">
                      {r.img}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2">{r.name}</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-black text-lg">{r.rating}</span>
                        </div>
                        <span className="text-gray-400">•</span>
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="font-bold text-gray-700">{r.time}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-bold text-emerald-600">฿{r.fee} delivery</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OrdersView = () => (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-black">Your Orders</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-20 text-center">
              <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
              <p className="text-2xl text-gray-500 mb-8 font-bold">No orders yet</p>
              <button onClick={() => setActiveView('food')} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:shadow-xl">
                START ORDERING
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.slice().reverse().map(o => (
                <div key={o.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-lg">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6">
                    <h3 className="text-2xl font-black mb-2">Order #{o.id}</h3>
                    <p className="text-emerald-100 font-semibold">{o.time.toLocaleString()}</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      {o.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{item.img}</span>
                            <div>
                              <div className="font-black">{item.name}</div>
                              <div className="text-sm text-gray-500 font-semibold">x{item.qty}</div>
                            </div>
                          </div>
                          <span className="font-black text-lg">฿{item.price * item.qty}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t-2 pt-4 mb-6 flex justify-between">
                      <span className="font-black text-xl">Total</span>
                      <span className="font-black text-2xl text-emerald-600">฿{o.total}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600">Status</span>
                        <span className={`font-black text-sm uppercase ${o.status === 'preparing' ? 'text-yellow-600' : o.status === 'delivering' ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {o.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-bold text-gray-600">Delivering to</span>
                        <span className="font-black">Hole {o.hole}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50">
      {activeView === 'operations' && <Operations />}
      {activeView === 'food' && <FoodView />}
      {activeView === 'orders' && <OrdersView />}
    </div>
  );
};

export default GolfGPSPlatform;