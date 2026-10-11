import { Link } from 'react-router';
import PageLayout from '../../components/PageLayout.jsx';
import { ROUTE_PATHS } from '../../routePaths.js';

export default function NotFoundPage() {
  return (
    <PageLayout title="Page not found">
      <h1>Page not found</h1>
      <p>That page doesn't exist, or it may have moved.</p>
      <p>
        <Link to={ROUTE_PATHS.home}>Go to the home page</Link>
      </p>
    </PageLayout>
  );
}
