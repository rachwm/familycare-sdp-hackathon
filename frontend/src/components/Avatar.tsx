import residentReference from '../assets/resident-reference.png';
import accountReference from '../assets/profile-reference.png';

// Reuse just the approved portraits, never the screenshot's interface.
export function Avatar({ person = 'resident' }: { person?: 'resident' | 'account' }) {
  const resident = person === 'resident';
  return <svg className="avatar" viewBox={resident ? '59 246 95 97' : '60 243 95 95'} role="img" aria-label={resident ? 'Puan Aisha' : 'Nur Aisha'}>
    <image href={resident ? residentReference : accountReference} width={resident ? 436 : 490} height={resident ? 834 : 938} />
  </svg>;
}
