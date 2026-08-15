// station.jsx — station peek + full detail (ficha). Exports: StationPeek, StationDetail, Stars, AMEN
const React = window.React;
const { useState } = React;
const { Icon, Seal, SeloBadge } = window;

const AMEN = {
  coffee: ['coffee', 'Café'], food: ['food', 'Restaurante'], wc: ['wc', 'Banheiro'],
  parking: ['parking', 'Estacionamento'], wifi: ['wifi', 'Wi-Fi'], shield: ['shield', 'Segurança 24h'],
  store: ['store', 'Mercado'], leaf: ['leaf', 'Área verde'], mountain: ['mountain', 'Mirante'],
};
const AVAIL = { ok: ['Disponível', 'var(--ok)'], busy: ['Movimentado', 'var(--busy)'], off: ['Indisponível', 'var(--off)'] };

function Stars({ n, size = 14, label = true }) {
  return (
    <span className="seal-row" style={{ color: 'var(--gold)' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <Icon key={i} name="star" size={size}
          fill={i < Math.round(n) ? 'var(--gold)' : 'none'}
          color={i < Math.round(n) ? 'var(--gold)' : 'var(--line-strong)'} stroke={1.5} />
      ))}
    </span>
  );
}

function StationPeek({ st, onOpen, onClose, onNavigate }) {
  const [av, avc] = AVAIL[st.avail];
  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet peek" style={{ paddingBottom: 18 }} role="dialog" aria-modal="true" aria-label={`Prévia: ${st.name}`}>
        <div className="grab" />
        <button style={{ padding: '6px 18px 0', display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', font: 'inherit' }}
          onClick={onOpen} aria-label={`Abrir ficha completa de ${st.name}`}>
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="ph" style={{ width: 84, height: 84, borderRadius: 16, flex: '0 0 auto' }} role="img" aria-label={`Foto do ponto ${st.name}`}>
              <span aria-hidden="true">foto</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span className="dot" style={{ background: avc }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: avc }}>{av}</span>
                <span className="t-faint" style={{ fontSize: 12 }}>· {st.free}/{st.total} livres · {st.dist}</span>
              </div>
              <div className="t-display" style={{ fontSize: 21, marginBottom: 3 }}>{st.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stars n={st.rating} size={13} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{st.rating.toFixed(1)}</span>
                <span className="t-faint" style={{ fontSize: 12 }}>({st.reviews})</span>
              </div>
            </div>
          </div>
          {st.selo > 0 && <div style={{ marginTop: 12 }}><SeloBadge level={st.selo} /></div>}
        </button>
        <div style={{ display: 'flex', gap: 10, padding: '14px 18px 0' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onNavigate(st); }}>
            <Icon name="nav" size={18} /> Navegar
          </button>
          <button className="btn btn-ghost" onClick={onOpen}>Ver ficha</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function Spec({ icon, label, value, sub }) {
  return (
    <div className="card-flat" style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Icon name={icon} size={18} color="var(--primary)" />
      <div>
        <div className="t-mono" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
        <div className="t-faint" style={{ fontSize: 11, marginTop: 2 }}>{label}{sub ? ` · ${sub}` : ''}</div>
      </div>
    </div>
  );
}

function StationDetail({ st, onClose, onNavigate, onReport, onRate, fav, onFav, toast }) {
  const ready = window.useDelay(((window.ROTA_CONFIG || {}).latency || {}).detail);
  const [av, avc] = AVAIL[st.avail];
  const pct = Math.round((st.free / st.total) * 100);
  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ height: '94%' }} role="dialog" aria-modal="true" aria-label={`Ficha do ponto ${st.name}`}>
        <div className="grab" />
        <div className="scroll" style={{ padding: '4px 0 24px' }}>
          {!ready && <StationSkeleton />}
          {ready && <React.Fragment>
          {/* hero */}
          <div style={{ padding: '0 18px' }}>
            <div className="ph" style={{ height: 170, borderRadius: 20, marginBottom: 14 }} role="img" aria-label={`Fotos do ponto ${st.name}, 3 imagens`}>
              <span aria-hidden="true">foto da estação · 3 imagens</span>
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                <button className="iconbtn" style={{ width: 44, height: 44 }} onClick={onClose} aria-label="Fechar ficha do ponto"><Icon name="chevD" size={20} /></button>
              </div>
              <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
                {st.selo > 0 && <SeloBadge level={st.selo} />}
              </div>
            </div>
          </div>

          <div style={{ padding: '0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="dot" style={{ background: avc }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: avc }}>{av}</span>
              <span className="t-faint" style={{ fontSize: 12 }}>· Atualizado há 3 min</span>
            </div>
            <h2 className="t-display" style={{ fontSize: 28, margin: '0 0 4px' }}>{st.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="t-soft" style={{ fontSize: 14 }}><Icon name="nav" size={13} /> {st.area} · {st.dist}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 14px' }}>
              <Stars n={st.rating} />
              <span style={{ fontWeight: 800, fontSize: 15 }}>{st.rating.toFixed(1)}</span>
              <span className="t-faint" style={{ fontSize: 13 }}>· {st.reviews} avaliações da comunidade</span>
            </div>

            {/* blurb — editorial guide voice */}
            <p className="t-serif" style={{ fontSize: 16.5, lineHeight: 1.5, color: 'var(--ink)', margin: '0 0 18px', fontStyle: 'italic' }}>
              “{st.blurb}”
            </p>

            {/* live availability bar */}
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <div className="kv" style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Pontos livres agora</span>
                <span className="t-mono" style={{ fontSize: 15, fontWeight: 600, color: avc }}>{st.free} / {st.total}</span>
              </div>
              <div className="bar" role="img" aria-label={`${st.free} de ${st.total} pontos livres`}><i style={{ width: `${pct}%`, background: avc }} /></div>
              <div className="t-faint" style={{ fontSize: 12, marginTop: 8 }}>
                <Icon name="clock" size={12} /> Menor movimento entre {st.quiet}
              </div>
            </div>

            {/* specs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Spec icon="zap" label="Potência máx." value={`${st.power} kW`} />
              <Spec icon="plug" label="Conectores" value={st.connectors.join(' · ')} />
              <Spec icon="clock" label="Funcionamento" value={st.hours} />
              <Spec icon="dollar" label="Preço médio" value={`R$ ${st.price.toFixed(2).replace('.', ',')}`} sub="kWh" />
            </div>

            {/* amenities */}
            <div style={{ marginBottom: 16 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Comodidades próximas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {st.amenities.map(a => (
                  <span key={a} className="chip" style={{ cursor: 'default' }}>
                    <Icon name={AMEN[a][0]} size={15} color="var(--primary)" /> {AMEN[a][1]}
                  </span>
                ))}
              </div>
            </div>

            {/* community reviews */}
            <div className="kv" style={{ marginBottom: 12 }}>
              <div className="t-eyebrow">Vozes da comunidade</div>
              <button className="btn btn-outline" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => onRate(st)}>
                <Icon name="edit" size={15} /> Avaliar
              </button>
            </div>
            {st.reviewsList.length === 0 && (
              <div className="card-flat" style={{ padding: 16, textAlign: 'center' }}>
                <div className="t-soft" style={{ fontSize: 14 }}>Seja o primeiro a avaliar este ponto.</div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onRate(st)}>Escrever avaliação</button>
              </div>
            )}
            {st.reviewsList.map((r, i) => (
              <div key={i} className="card-flat" style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{r.who.split(' ').map(s => s[0]).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.who}</div>
                    <div className="t-faint" style={{ fontSize: 11 }}>{r.car} · há {r.when}</div>
                  </div>
                  <Stars n={r.stars} size={12} />
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>{r.body}</p>
                <button className="chip" style={{ marginTop: 10, fontSize: 12 }}>
                  <Icon name="thumb" size={13} /> Útil · {r.helpful}
                </button>
              </div>
            ))}
          </div>
          </React.Fragment>}
        </div>

        {/* sticky actions */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
          <button className={`iconbtn fav-btn ${fav ? 'on' : ''}`} onClick={() => onFav(st)} style={{ color: fav ? 'var(--off)' : 'var(--ink)' }} aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={!!fav}>
            <Icon name="heart" size={20} fill={fav ? 'var(--off)' : 'none'} color={fav ? 'var(--off)' : 'currentColor'} />
          </button>
          <button className="iconbtn" onClick={() => onReport(st)} aria-label="Reportar problema neste ponto"><Icon name="alert" size={20} /></button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onNavigate(st)}>
            <Icon name="nav" size={18} /> Iniciar rota
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { StationPeek, StationDetail, Stars, AMEN, AVAIL });
