// screens-extra.jsx — Onboarding, Community, Route, Profile. Exports those + BrandMark
const React = window.React;
const { useState } = React;
const { Icon, Seal, SeloBadge, Stars, AMEN } = window;

function BrandMark({ size = 28, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: color || 'var(--ink)' }}>
      <span style={{ color: 'var(--primary)', display: 'inline-flex' }}><Seal size={size} /></span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 600, letterSpacing: '-0.01em' }}>Rota</span>
    </span>
  );
}

/* ============ ONBOARDING ============ */
function Onboarding({ onDone, initialStep = 0 }) {
  const D = window.DATA;
  const [step, setStep] = useState(initialStep);
  const [car, setCar] = useState(null);
  const [prefs, setPrefs] = useState(['fast', 'coffee']);
  const steps = 4;
  const next = () => step < steps - 1 ? setStep(step + 1) : onDone(car);
  const togglePref = (p) => setPrefs(x => x.includes(p) ? x.filter(y => y !== p) : [...x, p]);
  const selCar = D.cars.find(c => c.id === car);

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="scroll" style={{ padding: '8px 22px 0' }}>
        {step > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <button className="iconbtn" style={{ width: 44, height: 44, boxShadow: 'none', background: 'var(--surface-3)' }} onClick={() => setStep(step - 1)} aria-label="Voltar para a etapa anterior"><Icon name="chevL" size={20} /></button>
            <div className="progress" style={{ flex: 1 }}><i style={{ width: `${(step / (steps - 1)) * 100}%` }} /></div>
            <button className="t-soft" style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} onClick={() => onDone(car)}>Pular</button>
          </div>
        )}

        {step === 0 && (
          <div className="page-enter" style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ color: 'var(--primary)', display: 'inline-flex', filter: 'drop-shadow(0 8px 20px rgba(108,43,217,.35))' }}><Seal size={84} /></div>
            <h1 className="t-display" style={{ fontSize: 46, margin: '24px 0 0' }}>Rota</h1>
            <div className="t-eyebrow" style={{ marginTop: 6 }}>by Flui · O guia das recargas</div>
            <p className="t-serif" style={{ fontSize: 18, lineHeight: 1.5, color: 'var(--ink-soft)', margin: '22px auto 0', maxWidth: 280, fontStyle: 'italic' }}>
              Não é só onde carregar. É onde vale a pena parar — avaliado por quem dirige elétrico em São Paulo.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="page-enter">
            <div className="t-eyebrow">Passo 1 de 3</div>
            <h2 className="t-display" style={{ fontSize: 30, margin: '6px 0 6px' }}>Qual é o seu carro?</h2>
            <p className="t-soft" style={{ fontSize: 15, margin: '0 0 18px' }}>Recomendamos pontos compatíveis e calculamos a rota pelo seu alcance real.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {D.cars.map(c => (
                <button key={c.id} className={`pick ${car === c.id ? 'on' : ''}`} onClick={() => setCar(c.id)}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <Icon name="car" size={22} color="var(--primary)" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.brand} {c.model}</div>
                    <div className="t-mono t-faint" style={{ fontSize: 11, marginTop: 2 }}>{c.battery} kWh · {c.range} km · {c.connector}</div>
                  </div>
                  {car === c.id && <Icon name="checkCircle" size={22} color="var(--primary)" fill="var(--primary-soft)" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="page-enter">
            <div className="t-eyebrow">Passo 2 de 3</div>
            <h2 className="t-display" style={{ fontSize: 30, margin: '6px 0 6px' }}>O que importa pra você?</h2>
            <p className="t-soft" style={{ fontSize: 15, margin: '0 0 18px' }}>Personalizamos as recomendações do guia com base no seu estilo.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['fast', 'zap', 'Recarga rápida'], ['coffee', 'coffee', 'Café & comida'], ['cover', 'shield', 'Coberto & seguro'], ['leaf', 'leaf', 'Áreas verdes'], ['price', 'dollar', 'Melhor preço'], ['quiet', 'clock', 'Sem filas']].map(([id, ic, lb]) => (
                <button key={id} className={`pick ${prefs.includes(id) ? 'on' : ''}`} onClick={() => togglePref(id)} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 16 }}>
                  <Icon name={ic} size={24} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{lb}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="page-enter" style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ position: 'relative', width: 200, height: 200, margin: '10px auto 0' }}>
              <div className="userdot" style={{ left: '50%', top: '50%' }}><div className="pulse" /><div className="core" style={{ width: 26, height: 26 }} /></div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 1.5px var(--line)' }} />
              <div style={{ position: 'absolute', inset: 40, borderRadius: '50%', boxShadow: 'inset 0 0 0 1.5px var(--line)' }} />
            </div>
            <h2 className="t-display" style={{ fontSize: 30, margin: '18px 0 6px' }}>Ative a localização</h2>
            <p className="t-soft" style={{ fontSize: 15, margin: '0 auto', maxWidth: 280 }}>Para mostrar os melhores pontos perto de você em São Paulo e calcular distâncias reais.</p>
            {selCar && <div style={{ marginTop: 20, display: 'inline-flex' }}><span className="chip" style={{ cursor: 'default' }}><Icon name="car" size={14} color="var(--primary)" /> {selCar.brand} {selCar.model} · {selCar.connector}</span></div>}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 22px 18px' }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={next} disabled={step === 1 && !car} style={{ opacity: step === 1 && !car ? 0.5 : 1 }}>
          {step === 0 ? 'Começar' : step === 3 ? 'Ativar e entrar' : 'Continuar'}
          {step !== 3 && <Icon name="chevR" size={18} />}
        </button>
      </div>
    </div>
  );
}

