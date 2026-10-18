import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
const items: { label: string; icon: IconName; path: string }[] = [
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Alerts', icon: 'bell', path: '/alerts' },
  { label: 'History', icon: 'history', path: '/history' },
  { label: 'Profile', icon: 'profile', path: '/profile' },
];
export function BottomNav() {
  return <nav className="bottom-nav" aria-label="Main navigation">
    {items.map(({ label, icon, path }) => <NavLink key={path} to={path} end={path !== '/profile'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <Icon name={icon} /><span>{label}</span>
    </NavLink>)}
  </nav>;
}
