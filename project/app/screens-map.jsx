// screens-map.jsx — main map screen + report/rate sheets. Exports: MapScreen
const React = window.React;
const { useState } = React;
const { Icon, Seal, SeloBadge, MapView, StationPeek, StationDetail, Stars, AMEN, AVAIL, EventSheet, MapsHandoffSheet, RateFlow } = window;

const CONNECTORS = ['CCS2', 'Type 2', 'GB/T'];
const POWER_STEPS = [0, 22, 50, 100, 150];
const HOURS_OPTS = [
  { id: 'any', label: 'Qualquer horário' },
  { id: 'open', label: 'Aberto agora' },
  { id: '24h', label: 'Aberto 24 h' },
  { id: 'late', label: 'Aberto após 22 h' },
];
const AMEN_FILTER = ['coffee', 'food', 'wc', 'parking', 'wifi', 'shield', 'store'];

// quick chips shown over the map
const QUICK = [
  { id: 'now', label: 'Livre agora', test: s => s.avail === 'ok' },
  { id: 'selo', label: 'Selo Flui', test: s => s.selo > 0 },
  { id: 'cover', label: 'Coberto', test: s => s.cover },
];

const EMPTY_ADV = { connectors: [], power: 0, hours: 'any', amenities: [] };

function parseHours(h) {
  if (/24/.test(h)) return { open: 0, close: 24, always: true };
  const m = h.match(/(\d{1,2})h\s*[–-]\s*(\d{1,2})h/);
  if (!m) return { open: 0, close: 24, always: true };
  return { open: +m[1], close: +m[2] === 0 ? 24 : +m[2], always: false };
}
function hoursTest(st, opt, nowHour) {
  const { open, close, always } = parseHours(st.hours);
  if (opt === 'any') return true;
  if (opt === '24h') return always;
  if (opt === 'late') return always || close >= 22 || close <= 2;
  // 'open' → aberto agora
  if (always) return true;
  return close > open ? (nowHour >= open && nowHour < close) : (nowHour >= open || nowHour < close);
}

function matchAdv(st, adv, quick, nowHour) {
  for (const id of quick) { const q = QUICK.find(x => x.id === id); if (q && !q.test(st)) return false; }
  if (adv.connectors.length && !adv.connectors.every(c => st.connectors.includes(c))) return false;
  if (adv.power && st.power < adv.power) return false;
  if (!hoursTest(st, adv.hours, nowHour)) return false;
  if (adv.amenities.length && !adv.amenities.every(a => st.amenities.includes(a))) return false;
  return true;
}
function countAdv(adv) {
  return adv.connectors.length + (adv.power ? 1 : 0) + (adv.hours !== 'any' ? 1 : 0) + adv.amenities.length;
}

