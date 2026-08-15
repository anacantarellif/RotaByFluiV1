// board.jsx — static gallery of all Rota screens + light/dark variations for Figma import
const React = window.React;
const { Icon, Seal, MapView, MapScreen, StationPeek, StationDetail, ReportSheet, RateSheet,
        Onboarding, CommunityScreen, RouteScreen, ProfileScreen } = window;
const D = window.DATA;
const noop = () => {};
const HERO = D.stations[0]; // Pátio Higienópolis · Selo Flui 3

function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:30</span>
      <div className="punch" />
      <div className="icons">
        <Icon name="wifi" size={15} stroke={2.2} />
        <svg width="22" height="13" viewBox="0 0 22 13"><rect x="0.5" y="0.5" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" /><rect x="2" y="2" width="13" height="9" rx="1.5" fill="currentColor" /><rect x="20" y="4" width="2" height="5" rx="1" fill="currentColor" /></svg>
      </div>
    </div>
  );
}

const NAV = [['map', 'map', 'Mapa'], ['route', 'route', 'Rota'], ['community', 'users', 'Comunidade'], ['profile', 'user', 'Perfil']];
function NavBar({ tab }) {
  return (
    <div className="navbar">
      {NAV.map(([id, ic, lb]) => (
        <div key={id} className={`navitem ${tab === id ? 'on' : ''}`}>
          <span className="ico"><Icon name={ic} size={22} stroke={tab === id ? 2.4 : 2} /></span>{lb}
        </div>
      ))}
    </div>
  );
}

function Frame({ theme = 'light', label, sub, navTab, children }) {
  return (
    <div className="frame-wrap">
      <div className="rota" data-theme={theme} data-density="regular" data-markers="pin">
        <div className="phone">
          <StatusBar />
          {children}
          {navTab && <NavBar tab={navTab} />}
          <div className="gesture"><i /></div>
        </div>
      </div>
      <div className="frame-cap"><b>{label}</b>{sub && <span> · {sub}</span>}</div>
    </div>
  );
}

// background map used behind sheet frames
function MapBg() {
  return <div style={{ position: 'absolute', inset: 0 }}><MapView active={null} onPin={noop} stations={D.stations} /></div>;
}

function Section({ title, kicker, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="section-kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
      <div className="row">{children}</div>
    </section>
  );
}

function Board() {
  const only = window.BOARD_ONLY; // e.g. '01' renders just that section
  const SECTIONS = [
    { k: '01', title: 'Onboarding & cadastro', render: () => [
      <Frame key="a" label="Boas-vindas"><Onboarding onDone={noop} initialStep={0} /></Frame>,
      <Frame key="b" label="Cadastro do carro" sub="passo 1"><Onboarding onDone={noop} initialStep={1} /></Frame>,
      <Frame key="c" label="Localização" sub="passo 3"><Onboarding onDone={noop} initialStep={3} /></Frame>,
    ] },
    { k: '02', title: 'Mapa & descoberta', render: () => [
      <Frame key="a" label="Mapa" sub="light" navTab="map"><MapScreen favs={new Set()} onToggleFav={noop} pushToast={noop} onNavigate={noop} showReports={true} density="regular" /></Frame>,
      <Frame key="b" label="Mapa" sub="dark" theme="dark" navTab="map"><MapScreen favs={new Set()} onToggleFav={noop} pushToast={noop} onNavigate={noop} showReports={true} density="regular" /></Frame>,
      <Frame key="c" label="Preview do ponto" sub="bottom sheet"><div className="screen"><MapBg /><StationPeek st={HERO} onOpen={noop} onClose={noop} onNavigate={noop} /></div></Frame>,
    ] },
    { k: '03', title: 'Ficha do ponto & avaliação', render: () => [
      <Frame key="a" label="Ficha do ponto" sub="light · Selo Flui"><div className="screen" style={{ background: 'var(--bg)' }}><StationDetail st={HERO} onClose={noop} onNavigate={noop} onReport={noop} onRate={noop} fav={true} onFav={noop} /></div></Frame>,
      <Frame key="b" label="Ficha do ponto" sub="dark" theme="dark"><div className="screen" style={{ background: 'var(--bg)' }}><StationDetail st={HERO} onClose={noop} onNavigate={noop} onReport={noop} onRate={noop} fav={true} onFav={noop} /></div></Frame>,
      <Frame key="c" label="Avaliar" sub="Selo Flui"><div className="screen" style={{ background: 'var(--bg)' }}><RateSheet st={HERO} onClose={noop} onDone={noop} /></div></Frame>,
      <Frame key="d" label="Reporte" sub="comunidade"><div className="screen" style={{ background: 'var(--bg)' }}><ReportSheet st={HERO} onClose={noop} onDone={noop} /></div></Frame>,
    ] },
    { k: '04', title: 'Comunidade & gamificação', render: () => [
      <Frame key="a" label="Atividade" sub="feed" navTab="community"><CommunityScreen pushToast={noop} initialTab="feed" /></Frame>,
      <Frame key="b" label="Ranking" sub="watts" navTab="community"><CommunityScreen pushToast={noop} initialTab="rank" /></Frame>,
      <Frame key="c" label="Comunidade" sub="dark" theme="dark" navTab="community"><CommunityScreen pushToast={noop} initialTab="feed" /></Frame>,
    ] },
    { k: '05', title: 'Rota & perfil', render: () => [
      <Frame key="a" label="Planejador de rota" sub="com recarga" navTab="route"><RouteScreen pushToast={noop} initialDone={true} /></Frame>,
      <Frame key="b" label="Perfil" sub="light" navTab="profile"><ProfileScreen favs={new Set(['st1', 'st3', 'st7'])} density="regular" /></Frame>,
      <Frame key="c" label="Perfil" sub="dark" theme="dark" navTab="profile"><ProfileScreen favs={new Set(['st1', 'st3', 'st7'])} density="regular" /></Frame>,
    ] },
  ];
  const shown = only ? SECTIONS.filter(s => s.k === only) : SECTIONS;
  return (
    <div className="board">
      <header className="board-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#6C2BD9', display: 'inline-flex' }}><Seal size={40} /></span>
          <div>
            <h1>Rota <span>by Flui</span></h1>
            <p>O guia das recargas · {only ? `Seção ${only}` : 'UI Kit & telas'} · MVP São Paulo</p>
          </div>
        </div>
        <div className="legend-top">
          <span><i style={{ background: '#F4EEE3', boxShadow: 'inset 0 0 0 1px #DACFB8' }} /> Light</span>
          <span><i style={{ background: '#14111B' }} /> Dark</span>
        </div>
      </header>
      {shown.map(s => (
        <Section key={s.k} kicker={s.k} title={s.title}>{s.render()}</Section>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Board />);
