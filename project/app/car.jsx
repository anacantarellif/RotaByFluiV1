// car.jsx — Android Auto (head-unit) screens for Rota by Flui. Renders board to #root
const React = window.React;
const { Icon, Seal } = window;
const D = window.DATA;

/* ---------- landscape night map ---------- */
function CarMap({ route, pins, focus }) {
  // viewBox 800x450 landscape
  const blocks = [];
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x7fffffff); };
  for (let x = -20; x < 820; x += 78) {
    for (let y = -20; y < 470; y += 70) {
      const w = 50 + rnd() * 22, h = 44 + rnd() * 20;
      blocks.push({ x: x + rnd() * 8, y: y + rnd() * 8, w, h, s: rnd() });
    }
  }
  return (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
      <rect x="-20" y="-20" width="840" height="490" fill="var(--map-road)" />
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="5" fill={b.s > 0.8 ? 'var(--map-land-2)' : 'var(--map-land)'} />
      ))}
      {/* water diagonal */}
      <path d="M-20 120 C 180 90, 300 200, 520 150 C 680 110, 760 170, 840 150" fill="none" stroke="var(--map-water)" strokeWidth="26" strokeLinecap="round" />
      {/* avenues */}
      <g fill="none" stroke="var(--map-road-major)" strokeLinecap="round">
        <path d="M-20 300 C 200 280, 420 330, 840 300" strokeWidth="12" />
        <path d="M120 -20 C 200 160, 360 260, 460 470" strokeWidth="12" />
        <path d="M640 -20 C 600 160, 520 240, 500 470" strokeWidth="10" />
      </g>
      {route && (
        <g>
          <path className="aa-route-glow" d={route} />
          <path className="aa-route" d={route} />
        </g>
      )}
    </svg>
  );
}

function MapPin({ st, big }) {
  return (
    <div className={`aa-mappin ${st.avail} ${st.selo ? 'selo' : ''} ${big ? 'big' : ''}`} style={{ left: st.mx + '%', top: st.my + '%' }}>
      {st.selo > 0 && <span className="crown"><Seal size={big ? 18 : 15} /></span>}
      <span className="b">{st.power}</span>
    </div>
  );
}

// map coordinates (percent) for the stations we feature
const MAPXY = {
  st1: { mx: 58, my: 36 }, st2: { mx: 72, my: 64 }, st3: { mx: 64, my: 78 },
  st4: { mx: 40, my: 56 }, st7: { mx: 34, my: 40 }, st5: { mx: 80, my: 70 },
};
const feat = (ids) => ids.map(id => ({ ...D.stations.find(s => s.id === id), ...MAPXY[id] }));

/* ---------- chrome ---------- */
function Top({ title, sub, back, actions }) {
  return (
    <div className="aa-top">
      {back && <button className="aa-iconbtn"><Icon name="chevL" size={24} /></button>}
      <div className="titlewrap">
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="aa-actions">{actions}</div>}
    </div>
  );
}

function BottomBar() {
  return (
    <div className="aa-bottom">
      <div className="sysbtn"><Icon name="chevL" size={20} color="#E8E6EA" /></div>
      <div className="applabel"><span className="seal"><Seal size={20} /></span> Rota</div>
      <div className="sysbtn" style={{ marginLeft: 4 }}><Icon name="map" size={18} color="#E8E6EA" /></div>
      <div className="right">
        <Icon name="wifi" size={18} color="#Bdb8c4" />
        <Icon name="battery" size={18} color="#Bdb8c4" />
        <span className="clock">9:30</span>
      </div>
    </div>
  );
}

function Screen({ children }) {
  return (
    <div className="rota" data-theme="dark" data-density="regular" data-markers="dot" style={{ display: 'contents' }}>
      <div className="dash-screen">{children}</div>
    </div>
  );
}

