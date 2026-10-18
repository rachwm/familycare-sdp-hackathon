import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
export function BackButton() {
  const navigate = useNavigate();
  return <button className="back-button" onClick={() => {
    // A directly opened detail URL has no in-app page to return to.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  }}><Icon name="back" />Back</button>;
}
