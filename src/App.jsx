import React, { useState, useEffect } from 'react';
import {
  MapPin, Clock, CheckCircle, X, UserPlus, ChevronDown, Search,
  Plus, Dribbble, Users, User, LogOut, Trash2, Shield, Settings,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const NIC_ADMIN_ID = 'admin_nic';

// Regular player accounts
const PLAYER_ACCOUNTS = [
  { id: 1, name: 'Bucky Badger', username: '@bucky99', email: 'bucky@wisc.edu',  bio: 'Pass-first point guard.',           isAdmin: false },
  { id: 2, name: 'Paul Bolder', username: '@pbol',  email: 'pbolder@wisc.edu',  bio: 'Sharp shooter, 3-point specialist.', isAdmin: false },
  { id: 3, name: 'Mike Torres',  username: '@miket',   email: 'mike@wisc.edu',   bio: 'Defensive stopper. Hustles every play.', isAdmin: false },
];

// Admin account
const ADMIN_ACCOUNT = {
  id: NIC_ADMIN_ID,
  name: 'The Nick',
  fullName: 'Nicholas Recreation Center',
  username: '@nicholas_rec',
  email: 'admin@recsports.wisc.edu',
  bio: 'Official UW–Madison recreation facility.',
  isAdmin: true,
};

const ALL_ACCOUNTS = [...PLAYER_ACCOUNTS, ADMIN_ACCOUNT];

// The Nick's pre-seeded location (owned by admin)
const NIC_LOCATION = {
  id: 'loc_nic',
  name: 'Nicholas Recreation Center (The Nick)',
  shortName: 'The Nick',
  openTime: '07:00',
  closeTime: '23:00',
  ownerId: NIC_ADMIN_ID,
  verified: true,
};

// Hourly options 5 AM → midnight
const HOUR_OPTIONS = (() => {
  const opts = [];
  for (let h = 5; h <= 24; h++) {
    const realH  = h === 24 ? 0 : h;
    const period = h < 12 ? 'AM' : h === 12 ? 'PM' : h < 24 ? 'PM' : 'AM';
    const disp   = h === 12 ? 12 : h > 12 ? h - 12 : h;
    const val    = `${String(realH).padStart(2, '0')}:00`;
    opts.push({ val, label: `${disp} ${period}` });
  }
  return opts;
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const formatTime12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const dH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dH}:${String(m).padStart(2, '0')} ${period}`;
};

const generateTimeSlots = (openTime, closeTime) => {
  const slots = ['Right Now'];
  let cur = toMins(openTime);
  const end = toMins(closeTime) - 60;
  while (cur <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const dH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`Today, ${dH}:${String(m).padStart(2, '0')} ${period}`);
    cur += 30;
  }
  return slots;
};

const shortName = (accountId) => {
  const acc = ALL_ACCOUNTS.find(a => a.id === accountId);
  if (!acc) return 'Unknown';
  if (acc.isAdmin) return acc.name;
  const parts = acc.name.split(' ');
  return parts[0] + (parts[1] ? ' ' + parts[1].charAt(0) + '.' : '');
};

// ─── HourPicker ───────────────────────────────────────────────────────────────

function HourPicker({ label, value, onChange, minVal }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
        {HOUR_OPTIONS.map(opt => {
          const disabled = minVal ? toMins(opt.val) <= toMins(minVal) : false;
          const selected = value === opt.val;
          return (
            <button key={opt.val} type="button" disabled={disabled} onClick={() => onChange(opt.val)}
              className={`py-1.5 text-xs font-bold rounded-lg border transition-all
                ${selected   ? 'bg-red-600 border-red-600 text-white shadow-md scale-[1.03]'
                : disabled   ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                             : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'}`}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentAccountId, setCurrentAccountId] = useState(1);
  const currentAccount = ALL_ACCOUNTS.find(a => a.id === currentAccountId);
  const isAdminAccount = currentAccount?.isAdmin === true;

  // Favicon
  useEffect(() => {
    const existing = document.querySelector("link[rel~='icon']");
    const link = existing || document.createElement('link');
    link.rel = 'shortcut icon'; link.type = 'image/png'; link.href = '/logo.png';
    if (!existing) document.head.appendChild(link);
    document.title = 'Squad Up';
  }, []);

  // UI state
  const [activeTab, setActiveTab]                       = useState('find');
  const [toastMsg, setToastMsg]                         = useState(null);
  const [locationOpen, setLocationOpen]                 = useState(false);
  const [sportOpen, setSportOpen]                       = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal]         = useState(false);
  const [showProfileModal, setShowProfileModal]         = useState(false);
  const [showAdminPanel, setShowAdminPanel]             = useState(false);

  // Data — seed The Nick location
  const [locations, setLocations]               = useState([NIC_LOCATION]);
  const [selectedLocationId, setSelectedLocationId] = useState('loc_nic');
  const [selectedSport, setSelectedSport]       = useState('Basketball');
  const [games, setGames]                       = useState([]);
  const [friendsByAccount, setFriendsByAccount] = useState({ 1: [], 2: [], 3: [] });
  const [friendInput, setFriendInput]           = useState('');

  // Forms
  const [locationForm, setLocationForm] = useState({ name: '', openTime: '06:00', closeTime: '22:00' });
  const [newGameForm, setNewGameForm]   = useState({ time: 'Right Now', maxPlayers: 5 });

  // Admin edit form (for Nick admin to edit The Nick's hours)
  const [adminHoursForm, setAdminHoursForm] = useState({ openTime: NIC_LOCATION.openTime, closeTime: NIC_LOCATION.closeTime });

  // Derived
  const selectedLocation = locations.find(l => l.id === selectedLocationId) ?? null;
  const timeSlots = selectedLocation ? generateTimeSlots(selectedLocation.openTime, selectedLocation.closeTime) : ['Right Now'];
  const friends = friendsByAccount[currentAccountId] ?? [];
  const filteredGames = games.filter(g =>
    g.sport === selectedSport && (!selectedLocationId || g.locationId === selectedLocationId)
  );

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };
  const closeDropdowns = () => { setLocationOpen(false); setSportOpen(false); };

  // ── Location actions ──
  const handleAddLocation = (e) => {
    e.preventDefault();
    if (!locationForm.name.trim()) return;
    const loc = {
      id: Date.now(),
      name: locationForm.name.trim(),
      openTime: locationForm.openTime,
      closeTime: locationForm.closeTime,
      ownerId: currentAccountId,
      verified: false,
    };
    setLocations(prev => [...prev, loc]);
    setSelectedLocationId(loc.id);
    setNewGameForm(f => ({ ...f, time: 'Right Now' }));
    setShowAddLocationModal(false);
    setLocationForm({ name: '', openTime: '06:00', closeTime: '22:00' });
    toast(`${loc.name} added!`);
  };

  const handleRemoveLocation = (id) => {
    const loc = locations.find(l => l.id === id);
    if (!loc) return;
    // Only allow removal by the owner
    if (loc.ownerId !== currentAccountId) {
      toast('Only the location owner can remove this.');
      return;
    }
    setLocations(prev => prev.filter(l => l.id !== id));
    if (selectedLocationId === id) setSelectedLocationId(null);
    setGames(prev => prev.filter(g => g.locationId !== id));
    toast('Location removed.');
  };

  // Admin: update Nic hours
  const handleAdminSaveHours = (e) => {
    e.preventDefault();
    setLocations(prev => prev.map(l =>
      l.id === 'loc_nic' ? { ...l, openTime: adminHoursForm.openTime, closeTime: adminHoursForm.closeTime } : l
    ));
    // Reset any selected time that may be out of new range
    setNewGameForm(f => ({ ...f, time: 'Right Now' }));
    setShowAdminPanel(false);
    toast('Hours updated successfully!');
  };

  // ── Game actions ──
  const handleJoin = (id) => {
    if (isAdminAccount) return;
    setGames(prev => prev.map(g => {
      if (g.id !== id || g.joinedBy.includes(currentAccountId) || g.joinedBy.length >= g.maxPlayers) return g;
      return { ...g, joinedBy: [...g.joinedBy, currentAccountId] };
    }));
    toast("You've joined the squad!");
  };

  const handleLeave = (id) => {
    setGames(prev => prev.map(g => {
      if (g.id !== id || g.hostId === currentAccountId) return g;
      return { ...g, joinedBy: g.joinedBy.filter(uid => uid !== currentAccountId) };
    }));
    toast('You left the squad.');
  };

  const handleDelete = (id) => {
    setGames(prev => prev.filter(g => g.id !== id));
    toast('Squad deleted.');
  };

  const handleCreateGame = (e) => {
    e.preventDefault();
    if (!selectedLocationId) { toast('Please select a location first.'); return; }
    const game = {
      id: Date.now(),
      time: newGameForm.time,
      isRightNow: newGameForm.time === 'Right Now',
      hostId: currentAccountId,
      joinedBy: [currentAccountId],
      maxPlayers: parseInt(newGameForm.maxPlayers),
      locationId: selectedLocationId,
      locationName: selectedLocation.name,
      sport: selectedSport,
    };
    setGames(prev => [...prev, game]);
    toast('Squad created! Players can now join.');
    setActiveTab('find');
  };

  // ── Friend actions ──
  const handleAddFriend = (e) => {
    e.preventDefault();
    const val = friendInput.trim();
    if (!val) return;
    setFriendsByAccount(prev => ({ ...prev, [currentAccountId]: [...(prev[currentAccountId] ?? []), val] }));
    toast(`Added ${val}!`);
    setFriendInput('');
  };
  const handleRemoveFriend = (idx) => {
    const name = friends[idx];
    setFriendsByAccount(prev => ({ ...prev, [currentAccountId]: prev[currentAccountId].filter((_, i) => i !== idx) }));
    toast(`Removed ${name}.`);
  };

  // ── Game card ──
  const renderGameCard = (game) => {
    const isJoined = game.joinedBy.includes(currentAccountId);
    const isHost   = game.hostId === currentAccountId;
    const isFull   = game.joinedBy.length >= game.maxPlayers;
    const pct      = (game.joinedBy.length / game.maxPlayers) * 100;

    return (
      <div key={game.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md relative overflow-hidden ${isJoined ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
        <div className="absolute bottom-0 left-0 h-1 transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: isJoined ? '#22c55e' : '#ef4444', opacity: 0.75 }} />

        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2 text-red-700 font-bold">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{game.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500">Casual</span>
            {isHost && (
              <button onClick={() => handleDelete(game.id)} className="text-gray-300 hover:text-red-500 transition" title="Delete squad">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-800 mb-0.5">
          Host: {shortName(game.hostId)}{isHost && <span className="text-red-500 font-bold text-xs ml-1">(You)</span>}
        </p>
        <div className="flex items-center text-xs text-gray-400 mb-3">
          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />{game.locationName}
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-2 flex justify-between">
            <span>Squad</span><span>{game.joinedBy.length} / {game.maxPlayers}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {game.joinedBy.map(uid => (
              <span key={uid} className={`text-xs px-2.5 py-1 rounded-md border font-medium
                ${uid === currentAccountId ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                {shortName(uid)}{uid === currentAccountId ? ' (You)' : ''}
              </span>
            ))}
          </div>
        </div>

        {isJoined ? (
          <div className="space-y-2">
            <button disabled className="w-full bg-green-100 text-green-700 py-2 rounded-lg font-bold text-sm flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-1.5" />Joined
            </button>
            {!isHost && (
              <button onClick={() => handleLeave(game.id)}
                className="w-full border border-gray-200 text-gray-500 py-2 rounded-lg font-bold text-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                <LogOut className="w-4 h-4 mr-1.5" />Leave Squad
              </button>
            )}
          </div>
        ) : (
          <>
            {isAdminAccount ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-400 font-semibold text-center">
                Viewing as facility admin
              </div>
            ) : (
              <button onClick={() => handleJoin(game.id)} disabled={isFull}
                className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors
                  ${isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]'}`}>
                {isFull ? 'Squad Full' : 'Join Squad'}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20" onClick={closeDropdowns}>

      {/* Header */}
      <header className="bg-red-700 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 ml-2 my-1">
            <div className="bg-black p-1 rounded-xl shadow-lg border-2 border-gray-900 overflow-hidden w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="Squad Up" className="w-full h-full object-cover"
                onError={e => { e.target.src = 'https://placehold.co/100x100/000/fff?text=SU'; }} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter italic uppercase text-white drop-shadow-sm flex items-center">
              Squad<span className="text-red-700 bg-white px-1.5 py-0.5 ml-1 rounded-md shadow-sm">Up</span>
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Admin panel button — only shown for admin */}
            {isAdminAccount && (
              <button onClick={e => { e.stopPropagation(); setShowAdminPanel(true); }}
                className="flex items-center gap-1.5 bg-yellow-400 text-gray-900 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-yellow-300 transition shadow-sm">
                <Settings className="w-3.5 h-3.5" />Admin Panel
              </button>
            )}
            {!isAdminAccount && (
              <button onClick={e => { e.stopPropagation(); setShowFriendsModal(true); }} className="text-red-200 hover:text-white transition" title="Friends">
                <UserPlus className="w-5 h-5" />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); setShowProfileModal(true); }}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full border border-red-500 flex items-center justify-center font-bold text-sm uppercase">
              {currentAccount.name.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      {/* Demo switcher */}
      <div className="bg-gray-900 text-white text-xs py-2 px-4 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-gray-500 font-bold uppercase tracking-wider">Demo:</span>
        {PLAYER_ACCOUNTS.map(acc => (
          <button key={acc.id} onClick={() => { setCurrentAccountId(acc.id); toast(`Switched to ${acc.name}`); }}
            className={`px-3 py-1 rounded-full font-bold transition-colors
              ${currentAccountId === acc.id ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {acc.name.split(' ')[0]}
          </button>
        ))}
        {/* Admin account pill — styled differently */}
        <button onClick={() => { setCurrentAccountId(NIC_ADMIN_ID); toast('Switched to Nic Admin'); }}
          className={`px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1
            ${currentAccountId === NIC_ADMIN_ID ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-yellow-300 hover:bg-gray-600'}`}>
          <Shield className="w-3 h-3" />The Nick
        </button>
      </div>

      {/* Admin account banner */}
      {isAdminAccount && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-bold text-yellow-800">Admin View — Nicholas Recreation Center</span>
          </div>
          <button onClick={() => setShowAdminPanel(true)}
            className="text-xs font-bold text-yellow-700 underline hover:text-yellow-900">
            Edit Hours
          </button>
        </div>
      )}

      <main className="max-w-3xl mx-auto">

        {/* Filters */}
        <div className="bg-white p-4 shadow-sm border-b border-gray-100 relative z-10">
          <div className="grid grid-cols-2 gap-3">

            {/* Location dropdown */}
            <div className="relative">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Location</label>
              <button onClick={e => { e.stopPropagation(); setLocationOpen(o => !o); setSportOpen(false); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex justify-between items-center text-sm font-medium hover:bg-gray-100 transition">
                <span className="truncate mr-2 flex items-center min-w-0">
                  <MapPin className="w-4 h-4 mr-1.5 text-red-600 flex-shrink-0" />
                  <span className="truncate">{selectedLocation ? (selectedLocation.shortName ?? selectedLocation.name) : 'Select location…'}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>

              {locationOpen && (
                <div className="absolute top-full left-0 w-72 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-30"
                  onClick={e => e.stopPropagation()}>
                  {locations.map(loc => {
                    const canRemove = loc.ownerId === currentAccountId;
                    return (
                      <div key={loc.id}
                        className={`flex items-center justify-between px-3 py-3 border-b border-gray-50 last:border-0 group
                          ${selectedLocationId === loc.id ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}>
                        <div className="flex-1 cursor-pointer min-w-0"
                          onClick={() => { setSelectedLocationId(loc.id); setLocationOpen(false); setNewGameForm(f => ({ ...f, time: 'Right Now' })); }}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-sm font-semibold truncate ${selectedLocationId === loc.id ? 'text-red-700' : 'text-gray-800'}`}>
                              {loc.name}
                            </p>
                            {loc.verified && (
                              <Shield className="w-3 h-3 text-yellow-500 flex-shrink-0" title="Verified facility" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{formatTime12(loc.openTime)} – {formatTime12(loc.closeTime)}</p>
                        </div>
                        {/* Only show trash if this account owns the location */}
                        {canRemove && (
                          <button onClick={() => handleRemoveLocation(loc.id)}
                            className="ml-3 text-gray-200 hover:text-red-500 transition opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {/* Non-admin users can add their own locations */}
                  {!isAdminAccount && (
                    <button onClick={() => { setLocationOpen(false); setShowAddLocationModal(true); }}
                      className="w-full px-4 py-3 text-sm font-bold text-red-600 flex items-center hover:bg-gray-50 border-t border-gray-100">
                      <Plus className="w-4 h-4 mr-1.5" />Add Location
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sport dropdown */}
            <div className="relative">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Sport</label>
              <button onClick={e => { e.stopPropagation(); setSportOpen(o => !o); setLocationOpen(false); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex justify-between items-center text-sm font-medium hover:bg-gray-100 transition">
                <span className="truncate mr-2 flex items-center">
                  <Dribbble className="w-4 h-4 mr-1.5 text-orange-500" />{selectedSport}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
              {sportOpen && (
                <div className="absolute top-full right-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-30"
                  onClick={e => e.stopPropagation()}>
                  <div onClick={() => { setSelectedSport('Basketball'); setSportOpen(false); }}
                    className="p-3 cursor-pointer hover:bg-orange-50 text-sm font-semibold border-b border-gray-50">Basketball</div>
                  <div className="p-3 cursor-not-allowed text-sm text-gray-400 bg-gray-50 flex justify-between items-center">
                    Volleyball <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded uppercase font-bold text-gray-500">Soon</span>
                  </div>
                  <div className="p-3 cursor-not-allowed text-sm text-gray-400 bg-gray-50 flex justify-between items-center">
                    Pickleball <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded uppercase font-bold text-gray-500">Soon</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs — admin sees a read-only live view, no "create" tab */}
        <div className="flex px-4 pt-5 pb-2">
          {(isAdminAccount
            ? [{ key: 'find', label: 'Live Activity', Icon: Search }]
            : [{ key: 'find', label: 'Find a Squad', Icon: Search }, { key: 'create', label: 'Create a Squad', Icon: Plus }]
          ).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2
                ${activeTab === key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="p-4">

          {/* ── Find / Live Activity ── */}
          {activeTab === 'find' && (
            <div className="space-y-6">

              {/* Admin summary bar */}
              {isAdminAccount && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-0.5">Active Squads Today</p>
                    <p className="text-2xl font-black text-gray-900">{filteredGames.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-0.5">Players Out</p>
                    <p className="text-2xl font-black text-gray-900">
                      {filteredGames.reduce((sum, g) => sum + g.joinedBy.length, 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-0.5">Hours</p>
                    <p className="text-sm font-bold text-gray-700">
                      {selectedLocation ? `${formatTime12(selectedLocation.openTime)} – ${formatTime12(selectedLocation.closeTime)}` : '—'}
                    </p>
                  </div>
                </div>
              )}

              {filteredGames.filter(g => g.isRightNow).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <h2 className="text-base font-bold text-gray-800">Happening Right Now</h2>
                  </div>
                  <div className="space-y-4">{filteredGames.filter(g => g.isRightNow).map(renderGameCard)}</div>
                </div>
              )}

              {filteredGames.filter(g => !g.isRightNow).length > 0 && (
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <h2 className="text-base font-bold text-gray-800">Upcoming Today</h2>
                    <span className="text-xs text-gray-400 font-medium">{filteredGames.filter(g => !g.isRightNow).length} scheduled</span>
                  </div>
                  <div className="space-y-4">{filteredGames.filter(g => !g.isRightNow).map(renderGameCard)}</div>
                </div>
              )}

              {filteredGames.length === 0 && (
                <div className="text-center py-14">
                  {!selectedLocationId ? (
                    <>
                      <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium text-sm">No location selected.</p>
                      {!isAdminAccount && (
                        <button onClick={() => setShowAddLocationModal(true)} className="mt-2 text-red-600 font-bold text-sm hover:underline">Add a location to get started</button>
                      )}
                    </>
                  ) : (
                    <>
                      <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium text-sm">
                        {isAdminAccount ? 'No active squads right now.' : 'No squads at this location yet.'}
                      </p>
                      {!isAdminAccount && (
                        <button onClick={() => setActiveTab('create')} className="mt-2 text-red-600 font-bold text-sm hover:underline">Host the first squad</button>
                      )}
                    </>
                  )}
                </div>
              )}

              {filteredGames.length > 0 && !isAdminAccount && (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Don't see a time that works?</p>
                  <button onClick={() => setActiveTab('create')} className="text-red-600 font-bold text-sm mt-1 hover:underline">Host your own squad</button>
                </div>
              )}
            </div>
          )}

          {/* ── Create (players only) ── */}
          {activeTab === 'create' && !isAdminAccount && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-bold text-gray-900">Host a {selectedSport} Game</h2>
              <p className="text-sm text-gray-400 mt-1 mb-5">
                {selectedLocation
                  ? `At ${selectedLocation.name} · Open ${formatTime12(selectedLocation.openTime)} – ${formatTime12(selectedLocation.closeTime)}`
                  : 'Select a location to see available times.'}
              </p>

              {!selectedLocationId ? (
                <div className="text-center py-10">
                  <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-4">You need a location first.</p>
                  <button onClick={() => setShowAddLocationModal(true)}
                    className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-700 transition shadow-sm">
                    Add a Location
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateGame} className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-gray-700">Select Time</label>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Today</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map(time => {
                        const label = time === 'Right Now' ? 'Right Now' : time.replace('Today, ', '');
                        const sel = newGameForm.time === time;
                        return (
                          <button key={time} type="button" onClick={() => setNewGameForm(f => ({ ...f, time }))}
                            className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all
                              ${sel ? 'bg-red-600 border-red-600 text-white shadow-md scale-[1.02]'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {timeSlots.length <= 1 && (
                      <p className="text-xs text-amber-500 mt-2">Only "Right Now" available — the location may close soon.</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">Total Players</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Users className="h-5 w-5 text-gray-400" /></div>
                      <select className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-gray-50 font-medium appearance-none focus:ring-red-500 focus:border-red-500"
                        value={newGameForm.maxPlayers} onChange={e => setNewGameForm(f => ({ ...f, maxPlayers: e.target.value }))}>
                        <option value="2">2 Players</option>
                        <option value="3">3 Players</option>
                        <option value="4">4 Players</option>
                        <option value="5">5 Players</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><ChevronDown className="w-4 h-4 text-gray-500" /></div>
                    </div>
                  </div>

                  <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-start">
                    <MapPin className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-red-600" />
                    <p>By creating this squad you agree to meet at <strong>{selectedLocation.name}</strong> at the designated time. All games are casual.</p>
                  </div>

                  <button type="submit" className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 active:scale-[0.98] transition shadow-md flex items-center justify-center">
                    <Plus className="w-5 h-5 mr-2" />Create Squad
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 w-max max-w-[90vw]">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="pl-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Admin Panel Modal ── */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-yellow-400 p-4 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-black text-gray-900 flex items-center gap-2 text-base">
                  <Shield className="w-5 h-5" />Admin Panel
                </h3>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">Nicholas Recreation Center</p>
              </div>
              <button onClick={() => setShowAdminPanel(false)}><X className="w-5 h-5 text-gray-700 hover:text-gray-900" /></button>
            </div>

            <form onSubmit={handleAdminSaveHours} className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-bold text-gray-700 mb-1">Current Hours</p>
                <p className="text-gray-500">
                  {formatTime12(locations.find(l => l.id === 'loc_nic')?.openTime ?? '07:00')} – {formatTime12(locations.find(l => l.id === 'loc_nic')?.closeTime ?? '23:00')}
                </p>
              </div>

              <HourPicker
                label="New Open Time"
                value={adminHoursForm.openTime}
                onChange={val => {
                  const newClose = toMins(val) >= toMins(adminHoursForm.closeTime)
                    ? (HOUR_OPTIONS.find(o => toMins(o.val) > toMins(val))?.val ?? '23:00')
                    : adminHoursForm.closeTime;
                  setAdminHoursForm(f => ({ ...f, openTime: val, closeTime: newClose }));
                }}
              />

              <HourPicker
                label="New Close Time"
                value={adminHoursForm.closeTime}
                minVal={adminHoursForm.openTime}
                onChange={val => setAdminHoursForm(f => ({ ...f, closeTime: val }))}
              />

              <p className="text-xs text-gray-400">
                Updating hours will immediately change available run times for all players at The Nick.
              </p>

              <button type="submit" className="w-full bg-yellow-400 text-gray-900 font-black py-2.5 rounded-lg hover:bg-yellow-300 transition shadow-sm">
                Save Hours
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Location Modal (players only) ── */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-red-700 p-4 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold flex items-center gap-2"><MapPin className="w-5 h-5" /> Add Location</h3>
              <button onClick={() => setShowAddLocationModal(false)}><X className="w-5 h-5 text-red-200 hover:text-white" /></button>
            </div>
            <form onSubmit={handleAddLocation} className="p-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Location Name</label>
                <input type="text" placeholder="e.g. Bakke Recreation Center" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-red-500 focus:border-red-500"
                  value={locationForm.name} onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <HourPicker label="Opens At" value={locationForm.openTime}
                onChange={val => {
                  const newClose = toMins(val) >= toMins(locationForm.closeTime)
                    ? (HOUR_OPTIONS.find(o => toMins(o.val) > toMins(val))?.val ?? '23:00')
                    : locationForm.closeTime;
                  setLocationForm(f => ({ ...f, openTime: val, closeTime: newClose }));
                }} />

              <HourPicker label="Closes At" value={locationForm.closeTime} minVal={locationForm.openTime}
                onChange={val => setLocationForm(f => ({ ...f, closeTime: val }))} />

              <p className="text-xs text-gray-400">Run times are generated every 30 min within these hours, stopping 1 hr before close.</p>

              <button type="submit" className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition shadow-sm">
                Add Location
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Friends Modal ── */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-700 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /> Friends</h3>
              <button onClick={() => setShowFriendsModal(false)}><X className="w-5 h-5 text-red-200 hover:text-white" /></button>
            </div>
            <div className="p-4 space-y-4">
              <form onSubmit={handleAddFriend}>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Add by Username</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. @player123"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                    value={friendInput} onChange={e => setFriendInput(e.target.value)} />
                  <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">Add</button>
                </div>
              </form>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Your Friends ({friends.length})</label>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {friends.length === 0 ? <p className="text-sm text-gray-400">No friends added yet.</p>
                    : friends.map((f, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <span className="text-sm font-medium">{f}</span>
                        <button onClick={() => handleRemoveFriend(i)} className="text-gray-300 hover:text-red-500 transition"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-700 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                {isAdminAccount ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                {isAdminAccount ? 'Admin Profile' : 'Player Profile'}
              </h3>
              <button onClick={() => setShowProfileModal(false)}><X className="w-5 h-5 text-red-200 hover:text-white" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black
                  ${isAdminAccount ? 'bg-yellow-400' : 'bg-red-100'}`}>
                  {isAdminAccount
                    ? <Shield className="w-8 h-8 text-gray-900" />
                    : <span className="text-red-600">{currentAccount.name.charAt(0)}</span>}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <p className="font-bold text-gray-900">{currentAccount.fullName ?? currentAccount.name}</p>
                  {isAdminAccount && <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full border border-yellow-200">ADMIN</span>}
                </div>
                <p className="text-sm text-gray-400">{currentAccount.username}</p>
                <p className="text-xs text-gray-400 mt-1 italic">{currentAccount.bio}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-3">Switch Account</p>
                <div className="space-y-2">
                  {ALL_ACCOUNTS.map(acc => (
                    <button key={acc.id}
                      onClick={() => { setCurrentAccountId(acc.id); setShowProfileModal(false); toast(`Switched to ${acc.fullName ?? acc.name}`); }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition
                        ${currentAccountId === acc.id ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${currentAccountId === acc.id ? 'bg-red-600 text-white' : acc.isAdmin ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {acc.isAdmin ? <Shield className="w-4 h-4" /> : acc.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900">{acc.name}</p>
                            {acc.isAdmin && <span className="text-[9px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded-full">ADMIN</span>}
                          </div>
                          <p className="text-xs text-gray-400">{acc.username}</p>
                        </div>
                      </div>
                      {currentAccountId === acc.id && <CheckCircle className="w-4 h-4 text-red-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}