/* ---------- ring helper ---------- */
function Ring({ pct, color = 'var(--primary)', size = 120, sw = 11 }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

/* ============ SCREEN 1 — LIST + MAP ============ */
function S1() {
  const list = feat(['st1', 'st7', 'st4', 'st2', 'st3']);
  return (
    <Screen>
      <Top title="Recargas perto de você" sub="5 pontos · ordenado por distância"
        actions={<React.Fragment>
          <button className="aa-iconbtn"><Icon name="filter" size={22} color="var(--ink)" /></button>
          <button className="aa-iconbtn"><Icon name="search" size={22} color="var(--ink)" /></button>
        </React.Fragment>} />
      <div className="aa-body">
        <div className="aa-list">
          {list.map((st, i) => (
            <button key={st.id} className={`aa-row ${i === 0 ? 'sel' : ''}`}>
              <span className="rank">{i + 1}</span>
              <div className="info">
                <div className="name">
                  {st.selo > 0 && <span className="seal" style={{ color: 'var(--gold)', display: 'inline-flex', flex: '0 0 auto' }}><Seal size={18} /></span>}
                  <span className="nm">{st.name}</span>
                </div>
                <div className="meta">
                  <span className={`aa-dot ${st.avail}`} />
                  {st.free}/{st.total} livres · {st.connectors[0]}
                </div>
              </div>
              <div className="dist">
                <div className="km">{st.dist.replace(' km', '')}</div>
                <div className="kw">{st.power} kW</div>
              </div>
            </button>
          ))}
        </div>
        <div className="aa-map">
          <CarMap pins={list} />
          {list.map(st => <MapPin key={st.id} st={st} big={st.id === 'st1'} />)}
          <div className="aa-user" style={{ left: '50%', top: '54%' }}><div className="core" /></div>
          <div className="aa-mapctl">
            <button className="aa-iconbtn lg"><Icon name="plus" size={24} color="var(--ink)" /></button>
            <button className="aa-iconbtn lg brand"><Icon name="crosshair" size={24} /></button>
          </div>
        </div>
      </div>
      <BottomBar />
    </Screen>
  );
}

/* ============ SCREEN 2 — DETAIL PANE + MAP ============ */
function S2() {
  const st = { ...D.stations[0], ...MAPXY.st1 };
  const specs = [
    ['zap', 'Potência máxima', st.power + ' kW', true],
    ['plug', 'Conectores', st.connectors.join(' · '), false],
    ['dollar', 'Preço médio', 'R$ ' + st.price.toFixed(2).replace('.', ',') + ' /kWh', true],
    ['clock', 'Funcionamento', st.hours, false],
  ];
  return (
    <Screen>
      <Top title="Ponto de recarga" back
        actions={<button className="aa-iconbtn"><Icon name="heart" size={22} color="var(--off)" fill="var(--off)" /></button>} />
      <div className="aa-body">
        <div className="aa-pane">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="aa-selo"><span className="seal"><Seal size={18} /></span> Selo Flui · Excelência</span>
          </div>
          <h3>{st.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className={`aa-dot ${st.avail}`} />
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ok)' }}>Disponível · {st.free}/{st.total} livres</span>
            <span className="aa-tag" style={{ marginLeft: 4 }}>{st.area} · {st.dist}</span>
          </div>
          <div style={{ flex: 1 }}>
            {specs.map(([ic, lbl, val, mono]) => (
              <div key={lbl} className="aa-specrow">
                <span className="ic"><Icon name={ic} size={22} color="var(--primary)" /></span>
                <div style={{ flex: 1 }}>
                  <div className="lbl">{lbl}</div>
                  <div className={`val ${mono ? 'mono' : ''}`}>{val}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
            <button className="aa-btn primary" style={{ flex: 1 }}><Icon name="nav" size={24} /> Navegar</button>
            <button className="aa-btn ghost"><Icon name="coffee" size={22} /> Comodidades</button>
          </div>
        </div>
        <div className="aa-map">
          <CarMap pins={[st]} />
          <MapPin st={st} big />
          <div className="aa-user" style={{ left: '40%', top: '64%' }}><div className="core" /></div>
        </div>
      </div>
      <BottomBar />
    </Screen>
  );
}

/* ============ SCREEN 3 — NAVIGATION ============ */
function S3() {
  const dest = { ...D.stations[0], mx: 62, my: 26 };
  const route = "M 300 410 C 320 340, 280 300, 360 250 C 430 205, 440 160, 500 120";
  return (
    <Screen>
      <div className="aa-body" style={{ display: 'block' }}>
        <div className="aa-map" style={{ position: 'absolute', inset: 0 }}>
          <CarMap route={route} />
          <MapPin st={dest} big />
          <div className="aa-user" style={{ left: '37.5%', top: '91%' }}><div className="core" /></div>
        </div>
        <div className="aa-maneuver">
          <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V11a4 4 0 0 1 4-4h6" /><path d="M12 3l5 4-5 4" /></svg>
          <div>
            <div className="dist">400 m</div>
            <div className="step">Vire à direita na Av. Higienópolis</div>
          </div>
        </div>
        <div className="aa-etabar">
          <div>
            <div className="eta">9:34</div>
            <div className="sub">chegada</div>
          </div>
          <div style={{ width: 1, height: 36, background: 'var(--line)' }} />
          <div>
            <div className="eta" style={{ fontFamily: 'var(--font-mono)', fontSize: 22 }}>4 min</div>
            <div className="sub">1,2 km</div>
          </div>
          <div className="aa-destcard">
            <span className="seal"><Seal size={18} /></span> Pátio Higienópolis · 4/6 livres
          </div>
        </div>
      </div>
      <BottomBar />
    </Screen>
  );
}

/* ============ SCREEN 4 — CHARGING / WHILE YOU CHARGE ============ */
function S4() {
  const st = { ...D.stations[0], mx: 60, my: 40 };
  return (
    <Screen>
      <Top title="Conectado" sub="Pátio Higienópolis · 150 kW"
        actions={<span className="aa-selo"><span className="seal"><Seal size={16} /></span> Selo Flui</span>} />
      <div className="aa-body">
        <div className="aa-charge">
          <div className="aa-chargehead">
            <div className="aa-batt-ring">
              <Ring pct={64} color="var(--ok)" size={104} />
              <div className="pct"><b>64%</b><span>CARREGANDO</span></div>
            </div>
            <div>
              <div style={{ fontSize: 15, color: 'var(--ink-soft)', fontWeight: 700 }}>Pronto em</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 500, lineHeight: 1 }}>22 min</div>
              <div className="aa-tag" style={{ marginTop: 8, display: 'inline-block' }}>+18 kW · 80% às 9:52</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>Enquanto carrega</div>
          <div className="aa-suggest">
            <span className="ic"><Icon name="coffee" size={24} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Café da praça · 2 min a pé</div>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>Recomendado pela comunidade</div>
            </div>
            <Icon name="chevR" size={22} color="var(--ink-faint)" />
          </div>
          <div className="aa-suggest">
            <span className="ic"><Icon name="store" size={24} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Mercado & praça de alimentação</div>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>No mesmo piso · coberto</div>
            </div>
            <Icon name="chevR" size={22} color="var(--ink-faint)" />
          </div>
        </div>
        <div className="aa-map">
          <CarMap pins={[st]} />
          <MapPin st={st} big />
        </div>
      </div>
      <BottomBar />
    </Screen>
  );
}

/* ============ SCREEN 5 — COMMUNITY ALERT / REROUTE ============ */
function S5() {
  const route = "M 250 410 C 300 340, 280 280, 380 240 C 470 205, 480 150, 560 120";
  const broken = { ...D.stations[4], mx: 70, my: 30, avail: 'off' };
  return (
    <Screen>
      <div className="aa-body" style={{ display: 'block' }}>
        <div className="aa-map" style={{ position: 'absolute', inset: 0 }}>
          <CarMap route={route} />
          <MapPin st={broken} big />
          <div className="aa-user" style={{ left: '31%', top: '91%' }}><div className="core" /></div>
        </div>
        <div className="aa-alert">
          <span className="ic" style={{ background: 'color-mix(in srgb, var(--off) 18%, transparent)' }}><Icon name="alert" size={30} color="var(--off)" /></span>
          <div style={{ flex: 1 }}>
            <div className="who">Reporte da comunidade · há 8 min · Lucas P.</div>
            <div className="ttl">Carregador à frente fora do ar</div>
          </div>
          <span className="aa-tag">Berrini Energy</span>
        </div>
        <div className="aa-alert-actions">
          <button className="aa-btn primary"><span className="seal" style={{ display: 'inline-flex' }}><Seal size={22} /></span> Recalcular rota</button>
          <button className="aa-btn ghost"><Icon name="x" size={22} /> Ignorar</button>
        </div>
      </div>
      <BottomBar />
    </Screen>
  );
}

/* ============ BOARD ============ */
function Dash({ label, sub, children }) {
  return (
    <div>
      <div className="dash">{children}</div>
      <div className="dash-cap"><b>{label}</b> <span>· {sub}</span></div>
    </div>
  );
}

function Board() {
  return (
    <div className="aa-board">
      <header className="aa-board-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#6C2BD9', display: 'inline-flex' }}><Seal size={40} /></span>
          <div>
            <h1>Rota <span>by Flui</span></h1>
            <p>Android Auto · telas para o painel do carro · tema noturno, glanceável, alvos de toque grandes — seguindo os templates da plataforma.</p>
          </div>
        </div>
        <span className="aa-pill">1180 × 664 · 16:9 landscape</span>
      </header>

      <section className="aa-section">
        <div className="aa-section-head"><span className="aa-kicker">01</span><h2>Pontos perto de você</h2></div>
        <p className="aa-note">Template de <b>lista + mapa</b>. Lista rolável à esquerda (nome, disponibilidade ao vivo, distância, kW e Selo Flui), mapa à direita. Equivalente ao <b>PlaceListMapTemplate</b> do Android Auto.</p>
        <Dash label="Lista + Mapa" sub="PlaceListMapTemplate"><S1 /></Dash>
      </section>

      <section className="aa-section">
        <div className="aa-section-head"><span className="aa-kicker">02</span><h2>Ficha do ponto</h2></div>
        <p className="aa-note">Template de <b>painel</b>: informações essenciais e até duas ações grandes (<b>Navegar</b>, <b>Comodidades</b>). Texto reduzido ao indispensável para leitura rápida ao volante.</p>
        <Dash label="Ficha do ponto" sub="PaneTemplate + map">< S2 /></Dash>
      </section>

      <section className="aa-section">
        <div className="aa-section-head"><span className="aa-kicker">03</span><h2>Navegação até a recarga</h2></div>
        <p className="aa-note">Template de <b>navegação</b> turn-by-turn: manobra em destaque, barra de ETA e um cartão do destino mostrando o <b>Selo Flui</b> e a disponibilidade no momento da chegada.</p>
        <Dash label="Navegação" sub="NavigationTemplate"><S3 /></Dash>
      </section>

      <section className="aa-section">
        <div className="aa-section-head"><span className="aa-kicker">04</span><h2>Conectado · enquanto carrega</h2></div>
        <p className="aa-note">O diferencial do guia, traduzido para o carro: estado da recarga (bateria, tempo restante) e <b>o que fazer enquanto carrega</b> — sugestões curadas pela comunidade, sem sair do painel.</p>
        <Dash label="Carregando" sub="estado + sugestões"><S4 /></Dash>
      </section>

      <section className="aa-section">
        <div className="aa-section-head"><span className="aa-kicker">05</span><h2>Alerta da comunidade</h2></div>
        <p className="aa-note">A inteligência coletiva estilo Waze no painel: um reporte recente avisa que o carregador à frente está fora do ar e oferece <b>recalcular para um ponto com Selo Flui</b> — em um toque.</p>
        <Dash label="Alerta + recalcular" sub="reporte da comunidade"><S5 /></Dash>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  window.AA_ONLY ? React.createElement({ S1, S2, S3, S4, S5 }[window.AA_ONLY]) : <Board />
);
Object.assign(window, { S1, S2, S3, S4, S5 });
