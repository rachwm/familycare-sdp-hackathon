import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Icon, type IconName } from '../components/Icon';
import { PageHeading } from '../components/PageHeading';
const options: { slug: string; title: string; description: string; icon: IconName }[] = [
  { slug: 'personal', title: 'Personal Information', description: 'View your account details.', icon: 'profile' },
  { slug: 'contacts', title: 'Emergency Contacts', description: 'View your emergency contacts.', icon: 'people' },
  { slug: 'privacy', title: 'Privacy & Security', description: 'Your data and account security.', icon: 'shield' },
  { slug: 'support', title: 'Help & Support', description: 'Help with your FamilyCare dashboard.', icon: 'help' },
];
export function ProfilePage() {
  return <>
    <PageHeading title="Profile" subtitle="Manage your account and connected care." />
    <section className="profile-card account-card"><Avatar person="account" /><div><span className="eyebrow">Account profile</span><h2>Sarah</h2><p>Daughter · Family Member</p></div></section>
    <Link className="profile-card linked-card" to="/resident"><Avatar /><div><span className="eyebrow">Linked resident</span><h2>Puan Aisha</h2><p className="connected"><span />Connected</p></div><Icon name="chevron" /></Link>
    <h2 className="settings-heading">Account settings</h2>
    <div className="settings-list">{options.map(option => <Link className="setting-row" key={option.slug} to={`/profile/${option.slug}`}><span className="activity-icon"><Icon name={option.icon} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span><Icon name="chevron" /></Link>)}
      <div className="setting-row logout-row" aria-disabled="true"><span className="activity-icon"><Icon name="logout" /></span><span><strong>Log Out</strong><small>Unavailable in this signed-out demo.</small></span></div>
    </div>
  </>;
}
