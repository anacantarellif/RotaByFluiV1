// event-sheet.jsx — community event bottom sheet (map report markers). Exports: EventSheet
const React = window.React;
const { useState } = React;
const { Icon } = window;

function EventSheet({ ev, onClose, pushToast }) {
  const [voted, setVoted] = useState(null);
  if (!ev) return null;
  const c = ev.color;
  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ paddingBottom: 20 }} role="dialog" aria-modal="true" aria-label={`Reporte: ${ev.label}`}>
        <div className="grab" />
        <div style={{ padding: '4px 18px 0' }}>
          <div className="kv">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="dot" style={{ background: c, width: 8, height: 8, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{ev.kind}</span>
            </div>
            <span className="t-faint" style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>há {ev.when}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 14px' }}>
            <span className="ev-ring" style={{ borderColor: c }}><Icon name={ev.icon} size={32} color={c} /></span>
          </div>

          <h3 className="t-display" style={{ fontSize: 24, margin: 0, textAlign: 'center' }}>{ev.label}</h3>
          <p className="t-soft" style={{ fontSize: 13.5, lineHeight: 1.45, margin: '6px 0 0', textAlign: 'center' }}>{ev.desc}</p>

          <div className="ev-box">
            <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{ev.who.slice(0, 1)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.who} reportou</div>
              <div className="t-faint" style={{ fontSize: 11.5 }}>{ev.station} · confirmado por {ev.confirms} pessoas</div>
            </div>
          </div>

          {voted ? (
            <div className="ev-thanks">
              <Icon name="checkCircle" size={18} color="var(--ok)" />
              {voted === 'yes' ? 'Obrigado! Confirmação enviada · +20 Watts' : 'Valeu! Vamos revisar esse reporte'}
            </div>
          ) : (
            <React.Fragment>
              <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }}
                onClick={() => { setVoted('yes'); pushToast('Reporte confirmado · +20 Watts', 'check'); }}>
                <Icon name="check" size={18} /> Continua assim · +20 Watts
              </button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }}
                onClick={() => { setVoted('no'); pushToast('Reporte marcado como resolvido', 'check'); }}>
                Não está mais assim
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

window.EventSheet = EventSheet;
