// rating.jsx — multi-step rating flow for stations and itineraries. Exports: RateFlow
const React = window.React;
const { useState } = React;
const { Icon, Seal, SeloBadge } = window;

const GOOD = {
  station: [
    ['zap', 'Carregou rápido'], ['check', 'Ponto funcionando'], ['parking', 'Vaga fácil'],
    ['shield', 'Lugar seguro'], ['coffee', 'Café por perto'], ['food', 'Boa comida'],
    ['wc', 'Banheiro limpo'], ['wifi', 'Wi-Fi bom'], ['sun', 'Bem iluminado'],
  ],
  guide: [
    ['route', 'Trajeto tranquilo'], ['zap', 'Recarga no lugar certo'], ['clock', 'Tempos bem calculados'],
    ['mountain', 'Paisagem incrível'], ['food', 'Boas paradas para comer'], ['users', 'Bom com família'],
    ['sun', 'Vale o pôr do sol'], ['leaf', 'Muita natureza'],
  ],
};
const LABELS = ['Toque nas estrelas', 'Evite', 'Fraco', 'Ok', 'Muito bom', 'Excelente'];
const STEP_TITLES = ['Sua nota', 'O que foi bom', 'Pronto'];

function StarRow({ value, onChange, size = 40 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-row" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} role="radio" aria-checked={value === i} aria-label={`${i} ${i === 1 ? 'estrela' : 'estrelas'}`}
          className={`star-btn ${i <= shown ? 'on' : ''}`}
          onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
          <Icon name="star" size={size} fill={i <= shown ? 'var(--gold)' : 'none'}
            color={i <= shown ? 'var(--gold)' : 'var(--line-strong)'} stroke={1.5} />
        </button>
      ))}
    </div>
  );
}

function StopRating({ stop, value, onChange }) {
  return (
    <div className="stop-rate">
      <span className="ico">
        <Icon name={stop.kind === 'charge' ? 'zap' : (stop.icon || 'target')} size={17}
          color={stop.kind === 'charge' ? 'var(--primary)' : 'var(--ink-soft)'} />
      </span>
      <span className="nm">{stop.name}</span>
      <span className="mini" role="radiogroup" aria-label={`Nota para ${stop.name}`}>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} role="radio" aria-checked={value === i} aria-label={`${i} de 5 para ${stop.name}`}
            onClick={() => onChange(i)}>
            <Icon name="star" size={17} fill={i <= value ? 'var(--gold)' : 'none'}
              color={i <= value ? 'var(--gold)' : 'var(--line-strong)'} stroke={1.6} />
          </button>
        ))}
      </span>
    </div>
  );
}