/* ============ COMMUNITY ============ */
function MissionCard({ m }) {
  const pct = Math.round((m.prog / m.total) * 100);
  return (
    <div className="card" style={{ minWidth: 230, flex: '0 0 auto', padding: 0 }}>
      <div className="mission">
        <div className="ico-box" style={{ background: m.done ? 'var(--gold-soft)' : 'var(--primary-soft)', color: m.done ? 'var(--gold-ink)' : 'var(--primary-soft-ink)' }}>
          <Icon name={m.done ? 'check' : m.icon} size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{m.title}</div>
          <div className="t-faint" style={{ fontSize: 12 }}>{m.desc}</div>
        </div>
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <div className="bar" style={{ marginBottom: 7 }}><i style={{ width: `${pct}%`, background: m.done ? 'var(--gold)' : 'var(--primary)' }} /></div>
        <div className="kv">
          <span className="t-faint" style={{ fontSize: 12 }}>{m.prog}/{m.total}</span>
          <span className="tag" style={{ color: 'var(--gold-ink)', background: 'var(--gold-soft)' }}>+{m.reward} Watts</span>
        </div>
      </div>
    </div>
  );
}

function FeedItem({ f }) {
  const verb = { review: 'avaliou', report: 'reportou em', badge: '', photo: 'compartilhou foto de' };
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="avatar" style={{ width: 42, height: 42, fontSize: 14 }}>{f.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.4 }}>
          <b>{f.who}</b> <span className="t-soft">{verb[f.type]} {f.station && <b style={{ fontWeight: 600 }}>{f.station}</b>}</span>
          {f.type === 'review' && <span className="seal-row" style={{ marginLeft: 6, verticalAlign: 'middle' }}><Stars n={f.stars} size={12} /></span>}
        </div>
        <div className="t-faint" style={{ fontSize: 11, margin: '2px 0 8px' }}>há {f.when}</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{f.body}</p>
        {f.photo && <div className="ph" style={{ height: 120, borderRadius: 14, marginTop: 10 }}><span>foto da comunidade</span></div>}
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <span className="chip" style={{ boxShadow: 'none', background: 'none', padding: 0, fontSize: 13, color: 'var(--ink-soft)' }}><Icon name="thumb" size={16} /> {f.likes}</span>
          <span className="chip" style={{ boxShadow: 'none', background: 'none', padding: 0, fontSize: 13, color: 'var(--ink-soft)' }}><Icon name="msg" size={16} /> {f.comments}</span>
          <span className="chip" style={{ boxShadow: 'none', background: 'none', padding: 0, fontSize: 13, color: 'var(--ink-soft)', marginLeft: 'auto' }}><Icon name="share" size={16} /></span>
        </div>
      </div>
    </div>
  );
}