function FilterSheet({ adv, onApply, onClose, resultCount, stations, quick, nowHour }) {
  const [local, setLocal] = useState(adv);
  const set = (patch) => setLocal(l => ({ ...l, ...patch }));
  const toggleIn = (key, v) => setLocal(l => ({ ...l, [key]: l[key].includes(v) ? l[key].filter(x => x !== v) : [...l[key], v] }));
  const live = stations.filter(s => matchAdv(s, local, quick, nowHour)).length;
  const pIdx = POWER_STEPS.indexOf(local.power);

  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ height: '86%', display: 'flex', flexDirection: 'column' }} role="dialog" aria-modal="true" aria-label="Filtros de busca">
        <div className="grab" />
        <div className="scroll" style={{ padding: '4px 18px 12px', flex: 1, minHeight: 0 }}>
          <div className="kv" style={{ marginBottom: 16 }}>
            <div>
              <div className="t-eyebrow">Filtros</div>
              <h3 className="t-display" style={{ fontSize: 23, margin: '2px 0 0' }}>Refinar busca</h3>
            </div>
            <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setLocal(EMPTY_ADV)}>Limpar</button>
          </div>

          <fieldset className="fset">
            <legend className="t-eyebrow">Tipo de conector</legend>
            <div className="chip-wrap">
              {CONNECTORS.map(c => {
                const on = local.connectors.includes(c);
                return (
                  <button key={c} className={`chip ${on ? 'on' : ''}`} role="switch" aria-checked={on}
                    onClick={() => toggleIn('connectors', c)}>
                    <Icon name="plug" size={14} color={on ? '#fff' : 'var(--primary)'} /> {c}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="fset">
            <legend className="t-eyebrow">Potência mínima</legend>
            <input type="range" className="range" min="0" max={POWER_STEPS.length - 1} step="1" value={pIdx < 0 ? 0 : pIdx}
              aria-label="Potência mínima em quilowatts"
              aria-valuetext={local.power === 0 ? 'Qualquer potência' : local.power + ' kilowatts ou mais'}
              onChange={(e) => set({ power: POWER_STEPS[+e.target.value] })} />
            <div className="range-scale" aria-hidden="true">
              {POWER_STEPS.map(p => <span key={p} className={p === local.power ? 'on' : ''}>{p === 0 ? 'Todas' : p}</span>)}
            </div>
            <div className="t-faint" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>
              {local.power === 0 ? 'Qualquer potência' : `A partir de ${local.power} kW`}
            </div>
          </fieldset>

          <fieldset className="fset">
            <legend className="t-eyebrow">Horário de funcionamento</legend>
            <div className="chip-wrap" role="radiogroup" aria-label="Horário de funcionamento">
              {HOURS_OPTS.map(h => {
                const on = local.hours === h.id;
                return (
                  <button key={h.id} className={`chip ${on ? 'on' : ''}`} role="radio" aria-checked={on}
                    onClick={() => set({ hours: h.id })}>
                    {h.id !== 'any' && <Icon name="clock" size={14} color={on ? '#fff' : 'var(--primary)'} />} {h.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="fset">
            <legend className="t-eyebrow">Comodidades</legend>
            <div className="chip-wrap">
              {AMEN_FILTER.map(a => {
                const on = local.amenities.includes(a);
                return (
                  <button key={a} className={`chip ${on ? 'on' : ''}`} role="switch" aria-checked={on}
                    onClick={() => toggleIn('amenities', a)}>
                    <Icon name={AMEN[a][0]} size={14} color={on ? '#fff' : 'var(--primary)'} /> {AMEN[a][1]}
                  </button>
                );
              })}
            </div>
          </fieldset>

        </div>
        <div className="sheet-foot">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => onApply(local)}>
            Ver {live} {live === 1 ? 'ponto' : 'pontos'}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

const REPORT_TYPES = [
  { id: 'livre', icon: 'check', color: 'var(--ok)', label: 'Pontos livres' },
  { id: 'fila', icon: 'users', color: 'var(--busy)', label: 'Fila / lotado' },
  { id: 'quebrado', icon: 'alert', color: 'var(--off)', label: 'Fora do ar' },
  { id: 'preco', icon: 'dollar', color: 'var(--primary)', label: 'Preço mudou' },
  { id: 'bloqueada', icon: 'car', color: 'var(--busy)', label: 'Vaga bloqueada' },
  { id: 'foto', icon: 'camera', color: 'var(--primary)', label: 'Adicionar foto' },
];

function ReportSheet({ st, onClose, onDone }) {
  const [sel, setSel] = useState(null);
  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ paddingBottom: 20 }}>
        <div className="grab" />
        <div style={{ padding: '8px 18px 0' }}>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Reporte da comunidade</div>
          <h3 className="t-display" style={{ fontSize: 23, margin: '0 0 4px' }}>O que está rolando?</h3>
          <p className="t-soft" style={{ fontSize: 14, margin: '0 0 18px' }}>{st ? st.name : 'Ponto próximo'} · ajude quem vem depois</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {REPORT_TYPES.map(r => (
              <button key={r.id} className="pick" onClick={() => setSel(r.id)}
                style={{ flexDirection: 'column', gap: 8, padding: 14, alignItems: 'center', textAlign: 'center',
                  boxShadow: sel === r.id ? '0 0 0 2px var(--primary)' : 'inset 0 0 0 1.5px var(--line)',
                  background: sel === r.id ? 'var(--primary-soft)' : 'var(--surface)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={r.icon} size={20} color={r.color} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{r.label}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 18, opacity: sel ? 1 : 0.5 }}
            disabled={!sel} onClick={() => onDone(REPORT_TYPES.find(r => r.id === sel))}>
            Enviar reporte · +40 Watts
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

function RateSheet({ st, onClose, onDone }) {
  const [stars, setStars] = useState(0);
  const [recommend, setRec] = useState(false);
  const [tags, setTags] = useState([]);
  const toggle = (a) => setTags(t => t.includes(a) ? t.filter(x => x !== a) : [...t, a]);
  const amenChoices = ['coffee', 'food', 'wc', 'parking', 'shield', 'wifi'];
  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '92%' }}>
        <div className="grab" />
        <div className="scroll" style={{ padding: '8px 18px 18px' }}>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Avaliação</div>
          <h3 className="t-display" style={{ fontSize: 23, margin: '0 0 16px' }}>{st ? st.name : 'Avaliar ponto'}</h3>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} onClick={() => setStars(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}>
                <Icon name="star" size={38} fill={i <= stars ? 'var(--gold)' : 'none'} color={i <= stars ? 'var(--gold)' : 'var(--line-strong)'} stroke={1.5} />
              </button>
            ))}
          </div>
          <div className="t-faint" style={{ textAlign: 'center', fontSize: 13, marginBottom: 18 }}>
            {['Toque para avaliar', 'Evite', 'Fraco', 'Ok', 'Muito bom', 'Excelente'][stars]}
          </div>

          <button className="pick" onClick={() => setRec(!recommend)} style={{ marginBottom: 18, alignItems: 'center',
            background: recommend ? 'var(--gold-soft)' : 'var(--surface)', boxShadow: recommend ? '0 0 0 2px var(--gold)' : 'inset 0 0 0 1.5px var(--line)' }}>
            <span className="seal" style={{ width: 28, height: 28, color: 'var(--gold)' }}><Seal size={28} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Indicar para o Selo Flui</div>
              <div className="t-faint" style={{ fontSize: 12 }}>Sua recomendação ajuda a curar o guia</div>
            </div>
            <span className="dot" style={{ width: 22, height: 22, borderRadius: 7, background: recommend ? 'var(--gold)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {recommend && <Icon name="check" size={14} color="#fff" />}
            </span>
          </button>

          <div className="t-eyebrow" style={{ marginBottom: 10 }}>O que tem de bom?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {amenChoices.map(a => (
              <button key={a} className={`chip ${tags.includes(a) ? 'on' : ''}`} onClick={() => toggle(a)}>
                <Icon name={AMEN[a][0]} size={14} color={tags.includes(a) ? '#fff' : 'var(--primary)'} /> {AMEN[a][1]}
              </button>
            ))}
          </div>

          <button className="pick" style={{ marginBottom: 18, justifyContent: 'center', color: 'var(--ink-soft)' }}>
            <Icon name="camera" size={18} /> Adicionar foto
          </button>

          <textarea className="field" rows="3" placeholder="Conte como foi sua recarga (opcional)…" style={{ resize: 'none', marginBottom: 16 }} />
          <button className="btn btn-primary btn-block btn-lg" style={{ opacity: stars ? 1 : 0.5 }} disabled={!stars}
            onClick={() => onDone({ stars, recommend })}>
            Publicar avaliação · +200 Watts
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

function ListRow({ st, onOpen }) {
  const [av, avc] = AVAIL[st.avail];
  return (
    <button className="card" onClick={() => onOpen(st)} style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 10, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', alignItems: 'center' }}>
      <div className="ph" style={{ width: 64, height: 64, borderRadius: 14, flex: '0 0 auto' }}><span>foto</span></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {st.selo > 0 && <span className="seal" style={{ width: 14, height: 14, color: 'var(--gold)' }}><Seal size={14} /></span>}
          <span className="t-display" style={{ fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink-soft)' }}>{st.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '3px 0' }}>
          <Stars n={st.rating} size={11} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{st.rating.toFixed(1)}</span>
          <span className="t-faint" style={{ fontSize: 11 }}>· {st.dist}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="dot" style={{ background: avc }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: avc }}>{st.free}/{st.total} livres</span>
          <span className="tag" style={{ marginLeft: 'auto' }}>{st.power} kW</span>
        </div>
      </div>
    </button>
  );
}

function EmptyResults({ onClear }) {
  return (
    <div className="card" style={{ padding: '22px 18px', textAlign: 'center' }} role="status">
      <Icon name="search" size={30} color="var(--ink-faint)" />
      <h4 className="t-display" style={{ fontSize: 18, margin: '10px 0 4px' }}>Nenhum ponto com esses filtros</h4>
      <p className="t-soft" style={{ fontSize: 13.5, margin: '0 0 14px' }}>Tente ampliar a potência ou remover comodidades.</p>
      <button className="btn btn-primary" onClick={onClear}>Limpar filtros</button>
    </div>
  );
}

function MapScreen({ favs, onToggleFav, pushToast, onNavigate, density, showReports = true }) {
  const D = window.DATA;
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(false);
  const [report, setReport] = useState(null);   // {st} or true
  const [rate, setRate] = useState(null);
  const [quick, setQuick] = useState([]);
  const [adv, setAdv] = useState(EMPTY_ADV);
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState('');
  const nowHour = 9;   // demo clock (status bar shows 9:41)
  const L = (window.ROTA_CONFIG || {}).latency || {};
  // the list "fetch" replays whenever the view or the query changes,
  // so the skeleton is driven by real state rather than a one-off mount timer
  const [view, setView] = useState('map');
  const [recenter, setRecenter] = useState(0);
  const listReady = useDelay(L.list, view + '|' + q + '|' + quick.join() + '|' + JSON.stringify(adv));
  const [event, setEvent] = useState(null);   // community report tapped on the map
  const [handoff, setHandoff] = useState(null); // navigation app chooser

  const toggleF = (id) => setQuick(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const term = q.trim().toLowerCase();
  const visible = D.stations.filter(s =>
    matchAdv(s, adv, quick, nowHour) &&
    (!term || s.name.toLowerCase().includes(term) || s.area.toLowerCase().includes(term)));
  const advCount = countAdv(adv);
  const anyFilter = advCount + quick.length > 0;
  const activeSt = D.stations.find(s => s.id === active);

  const openPin = (st) => { setActive(st.id); setDetail(false); };
  const openDetail = () => setDetail(true);
  const close = () => { setActive(null); setDetail(false); };

  return (
    <div className="screen">
      {/* MAP / LIST */}
      {view === 'map'
        ? <GeoMapView active={active} onPin={openPin} onReport={(r) => { close(); setEvent(r); }} recenterSignal={recenter} stations={visible} showReports={showReports} />
        : <div className="scroll" style={{ padding: '200px 16px 96px', background: 'var(--bg)' }}>
            {!listReady ? <ListSkeleton rows={4} /> : (
              <React.Fragment>
                <div className="t-faint" style={{ fontSize: 13, marginBottom: 10 }} aria-live="polite">{visible.length} pontos · ordenado por proximidade</div>
                {visible.map(st => <ListRow key={st.id} st={st} onOpen={openPin} />)}
                {!visible.length && <EmptyResults onClear={() => { setQuick([]); setAdv(EMPTY_ADV); setQ(''); }} />}
              </React.Fragment>
            )}
          </div>}

      {/* TOP OVERLAY: search + filters */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 14px 0', zIndex: 12, pointerEvents: 'none' }}>
        <div className="searchbar" style={{ pointerEvents: 'auto' }}>
          <Icon name="search" size={20} color="var(--ink-faint)" />
          <input placeholder="Buscar em São Paulo" aria-label="Buscar ponto de recarga por nome ou bairro"
            value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="clear-x" onClick={() => setQ('')} aria-label="Limpar busca"><Icon name="x" size={14} /></button>}
          <div className="seg" style={{ padding: 2 }} role="group" aria-label="Alternar visualização">
            <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')} style={{ padding: '5px 9px' }}
              aria-label="Ver no mapa" aria-pressed={view === 'map'}><Icon name="map" size={16} /></button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} style={{ padding: '5px 9px' }}
              aria-label="Ver em lista" aria-pressed={view === 'list'}><Icon name="layers" size={16} /></button>
          </div>
        </div>
        <div className="chip-row" style={{ marginTop: 12, pointerEvents: 'auto' }}>
          <button className={`chip chip-filter ${advCount ? 'on' : ''}`} onClick={() => setShowFilters(true)}
            aria-label={`Abrir filtros${advCount ? `, ${advCount} ativos` : ''}`} aria-haspopup="dialog">
            <Icon name="filter" size={14} color={advCount ? '#fff' : 'var(--primary)'} />
            Filtros{advCount ? ' · ' + advCount : ''}
          </button>
          {QUICK.map(f => {
            const on = quick.includes(f.id);
            return (
              <button key={f.id} className={`chip ${on ? 'on' : ''}`} onClick={() => toggleF(f.id)} role="switch" aria-checked={on}>
                {f.id === 'selo' && <span className="seal" style={{ width: 13, height: 13, color: on ? '#fff' : 'var(--gold)' }}><Seal size={13} /></span>}
                {f.label}
              </button>
            );
          })}
        </div>
        {anyFilter && (
          <div className="filter-bar" style={{ pointerEvents: 'auto' }}>
            <span aria-live="polite">{visible.length} {visible.length === 1 ? 'ponto encontrado' : 'pontos encontrados'}</span>
            <button onClick={() => { setQuick([]); setAdv(EMPTY_ADV); setQ(''); }}>Limpar tudo</button>
          </div>
        )}
      </div>

      {view === 'map' && !visible.length && (
        <div style={{ position: 'absolute', left: 20, right: 20, top: '38%', zIndex: 13 }}>
          <EmptyResults onClear={() => { setQuick([]); setAdv(EMPTY_ADV); setQ(''); }} />
        </div>
      )}

      {/* RIGHT controls */}
      {view === 'map' && !active && (
        <div style={{ position: 'absolute', right: 14, bottom: 22, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 12 }}>
          <button className="iconbtn" onClick={() => pushToast('Camadas do mapa')} aria-label="Camadas do mapa"><Icon name="layers" size={20} /></button>
          <button className="iconbtn" onClick={() => setRecenter(r => r + 1)} aria-label="Centralizar na minha localização"><Icon name="crosshair" size={20} color="var(--primary)" /></button>
          <button className="fab" onClick={() => setReport({})} aria-label="Reportar situação em um ponto"><Icon name="plus" size={26} /></button>
        </div>
      )}

      {/* legend pill */}
      {view === 'map' && !active && (
        <div style={{ position: 'absolute', left: 14, bottom: 26, zIndex: 11 }}>
          <div className="card" style={{ padding: '8px 12px', display: 'flex', gap: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <span><span className="dot ok" /> Livre</span>
            <span><span className="dot busy" /> Cheio</span>
            <span><span className="dot off" /> Off</span>
          </div>
        </div>
      )}

      {/* SHEETS */}
      {active && !detail && (
        <StationPeek st={activeSt} onOpen={openDetail} onClose={close}
          onNavigate={(s) => { close(); setHandoff(s); }} />
      )}
      {active && detail && (
        <StationDetail st={activeSt} onClose={close}
          onNavigate={(s) => { close(); setHandoff(s); }}
          onReport={(s) => setReport({ st: s })}
          onRate={(s) => setRate({ st: s })}
          fav={favs.has(activeSt.id)} onFav={(s) => onToggleFav(s.id)} />
      )}
      {report && (
        <ReportSheet st={report.st} onClose={() => setReport(null)}
          onDone={(r) => { setReport(null); pushToast(`Reporte enviado · ${r.label}`, 'check'); }} />
      )}
      {event && (
        <EventSheet ev={event} onClose={() => setEvent(null)} pushToast={pushToast} />
      )}
      {showFilters && (
        <FilterSheet adv={adv} quick={quick} nowHour={nowHour} stations={D.stations}
          onClose={() => setShowFilters(false)}
          onApply={(v) => { setAdv(v); setShowFilters(false); }} />
      )}
      {rate && (
        <RateFlow target={rate.st} kind="station" pushToast={pushToast}
          onClose={() => setRate(null)}
          onDone={(r) => { setRate(null); pushToast(r.selo ? `Avaliação + indicação ao Selo Flui · +${r.watts} W` : `Avaliação publicada · +${r.watts} Watts`, 'check'); }} />
      )}
      {handoff && (
        <MapsHandoffSheet dest={handoff} onClose={() => setHandoff(null)}
          onRotaNav={(s) => onNavigate(s)} pushToast={pushToast} />
      )}
    </div>
  );
}

Object.assign(window, { MapScreen, ReportSheet, RateSheet, FilterSheet });