function RateFlow({ target, kind = 'station', onClose, onDone, pushToast }) {
  const isGuide = kind === 'guide';
  const [step, setStep] = useState(0);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [selo, setSelo] = useState(false);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState(0);
  const [stopStars, setStopStars] = useState({});
  const [sent, setSent] = useState(false);

  const rateable = isGuide ? target.stops.filter(s => s.kind !== 'start') : [];
  const toggleTag = (t) => setTags(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t]);
  const watts = 200 + tags.length * 10 + photos * 50 + (body.trim() ? 40 : 0) +
    Object.keys(stopStars).length * 15 + (selo ? 60 : 0);

  const submit = () => {
    setSent(true);
    setStep(2);
  };
  const finish = () => { onDone({ stars, selo, watts, kind }); };

  const canNext = step === 0 ? stars > 0 : true;

  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet rate-sheet" role="dialog" aria-modal="true"
        aria-label={`Avaliar ${isGuide ? 'roteiro' : 'ponto'}: ${target.name || target.title}`}>
        <div className="grab" />

        {/* header + step progress */}
        <div className="rate-head">
          <div className="kv">
            <div style={{ minWidth: 0 }}>
              <div className="t-eyebrow">{isGuide ? 'Avaliar roteiro' : 'Avaliar ponto'} · {STEP_TITLES[step]}</div>
              <h3 className="t-display" style={{ fontSize: 21, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {target.name || target.title}
              </h3>
            </div>
            <button className="iconbtn" style={{ width: 44, height: 44 }} onClick={onClose} aria-label="Fechar avaliação">
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="rate-steps" role="img" aria-label={`Etapa ${step + 1} de 3`}>
            {[0, 1, 2].map(i => <span key={i} className={i <= step ? 'on' : ''} />)}
          </div>
        </div>

        <div className="scroll rate-body">
          {/* ---------- STEP 1 · stars ---------- */}
          {step === 0 && (
            <div className="page-enter">
              <div className="rate-hero">
                <div className="ph" style={{ width: 68, height: 68, borderRadius: 18, flex: '0 0 auto' }}
                  role="img" aria-label={`Imagem de ${target.name || target.title}`}>
                  <span aria-hidden="true">foto</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="t-faint" style={{ fontSize: 11.5, fontWeight: 600 }}>{isGuide ? target.region : target.area}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2 }}>
                    {isGuide ? `${target.distance} km · ${target.duration}` : `${target.power} kW · ${target.connectors.join(' · ')}`}
                  </div>
                </div>
              </div>

              <p className="rate-q">{isGuide ? 'Como foi fazer este roteiro?' : 'Como foi sua recarga aqui?'}</p>
              <StarRow value={stars} onChange={setStars} />
              <div className={`rate-label ${stars ? 'set' : ''}`} aria-live="polite">{LABELS[stars]}</div>

              {isGuide && rateable.length > 0 && (
                <div className="rate-block">
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Nota por parada <span className="t-faint" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>(opcional)</span></div>
                  {rateable.map((s, i) => (
                    <StopRating key={i} stop={s} value={stopStars[i] || 0}
                      onChange={(v) => setStopStars(m => ({ ...m, [i]: v }))} />
                  ))}
                </div>
              )}

              {!isGuide && (
                <button className={`pick selo-pick ${selo ? 'on' : ''}`} onClick={() => setSelo(!selo)} role="switch" aria-checked={selo}>
                  <span className="seal" style={{ width: 30, height: 30, color: 'var(--gold)' }}><Seal size={30} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>Indicar para o Selo Flui</span>
                    <span className="t-faint" style={{ display: 'block', fontSize: 12 }}>Sua indicação alimenta a curadoria do guia</span>
                  </span>
                  <span className="cbox" aria-hidden="true">{selo && <Icon name="check" size={14} color="#fff" />}</span>
                </button>
              )}
            </div>
          )}

          {/* ---------- STEP 2 · what was good ---------- */}
          {step === 1 && (
            <div className="page-enter">
              <p className="rate-q" style={{ marginTop: 4 }}>O que foi bom?</p>
              <div className="chip-wrap">
                {GOOD[kind].map(([ic, label]) => {
                  const on = tags.includes(label);
                  return (
                    <button key={label} className={`chip ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => toggleTag(label)}>
                      <Icon name={ic} size={14} color={on ? '#fff' : 'var(--primary)'} /> {label}
                    </button>
                  );
                })}
              </div>

              <div className="t-eyebrow" style={{ margin: '20px 0 9px' }}>Fotos</div>
              <div className="photo-row">
                {Array.from({ length: photos }).map((_, i) => (
                  <div key={i} className="ph photo-thumb" role="img" aria-label={`Foto ${i + 1} adicionada`}>
                    <span aria-hidden="true">foto {i + 1}</span>
                  </div>
                ))}
                {photos < 3 && (
                  <button className="photo-add" onClick={() => setPhotos(p => p + 1)} aria-label="Adicionar foto">
                    <Icon name="camera" size={20} color="var(--primary)" />
                    <span>+50 W</span>
                  </button>
                )}
              </div>

              <div className="t-eyebrow" style={{ margin: '20px 0 9px' }}>Seu comentário</div>
              <textarea className="field" rows="4" value={body} onChange={(e) => setBody(e.target.value)}
                aria-label="Comentário sobre a experiência"
                placeholder={isGuide ? 'Conte como foi a viagem, o que valeu a pena…' : 'Conte como foi a recarga, o que ajudou…'}
                style={{ resize: 'none' }} />
              <div className="t-faint" style={{ fontSize: 11.5, marginTop: 6, textAlign: 'right' }}>{body.length}/280</div>
            </div>
          )}

          {/* ---------- STEP 3 · success ---------- */}
          {step === 2 && (
            <div className="page-enter rate-success">
              <div className="succ-badge"><Icon name="checkCircle" size={34} color="#fff" /></div>
              <div className="t-eyebrow" style={{ color: 'var(--ok)' }}>Avaliação publicada</div>
              <h4 className="t-display" style={{ fontSize: 23, margin: '4px 0 6px' }}>Obrigado!</h4>
              <p className="t-soft" style={{ fontSize: 13.5, margin: '0 auto 16px', maxWidth: 280 }}>
                {isGuide
                  ? 'Sua nota ajuda outros motoristas a decidir se o roteiro vale a viagem.'
                  : 'Sua avaliação entra na curadoria e aparece para quem buscar este ponto.'}
              </p>

              <div className="watts-pill">
                <Icon name="zap" size={17} color="var(--primary)" />
                <b>+{watts}</b> Watts
              </div>

              <div className="succ-recap">
                <div className="row">
                  <span>Sua nota</span>
                  <span className="v">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name="star" size={13} fill={i < stars ? 'var(--gold)' : 'none'}
                        color={i < stars ? 'var(--gold)' : 'var(--line-strong)'} stroke={1.6} />
                    ))}
                  </span>
                </div>
                {tags.length > 0 && <div className="row"><span>Destaques</span><span className="v t-faint">{tags.length} marcados</span></div>}
                {photos > 0 && <div className="row"><span>Fotos</span><span className="v t-faint">{photos}</span></div>}
                {selo && <div className="row"><span>Selo Flui</span><span className="v" style={{ color: 'var(--gold-ink)', fontWeight: 700 }}>indicado</span></div>}
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="sheet-foot">
          {step === 0 && (
            <button className="btn btn-primary btn-block btn-lg" disabled={!canNext} style={{ opacity: canNext ? 1 : .5 }}
              onClick={() => setStep(1)}>Continuar</button>
          )}
          {step === 1 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)} aria-label="Voltar para a nota">
                <Icon name="chevL" size={18} />
              </button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={submit}>
                Publicar · +{watts} W
              </button>
            </div>
          )}
          {step === 2 && (
            <button className="btn btn-primary btn-block btn-lg" onClick={finish}>Concluir</button>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { RateFlow, StarRow });