function CommunityScreen({ pushToast, initialTab = 'feed' }) {
  const D = window.DATA;
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="scroll" style={{ padding: '14px 18px 96px' }}>
        <div className="kv" style={{ marginBottom: 14 }}>
          <h1 className="t-display" style={{ fontSize: 30, margin: 0 }}>Comunidade</h1>
          <button className="iconbtn" aria-label="Destaques da comunidade"><Icon name="sparkle" size={20} color="var(--primary)" /></button>
        </div>

        {/* watts banner */}
        <div className="card" style={{ padding: 16, marginBottom: 18, background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: '#fff' }}>
          <div className="kv">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: .85, letterSpacing: '.1em', textTransform: 'uppercase' }}>Nível {D.user.level} · {D.user.title}</div>
              <div className="t-mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{D.user.watts.toLocaleString('pt-BR')} <span style={{ fontSize: 15 }}>Watts</span></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: 22 }}><Icon name="flame" size={20} color="#fff" fill="#fff" /> {D.user.streak}</div>
              <div style={{ fontSize: 11, opacity: .85 }}>dias seguidos</div>
            </div>
          </div>
          <div className="bar" style={{ marginTop: 14, background: 'rgba(255,255,255,.25)' }}><i style={{ width: `${(D.user.watts / D.user.nextLevel) * 100}%`, background: '#fff' }} /></div>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 7 }}>{(D.user.nextLevel - D.user.watts).toLocaleString('pt-BR')} Watts para o nível {D.user.level + 1}</div>
        </div>

        {/* missions */}
        <div className="kv" style={{ marginBottom: 10 }}>
          <div className="t-eyebrow">Missões da semana</div>
          <span className="t-faint" style={{ fontSize: 12 }}>renova em 3d</span>
        </div>
        <div className="chip-row" style={{ marginBottom: 22, gap: 12 }}>
          {D.missions.map(m => <MissionCard key={m.id} m={m} />)}
        </div>

        {/* tabs */}
        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>Atividade</button>
          <button className={tab === 'rank' ? 'on' : ''} onClick={() => setTab('rank')}>Ranking</button>
        </div>

        {tab === 'rank' ? (
          <div className="card" style={{ padding: '4px 16px' }}>
            {D.leaderboard.map((p, i) => (
              <div key={i} className={`lb-row ${p.me ? 'me' : ''}`}>
                <span className="lb-rank" style={{ color: i < 3 ? 'var(--gold)' : 'var(--ink-faint)' }}>{p.rank}</span>
                <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>{p.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.who}</div>
                  <div className="t-mono t-faint" style={{ fontSize: 12 }}>{p.watts.toLocaleString('pt-BR')} Watts</div>
                </div>
                <Icon name={p.up ? 'chevU' : 'chevD'} size={18} color={p.up ? 'var(--ok)' : 'var(--ink-faint)'} />
              </div>
            ))}
          </div>
        ) : (
          <div>{D.feed.map(f => <FeedItem key={f.id} f={f} />)}</div>
        )}
      </div>
    </div>
  );
}

/* ============ GUIA FLUI · roteiros curados ============ */
function SeloRow({ n, size = 18, shadow = false }) {
  return (
    <span className="seal-row" style={{ gap: 1, color: 'var(--gold)', filter: shadow ? 'drop-shadow(0 1px 3px rgba(0,0,0,.55))' : 'none' }}>
      {Array.from({ length: n }).map((_, i) => <Seal key={i} size={size} />)}
    </span>
  );
}

function GuideMeta({ g, faint }) {
  const c = faint ? 'var(--ink-faint)' : 'var(--ink-soft)';
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="route" size={14} color={c} />{g.distance} km</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={14} color={c} />{g.duration}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="zap" size={14} color="var(--primary)" />{g.recharges === 0 ? 'sem recarga' : g.recharges + ' recarga'}</span>
    </div>
  );
}

