import { Link } from 'react-router-dom';
import { activityPath, type Activity } from '../data/mockData';
import { Icon, type IconName } from './Icon';
export function ActivityCard({ activity, expanded = false, showDay = true, statusIcon, timeLabel }: { activity: Activity; expanded?: boolean; showDay?: boolean; statusIcon?: IconName; timeLabel?: string }) {
  return <Link className={`activity-card${expanded ? ' activity-card--expanded' : ''} tone-${activity.tone}`} to={activityPath(activity)}>
    <span className="activity-icon"><Icon name={activity.icon} /></span>
    <span className="activity-copy"><span className="activity-title">{activity.title}</span><span className="activity-description">{activity.description}</span>
      {expanded && activity.status && <span className="small-status"><Icon name={statusIcon ?? (activity.tone === 'orange' ? 'clock' : 'check')} />{activity.status}</span>}
    </span>
    <span className="activity-time">{timeLabel && <span className="activity-time-label">{timeLabel}</span>}{showDay && <>Today<br /></>}{activity.time}</span><Icon name="chevron" className="activity-chevron" />
  </Link>;
}
