import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="The page you're looking for doesn't exist." />
      <Link to="/" className="btn">Back to dashboard</Link>
    </>
  );
}