function GuideCard({ g, onOpen }) {
  return (
    <button className="card" onClick={onOpen}
      style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', padding: 0, marginBottom: 14, cursor: 'pointer', color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>
      <div className="ph" style={{ height: 150, position: 'relative' }} role="img" aria-label={`Imagem do roteiro ${g.title}: ${g.cover}`}>
        <span aria-hidden="true">{g.cover}</span>
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span className="tag" style={{ background: 'rgba(20,14,24,.62)', color: '#fff', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 10 }}>{g.kicker}</span>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}><SeloRow n={g.selo} size={18} /></div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div className="t-mono t-faint" style={{ fontSize: 11, letterSpacing: '.03em' }}>{g.region}</div>
        <h3 className="t-display" style={{ fontSize: 22, margin: '2px 0 6px', fontWeight: 600 }}>{g.title}</h3>
        <p className="t-soft" style={{ fontSize: 13.5, lineHeight: 1.45, margin: '0 0 12px' }}>{g.blurb}</p>
        <GuideMeta g={g} />
      </div>
    </button>
  );
}

function GuideTimeline({ stops }) {
  return (
    <div className="timeline">
      {stops.map((s, i) => (
        <div key={i} className={`tl-node ${s.kind === 'charge' ? 'charge' : ''}`}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, lineHeight: 1.25 }}>
                  {s.kind === 'charge' && <Icon name="zap" size={15} color="var(--primary)" style={{ verticalAlign: '-2px', marginRight: 4 }} />}
                  {s.name}
                  {s.selo > 0 && <span className="seal" style={{ width: 13, height: 13, color: 'var(--gold)', display: 'inline-flex', verticalAlign: '-2px', marginLeft: 5 }}><Seal size={13} /></span>}
                </div>
                <div className="t-faint" style={{ fontSize: 12, marginTop: 3 }}>{s.sub}{s.kind === 'charge' && s.power ? ' · ' + s.power + ' kW' : ''}</div>
              </div>
              {s.time && <span className="t-mono t-faint" style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.time}</span>}
            </div>
            {s.todo && (
              <div style={{ marginTop: 10, padding: s.kind === 'charge' ? 12 : 0, borderRadius: 12, background: s.kind === 'charge' ? 'var(--primary-soft)' : 'transparent', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {s.icon && <Icon name={s.icon} size={18} color={s.kind === 'charge' ? 'var(--primary-soft-ink)' : 'var(--ink-faint)'} style={{ flexShrink: 0, marginTop: 1 }} />}
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.42, color: s.kind === 'charge' ? 'var(--primary-soft-ink)' : 'var(--ink-soft)', fontWeight: s.kind === 'charge' ? 700 : 500 }}>{s.todo}</div>
                {s.dur && <span className="tag" style={{ background: s.kind === 'charge' ? 'var(--surface)' : 'var(--surface-3)', flexShrink: 0 }}>{s.dur}</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GuideDetail({ g, onBack, pushToast, onStartTrip, onRateGuide, rateGuide, onCloseRate, onRateDone }) {
  const [mapsOut, setMapsOut] = useState(false);
  const META = [[g.distance + ' km', 'distância'], [g.duration, 'só ida'], [g.recharges === 0 ? '0' : g.recharges, g.recharges === 1 ? 'recarga' : 'recargas'], [g.season, 'melhor época']];
  return (
    <div className="screen page-enter" style={{ background: 'var(--bg)' }}>
      <div className="scroll" style={{ padding: '0 0 96px' }}>
        <div className="ph" style={{ height: 210, position: 'relative', borderRadius: 0 }} role="img" aria-label={`Imagem do roteiro ${g.title}: ${g.cover}`}>
          <span aria-hidden="true">{g.cover}</span>
          <button className="iconbtn" onClick={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 44, height: 44 }} aria-label="Voltar aos roteiros"><Icon name="chevL" size={20} /></button>
          <button className="iconbtn" onClick={() => pushToast('Roteiro copiado para compartilhar')} style={{ position: 'absolute', top: 14, right: 14, width: 44, height: 44 }} aria-label="Compartilhar roteiro"><Icon name="share" size={18} /></button>
          <div style={{ position: 'absolute', left: 16, bottom: 14 }}>
            <span className="tag" style={{ background: 'rgba(20,14,24,.62)', color: '#fff', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 10 }}>{g.kicker}</span>
          </div>
        </div>

        <div style={{ padding: '18px 18px 0' }}>
          <div className="kv" style={{ alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="t-mono t-faint" style={{ fontSize: 11, letterSpacing: '.03em' }}>{g.region}</div>
              <h1 className="t-display" style={{ fontSize: 30, margin: '3px 0 0', lineHeight: 1.05 }}>{g.title}</h1>
            </div>
            <SeloRow n={g.selo} size={20} />
          </div>

          <div className="selo-badge" style={{ marginTop: 12 }}>
            {g.selo >= 3 ? 'Selo Flui · Vale a viagem' : g.selo === 2 ? 'Selo Flui · Vale o desvio' : 'Selo Flui · Vale a parada'}
          </div>

          <p className="t-serif" style={{ fontSize: 16, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--ink-soft)', margin: '14px 0 0' }}>{g.blurbLong}</p>

          <div className="card" style={{ padding: '14px 8px', margin: '18px 0', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            {META.map(([v, l], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: 1, background: 'var(--line)' }} />}
                <div style={{ flex: 1 }}>
                  <div className="stat-num" style={{ fontSize: 18, whiteSpace: 'nowrap', color: l === 'recarga' || l === 'recargas' ? 'var(--primary)' : 'var(--ink)' }}>{v}</div>
                  <div className="t-faint" style={{ fontSize: 10.5, marginTop: 2 }}>{l}</div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="t-eyebrow" style={{ margin: '4px 0 14px' }}>O roteiro do Guia</div>
          <GuideTimeline stops={g.stops} />

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={() => onStartTrip && onStartTrip(g)}>
            <Icon name="nav" size={18} /> Iniciar este roteiro
          </button>
          <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => setMapsOut(true)}>
            <Icon name="nav" size={17} /> Abrir no Google Maps ou Waze
          </button>
          <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={() => onRateGuide && onRateGuide(g)}>
            <Icon name="star" size={17} /> Avaliar este roteiro
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onBack}>
            Voltar aos roteiros
          </button>
        </div>
      </div>
      {rateGuide && (
        <window.RateFlow target={rateGuide} kind="guide" pushToast={pushToast}
          onClose={onCloseRate} onDone={onRateDone} />
      )}
      {mapsOut && <window.RouteHandoffSheet guide={g} onClose={() => setMapsOut(false)} pushToast={pushToast} />}
    </div>
  );
}

const GUIDE_CATS = [['all', 'Todos'], ['bate-volta', 'Bate-volta'], ['serra', 'Serra'], ['praia', 'Praia'], ['cultura', 'Cultura']];

function GuideBrowser({ onOpen }) {
  const D = window.DATA;
  const [cat, setCat] = useState('all');
  const list = cat === 'all' ? D.guides : D.guides.filter(g => g.cat === cat);
  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '26px 0 5px' }}>
        <span className="seal" style={{ width: 20, height: 20, color: 'var(--gold)' }}><Seal size={20} /></span>
        <div className="t-eyebrow" style={{ color: 'var(--gold-ink)' }}>Guia Flui · Roteiros</div>
      </div>
      <h2 className="t-display" style={{ fontSize: 25, margin: '0 0 6px' }}>Sem destino ainda?</h2>
      <p className="t-soft" style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 16px' }}>Viagens selecionadas para fazer de elétrico — com a parada de recarga já no lugar certo.</p>

      <div className="chip-row" style={{ marginBottom: 18 }}>
        {GUIDE_CATS.map(([id, lb]) => (
          <button key={id} className={`chip ${cat === id ? 'on' : ''}`} onClick={() => setCat(id)}>{lb}</button>
        ))}
      </div>

      {list.map(g => <GuideCard key={g.id} g={g} onOpen={() => onOpen(g)} />)}
    </div>
  );
}

/* ============ ROUTE PLANNER ============ */
function RouteScreen({ pushToast, initialDone = false, onStartTrip }) {
  const D = window.DATA;
  const R = D.route;
  const [battery, setBattery] = useState(R.startBattery);
  const [done, setDone] = useState(initialDone);
  const [guide, setGuide] = useState(null);
  const [rateGuide, setRateGuide] = useState(null);

  if (guide) return (
    <GuideDetail g={guide} onBack={() => setGuide(null)} pushToast={pushToast} onStartTrip={onStartTrip}
      onRateGuide={setRateGuide} rateGuide={rateGuide} onCloseRate={() => setRateGuide(null)}
      onRateDone={(r) => { setRateGuide(null); pushToast(`Roteiro avaliado · +${r.watts} Watts`, 'check'); }} />
  );

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="scroll" style={{ padding: '14px 18px 96px' }}>
        <h1 className="t-display" style={{ fontSize: 30, margin: '0 0 16px' }}>Planejar rota</h1>

        {/* inputs */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ paddingTop: 4 }}>
              <div className="userdot" style={{ position: 'static' }}><div className="core" style={{ width: 12, height: 12, left: 12, zIndex: 4 }} /></div>
              <div style={{ width: 2, height: 30, background: 'var(--line-strong)', margin: '4px auto' }} />
              <Icon name="nav" size={14} color="var(--primary)" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="field" defaultValue={R.from} />
              <input className="field" defaultValue={R.to} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="kv" style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}><Icon name="battery" size={15} color="var(--primary)" /> Bateria na saída</span>
              <span className="t-mono" style={{ fontWeight: 600 }}>{battery}%</span>
            </div>
            <input type="range" min="10" max="100" value={battery} onChange={e => setBattery(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--primary)' }} />
          </div>
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} onClick={() => { setDone(true); pushToast('Rota otimizada para o seu carro', 'check'); }}>
            <Icon name="route" size={18} /> Calcular rota
          </button>
        </div>

        {done && (
          <div className="page-enter">
            {/* summary */}
            <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div><div className="stat-num" style={{ fontSize: 21 }}>{R.distance}<span style={{ fontSize: 12 }}> km</span></div><div className="t-faint" style={{ fontSize: 11 }}>distância</div></div>
              <div style={{ width: 1, background: 'var(--line)' }} />
              <div><div className="stat-num" style={{ fontSize: 21, whiteSpace: 'nowrap' }}>{R.duration}</div><div className="t-faint" style={{ fontSize: 11 }}>1 parada</div></div>
              <div style={{ width: 1, background: 'var(--line)' }} />
              <div><div className="stat-num" style={{ fontSize: 21, color: 'var(--ok)' }}>{R.arriveBattery}%</div><div className="t-faint" style={{ fontSize: 11 }}>na chegada</div></div>
            </div>

            <div className="t-eyebrow" style={{ marginBottom: 14 }}>Sua rota com recarga</div>
            <div className="timeline">
              {R.stops.map((s, i) => (
                <div key={i} className={`tl-node ${s.kind === 'charge' ? 'charge' : ''}`}>
                  <div className="card" style={{ padding: 14 }}>
                    <div className="kv">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {s.kind === 'charge' && <Icon name="zap" size={16} color="var(--primary)" />}
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                          {s.selo > 0 && <span className="seal" style={{ width: 15, height: 15, color: 'var(--gold)' }}><Seal size={15} /></span>}
                        </div>
                        <div className="t-faint" style={{ fontSize: 12, marginTop: 3 }}>{s.sub}</div>
                      </div>
                      <div className="t-mono" style={{ fontWeight: 600, fontSize: 15, color: s.battery < 30 ? 'var(--busy)' : 'var(--ink)' }}>{s.battery}%</div>
                    </div>
                    {s.kind === 'charge' && (
                      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="coffee" size={20} color="var(--primary-soft-ink)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-soft-ink)' }}>Enquanto carrega ({s.time} min)</div>
                          <div style={{ fontSize: 12, color: 'var(--primary-soft-ink)', opacity: .85 }}>Tempo pra um café e esticar as pernas</div>
                        </div>
                        <span className="tag" style={{ background: 'var(--surface)' }}>{s.power} kW</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={() => onStartTrip && onStartTrip({
              id: 'planned', title: R.to, region: R.from + ' → ' + R.to, distance: R.distance, duration: R.duration,
              stops: R.stops.map(s => ({ ...s, icon: s.kind === 'charge' ? 'zap' : s.kind === 'end' ? 'flag' : 'car',
                todo: s.kind === 'charge' ? 'Recarga planejada no meio do caminho — aproveite para um café.' : null, dur: s.time ? s.time + ' min' : null })),
            })}>
              <Icon name="nav" size={18} /> Iniciar navegação
            </button>
          </div>
        )}

        {!done && <GuideBrowser onOpen={setGuide} />}
      </div>
    </div>
  );
}

/* ============ PROFILE ============ */
function ProfileScreen({ favs, density }) {
  const D = window.DATA;
  const u = D.user;
  const favStations = D.stations.filter(s => favs.has(s.id));
  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="scroll" style={{ padding: '14px 18px 96px' }}>
        <div className="kv" style={{ marginBottom: 18 }}>
          <BrandMark size={22} />
          <button className="iconbtn" aria-label="Configurações"><Icon name="settings" size={20} /></button>
        </div>

        {/* identity */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
          <div className="ring">
            <div className="avatar" style={{ width: 76, height: 76, fontSize: 26 }}>{u.initials}</div>
            <span className="selo-badge" style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', padding: '3px 9px', fontSize: 11 }}>Nv {u.level}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="t-display" style={{ fontSize: 26, margin: 0 }}>{u.name}</h1>
            <div className="t-soft" style={{ fontSize: 14 }}>{u.title} · {u.handle}</div>
            <div className="t-mono" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>{u.watts.toLocaleString('pt-BR')} Watts</div>
          </div>
        </div>

        {/* stats */}
        <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          {[[u.contributions, 'contrib.'], [u.reviews, 'avaliações'], [u.photos, 'fotos'], [u.reports, 'reportes']].map(([n, l], i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width: 1, background: 'var(--line)' }} />}
              <div><div className="stat-num" style={{ fontSize: 22 }}>{n}</div><div className="t-faint" style={{ fontSize: 11 }}>{l}</div></div>
            </React.Fragment>
          ))}
        </div>

        {/* car */}
        <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <Icon name="car" size={26} color="var(--primary-soft-ink)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{u.car}</div>
            <div className="t-mono t-faint" style={{ fontSize: 12 }}>44,9 kWh · CCS2 · 291 km</div>
          </div>
          <button className="chip"><Icon name="edit" size={14} /> Trocar</button>
        </div>

        {/* achievements */}
        <div className="kv" style={{ margin: '4px 0 12px' }}>
          <div className="t-eyebrow">Conquistas</div>
          <span className="t-faint" style={{ fontSize: 12 }}>{D.badges.filter(b => b.earned).length}/{D.badges.length}</span>
        </div>
        <div className="badge-grid" style={{ marginBottom: 22 }}>
          {D.badges.map(b => (
            <div key={b.id} className="badge-cell">
              <div className={`badge-medal ${b.earned ? 'earned' : ''}`}><Icon name={b.icon} size={24} /></div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: b.earned ? 'var(--ink)' : 'var(--ink-faint)', lineHeight: 1.2 }}>{b.name}</span>
            </div>
          ))}
        </div>

        {/* favorites */}
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Favoritos ({favStations.length})</div>
        {favStations.length === 0 ? (
          <div className="card-flat" style={{ padding: 18, textAlign: 'center' }}>
            <Icon name="heart" size={26} color="var(--ink-faint)" />
            <div className="t-soft" style={{ fontSize: 14, marginTop: 8 }}>Toque no ♥ de um ponto para salvar aqui.</div>
          </div>
        ) : favStations.map(s => (
          <div key={s.id} className="card" style={{ padding: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph" style={{ width: 50, height: 50, borderRadius: 12, flex: '0 0 auto' }}><span>foto</span></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
              <div className="t-faint" style={{ fontSize: 12 }}>{s.area} · {s.dist}</div>
            </div>
            <Icon name="heart" size={20} fill="var(--off)" color="var(--off)" />
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding, CommunityScreen, RouteScreen, ProfileScreen, BrandMark, GuideDetail, GuideBrowser });
