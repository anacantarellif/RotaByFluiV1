// app.jsx — shell: theme, tweaks, nav, frame. Mounts to #root
const React = window.React;
const { useState, useEffect } = React;
const { Icon, MapScreen, CommunityScreen, RouteScreen, ProfileScreen, Onboarding, NavScreen, TripScreen } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "markers": "Pino",
  "density": "regular",
  "reports": true
}/*EDITMODE-END*/;

function StatusBar() {
  return (
    <div className="statusbar" aria-hidden="true">
      <span>9:30</span>
      <div className="punch" />
      <div className="icons">
        <Icon name="wifi" size={15} stroke={2.2} />
        <svg width="22" height="13" viewBox="0 0 22 13"><rect x="0.5" y="0.5" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" /><rect x="2" y="2" width="13" height="9" rx="1.5" fill="currentColor" /><rect x="20" y="4" width="2" height="5" rx="1" fill="currentColor" /></svg>
      </div>
    </div>
  );
}

const NAV = [
  { id: 'map', icon: 'map', label: 'Mapa' },
  { id: 'route', icon: 'route', label: 'Rota' },
  { id: 'community', icon: 'users', label: 'Comunidade' },
  { id: 'profile', icon: 'user', label: 'Perfil' },
];

function NavBar({ tab, setTab }) {
  return (
    <nav className="navbar" role="tablist" aria-label="Navegação principal">
      {NAV.map(n => (
        <button key={n.id} className={`navitem ${tab === n.id ? 'on' : ''}`} onClick={() => setTab(n.id)}
          role="tab" aria-selected={tab === n.id} aria-label={n.label}>
          <span className="ico"><Icon name={n.icon} size={22} stroke={tab === n.id ? 2.4 : 2} /></span>
          {n.label}
        </button>
      ))}
    </nav>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('rota_onboarded') === '1');
  const [tab, setTab] = useState('map');
  const [favs, setFavs] = useState(() => new Set(['st1', 'st3', 'st7']));
  const [toast, setToast] = useState(null);
  const [nav, setNav] = useState(null);   // active navigation destination
  const [trip, setTrip] = useState(null); // active itinerary (roteiro em viagem)

  const theme = t.dark ? 'dark' : 'light';
  const markers = t.markers === 'Ponto' ? 'dot' : 'pin';

  const pushToast = (msg, icon) => {
    setToast({ msg, icon });
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => setToast(null), 2200);
  };
  const toggleFav = (id) => setFavs(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const finishOnboarding = () => { localStorage.setItem('rota_onboarded', '1'); setOnboarded(true); };

  return (
    <div className="rota" data-theme={theme} data-density={t.density} data-markers={markers}>
      <div className="stage">
        <div className="phone">
          <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
          <StatusBar />
          {!onboarded ? (
            <Onboarding onDone={finishOnboarding} />
          ) : (
            <React.Fragment>
              <span id="conteudo" tabIndex="-1" className="sr-only">Conteúdo principal</span>
              {tab === 'map' && <MapScreen favs={favs} onToggleFav={toggleFav} pushToast={pushToast} onNavigate={(s) => setNav(s)} showReports={t.reports} density={t.density} />}
              {tab === 'route' && <RouteScreen pushToast={pushToast} onNavigate={(s) => setNav(s)} onStartTrip={(g) => setTrip(g)} />}
              {tab === 'community' && <CommunityScreen pushToast={pushToast} />}
              {tab === 'profile' && <ProfileScreen favs={favs} density={t.density} />}
              <NavBar tab={tab} setTab={setTab} />
            </React.Fragment>
          )}
          {trip && <TripScreen guide={trip} onExit={() => setTrip(null)} pushToast={pushToast} />}
          {nav && <NavScreen dest={nav} pushToast={pushToast} onExit={() => setNav(null)} onArrive={(s) => { setNav(null); pushToast(`Recarga iniciada · ${s.name}`, 'zap'); }} />}
          {toast && <div className="toast" role="status" aria-live="polite">{toast.icon && <Icon name={toast.icon} size={16} color="var(--bg)" />}{toast.msg}</div>}
          <div className="gesture"><i /></div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aparência" />
        <TweakToggle label="Modo escuro" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakRadio label="Densidade" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Mapa" />
        <TweakRadio label="Marcadores" value={t.markers} options={['Pino', 'Ponto']} onChange={(v) => setTweak('markers', v)} />
        <TweakToggle label="Reportes da comunidade" value={t.reports} onChange={(v) => setTweak('reports', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
