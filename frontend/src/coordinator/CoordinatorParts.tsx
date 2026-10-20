import { useEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import { eligibleCandidate, type DemoState } from './demo';
import { arrivalEstimate } from './records';
import responderReference from '../../../designs/responder-dashboard/03_track_incident.png';
export function RouteMap({ travelling, name = 'Daniel Lim' }: { travelling: boolean; name?: string }) {
  return <div className="coord-map"><svg viewBox="0 0 760 350" role="img" aria-label="Schematic simulated route to Puan Aisha’s home, not live GPS">
    <defs><pattern id="streets" width="100" height="75" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse"><rect width="100" height="75" fill="#e9edeb"/><path d="M0 0H100V75H0Z" fill="none" stroke="white" strokeWidth="10"/><path d="M45 0V75" stroke="#f8faf9" strokeWidth="5"/></pattern></defs>
    <rect width="760" height="350" fill="url(#streets)"/><path d="M-20 170Q120 30 250 200T520 220T800 110" fill="none" stroke="#c4e3f0" strokeWidth="48"/><path d="M-20 170Q120 30 250 200T520 220T800 110" fill="none" stroke="#d9eff8" strokeWidth="30"/>
    <path d="m30 40 130-22 45 90-105 35ZM530 20l150-5 42 85-140 30ZM350 275l90-60 70 90-90 40Z" fill="#badcc2"/>
    <text x="235" y="95" fill="#8ba599" fontSize="18" letterSpacing="2">ELMINA</text><text x="540" y="280" fill="#8ba599" fontSize="15">GREEN SPACE</text>
    {travelling && <><path d="m110 280 120-20 68-48 92 3 45-62 110-38 40-65" fill="none" stroke="white" strokeWidth="14" strokeLinejoin="round"/><path d="m110 280 120-20 68-48 92 3 45-62 110-38 40-65" fill="none" stroke="#1479ee" strokeWidth="7" strokeLinejoin="round" strokeDasharray={travelling ? undefined : '10 7'}/>
    <circle cx="110" cy="280" r="23" fill="#005a4a" stroke="white" strokeWidth="4"/><text x="110" y="286" textAnchor="middle" fill="white" fontSize="17">{name.split(' ').map(n=>n[0]).join('')}</text></>}<circle cx="585" cy="50" r="12" fill="#f34b5f" stroke="white" strokeWidth="5"/>
    <rect x="585" y="71" width="165" height="44" rx="9" fill="white"/><text x="595" y="97" fill="#003f35" fontSize="14">Puan Aisha’s home</text>
  </svg><span className="coord-map-label"><Icon name="info"/> Simulated route · {travelling ? 'Illustrative journey · no live GPS' : 'Resident location only · no journey started'}</span></div>;
}
export function Timeline({ state }: { state: DemoState }) {
  return <section className="coord-card"><h2><Icon name="clock"/> Incident Timeline</h2><ol className="coord-timeline">{state.events.map((event, i) => <li key={event.id} className={i === state.events.length - 1 ? 'current' : ''}><span className="coord-event-dot"><Icon name="check"/></span><time>{event.time}</time><div><strong>{event.title}</strong><p>{event.description}</p></div></li>)}</ol>{state.stage !== 'completed' && <p className="coord-pending"><Icon name="clock"/> {state.stage === 'matching' && !eligibleCandidate(state) ? 'Pending: manual responder review' : state.escalated ? 'Pending: urgent support review' : state.stage === 'on-way' ? `Estimated arrival: ~${arrivalEstimate(state)} · unconfirmed` : 'Later milestones remain pending until confirmed.'}</p>}</section>;
}
export function Confirmation({ kind, confirm, close, busy }: { busy: boolean; kind: 'reassign' | 'escalate'; confirm: () => void; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog className="coord-dialog" aria-labelledby="confirmation-title" ref={ref} onCancel={event=>{if(busy) event.preventDefault(); else close();}} onClick={event => { if (!busy && event.target === event.currentTarget) close(); }}><h2 id="confirmation-title">{kind === 'reassign' ? 'Reassign Responder?' : 'Escalate Incident?'}</h2><p>{kind === 'reassign' ? 'Release the current assignment and request the next suitable available responder. The replacement must accept and confirm departure before travelling. Assignment history will be preserved.' : 'Mark this incident for urgent support review. This simulation does not contact emergency services or dispatch anyone.'}</p><div className="coord-actions"><button className="coord-btn secondary" autoFocus disabled={busy} onClick={close}>Cancel</button><button className={`coord-btn ${kind === 'escalate' ? 'danger' : ''}`} disabled={busy} onClick={confirm}>{busy ? 'Updating…' : 'Confirm'} {kind === 'reassign' ? 'Reassignment' : 'Escalation'}</button></div></dialog>;
}

export function ResponderPortrait({name}:{name:string}) { return name === 'Daniel Lim' ? <svg className="coord-responder-photo" viewBox="915 443 56 55" role="img" aria-label="Daniel Lim"><image href={responderReference} width="1452" height="1083"/></svg> : <span className="coord-initials" aria-label={name}>{name.split(' ').map(n=>n[0]).join('')}</span>; }
